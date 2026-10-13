import {
  STATUS,
  graphDelete,
  graphGet,
  graphPatch,
  graphPost,
  parseGraphDateTime,
} from "@/lib/graph"
import {
  RETRY,
  TODO_SCOPES,
  completedDayOf,
  describeFailure,
  dueDayOf,
  getPages,
  isPermanent,
  mapPool,
  warnFailure,
} from "@/lib/todo"
import { notifyTodoChanged } from "@/lib/todoSync"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  TO-DO SAYFASI — MEKANİZMA (Microsoft To Do'nun tamamı, 2026-09-30)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İstek: *"to-do sayfası yap… tarihleriyle birlikte ne to-do'lar vardı,
 * neleri yaptık, yenileri ekleme, düzenleme, tamamlama… Microsoft To Do'yu
 * core özellikleriyle birlikte burada görüntüleme, analiz etme, sorgulama ve
 * girme işini yapalım."*
 *
 * Akışım'ın "Bugünün odağı" (`lib/todo.js`) yalnız BUGÜNÜ okuyor; bu dosya
 * BÜTÜN tabloyu: listeler, açık görevlerin hepsi ve yakın geçmişin
 * tamamlananları. Kurallar `lib/todo.js`le ORTAK ve oradan import ediliyor —
 * sayfalama (`getPages`), eşzamanlılık havuzu (`mapPool`, en çok 2 liste),
 * yeniden deneme (`RETRY`), gün kuralı (`dueDayOf` / `completedDayOf`). İkinci
 * bir kopya, iki yüzeyin aynı görevi farklı GÜNE koyması demekti.
 *
 * ⚠️ **`$select` YOK, `$expand` YOK.** `$select`i To Do üretimde 400 ile
 * reddetti (`lib/todo.js`, onuncu tur). `$expand=checklistItems` belgede
 * geçiyor ama bu kiracıda DENENMEDİ; "denenmemiş parametre eklenmez" kuralı
 * gereği bağlı kaynaklar (işaretli e-postanın kendisi) yalnız görev AÇILINCA,
 * kendi ucundan okunuyor.
 * ⚠️ **ADIMLAR 2026-10-02'DEN BERİ BASAMAKLI `$expand`LE** (istek: *"to do'ya
 * ait alt adımlar varsa onları görelim, adımları göster ile açıp kapatalım"*).
 * Açık görevlerin sorgusu önce `$expand=checklistItems` ile denenir; KALICI
 * bir retle (400…) oturum boyunca bırakılır (`stepsExpand`) ve sayfa adımları
 * yalnız EKRANDAKİ satırlar için, satır satır sorar (`fetchSteps`,
 * `TodoBoard`un kuyruğu). Basamağın dili `QUERY_VARIANTS`in: yalnız kalıcı
 * ret indirir, geçici hata indirmez. Tamamlanan görevlerin sorgusu
 * genişletmesiz kalır — satırları adım göstermez (bilinçli: "neleri yaptık"
 * sorusu adım istemiyor, ve ikinci bir basamak `doneStep`i karıştırırdı).
 * ⚠️ **CANLI KİRACIDA ÖLÇÜLMEDİ** — sahte sunucu KATI (bilinmeyen parametre 400).
 *
 * ⚠️ **TAMAMLANANLAR BASAMAKLI** (`DONE_QUERIES`): son değişene göre sıralı →
 * sırasız → hiç. `lib/todo.js`in `COMPLETED_QUERIES` deseni, kendi basamağıyla
 * (`doneStep`) — biri öbürünün reddini miras almasın. En alt basamakta sayfa
 * açık görevlerle çalışır ve geçmişin okunamadığını SÖYLER (`doneMissing`).
 *
 * ⚠️ **GEÇMİŞ SINIRLI VE SÖYLENİYOR.** Liste başına en çok 200 tamamlanan
 * (sıralı basamakta en yeniler). Sınıra dayanan liste `truncated`a yazılıyor
 * ve sayfa "yakın geçmiş" dediğini açıkça yazıyor — "neleri yaptık" sorusuna
 * eksik bir cevabı TAM gibi vermek olmasın.
 */

const MAX_LISTS = 25
/** Açık görevler: liste başına en çok 5 × 100. */
const OPEN_PAGES = 5
/** Süzgeçsiz yedek: varsayılan sayfa boyu küçük, sayfa sayısı büyük. */
const FALLBACK_PAGES = 20
const LIST_CONCURRENCY = 2

const enc = encodeURIComponent

/** Tamamlananların basamakları — gerekçe dosya başında. */
const DONE_QUERIES = [
  {
    query: `?$filter=${enc("status eq 'completed'")}&$orderby=${enc("lastModifiedDateTime desc")}&$top=50`,
    pages: 4,
  },
  { query: `?$filter=${enc("status eq 'completed'")}&$top=100`, pages: 2 },
]
const DONE_CAP = 200
let doneStep = 0
/** Açık görev sorgusu adımları da getirebiliyor mu (yukarıdaki basamak). */
let stepsExpand = true

/** Çıkışta — bir sonraki oturum tam sorguyla başlasın. */
export function resetTodoBoardQuery() {
  doneStep = 0
  stepsExpand = true
}

/** `wellknownListName` → sayfanın dili. */
export const LIST_KIND = {
  defaultList: "default",
  flaggedEmails: "flagged",
}

/**
 * Görevin notu DÜZ METİN. To Do notu bazen HTML saklıyor (Outlook'tan gelen
 * işaretli postalar, masaüstü uygulamasının zengin notu). HTML ekrana ham
 * basılmaz ve düzenlenip geri yazılırken biçimi bozulmasın diye kaydederken
 * `text` olarak yazılıyor — kayıt anında HTML'in biçimi düşer, METNİ kalır.
 */
export function bodyText(body) {
  const raw = String(body?.content ?? "")
  if (!raw.trim()) return ""
  if (body?.contentType !== "html") return raw.replace(/\r\n/g, "\n").trim()
  const withBreaks = raw
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, "\n")
  let text
  if (typeof DOMParser !== "undefined") {
    text = new DOMParser().parseFromString(withBreaks, "text/html").body.textContent ?? ""
  } else {
    text = withBreaks
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
  }
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Tekrarın sayfadaki adı: `daily` · `weekdays` · `weekly` · `monthly` · `yearly` · `custom`. */
export function recurrenceKind(recurrence) {
  const p = recurrence?.pattern
  if (!p?.type) return null
  if (p.interval && p.interval !== 1) return "custom"
  if (p.type === "daily") return "daily"
  if (p.type === "weekly") {
    const days = [...(p.daysOfWeek ?? [])].sort().join(",")
    if (days === "friday,monday,thursday,tuesday,wednesday") return "weekdays"
    return (p.daysOfWeek ?? []).length === 1 ? "weekly" : "custom"
  }
  if (p.type === "absoluteMonthly") return "monthly"
  if (p.type === "absoluteYearly") return "yearly"
  return "custom"
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

/**
 * Sayfanın tekrar seçimi → Graph'ın `patternedRecurrence`i. Başlangıç TESLİM
 * GÜNÜ: To Do tekrarı teslim tarihine bağlıyor, teslimsiz tekrar kabul
 * edilmiyor (arayüz bu yüzden tekrarı ancak tarih varken açıyor).
 */
export function recurrenceFor(kind, dueKey) {
  if (!kind || !dueKey) return null
  const [y, m, d] = dueKey.split("-").map(Number)
  const range = { type: "noEnd", startDate: dueKey }
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  switch (kind) {
    case "daily":
      return { pattern: { type: "daily", interval: 1 }, range }
    case "weekdays":
      return {
        pattern: {
          type: "weekly",
          interval: 1,
          daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
          firstDayOfWeek: "monday",
        },
        range,
      }
    case "weekly":
      return {
        pattern: { type: "weekly", interval: 1, daysOfWeek: [weekday], firstDayOfWeek: "monday" },
        range,
      }
    case "monthly":
      return { pattern: { type: "absoluteMonthly", interval: 1, dayOfMonth: d }, range }
    case "yearly":
      return { pattern: { type: "absoluteYearly", interval: 1, dayOfMonth: d, month: m }, range }
    default:
      return null
  }
}

/** Ham To Do görevi → sayfanın görevi. */
export function toBoardTask(raw, listId) {
  if (!raw?.id) return null
  const status = raw.status ?? "notStarted"
  const done = status === "completed"
  const doneAt = done ? parseGraphDateTime(raw.completedDateTime) : null
  return {
    id: raw.id,
    listId,
    title: String(raw.title ?? ""),
    status,
    done,
    importance: raw.importance === "high" ? "high" : raw.importance === "low" ? "low" : "normal",
    dueKey: dueDayOf(raw.dueDateTime),
    doneKey: done ? completedDayOf(raw.completedDateTime) : null,
    doneAt: doneAt ? doneAt.toISOString() : null,
    createdAt: raw.createdDateTime ?? "",
    modifiedAt: raw.lastModifiedDateTime ?? "",
    note: bodyText(raw.body),
    reminderAt: raw.isReminderOn
      ? (parseGraphDateTime(raw.reminderDateTime)?.toISOString() ?? null)
      : null,
    recurrence: recurrenceKind(raw.recurrence),
    rawRecurrence: raw.recurrence ?? null,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    hasAttachments: Boolean(raw.hasAttachments),
    // `undefined` = BİLMİYORUZ (sorgu genişletmesizdi); `[]` = adımı YOK.
    steps: Array.isArray(raw.checklistItems)
      ? sortSteps(raw.checklistItems.map(toStep))
      : undefined,
  }
}

function toBoardList(raw) {
  return {
    id: raw.id,
    name: String(raw.displayName ?? ""),
    kind: LIST_KIND[raw.wellknownListName] ?? "custom",
    isOwner: raw.isOwner !== false,
    isShared: Boolean(raw.isShared),
  }
}

async function readOpen(instance, account, base, label) {
  if (stepsExpand) {
    const withSteps = await getPages(
      instance,
      account,
      `${base}?$filter=${enc("status ne 'completed'")}&$expand=checklistItems&$top=100`,
      OPEN_PAGES,
    )
    if (withSteps.status === STATUS.ready || !isPermanent(withSteps)) return withSteps
    warnFailure(`"${label}" adımlı sorgu`, withSteps)
    stepsExpand = false
  }
  let open = await getPages(
    instance,
    account,
    `${base}?$filter=${enc("status ne 'completed'")}&$top=100`,
    OPEN_PAGES,
  )
  if (isPermanent(open)) {
    warnFailure(`"${label}" süzgeçli sorgu`, open)
    // Süzgeçsiz yedek BÜTÜN görevleri getirir; tamamlananlar da içinde olur
    // ve aşağıda aynı listeye karışır — kimliğe göre tekilleşiyor.
    open = await getPages(instance, account, base, FALLBACK_PAGES)
  }
  return open
}

async function readDone(instance, account, base, label) {
  for (let step = doneStep; step < DONE_QUERIES.length; step = Math.max(step + 1, doneStep)) {
    const { query, pages } = DONE_QUERIES[step]
    const res = await getPages(instance, account, `${base}${query}`, pages)
    if (res.status === STATUS.ready) return { tasks: res.data, missing: false }
    warnFailure(`"${label}" tamamlananlar`, res)
    if (!isPermanent(res)) break
    // ⚠️ `+= 1` DEĞİL — gerekçe `lib/todo.js` (iki liste aynı reddi görüp
    // basamağı iki kez artırıyordu).
    doneStep = Math.max(doneStep, step + 1)
  }
  return { tasks: [], missing: true }
}

async function readList(instance, account, list) {
  const base = `/me/todo/lists/${enc(list.id)}/tasks`
  const label = list.displayName ?? list.id
  const open = await readOpen(instance, account, base, label)
  if (open.status !== STATUS.ready) return { failed: open }
  const done = await readDone(instance, account, base, label)
  return {
    listId: list.id,
    raw: [...open.data, ...done.tasks],
    doneMissing: done.missing,
    truncated: done.tasks.length >= DONE_CAP,
  }
}

/**
 * Bütün tablo. Dönen: `{ status, lists, tasks, defaultListId, skipped,
 * detail, doneMissing, truncated }` — `skipped` okunamayan liste sayısı
 * (kart SÖYLÜYOR), `doneMissing` tamamlananları okunamayan liste var mı.
 */
export async function fetchBoard(instance, account) {
  const listsRes = await getPages(instance, account, "/me/todo/lists", 3)
  if (listsRes.status !== STATUS.ready) {
    warnFailure("listeler", listsRes)
    return { ...listsRes, detail: describeFailure(listsRes, "lists") }
  }
  const all = listsRes.data
  if (all.length > MAX_LISTS) console.warn(`[todo] ${all.length} liste, ilk ${MAX_LISTS}'i okundu`)
  const scan = all.slice(0, MAX_LISTS)
  const lists = scan.map(toBoardList)
  const defaultListId = (lists.find((l) => l.kind === "default") ?? lists[0])?.id ?? null

  const results = await mapPool(scan, LIST_CONCURRENCY, (list) => readList(instance, account, list))
  const failures = results.filter((r) => r.failed)
  if (scan.length > 0 && failures.length === scan.length) {
    const first =
      failures.find((f) => f.failed.status === STATUS.error)?.failed ?? failures[0].failed
    return { ...first, detail: describeFailure(first, "tasks") }
  }

  const seen = new Set()
  const tasks = []
  for (const r of results) {
    if (r.failed) continue
    for (const raw of r.raw) {
      if (seen.has(raw.id)) continue
      seen.add(raw.id)
      const task = toBoardTask(raw, r.listId)
      if (task) tasks.push(task)
    }
  }
  const failedIds = new Set(results.map((r, i) => (r.failed ? scan[i].id : null)).filter(Boolean))
  return {
    status: STATUS.ready,
    lists: lists.map((l) => ({ ...l, unreadable: failedIds.has(l.id) })),
    tasks,
    defaultListId,
    skipped: failures.length,
    detail: failures.length ? describeFailure(failures[0].failed, "tasks") : "",
    doneMissing: results.some((r) => r.doneMissing),
    truncated: results.some((r) => r.truncated),
    // Adımlar sorguyla gelmediyse satırlar onları kendisi sorar.
    stepsInline: stepsExpand,
  }
}

/* ─── Yazma ─────────────────────────────────────────────────────────── */

/** To Do'nun gün biçimi: o günün UTC gece yarısı (gerekçe `lib/todo.js` başı). */
function dueValue(dueKey) {
  return dueKey ? { dateTime: `${dueKey}T00:00:00.0000000`, timeZone: "UTC" } : null
}

/**
 * Sayfanın değişiklik kaydı → Graph gövdesi. Yalnız VERİLEN alanlar yazılır;
 * bir alan için `null` "kaldır" demek.
 *
 * ⚠️ Hatırlatma UTC'ye çevrilip yazılıyor: `dateTimeTimeZone`a tarayıcının
 * IANA adını vermek Graph'ın her ucunda kabul görmüyor (bazıları Windows adı
 * istiyor); UTC her yerde geçerli ve anı değiştirmiyor.
 * ⚠️ Teslim tarihi kalkarsa TEKRAR da kalkar — tekrar teslime bağlı.
 */
export function toGraphPatch(changes, task) {
  const body = {}
  if ("title" in changes) body.title = changes.title
  if ("importance" in changes) body.importance = changes.importance
  if ("done" in changes) body.status = changes.done ? "completed" : "notStarted"
  if ("dueKey" in changes) {
    body.dueDateTime = dueValue(changes.dueKey)
    if (!changes.dueKey && (task?.recurrence || "recurrence" in changes)) body.recurrence = null
  }
  if ("recurrence" in changes) {
    const dueKey = "dueKey" in changes ? changes.dueKey : task?.dueKey
    body.recurrence = changes.recurrence ? recurrenceFor(changes.recurrence, dueKey) : null
  }
  if ("note" in changes) body.body = { content: changes.note ?? "", contentType: "text" }
  if ("reminderAt" in changes) {
    if (changes.reminderAt) {
      body.isReminderOn = true
      body.reminderDateTime = {
        dateTime: new Date(changes.reminderAt).toISOString().replace("Z", ""),
        timeZone: "UTC",
      }
    } else {
      body.isReminderOn = false
      body.reminderDateTime = null
    }
  }
  return body
}

/**
 * Yeni görev. `linked`: işaretli bir postadan geliyorsa `{ webUrl,
 * displayName }` — To Do görevde postaya dönen bağlantıyı gösteriyor.
 */
export async function createBoardTask(
  instance,
  account,
  { listId, title, dueKey, importance, note, linked },
) {
  const body = { title }
  if (importance && importance !== "normal") body.importance = importance
  if (dueKey) body.dueDateTime = dueValue(dueKey)
  if (note) body.body = { content: note, contentType: "text" }
  if (linked?.webUrl) {
    body.linkedResources = [
      {
        webUrl: linked.webUrl,
        applicationName: "Outlook",
        displayName: linked.displayName || title,
      },
    ]
  }
  const res = await graphPost(instance, account, {
    path: `/me/todo/lists/${enc(listId)}/tasks`,
    scopes: TODO_SCOPES,
    retry: RETRY,
    body,
  })
  if (res.status !== STATUS.ready) return res
  return { status: STATUS.ready, task: toBoardTask(res.data, listId) }
}

export async function updateBoardTask(instance, account, { listId, taskId, changes, task }) {
  const res = await graphPatch(instance, account, {
    path: `/me/todo/lists/${enc(listId)}/tasks/${enc(taskId)}`,
    scopes: TODO_SCOPES,
    retry: RETRY,
    body: toGraphPatch(changes, task),
  })
  if (res.status !== STATUS.ready) return res
  // PATCH bazen 204 döner — o hâlde çağıranın iyimser hâli doğru kabul edilir.
  return { status: STATUS.ready, task: res.data ? toBoardTask(res.data, listId) : null }
}

export function deleteBoardTask(instance, account, { listId, taskId }) {
  return graphDelete(instance, account, {
    path: `/me/todo/lists/${enc(listId)}/tasks/${enc(taskId)}`,
    scopes: TODO_SCOPES,
    retry: RETRY,
  })
}

/* ─── Adımlar (checklist) ve bağlı kaynaklar — görev açılınca ─────────── */

const toStep = (s) => ({
  id: s.id,
  title: String(s.displayName ?? ""),
  done: Boolean(s.isChecked),
  createdAt: s.createdDateTime ?? "",
})

function sortSteps(steps) {
  return steps.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
}

export async function fetchSteps(instance, account, { listId, taskId }) {
  const res = await getPages(
    instance,
    account,
    `/me/todo/lists/${enc(listId)}/tasks/${enc(taskId)}/checklistItems`,
    3,
  )
  if (res.status !== STATUS.ready) return res
  const steps = sortSteps(res.data.map(toStep))
  return { status: STATUS.ready, steps }
}

export async function addStep(instance, account, { listId, taskId, title }) {
  const res = await graphPost(instance, account, {
    path: `/me/todo/lists/${enc(listId)}/tasks/${enc(taskId)}/checklistItems`,
    scopes: TODO_SCOPES,
    retry: RETRY,
    body: { displayName: title },
  })
  if (res.status !== STATUS.ready) return res
  return { status: STATUS.ready, step: toStep(res.data) }
}

export function updateStep(instance, account, { listId, taskId, stepId, changes }) {
  const body = {}
  if ("done" in changes) body.isChecked = changes.done
  if ("title" in changes) body.displayName = changes.title
  return graphPatch(instance, account, {
    path: `/me/todo/lists/${enc(listId)}/tasks/${enc(taskId)}/checklistItems/${enc(stepId)}`,
    scopes: TODO_SCOPES,
    retry: RETRY,
    body,
  })
}

export function deleteStep(instance, account, { listId, taskId, stepId }) {
  return graphDelete(instance, account, {
    path: `/me/todo/lists/${enc(listId)}/tasks/${enc(taskId)}/checklistItems/${enc(stepId)}`,
    scopes: TODO_SCOPES,
    retry: RETRY,
  })
}

/**
 * Görevin bağlı kaynakları — işaretli e-posta listesinde postanın kendisi.
 * ⚠️ Yalnız `http(s)` adresi dönüyor: bağlantı `<a href>`e giriyor ve To Do
 * başka uygulamaların kendi şemalarını da (`ms-outlook:`) saklayabiliyor.
 */
export async function fetchLinks(instance, account, { listId, taskId }) {
  const res = await graphGet(instance, account, {
    path: `/me/todo/lists/${enc(listId)}/tasks/${enc(taskId)}/linkedResources`,
    scopes: TODO_SCOPES,
    retry: RETRY,
  })
  if (res.status !== STATUS.ready) return res
  const links = (res.data?.value ?? [])
    .filter((l) => /^https?:\/\//i.test(String(l.webUrl ?? "")))
    .map((l) => ({
      id: l.id,
      url: l.webUrl,
      app: l.applicationName ?? "",
      title: l.displayName ?? "",
    }))
  return { status: STATUS.ready, links }
}

/* ─── Listeler ──────────────────────────────────────────────────────── */

export async function createBoardList(instance, account, { name }) {
  const res = await graphPost(instance, account, {
    path: "/me/todo/lists",
    scopes: TODO_SCOPES,
    retry: RETRY,
    body: { displayName: name },
  })
  if (res.status !== STATUS.ready) return res
  return { status: STATUS.ready, list: toBoardList(res.data) }
}

export function renameBoardList(instance, account, { listId, name }) {
  return graphPatch(instance, account, {
    path: `/me/todo/lists/${enc(listId)}`,
    scopes: TODO_SCOPES,
    retry: RETRY,
    body: { displayName: name },
  })
}

export function deleteBoardList(instance, account, { listId }) {
  return graphDelete(instance, account, {
    path: `/me/todo/lists/${enc(listId)}`,
    scopes: TODO_SCOPES,
    retry: RETRY,
  })
}

/* ─── Postadan göreve (Keşfet › Önemli) ───────────────────────────────── */

/**
 * İşaretli bir postayı To Do görevine çevirir: başlık konu, not gönderen,
 * postaya dönen bağlantı (`linkedResources`) — To Do'nun kendi "e-postayı aç"
 * bağlantısı. Varsayılan listeye, tarihsiz; posta yüksek önemliyse görev de
 * yıldızlı.
 *
 * ⚠️ Liste kimliği her çağrıda sorulur (tek istek): Keşfet To-Do'nun
 * tablosunu yüklemiyor ve yüklememeli — bir düğme için bütün görevleri okumak.
 * ⚠️ Başarıda iki yüzeyin de önbelleği bayat sayılır (`lib/todoSync.js`).
 */
export async function createTaskFromMail(instance, account, { title, note, webUrl, important }) {
  const lists = await getPages(instance, account, "/me/todo/lists", 3)
  if (lists.status !== STATUS.ready) return lists
  const def = lists.data.find((l) => l.wellknownListName === "defaultList") ?? lists.data[0]
  if (!def) return { status: STATUS.error }
  const res = await createBoardTask(instance, account, {
    listId: def.id,
    title,
    importance: important ? "high" : "normal",
    note,
    linked: webUrl ? { webUrl, displayName: title } : null,
  })
  if (res.status === STATUS.ready) notifyTodoChanged("mail")
  // Listenin ADI da döner: Sana özel'in bildirimi "“Görevler” listesine
  // eklendi" diyor ve "To-Do'da gör" bağlantısı o LİSTEYİ açıyor.
  return res.status === STATUS.ready ? { ...res, listName: def.displayName ?? "" } : res
}
