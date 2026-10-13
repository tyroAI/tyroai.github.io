/**
 * Botun gönderdiği DOSYALAR: indirme adresi, araç belgeleri, yazdırma.
 *
 * ARAÇ BELGESİ — bir MCP aracının ürettiği belgeyi sohbete taşır.
 * Copilot Studio, MCP aracının döndürdüğü dosyayı sohbete iletmiyor. Asistana
 * belgeyi kod çalıştırma ile dosyaya yazdırmak da tutmadı: izin formunda
 * asistan aracın HTML'ini kopyalamak yerine kendi iki satırlık sayfasını yazdı
 * (sahada görüldü). Ama aracın SONUCU, araç adımı olayının `observation`
 * alanında olduğu gibi geliyor (Copilot Studio dökümünden ölçüldü), yani belge
 * oradan alınır ve asistanın kopyalamasına bağlı kalmaz.
 *
 * Yalnız `DOCUMENT_TOOLS`taki araçların gözlemi okunur; ötekiler eskisi gibi hiç
 * okunmaz (bkz. toolTracePolicy — içlerinde kişisel veri var).
 */
const DOCUMENT_TOOLS = new Set(["get_leave_form", "get_expense_form"])
const HTML_RE = /---HTML BAŞI---\n([\s\S]*?)\n---HTML SONU---/
const NAME_RE = /`([\w.-]+\.html)`/
const HTML_DATA = "data:text/html;charset=utf-8;base64,"

// Botun döndürdüğü dosya attachment'ından indirilebilir bir URL çıkarır.
// Adaptive Card DEĞİL; data: URI ya da http(s) bağlantı olabilir; bazı bot
// kartlarında dosya content içinde (downloadUrl/url) gelir.
export function attachmentDownloadUrl(att) {
  if (att?.contentUrl) return att.contentUrl
  const c = att?.content
  if (c && typeof c === "object") return c.downloadUrl || c.url || null
  return null
}

function observationText(obs) {
  if (!obs || typeof obs !== "object") return ""
  const result = obs.structuredContent?.result
  if (typeof result === "string") return result
  const parts = Array.isArray(obs.content) ? obs.content : []
  return parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("\n")
}

/**
 * Sohbet kaydında saklanan belge sınırı. Araçtan gelen form birkaç KB; daha
 * büyüğü (botun gönderdiği PDF, görsel) depo bütçesini tek başına doldurur.
 */
const SESSION_DOC_MAX_CHARS = 100_000

/**
 * Bu ek sohbet kaydında İÇERİĞİYLE saklanır mı? Yalnız bizim ürettiğimiz küçük
 * HTML belgesi. Saklanmazsa sayfa yenilenince İndir · Yazdır · İmzala
 * düğmeleri kaybolurdu (kayıt data adreslerini atıyor, bkz. chatSession).
 */
export function keepInSession(att) {
  return isPrintableHtml(att) && att.contentUrl.length <= SESSION_DOC_MAX_CHARS
}

/** UTF-8 HTML → base64 data adresi; küçükse sohbet kaydında da yaşar. */
export function htmlDataUrl(html) {
  let bin = ""
  for (const b of new TextEncoder().encode(html)) bin += String.fromCharCode(b)
  return HTML_DATA + btoa(bin)
}

/**
 * Araç adımı olayından belge eki: `{ contentType, name, contentUrl }` ya da null.
 * Olay değeri JSON metni olarak da gelebiliyor (bkz. toolEventOf).
 */
export function toolDocumentOf(activity) {
  if (activity?.type !== "event" || activity?.value == null) return null
  let v = activity.value
  if (typeof v === "string") {
    try {
      v = JSON.parse(v)
    } catch {
      return null
    }
  }
  const tool = String(v?.taskDialogId || "")
    .split(":")
    .pop()
  if (!DOCUMENT_TOOLS.has(tool)) return null
  const text = observationText(v.observation)
  const html = text.match(HTML_RE)?.[1]
  if (!html) return null
  const name = text.match(NAME_RE)?.[1] || `${tool}.html`
  return { contentType: "text/html", name, contentUrl: htmlDataUrl(html) }
}

/** Yalnız bizim ürettiğimiz HTML yazdırılır (içeriği elimizde olan). */
export function isPrintableHtml(att) {
  return typeof att?.contentUrl === "string" && att.contentUrl.startsWith(HTML_DATA)
}

export function htmlOf(att) {
  const bin = atob(att.contentUrl.slice(HTML_DATA.length))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/**
 * Belgeyi görünmez bir çerçevede açıp yazdırma penceresini açar.
 *
 * ⚠️ Çerçeve `allow-scripts` TAŞIMAZ: belge uygulamanın kendi kökeninde
 * açılıyor ve içindeki betik (formun kendi Yazdır düğmesi dahil) oturuma
 * erişebilirdi. Yazdırmayı çerçevenin içi değil bu sayfa çağırır —
 * `allow-same-origin` buna izin verir, `allow-modals` da yazdırma penceresine.
 */
export function printHtmlAttachment(att) {
  const frame = document.createElement("iframe")
  frame.setAttribute("sandbox", "allow-same-origin allow-modals")
  frame.setAttribute("aria-hidden", "true")
  frame.tabIndex = -1
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0"
  frame.onload = () => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    setTimeout(() => frame.remove(), 60_000)
  }
  frame.srcdoc = htmlOf(att)
  document.body.appendChild(frame)
}
