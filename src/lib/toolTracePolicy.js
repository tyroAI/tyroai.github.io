/* ⚠️ tyrotrade burada `traceNumberLocale()` okuyor; tyro'da o modül YOK ve
   sayı dili tarayıcıdan geliyor. Biçimlendirme tek bir ondalık için, yani
   ayıracın "1,2" mi "1.2" mi olduğu; yanlış dil burada okunabilirliği
   bozmaz, olmayan bir modülü import etmek ise derlemeyi bozardı. */
function traceNumberLocale() {
  if (typeof navigator === "undefined") return "tr-TR"
  return navigator.language || "tr-TR"
}

/**
 * ARAÇ İZİ — tek kumanda noktası.
 *
 * Copilot Studio, orkestratörün çağırdığı her aracı `event` aktivitesi
 * olarak YAYINLIYOR: `taskDialogId` (aracın kimliği), `planIdentifier`
 * (çağrının kimliği), `state`, `executionTime`, ayrıca `arguments` ve
 * `observation`. Ölçüldü (2026-09-08, `conversationtranscript` üzerinde
 * `like` filtresiyle): son üç günün kayıtlarında beş işaretin hepsi var.
 *
 * SDK bu aktiviteleri bize zaten veriyor (`copilotStudioClient`in
 * `switch`indeki `default:` dalı her tipi yield ediyor); biz bugüne kadar
 * onları düşürüyorduk, çünkü `activityToChunk` metni/eki olmayan her
 * aktiviteye `null` diyor.
 *
 * ⚠️ `arguments` ve `observation` OKUNMUYOR ve EKRANA KONMUYOR. İçlerinde
 * proje kodu, tutar ve cari adı var; sohbet balonu onların yeri değil.
 * İstenirse saniye sayacıyla aynı kapının (BT zinciri) arkasına konabilir —
 * o zaman burada ikinci bir bayrak açılır, ekranda değil.
 * Tek istisna `botFiles.js`teki BELGE araçları (izin formu): onların gözlemi
 * kişinin kendi belgesidir ve sohbete metin değil indirilebilir dosya olarak
 * konur. Liste orada, adla.
 *
 * ── TEK SATIRLIK GERİ ALMA ────────────────────────────────────────────
 *
 *   enabled: false  →  event'ler yine düşürülür, iz bugünkü gibi yalnız
 *                      ajanın kendi cümlelerini ve saat basamaklarını
 *                      taşır. Başka hiçbir dosyaya dokunmak gerekmez.
 *
 * Kapalıyken de, açıkken de EKSİK VERİ ZARARSIZ: ajan hiç event
 * göndermezse hiçbir adım eklenmez ve ekran bugünküyle birebir aynı kalır.
 * Yani bu özellik "çalışmazsa bozar" değil, "çalışmazsa yok" sınıfında.
 */
export const TOOL_TRACE = {
  /** Ana şalter. */
  enabled: true,
  /**
   * Aracın süresi adın yanında yazılsın mı ("· 1,2 sn").
   *
   * `executionTime`in birimi belgelenmiş değil; okuyucu savunmacı
   * (bkz. `toolStepLabel`) ve çözemediğinde süreyi hiç yazmıyor —
   * anlamı bilinmeyen bir sayı basmaktansa boş bırakmak doğru.
   */
  showDuration: true,
}

/**
 * `taskDialogId` bir ARAÇ KİMLİĞİ, kullanıcı metni değil:
 * "MCP:...MicrosoftDataverseMCPServer:read_query" gibi geliyor. Son iki
 * nokta üst üsteden sonrası aracın kısa adı.
 */
export function shortToolName(id) {
  const raw = String(id || "").trim()
  if (!raw) return ""
  const i = raw.lastIndexOf(":")
  return i >= 0 && i < raw.length - 1 ? raw.slice(i + 1) : raw
}

/**
 * Kısa addan okunabilir etiket.
 *
 * ⚠️ Burada BUGÜN eşleme YOK ve bu bilinçli: gerçek araç kimliklerini
 * canlıda görmeden yazılacak her satır tahmin olurdu. İlk tur çalıştıktan
 * sonra ekranda görünen adlar buraya eklenir. Eşlenmemiş ad HAM basılır —
 * gizlemek, ajanın gerçekten kullandığı bir aracı ekrandan sessizce
 * silmek olurdu.
 */
const TOOL_LABELS = {}

export function toolDisplayName(id) {
  const short = shortToolName(id)
  if (!short) return ""
  if (TOOL_LABELS[short]) return TOOL_LABELS[short]
  // `get_voucher_transactions` → `Get voucher transactions`
  const words = short
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : short
}

/**
 * `executionTime` SAVUNMACI okunur: birimi belgelenmiş değil ve yanlış
 * yorumlanmış bir sayı ("0,0 sn" ya da "1234 sn") izin güvenilirliğini
 * tek başına bitirir. Yalnız iki tanınan şekil kabul edilir — düz
 * milisaniye sayısı ve `hh:mm:ss(.fff)` — gerisinde süre HİÇ yazılmaz.
 */
