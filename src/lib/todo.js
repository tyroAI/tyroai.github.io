import { STATUS, graphGet, graphPatch, graphPost, parseGraphDateTime } from "@/lib/graph"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  MICROSOFT TO DO — "Bugünün odağı"nın kaynağı (2026-09-29)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İstek: *"Outlook'ta To Do'ya erişip yönetebiliyor muyuz — herkes kendi
 * hesabındakini? Bugünün odağındaki işler için orayı kullanamaz mıyız?"*
 * Karar (aynı gün, kullanıcının seçimi): kart **bugün teslim edilecek ve
 * gecikmiş** görevleri gösterir, bugün bitenler üstü çizili; karttan eklenen
 * iş varsayılan "Görevler" listesine BUGÜNÜN tarihiyle düşer.
 *
 * ⚠️ **İZİN `Tasks.ReadWrite` (delegated) ve `loginRequest`te DEĞİL.** Kayıtta
 * verildi (2026-09-29) ama girişe eklenmesi ancak "Granted for Midea"
 * teyidinden sonra — onaysız bir kapsam girişin TAMAMINI "Approval required"
 * duvarına çevirir (msal.js). Belirteç sessizce alınıyor; alınamazsa
 * (`denied`) kart yerel listeye düşüp "To Do'ya bağlan" diyor.
 *
 * ⚠️ **TESLİM TARİHİ BİR GÜN, AN DEĞİL.** To Do yalnız tarih seçtiriyor ve
 * `dueDateTime`ı o günün UTC gece yarısı olarak saklıyor. Yerel saate ÇEVRİLMEZ:
 * UTC−5'teki birinde gece yarısı bir önceki güne düşer ve her görev bir gün
 * erken görünürdü (takvimin tüm gün etkinliklerindeki klasik hatanın aynısı).
 * Gün, `dateTime`ın TARİH KISMI. Tamamlanma ise gerçek bir an olabilir —
 * orada yerel güne çevriliyor (`parseGraphDateTime`); gece yarısına yakın
 * bitirilen bir iş aksi hâlde "dün" sayılırdı.
 *
 * ⚠️ **"GÜNÜM" (My Day) OKUNAMIYOR.** Graph'ın To Do API'si o görünümü
 * vermiyor; "bugün" bu yüzden teslim tarihiyle tanımlı.
 *
 * ⚠️ **HİÇBİR LİSTE ATLANMAZ.** Kart To Do'nun "Planlanan" görünümü gibi BÜTÜN
 * listelere bakıyor (işaretli e-postalar dahil) — yalnız varsayılan listeye
 * bakmak, başka bir listede bugüne planlanmış işi sessizce gizlerdi.
 *
 * ⚠️ **OKUNAMAYAN LİSTE SESSİZCE DÜŞMEZ, AMA KARTI DA DÜŞÜRMEZ** (2026-09-29,
 * üretimde "şu an ulaşılamıyor" görüldükten sonra). İlk sürüm tek bir
 * listenin hatasında TÜM sonucu `error` yapıyordu; kalıcı olarak okunamayan
 * tek bir liste (paylaşılmış, işaretli e-postalar, kısıtlanmış) kartı hiç
 * açılmaz hâle getirirdi. Artık okunan listeler çiziliyor ve kart kaç listenin
 * okunamadığını SÖYLÜYOR (`skipped`) — "soramadık ≠ veri yok" kuralı eksik
 * listeyi eksik diye göstermekle korunuyor. Yalnız listelerin kendisi ya da
 * listelerin HEPSİ okunamazsa `error`.
 *
 * ⚠️ **AYNI ANDA EN ÇOK İKİ LİSTE** (`LIST_CONCURRENCY`). To Do, Exchange
 * posta kutusunun üstünde çalışıyor ve Exchange bir uygulamaya posta kutusu
 * başına 4 eşzamanlı istek tanıyor; fazlası 429. İlk sürüm 12 listeyi aynı
 * anda soruyordu ve Akışım o sırada aynı kutuya takvim ve posta da soruyor.
 * Kalan 429'lar (ve CORS'suz kısıtlama cevabının `TypeError`ı) graph.js'in
 * `retry`ıyla yeniden deneniyor.
 *
 * ⚠️ **HATA KENDİNİ ANLATIR.** Her başarısız istek `[todo]` önekiyle HTTP
 * kodunu, Graph'ın hata kodunu ve cümlesini konsola yazıyor, kartın hata
 * satırı da kısa hâlini gösteriyor (`detail`). Gerçek To Do'yu buradan
 * çağıramadığımız için bir sonraki arıza ancak böyle adını söyler.
 */

