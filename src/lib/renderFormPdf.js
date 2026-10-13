import { jpegToPdf } from "@/lib/imagePdf"
import { pdfReadyHtml } from "@/lib/signedForm"

/**
 * Formun HTML'ini PDF'e çevirir: görünmez bir çerçevede açar, `html2canvas-pro`
 * ile görüntüye çizer, görüntüyü tek sayfalık PDF'e koyar.
 *
 * Neden görüntü: formun tek çizimi HR MCP'nin HTML'i. PDF'i ayrıca dizmek
 * ikinci bir şablon demekti ve Türkçe yazı tipi gömmek gerekirdi. Bedeli,
 * PDF'teki metnin seçilememesi; imzalı bir form için kabul edilebilir.
 *
 * Neden `html2canvas-pro`, SVG `foreignObject` değil: Safari, foreignObject
 * içeren bir görüntüyü tuvale çizince tuvali "kirli" sayıyor ve görüntü
 * dışarı alınamıyor (iPad/iPhone'da gönderim hiç çalışmazdı).
 *
 * Çerçevede betik ÇALIŞMAZ, ama bunu `sandbox` değil CSP sağlar
 * (`script-src 'none'`): `html2canvas-pro` formu çerçevenin İÇİNDE ikinci bir
 * çerçeveye kopyalayıp onun `load` olayını bekliyor. Betiksiz bir `sandbox`
 * içinde WebKit (iPad/iPhone'daki her tarayıcı ve Safari) o olayı hiç
 * iletmiyor ve gönderim 60 sn sonra "Cloned iframe did not fire its load
 * event" ile düşüyordu; Chrome/Edge'de görünmüyordu. CSP aynı korumayı
 * olayları kesmeden veriyor (WebKit ve Edge'de ölçüldü).
 */
const FRAME_WIDTH = 1100 // .sheet 273 mm ≈ 1032 px; kırpılmasın
const SCALE = 2 // ≈ 190 dpi: yazdırmaya yeter, ek 3 MB sınırının çok altında
const JPEG_QUALITY = 0.9
const NO_SCRIPT_CSP = `<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; base-uri 'none'">`

/** CSP etiketi belgenin EN BAŞINA: kendisinden önceki betikleri durduramaz. */
function withoutScripts(html) {
  return /<head(\s[^>]*)?>/i.test(html)
    ? html.replace(/<head(\s[^>]*)?>/i, (m) => m + NO_SCRIPT_CSP)
    : NO_SCRIPT_CSP + html
}

function loadFrame(html) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe")
    frame.setAttribute("aria-hidden", "true")
    frame.tabIndex = -1
    frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${FRAME_WIDTH}px;height:900px;border:0`
    const timer = setTimeout(() => {
      frame.remove()
      reject(new Error("frame-timeout"))
    }, 15_000)
    frame.onload = () => {
      clearTimeout(timer)
      resolve(frame)
    }
    frame.srcdoc = html
    document.body.appendChild(frame)
  })
}

function canvasToJpeg(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? blob.arrayBuffer().then((b) => resolve(new Uint8Array(b)), reject)
          : reject(new Error("jpeg")),
      "image/jpeg",
      JPEG_QUALITY,
    )
  })
}

/** @returns {Promise<Uint8Array>} PDF baytları */
export async function renderFormPdf(html, { title = "" } = {}) {
  const [{ default: html2canvas }, frame] = await Promise.all([
    import("html2canvas-pro"),
    loadFrame(withoutScripts(pdfReadyHtml(html))),
  ])
  try {
    const doc = frame.contentDocument
    await doc.fonts?.ready
    const sheet = doc.querySelector(".sheet") ?? doc.body
    const canvas = await html2canvas(sheet, {
      scale: SCALE,
      backgroundColor: "#ffffff",
      logging: false,
    })
    const jpeg = await canvasToJpeg(canvas)
    return jpegToPdf(jpeg, { width: canvas.width, height: canvas.height, title })
  } finally {
    frame.remove()
  }
}