export function toolDurationSeconds(value) {
  if (value == null) return null
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value / 1000
  }
  const raw = String(value).trim()
  const clock = /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/.exec(raw)
  if (clock) {
    return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3])
  }
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw) / 1000
  return null
}

/**
 * Fold one stream chunk into a message's activity trace.
 *
 * `received` flips on the FIRST activity of any kind: that is the moment the
 * service answered, so it is evidence, not a guess. `steps` holds only the
 * agent's own `informative` lines — Copilot repeats the same one for as long
 * as a step runs, so only a CHANGE is a new step, otherwise a slow lookup
 * would stack twenty identical rows.
 *
 * ⚠️ **BURADA, `ChatScreen`de DEĞİL** (2026-09-19, gün özeti turu). İkinci
 * bir okuyucu çıktı: `warmStart.js` ısıtma turunun izini aynı şekle
 * katlamak zorunda, çünkü o iz sonradan sohbet balonuna basılıyor. İki
 * kopya, zamanla ayrışacak iki iz mantığı demekti — ve ayrışan iki iz,
 * aynı cevabın iki farklı hikâyesini anlatırdı.
 */
export function foldActivityStep(activity, statusText, startedAt) {
  const a = activity ?? { received: false, steps: [], startedAt }
  const status = (statusText || "").trim()
  return {
    ...a,
    received: true,
    steps: status && a.steps[a.steps.length - 1] !== status ? [...a.steps, status] : a.steps,
  }
}

/**
 * ARAÇ ÇAĞRISI TAMPONU.
 *
 * Tek bir araç çağrısı BİRDEN FAZLA event olarak geliyor (başlangıç,
 * argümanlar, gözlem, bitiş) ve alanlar bunlara dağılmış durumda. Referans
 * uygulama da aynısını yapıyor: `planIdentifier`e göre biriktir, yalnız BOŞ
 * OLMAYAN alanları üzerine yaz. Tamponsuz her araç için dört yarım satır
 * çıkardı.
 *
 * İKİ AŞAMA DÖNER ve ayrımı çağıran kullanır:
 *
 *   { kind: "running", label }  → araç ÇALIŞIYOR. Başlığa yazılır, TİK
 *                                 ALMAZ. Bunsuz, ilk araç bitene kadar
 *                                 (sahada 14 sn ölçüldü) ekranda yalnız
 *                                 uydurma saat basamakları duruyordu —
 *                                 oysa asistan o sırada gerçekten bir araç
 *                                 çalıştırıyor ve adını biliyoruz.
 *   { kind: "done", label }     → çağrı BİTTİ. İze tikiyle düşer, süresi
 *                                 varsa adın yanında.
 *
 * ⚠️ Yarım kalan çağrı İZE yazılmaz. Referans uygulama akış bitince
 * bunları da boşaltıyor; biz boşaltmıyoruz, çünkü iz satırı TİK taşıyor ve
 * tamamlanmamış bir çağrıya tik koymak tam da kaçındığımız yalan. Başlıkta
 * görünmesi başka: orada tik değil, dönen glif var.
 */
export function foldToolCall(buffer, tool) {
  const prev = buffer.get(tool.plan) || {}
  const merged = {
    id: tool.id || prev.id,
    state: tool.state ?? prev.state ?? null,
    executionTime: tool.executionTime ?? prev.executionTime ?? null,
    announced: prev.announced === true,
  }
  const name = toolDisplayName(merged.id)
  if (!name) {
    buffer.set(tool.plan, merged)
    return null
  }

  if (!/^(completed|complete|succeeded|success)$/i.test(String(merged.state || ""))) {
    buffer.set(tool.plan, merged)
    // Aynı çağrı için başlığı bir kez kurarız; sonraki ara event'ler aynı
    // metni tekrar tekrar yazdırmaz.
    if (merged.announced) return null
    merged.announced = true
    return { kind: "running", label: name }
  }

  buffer.delete(tool.plan)
  if (!TOOL_TRACE.showDuration) return { kind: "done", label: name }
  const secs = toolDurationSeconds(merged.executionTime)
  if (secs == null) return { kind: "done", label: name }
  // Birim mevcut saniye sayacıyla aynı yazılır (çıplak "s"): ikinci bir
  // birim sözlüğü açmak, aynı ekranda iki farklı saniye yazımı demekti.
  return {
    kind: "done",
    label: `${name} · ${secs.toLocaleString(traceNumberLocale(), { maximumFractionDigits: 1 })}s`,
  }
}

export function toolEventOf(activity) {
  if (activity?.type !== "event" || !activity?.name || activity?.value == null) return null
  let v = activity.value
  if (typeof v === "string") {
    try {
      v = JSON.parse(v)
    } catch {
      return null
    }
  }
  if (!v || typeof v !== "object") return null
  const id = v.taskDialogId
  const plan = v.planIdentifier
  if (!id || !plan) return null
  return {
    id: String(id),
    plan: String(plan),
    state: v.state == null ? null : String(v.state),
    executionTime: v.executionTime ?? null,
  }
}