export const TODO_SCOPES = ["Tasks.ReadWrite"]
// ⚠️ Aşağıdaki yardımcıların bir kısmı İHRAÇ ediliyor: To-Do sayfası
// (`lib/todoBoard.js`) aynı sayfalama, havuz, yeniden deneme ve gün kurallarını
// kullanıyor — ikinci bir kopya, iki yüzeyin aynı görevi farklı güne koyması
// demekti (tarih kuralı dosya başında).

/*
 * ⚠️ **`$select` YOK — To Do onu REDDEDİYOR** (2026-09-29, üretimde ölçüldü:
 * kart "Teknik ayrıntı: HTTP 400 · invalidRequest" dedi). İlk sürüm hem liste
 * hem görev sorgularında `$select` taşıyordu; belge yalnız "bazı OData
 * parametreleri desteklenir" diyor ve sahadaki kayıtlar görev listesinde
 * `$select`in 400 döndürdüğünü söylüyor. Liste çağrısının yedeği olmadığı için
 * bütün kart düşüyordu. `$filter=status ne 'completed'` ve `$top` sahada
 * çalışan biçimler (Microsoft Q&A'nın kabul edilmiş cevabı). Bir sorguya
 * parametre EKLEYEN kişi onu gerçek To Do'da denemeden eklememeli — sahte
 * sunucu her parametreyi kabul ediyordu, hatayı o yüzden görmedi.
 */
const MAX_LISTS = 12
/** Açık görevler için en fazla üç sayfa (3 × 100). */
const OPEN_PAGES = 3
/** Süzgeçsiz yedek sorgu varsayılan sayfa boyuyla gelir; daha çok sayfa. */
const FALLBACK_PAGES = 10
/** Aynı anda sorulan liste sayısı — gerekçe dosya başında. */
const LIST_CONCURRENCY = 2
/** Geçici hatada (429 · 50x · ağ) yeniden deneme sayısı. */
export const RETRY = 2
/** Yeniden denemeden sonra da düşen bu kodlarda süzgeçsiz yedek sorulmaz — sorgu değil yük sorunu. */
const TRANSIENT_HTTP = new Set([429, 502, 503, 504])

/**
 * "Bugün bitenler" sorgusunun basamakları. Kalıcı bir ret (4xx/501) bir alt
 * basamağa iner ve karar oturum boyunca hatırlanır — `authorizations.js`in
 * `notesAvailable` deseni: son değişene göre sıralı 25 → sırasız 100 → hiç.
 * En alt basamakta "bugün bitenler" yalnız karttan bitirilenler olur; açık
 * görevler etkilenmez.
 */
const COMPLETED_QUERIES = [
  `?$filter=${encodeURIComponent("status eq 'completed'")}&$orderby=${encodeURIComponent("lastModifiedDateTime desc")}&$top=25`,
  `?$filter=${encodeURIComponent("status eq 'completed'")}&$top=100`,
]
let completedStep = 0

/** Yerel takvim günü — `toISOString()` DEĞİL (UTC'de gün kayar). */
export function localDayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Teslim tarihi: `dateTime`ın tarih kısmı (gerekçe dosya başında). */
export function dueDayOf(value) {
  const raw = value?.dateTime
  return typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null
}

/** Tamamlanma günü: gerçek bir an, yerel güne çevrilir. */
export function completedDayOf(value) {
  const d = parseGraphDateTime(value)
  return d ? localDayKey(d) : null
}

const enc = encodeURIComponent

export async function getPages(instance, account, path, pages) {
  const out = []
  let next = path
  for (let i = 0; next && i < pages; i += 1) {
    const res = await graphGet(instance, account, { path: next, scopes: TODO_SCOPES, retry: RETRY })
    if (res.status !== STATUS.ready) return res
    out.push(...(res.data?.value ?? []))
    next = res.data?.["@odata.nextLink"] ?? null
  }
  if (next) console.warn(`[todo] ${path.split("?")[0]}: ${pages} sayfadan fazlası okunmadı`)
  return { status: STATUS.ready, data: out }
}

