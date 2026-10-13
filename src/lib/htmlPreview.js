/**
 * ═══════════════════════════════════════════════════════════════════════
 *  HTML DOSYASININ ÖNİZLEMESİ — kilitli bir çerçevenin belgesi (2026-10-02)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Sahada: *"html önizleme açmıyor Dosyalarım'da"*. HTML "önizlemesi anlamsız
 * tür" listesindeydi (`EXTERNAL_EXTS`) ve satır yeni sekmede SharePoint'i
 * açıyordu — SharePoint de modern sitelerde çıplak HTML'i İNDİRME olarak
 * sunuyor (betik güvenliği). Office'in görüntüleyicisi (`/preview`) HTML'i
 * çizmiyor. Yani dosya hiçbir yerde GÖRÜNMÜYORDU.
 *
 * Çare: dosyanın kendisi Graph'ın kısa ömürlü indirme adresinden okunur
 * (`useDriveHtml`) ve `srcDoc` ile bir çerçeveye konur. İki kip:
 *
 * | kip | `sandbox` | betik | ağ |
 * |---|---|---|---|
 * | GÜVENLİ (varsayılan) | `allow-popups…` | YOK | yalnız görsel/stil/yazı tipi (https) |
 * | ETKİLEŞİMLİ (kullanıcı açar) | + `allow-scripts` | var | + betik ve `fetch` (https) |
 *
 * ⚠️ **İKİ KİPTE DE `allow-same-origin` YOK** ve bu pazarlık konusu değil:
 * çerçevenin kökeni OPAK, yani betik çalışsa bile uygulamanın çerezine,
 * `localStorage`ına (MSAL belirteçleri orada), DOM'una ulaşamaz. Bedeli:
 * `localStorage` kullanan bir sayfa etkileşimli kipte SecurityError alabilir.
 * Form gönderimi, üst pencereyi yönlendirme ve açılır uyarılar da kapalı.
 * ⚠️ Bağlantılar YENİ SEKMEDE (`<base target="_blank">` + `allow-popups`).
 * ⚠️ Göreli adresler (`./stil.css`, yanındaki görsel) ÇÖZÜLMEZ — dosyanın
 * klasörüne kimlikli erişim yok. Bilinen sınır.
 */

const SAFE_CSP = [
  "default-src 'none'",
  "img-src data: blob: https:",
  "media-src data: blob: https:",
  "style-src 'unsafe-inline' https:",
  "font-src data: https:",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ")

const LIVE_CSP = [
  SAFE_CSP,
  "script-src 'unsafe-inline' 'unsafe-eval' https: blob: data:",
  "connect-src https: blob: data:",
  "worker-src blob:",
  "frame-src https:",
].join("; ")

export const HTML_SANDBOX = {
  safe: "allow-popups allow-popups-to-escape-sandbox",
  live: "allow-scripts allow-popups allow-popups-to-escape-sandbox",
}

export const HTML_EXTS = new Set(["html", "htm", "xhtml"])

/**
 * Bu oturumda "etkileşimli aç"ılan dosyalar (yalnız sürücü+öğe kimliği):
 * aynı dosyayı yeniden açan kişiye aynı soruyu tekrar sordurmayalım.
 * Bellekte; çıkışta düşer (`clearPreviewCache`).
 */
export const liveHtmlItems = new Set()

/**
 * Çerçevenin belgesi: dosyanın HTML'i + başına güvenlik politikası.
 * ⚠️ Politika `<head>`in İLK çocuğu olmak ZORUNDA — ondan önce gelen bir betik
 * ya da stil politikadan kaçardı. `<!doctype>`ın ÖNÜNE yazılmaz: belge tuhaf
 * kipe (quirks) düşer ve düzen bozulur.
 */
export function htmlPreviewDoc(html, { scripts = false } = {}) {
  const src = String(html ?? "")
  const csp = scripts ? LIVE_CSP : SAFE_CSP
  const inject = `<meta http-equiv="Content-Security-Policy" content="${csp}"><base target="_blank">`
  const head = /<head\b[^>]*>/i.exec(src)
  if (head)
    return (
      src.slice(0, head.index + head[0].length) + inject + src.slice(head.index + head[0].length)
    )
  const root = /<html\b[^>]*>/i.exec(src)
  if (root)
    return (
      src.slice(0, root.index + root[0].length) +
      `<head>${inject}</head>` +
      src.slice(root.index + root[0].length)
    )
  const doctype = /<!doctype[^>]*>/i.exec(src)
  if (doctype)
    return (
      src.slice(0, doctype.index + doctype[0].length) +
      inject +
      src.slice(doctype.index + doctype[0].length)
    )
  return inject + src
}

/**
 * Güvenli kipte boş görünecek mi? Betiği olan ama betikler ve stiller
 * söküldüğünde neredeyse hiç metni kalmayan sayfa (React/Vue paketi, grafik
 * panosu) — çağıran bunu "etkileşimli aç" ipucuyla söyler, kendisi AÇMAZ.
 */
export function needsScripts(html) {
  const src = String(html ?? "")
  if (!/<script[\s>]/i.test(src)) return false
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(src)?.[1] ?? src
  const text = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, "")
  return text.length < 40
}

/**
 * Baytları metne çevirir. Sıra: BOM → yanıtın `charset`i → belgenin kendi
 * `<meta charset>`i → UTF-8. Eski Türkçe raporlar sıkça `windows-1254` ile
 * kaydedilmiş; sabit UTF-8 "Ş" yerine "�" basardı.
 */
export function decodeHtml(buffer, contentType = "") {
  const bytes = new Uint8Array(buffer)
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    return new TextDecoder("utf-8").decode(bytes)
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes)
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes)
  const fromHeader = /charset=["']?([\w-]+)/i.exec(contentType)?.[1]
  const sniff = new TextDecoder("utf-8").decode(bytes.slice(0, 2048))
  const fromMeta = /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i.exec(sniff)?.[1]
  for (const label of [fromHeader, fromMeta, "utf-8"]) {
    if (!label) continue
    try {
      return new TextDecoder(label).decode(bytes)
    } catch {
      // Tanınmayan etiket — sıradakine geç.
    }
  }
  return new TextDecoder("utf-8").decode(bytes)
}
