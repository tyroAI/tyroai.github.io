/**
 * Tek bir JPEG'i tek sayfalık bir PDF'e koyar — kütüphanesiz.
 *
 * Form ekranda tarayıcının kendi çizimiyle görüntüye çevriliyor (bkz.
 * `renderFormPdf.js`); PDF yalnız o görüntünün zarfı. Bir PDF kütüphanesi
 * metni yeniden dizmek için Türkçe yazı tipi gömmek isterdi ve formun ikinci
 * bir çizimi olurdu. JPEG, PDF'in kendi DCT süzgeciyle olduğu gibi gömülür.
 *
 * Sayfa varsayılanı A4 yatay ve 12 mm kenar payı: formun `@page` kuralı.
 */
const MM = 72 / 25.4
export const A4_LANDSCAPE = { width: 297 * MM, height: 210 * MM, margin: 12 * MM }

const n = (v) => Number(v.toFixed(2)).toString()

/** PDF metin dizesi: UTF-16BE onaltılı, Türkçe karakterler bozulmasın. */
export function pdfTextString(text) {
  let hex = "FEFF"
  for (const ch of String(text)) {
    const code = ch.codePointAt(0)
    const units =
      code > 0xffff
        ? [0xd800 + ((code - 0x10000) >> 10), 0xdc00 + ((code - 0x10000) & 0x3ff)]
        : [code]
    for (const u of units) hex += u.toString(16).toUpperCase().padStart(4, "0")
  }
  return `<${hex}>`
}

/** Görüntünün sayfadaki yeri: kenar payı içinde oranı korunur, üste yaslanır. */
export function placeImage(widthPx, heightPx, page = A4_LANDSCAPE) {
  const availW = page.width - 2 * page.margin
  const availH = page.height - 2 * page.margin
  const scale = Math.min(availW / widthPx, availH / heightPx)
  const w = widthPx * scale
  const h = heightPx * scale
  return { x: page.margin + (availW - w) / 2, y: page.height - page.margin - h, w, h }
}

/**
 * @param {Uint8Array} jpeg  JPEG baytları
 * @param {{width:number,height:number,title?:string,page?:object}} opts  piksel boyutu
 * @returns {Uint8Array} PDF baytları
 */
export function jpegToPdf(jpeg, { width, height, title = "", page = A4_LANDSCAPE }) {
  const enc = new TextEncoder()
  const parts = []
  const offsets = []
  let length = 0
  const push = (chunk) => {
    const bytes = typeof chunk === "string" ? enc.encode(chunk) : chunk
    parts.push(bytes)
    length += bytes.length
  }
  const obj = (id, body) => {
    offsets[id] = length
    push(`${id} 0 obj\n${body}\nendobj\n`)
  }

  const box = placeImage(width, height, page)
  const draw = `q ${n(box.w)} 0 0 ${n(box.h)} ${n(box.x)} ${n(box.y)} cm /Im0 Do Q`

  // İkinci satırdaki 127 üstü baytlar okuyuculara "bu dosya ikili" der.
  push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]))
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>")
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
  obj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(page.width)} ${n(page.height)}] ` +
      "/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
  )
  offsets[4] = length
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  )
  push(jpeg)
  push("\nendstream\nendobj\n")
  obj(5, `<< /Length ${enc.encode(draw).length} >>\nstream\n${draw}\nendstream`)
  obj(6, `<< /Title ${pdfTextString(title)} /Producer (TYRO) >>`)

  const xrefAt = length
  const rows = offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
  push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n${rows.join("")}`)
  push(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`,
  )

  const out = new Uint8Array(length)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}