/**
 * Başarısız bir cevabın kısa, okunabilir özeti: "HTTP 400 · invalidRequest ·
 * lists". Son parça HANGİ çağrının düştüğü (`lists` · `tasks`) — ilk üretim
 * hatası yalnız kodu söyledi ve hangi sorgunun reddedildiği tahmin edildi.
 * Dilden bağımsız teknik metin (HTTP kodu gibi), bu yüzden çevrilmiyor.
 */
export function describeFailure(res, where = "") {
  if (!res) return ""
  const head = res.httpStatus ? `HTTP ${res.httpStatus}` : res.error || res.status || ""
  const code = res.httpStatus && res.code ? ` · ${res.code}` : ""
  return `${head}${code}${where ? ` · ${where}` : ""}`
}

export const isPermanent = (res) =>
  res.status === STATUS.error && res.httpStatus && !TRANSIENT_HTTP.has(res.httpStatus)

export function warnFailure(what, res) {
  console.warn(
    `[todo] ${what}: ${describeFailure(res)}`,
    res?.httpStatus && res?.error ? res.error : "",
  )
}

/** `items` üzerinde en çok `limit` iş aynı anda — sıra korunur. */
export async function mapPool(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next
      next += 1
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

/**
 * Bir To Do görevini kartın biçimine çevirir; bugünün odağına girmiyorsa
 * `null`. Giren: açık ve teslimi bugün ya da geçmiş; ya da BUGÜN bitmiş ve
 * teslimi bugün ya da geçmiş (erken bitirilen yarının işi bugünün değil).
 */
export function toFocusTask(task, listId, today) {
  if (!task?.id) return null
  const dueKey = dueDayOf(task.dueDateTime)
  if (!dueKey || dueKey > today) return null
  const done = task.status === "completed"
  if (done && completedDayOf(task.completedDateTime) !== today) return null
  return {
    id: task.id,
    listId,
    title: String(task.title ?? ""),
    done,
    doneOn: done ? today : undefined,
    dueKey,
    overdue: !done && dueKey < today,
    created: task.createdDateTime ?? "",
  }
}

/** Açıklar önce (en eski teslim başta), bitenler sonda. */
function order(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1
  if (a.dueKey !== b.dueKey) return a.dueKey < b.dueKey ? -1 : 1
  return a.created < b.created ? -1 : a.created > b.created ? 1 : 0
}

/**
 * Bir listenin bugüne giren görevleri. Açık görevler süzgeçle; süzgeçli sorgu
 * geçici OLMAYAN bir hatayla reddedilirse (400 · 404 · 501…) bir kez de
 * SÜZGEÇSİZ, `$select`siz ve `$top`suz sorulur — hangisinin reddedildiğini
 * bilmiyoruz, yedek hiçbirini taşımıyor. Bugün bitenlerin sorgusu isteğe
 * bağlı: düşerse liste yine okunmuş sayılır (yalnız "bugün bitti" satırları
 * eksik kalır ve konsola yazılır).
 */
async function readList(instance, account, list) {
  const base = `/me/todo/lists/${enc(list.id)}/tasks`
  let open = await getPages(
    instance,
    account,
    `${base}?$filter=${enc("status ne 'completed'")}&$top=100`,
    OPEN_PAGES,
  )
  if (isPermanent(open)) {
    warnFailure(`"${list.displayName ?? list.id}" süzgeçli sorgu`, open)
    open = await getPages(instance, account, base, FALLBACK_PAGES)
  }
  if (open.status !== STATUS.ready) return { failed: open }

  let done = []
  for (
    let step = completedStep;
    step < COMPLETED_QUERIES.length;
    step = Math.max(step + 1, completedStep)
  ) {
    const res = await graphGet(instance, account, {
      path: `${base}${COMPLETED_QUERIES[step]}`,
      scopes: TODO_SCOPES,
      retry: RETRY,
    })
    if (res.status === STATUS.ready) {
      done = res.data?.value ?? []
      break
    }
    warnFailure(`"${list.displayName ?? list.id}" bugün bitenler`, res)
    // Kalıcı ret (sorgu biçimi) bir alt basamağa iner; geçici hatada bu tur
    // bitenler olmadan devam edilir, basamak korunur.
    if (!isPermanent(res)) break
    // ⚠️ `+= 1` DEĞİL: listeler aynı anda soruluyor ve aynı reddi gören iki
    // liste basamağı iki kez artırıp yedek sorguyu hiç denemeden atlıyordu
    // (ölçüldü: bugün biten iş karttan düştü). Basamak, DENENENİN bir altı.
    completedStep = Math.max(completedStep, step + 1)
  }
  return { listId: list.id, tasks: [...open.data, ...done] }
}

/**
 * Bugünün odağı: bütün listelerde teslimi bugün/geçmiş açık görevler + bugün
 * bitenler. Dönen: `{ status, tasks, defaultListId, skipped, detail }` —
 * `skipped` okunamayan liste sayısı, `detail` hatanın kısa özeti.
 */
export async function fetchFocusTasks(instance, account, today = localDayKey()) {
  // Sorgusuz — belgenin kendi örneği de öyle; liste yükü küçük.
  const lists = await getPages(instance, account, "/me/todo/lists", 2)
  if (lists.status !== STATUS.ready) {
    warnFailure("listeler", lists)
    return { ...lists, detail: describeFailure(lists, "lists") }
  }
  const all = lists.data
  if (all.length > MAX_LISTS) console.warn(`[todo] ${all.length} liste, ilk ${MAX_LISTS}'i okundu`)
  const scan = all.slice(0, MAX_LISTS)
  const defaultListId =
    (all.find((l) => l.wellknownListName === "defaultList") ?? all[0])?.id ?? null

  const results = await mapPool(scan, LIST_CONCURRENCY, (list) => readList(instance, account, list))

  const failures = results.filter((r) => r.failed)
  for (const [i, r] of results.entries()) {
    if (r.failed) warnFailure(`"${scan[i].displayName ?? scan[i].id}" okunamadı`, r.failed)
  }
  // Hepsi düştüyse kısmi bir sonuç yok — hata, ilk düşenin özetiyle. İzin
  // reddi (403) listelerin HEPSİNDE ise o bir izin durumu, hata değil.
  if (scan.length > 0 && failures.length === scan.length) {
    const first =
      failures.find((f) => f.failed.status === STATUS.error)?.failed ?? failures[0].failed
    return { ...first, detail: describeFailure(first, "tasks") }
  }

  const seen = new Set()
  const tasks = []
  for (const r of results) {
    if (r.failed) continue
    for (const task of r.tasks) {
      if (seen.has(task.id)) continue
      seen.add(task.id)
      const focus = toFocusTask(task, r.listId, today)
      if (focus) tasks.push(focus)
    }
  }
  tasks.sort(order)
  return {
    status: STATUS.ready,
    tasks,
    defaultListId,
    skipped: failures.length,
    detail: failures.length ? describeFailure(failures[0].failed, "tasks") : "",
  }
}

/** Varsayılan listeye bugünün tarihiyle yeni görev. `done`: taşınan yerel iş bitmişse. */
export async function createFocusTask(
  instance,
  account,
  { listId, title, today = localDayKey(), done = false },
) {
  const res = await graphPost(instance, account, {
    path: `/me/todo/lists/${enc(listId)}/tasks`,
    scopes: TODO_SCOPES,
    retry: RETRY,
    body: {
      title,
      // Gün, UTC gece yarısı — To Do'nun kendi saklama biçimi (dosya başı).
      dueDateTime: { dateTime: `${today}T00:00:00.0000000`, timeZone: "UTC" },
      ...(done ? { status: "completed" } : {}),
    },
  })
  if (res.status !== STATUS.ready) return res
  return {
    status: STATUS.ready,
    task: toFocusTask(res.data, listId, today) ?? {
      id: res.data?.id,
      listId,
      title,
      done,
      doneOn: done ? today : undefined,
      dueKey: today,
      overdue: false,
      created: res.data?.createdDateTime ?? "",
    },
  }
}

export function setFocusTaskDone(instance, account, { listId, taskId, done }) {
  return graphPatch(instance, account, {
    path: `/me/todo/lists/${enc(listId)}/tasks/${enc(taskId)}`,
    scopes: TODO_SCOPES,
    retry: RETRY,
    body: { status: done ? "completed" : "notStarted" },
  })
}

/**
 * Karttaki × görevi SİLMEZ, teslim tarihini kaldırır: iş To Do'da durur,
 * yalnız bugünün odağından çıkar. Birinin To Do'daki işini bu ekrandan yok
 * etmek geri alınamaz bir iş olurdu.
 */
export function clearFocusTaskDue(instance, account, { listId, taskId }) {
  return graphPatch(instance, account, {
    path: `/me/todo/lists/${enc(listId)}/tasks/${enc(taskId)}`,
    scopes: TODO_SCOPES,
    retry: RETRY,
    body: { dueDateTime: null },
  })
}
