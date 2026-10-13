// Demo dosyalarının GÖRÜNTÜSÜ: küçük resim (SVG `data:`), önizleme sayfasının
// adresi (aynı köken `public/demo/preview.html`) ve indirilebilir gerçek dosya
// (xlsx · docx · pdf · csv · txt · png · zip — paketsiz, elle kuruluyor).
// Hiçbir dış adrese gidilmez.

import { plainTextOf } from "./files-content"

/* ─────────────────────────── biçim ─────────────────────────── */

const nf = new Intl.NumberFormat("tr-TR")
const pf = new Intl.NumberFormat("tr-TR", { style: "percent", maximumFractionDigits: 1 })

export function formatCell(v, fmt) {
  if (v === "" || v == null) return ""
  if (typeof v !== "number") return String(v)
  if (fmt === "money") return `${nf.format(v)} ₺`
  if (fmt === "pct") return pf.format(v)
  return nf.format(v)
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const FONT = "Segoe UI, Inter, Arial, sans-serif"

/** Metni yaklaşık karakter genişliğiyle satırlara böler. */
function wrap(text, max) {
  const words = String(text ?? "").split(/\s+/)
  const lines = []
  let line = ""
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      if (line) lines.push(line)
      line = w
    } else line = `${line} ${w}`.trim()
  }
  if (line) lines.push(line)
  return lines
}

const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/* ─────────────────────────── görsel sanatı ─────────────────────────── */

export function artSvg(art, w = 1200, h = 800) {
  if (art === "dashboard") {
    const bars = [62, 74, 58, 81, 90, 77, 96, 88, 104, 99, 112, 121]
    const barSvg = bars
      .map(
        (v, i) =>
          `<rect x="${92 + i * 46}" y="${560 - v * 2.4}" width="28" height="${v * 2.4}" rx="5" fill="${i === 11 ? "#4f46e5" : "#a5b4fc"}"/>`,
      )
      .join("")
    const rows = [
      ["Altay Perakende", "Teklif", "4.200.000 ₺", "%60"],
      ["Nordis Lojistik", "Sözleşme", "3.150.000 ₺", "%85"],
      ["Ekinoks Enerji", "Çözüm tasarımı", "2.480.000 ₺", "%40"],
      ["Pera Otelcilik", "Müzakere", "1.320.000 ₺", "%70"],
    ]
      .map((r, i) => {
        const y = 352 + i * 50
        return `<g font-size="15" fill="#334155"><text x="762" y="${y}">${esc(r[0])}</text><text x="925" y="${y}" fill="#64748b">${esc(r[1])}</text><text x="1120" y="${y}" text-anchor="end" font-weight="600">${esc(r[2])}</text></g><line x1="762" x2="1120" y1="${y + 18}" y2="${y + 18}" stroke="#e2e8f0"/>`
      })
      .join("")
    const kpis = [
      ["Aylık ciro", "4,82 M₺", "+7,1%"],
      ["Açık fırsat", "93", "+5"],
      ["Kazanma oranı", "%31", "+2 puan"],
      ["Ort. satış döngüsü", "41 gün", "-3 gün"],
    ]
      .map(
        (k, i) =>
          `<g transform="translate(${60 + i * 275} 118)"><rect width="255" height="112" rx="16" fill="#fff" stroke="#e2e8f0"/><text x="22" y="38" font-size="15" fill="#64748b">${esc(k[0])}</text><text x="22" y="80" font-size="30" font-weight="700" fill="#0f172a">${esc(k[1])}</text><text x="233" y="80" font-size="15" fill="#16a34a" text-anchor="end">${esc(k[2])}</text></g>`,
      )
      .join("")
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1200 800" font-family="${FONT}"><rect width="1200" height="800" fill="#f1f5f9"/><rect width="1200" height="74" fill="#1e1b4b"/><circle cx="46" cy="37" r="14" fill="#818cf8"/><text x="72" y="45" font-size="22" font-weight="700" fill="#fff">Vega CRM</text><text x="1140" y="45" font-size="16" fill="#c7d2fe" text-anchor="end">Satış Paneli · Marmara</text>${kpis}<rect x="60" y="256" width="660" height="490" rx="16" fill="#fff" stroke="#e2e8f0"/><text x="88" y="300" font-size="18" font-weight="600" fill="#0f172a">Aylık ciro (son 12 ay)</text>${barSvg}<line x1="80" x2="700" y1="560" y2="560" stroke="#cbd5e1"/><rect x="740" y="256" width="400" height="490" rx="16" fill="#fff" stroke="#e2e8f0"/><text x="762" y="300" font-size="18" font-weight="600" fill="#0f172a">Öncelikli fırsatlar</text>${rows}</svg>`
  }
  if (art === "stand") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1200 800" font-family="${FONT}"><defs><linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2e8f0"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient><linearGradient id="wl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#312e81"/><stop offset="1" stop-color="#0e7490"/></linearGradient></defs><rect width="1200" height="800" fill="#f8fafc"/><polygon points="120,620 1080,620 1180,780 20,780" fill="url(#fl)"/><rect x="160" y="120" width="880" height="500" fill="url(#wl)"/><rect x="160" y="120" width="880" height="86" fill="#1e1b4b"/><text x="600" y="178" text-anchor="middle" font-size="44" font-weight="800" fill="#fff" letter-spacing="8">VEGA GLOBAL</text><rect x="230" y="250" width="330" height="190" rx="10" fill="#0f172a"/><rect x="246" y="266" width="298" height="158" rx="4" fill="#4f46e5"/><text x="395" y="335" text-anchor="middle" font-size="24" font-weight="700" fill="#fff">Vega Insight</text><text x="395" y="370" text-anchor="middle" font-size="16" fill="#c7d2fe">Tüm şubeler tek panoda</text><rect x="640" y="250" width="330" height="190" rx="10" fill="#0f172a"/><rect x="656" y="266" width="298" height="158" rx="4" fill="#0891b2"/><text x="805" y="335" text-anchor="middle" font-size="24" font-weight="700" fill="#fff">Vega Track</text><text x="805" y="370" text-anchor="middle" font-size="16" fill="#cffafe">Filo ve saha yönetimi</text><rect x="420" y="500" width="360" height="120" rx="14" fill="#f8fafc"/><text x="600" y="570" text-anchor="middle" font-size="22" font-weight="600" fill="#312e81">Karşılama &amp; Demo</text><rect x="190" y="540" width="140" height="80" rx="10" fill="#e0e7ff"/><rect x="870" y="540" width="140" height="80" rx="10" fill="#e0e7ff"/><text x="600" y="740" text-anchor="middle" font-size="20" fill="#475569">Perakende Teknolojileri Fuarı 2026 · Stand B-14 · 6×4 m</text></svg>`
  }
  // campaign (varsayılan)
  const flakes = Array.from({ length: 26 }, (_, i) => {
    const x = (i * 173) % 1200
    const y = (i * 97) % 800
    const r = 3 + (i % 4) * 2
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.25 + (i % 5) * 0.12}"/>`
  }).join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1200 800" font-family="${FONT}"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="0.55" stop-color="#4338ca"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="1200" height="800" fill="url(#bg)"/>${flakes}<text x="90" y="170" font-size="26" fill="#c7d2fe" letter-spacing="6">VEGA GLOBAL · KIŞ 2026</text><text x="90" y="290" font-size="86" font-weight="800" fill="#fff">Kış Kampanyası</text><text x="90" y="370" font-size="34" fill="#e0e7ff">Tüm şubelerinizi tek panodan yönetin.</text><rect x="90" y="440" width="420" height="120" rx="24" fill="#fff"/><text x="300" y="518" text-anchor="middle" font-size="44" font-weight="800" fill="#4338ca">%20'ye varan</text><text x="90" y="640" font-size="26" fill="#c7d2fe">Vega Insight Analitik · 31 Aralık'a kadar geçerli</text><circle cx="960" cy="420" r="210" fill="#fff" opacity="0.08"/><circle cx="960" cy="420" r="140" fill="#fff" opacity="0.1"/><text x="960" y="440" text-anchor="middle" font-size="64" font-weight="800" fill="#fff">VEGA</text></svg>`
}

/* ─────────────────────────── küçük resim ─────────────────────────── */

function docThumb(content, w = 600, h = 776) {
  const out = []
  let y = 64
  const line = (text, size, weight = 400, fill = "#334155", x = 56) => {
    out.push(
      `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(text)}</text>`,
    )
  }
  for (const b of content.blocks) {
    if (y > h - 40) break
    const [kind, a, rows] = b
    if (kind === "kicker") {
      line(a, 11, 600, "#6366f1")
      y += 26
    } else if (kind === "h1") {
      for (const l of wrap(a, 34)) {
        line(l, 24, 700, "#0f172a")
        y += 30
      }
      y += 8
    } else if (kind === "h2") {
      y += 8
      line(a, 15, 700, "#1e293b")
      y += 24
    } else if (kind === "p" || kind === "note") {
      for (const l of wrap(a, 78).slice(0, 4)) {
        line(l, 11.5, 400, kind === "note" ? "#92400e" : "#475569")
        y += 17
      }
      y += 8
    } else if (kind === "ul" || kind === "ol") {
      a.slice(0, 5).forEach((it, i) => {
        line(`${kind === "ol" ? `${i + 1}.` : "•"} ${wrap(it, 70)[0]}`, 11.5, 400, "#475569", 70)
        y += 18
      })
      y += 8
    } else if (kind === "meta") {
      for (const [k, v] of a) {
        line(`${k}: ${v}`, 11.5, 400, "#64748b")
        y += 17
      }
      y += 10
    } else if (kind === "table") {
      const cols = a.length
      const cw = (w - 112) / cols
      const all = [a, ...rows].slice(0, 8)
      all.forEach((r, ri) => {
        if (ri === 0)
          out.push(`<rect x="56" y="${y - 14}" width="${w - 112}" height="22" fill="#eef2ff"/>`)
        r.forEach((c, ci) =>
          out.push(
            `<text x="${60 + ci * cw}" y="${y + 1}" font-size="10.5" font-weight="${ri === 0 ? 700 : 400}" fill="#334155">${esc(String(c).slice(0, Math.floor(cw / 6.5)))}</text>`,
          ),
        )
        out.push(`<line x1="56" x2="${w - 56}" y1="${y + 8}" y2="${y + 8}" stroke="#e2e8f0"/>`)
        y += 22
      })
      y += 12
    } else if (kind === "sign") {
      y += 30
      a.forEach((n, i) => {
        out.push(
          `<line x1="${56 + i * 260}" x2="${256 + i * 260}" y1="${y}" y2="${y}" stroke="#94a3b8"/>`,
        )
        out.push(
          `<text x="${56 + i * 260}" y="${y + 18}" font-size="11" fill="#475569">${esc(n)}</text>`,
        )
      })
      y += 40
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}"><rect width="${w}" height="${h}" fill="#fff"/>${content.pdf ? `<rect width="${w}" height="6" fill="#dc2626"/>` : ""}${out.join("")}</svg>`
}

function sheetThumb(content, w = 800, h = 520) {
  const s = content.sheets[0]
  const cols = Math.min(s.cols.length, 7)
  const rowH = 30
  const widths = s.cols
    .slice(0, cols)
    .map((c, i) => (i === 0 ? 170 : (w - 46 - 170) / Math.max(1, cols - 1)))
  const xs = widths.reduce((acc, cw, i) => [...acc, (acc[i] ?? 46) + cw], [46])
  const out = [
    `<rect width="${w}" height="${h}" fill="#fff"/>`,
    `<rect width="${w}" height="26" fill="#f3f4f6"/>`,
    `<rect width="46" height="${h}" fill="#f3f4f6"/>`,
  ]
  for (let i = 0; i < cols; i += 1)
    out.push(
      `<text x="${xs[i] + widths[i] / 2}" y="18" font-size="12" fill="#6b7280" text-anchor="middle">${String.fromCharCode(65 + i)}</text>`,
    )
  const rows = [s.cols, ...s.rows, ...(s.total ? [s.total] : [])]
  rows.slice(0, Math.floor((h - 26) / rowH)).forEach((r, ri) => {
    const y = 26 + ri * rowH
    out.push(
      `<text x="23" y="${y + 20}" font-size="12" fill="#6b7280" text-anchor="middle">${ri + 1}</text>`,
    )
    if (ri === 0)
      out.push(`<rect x="46" y="${y}" width="${w - 46}" height="${rowH}" fill="#e7f3ec"/>`)
    const isTotal = s.total && ri === rows.length - 1
    if (isTotal)
      out.push(`<rect x="46" y="${y}" width="${w - 46}" height="${rowH}" fill="#f8fafc"/>`)
    for (let ci = 0; ci < cols; ci += 1) {
      const v = r[ci]
      const txt = ri === 0 ? String(v) : formatCell(v, s.fmt?.[ci])
      const num = ri > 0 && typeof v === "number"
      const neg = num && v < 0
      out.push(
        `<text x="${num ? xs[ci] + widths[ci] - 8 : xs[ci] + 8}" y="${y + 20}" font-size="12.5" text-anchor="${num ? "end" : "start"}" font-weight="${ri === 0 || isTotal ? 700 : 400}" fill="${neg ? "#dc2626" : ri === 0 ? "#14532d" : "#1f2937"}">${esc(txt.slice(0, Math.floor(widths[ci] / 7.4)))}</text>`,
      )
    }
  })
  for (let i = 0; i <= cols; i += 1)
    out.push(`<line x1="${xs[i]}" x2="${xs[i]}" y1="0" y2="${h}" stroke="#e5e7eb"/>`)
  for (let ri = 0; ri <= Math.floor(h / rowH); ri += 1)
    out.push(
      `<line x1="0" x2="${w}" y1="${26 + ri * rowH}" y2="${26 + ri * rowH}" stroke="#e5e7eb"/>`,
    )
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">${out.join("")}</svg>`
}

function slideThumb(content, w = 800, h = 450) {
  const s = content.slides[0]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 800 450" font-family="${FONT}"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#4338ca"/></linearGradient></defs><rect width="800" height="450" fill="url(#sg)"/><circle cx="690" cy="90" r="160" fill="#fff" opacity="0.06"/><circle cx="720" cy="380" r="120" fill="#22d3ee" opacity="0.12"/><text x="60" y="80" font-size="15" letter-spacing="4" fill="#a5b4fc">VEGA GLOBAL</text>${wrap(
    s.title,
    28,
  )
    .map(
      (l, i) =>
        `<text x="60" y="${200 + i * 52}" font-size="44" font-weight="800" fill="#fff">${esc(l)}</text>`,
    )
    .join(
      "",
    )}<rect x="60" y="${232 + (wrap(s.title, 28).length - 1) * 52}" width="80" height="5" rx="2" fill="#22d3ee"/><text x="60" y="${286 + (wrap(s.title, 28).length - 1) * 52}" font-size="19" fill="#c7d2fe">${esc(s.sub ?? "")}</text></svg>`
}

function textThumb(content, w = 600, h = 776) {
  const lines = String(content.text).split("\n").slice(0, 34)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#fff"/>${lines
    .map(
      (l, i) =>
        `<text x="40" y="${56 + i * 20}" font-size="13" font-family="Consolas, monospace" fill="#334155">${esc(l)}</text>`,
    )
    .join("")}</svg>`
}

/** Küçük resmin SVG'si; küçük resmi olmayan tür için `null`. */
export function thumbSvg(content) {
  if (!content) return null
  if (content.type === "doc") return docThumb(content)
  if (content.type === "sheet") return sheetThumb(content)
  if (content.type === "slides") return slideThumb(content)
  if (content.type === "image") return artSvg(content.art)
  if (content.type === "text") return textThumb(content)
  return null
}

const SIZES = {
  doc: [600, 776],
  text: [600, 776],
  sheet: [800, 520],
  slides: [800, 450],
  image: [1200, 800],
}

/** Graph `thumbnailSet` biçimi — üç boy, aynı görsel. */
export function thumbnailSet(content) {
  const svg = thumbSvg(content)
  if (!svg) return null
  const url = svgUrl(svg)
  const [w, h] = SIZES[content.type] ?? [800, 600]
  const at = (k) => ({ url, width: Math.round(w * k), height: Math.round(h * k) })
  return { id: "0", small: at(0.12), medium: at(0.33), large: at(1) }
}

/* ─────────────────────────── önizleme sayfası ─────────────────────────── */

function b64url(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ""
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")
}

const base = () => {
  const b = import.meta.env.BASE_URL || "/"
  return `${window.location.origin}${b.endsWith("/") ? b : `${b}/`}`
}

/**
 * Aynı kökenli önizleme sayfasının adresi. İçerik adresin `#` parçasında
 * taşınır (sunucuya hiç gitmez): sayfa statik, veri bu tariften.
 */
export function previewPageUrl(payload) {
  return `${base()}demo/preview.html#d=${b64url(JSON.stringify(payload))}`
}

export function filePreviewPayload(node, content, meta) {
  return {
    v: 1,
    kind: "file",
    name: node.name,
    ext: node.ext,
    modified: meta.modified,
    by: meta.by,
    location: meta.location,
    content: content?.type === "image" ? { type: "image", svg: artSvg(content.art) } : content,
  }
}

/* ─────────────────────────── indirme: gerçek dosyalar ─────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** Sıkıştırmasız (STORE) ZIP — Office dosyaları da birer ZIP. */
export function zip(files) {
  const enc = new TextEncoder()
  const parts = []
  const central = []
  let offset = 0
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  for (const f of files) {
    const name = enc.encode(f.name)
    const data = typeof f.data === "string" ? enc.encode(f.data) : f.data
    const crc = crc32(data)
    const head = new DataView(new ArrayBuffer(30))
    head.setUint32(0, 0x04034b50, true)
    head.setUint16(4, 20, true)
    head.setUint16(6, 0x0800, true)
    head.setUint16(8, 0, true)
    head.setUint16(10, dosTime, true)
    head.setUint16(12, dosDate, true)
    head.setUint32(14, crc, true)
    head.setUint32(18, data.length, true)
    head.setUint32(22, data.length, true)
    head.setUint16(26, name.length, true)
    head.setUint16(28, 0, true)
    parts.push(new Uint8Array(head.buffer), name, data)
    const cd = new DataView(new ArrayBuffer(46))
    cd.setUint32(0, 0x02014b50, true)
    cd.setUint16(4, 20, true)
    cd.setUint16(6, 20, true)
    cd.setUint16(8, 0x0800, true)
    cd.setUint16(10, 0, true)
    cd.setUint16(12, dosTime, true)
    cd.setUint16(14, dosDate, true)
    cd.setUint32(16, crc, true)
    cd.setUint32(20, data.length, true)
    cd.setUint32(24, data.length, true)
    cd.setUint16(28, name.length, true)
    cd.setUint32(42, offset, true)
    central.push(new Uint8Array(cd.buffer), name)
    offset += 30 + name.length + data.length
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, cdSize, true)
  end.setUint32(16, offset, true)
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" })
}

const xml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

function colName(i) {
  let s = ""
  let n = i + 1
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function sheetXml(sheet) {
  const rows = [sheet.cols, ...sheet.rows, ...(sheet.total ? [sheet.total] : [])]
  const lastRow = rows.length
  const body = rows
    .map((r, ri) => {
      const bold = ri === 0 || (sheet.total && ri === lastRow - 1)
      const cells = r
        .map((v, ci) => {
          const ref = `${colName(ci)}${ri + 1}`
          if (v === "" || v == null) return ""
          if (typeof v === "number" && ri > 0) {
            const fmt = sheet.fmt?.[ci]
            const style =
              fmt === "pct"
                ? bold
                  ? 5
                  : 3
                : fmt === "money" || fmt === "int"
                  ? bold
                    ? 4
                    : 2
                  : bold
                    ? 1
                    : 0
            return `<c r="${ref}" s="${style}"><v>${v}</v></c>`
          }
          return `<c r="${ref}" t="inlineStr"${bold ? ' s="1"' : ""}><is><t xml:space="preserve">${xml(v)}</t></is></c>`
        })
        .join("")
      return `<row r="${ri + 1}">${cells}</row>`
    })
    .join("")
  const widths = sheet.cols
    .map((c, i) => {
      const longest = Math.max(String(c).length, ...rows.map((r) => String(r[i] ?? "").length))
      return `<col min="${i + 1}" max="${i + 1}" width="${Math.min(48, Math.max(10, longest + 4))}" customWidth="1"/>`
    })
    .join("")
  return `${XML_HEAD}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${body}</sheetData></worksheet>`
}

const STYLES = `${XML_HEAD}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/><xf numFmtId="10" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

export function xlsxBlob(content) {
  const sheets = content.sheets
  const files = [
    {
      name: "[Content_Types].xml",
      data: `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        )
        .join("")}</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `${XML_HEAD}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map(
          (s, i) =>
            `<sheet name="${xml(
              String(s.name)
                .slice(0, 31)
                .replace(/[\\/?*[\]:]/g, " "),
            )}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
        )
        .join("")}</sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
        )
        .join(
          "",
        )}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: "xl/styles.xml", data: STYLES },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) })),
  ]
  const blob = zip(files)
  return new Blob([blob], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

function wRun(text, { bold = false, size = 22, color = "", italic = false } = {}) {
  return `<w:r><w:rPr>${bold ? "<w:b/>" : ""}${italic ? "<w:i/>" : ""}${color ? `<w:color w:val="${color}"/>` : ""}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r>`
}
const wP = (runs, { after = 120, indent = 0 } = {}) =>
  `<w:p><w:pPr><w:spacing w:after="${after}"/>${indent ? `<w:ind w:left="${indent}"/>` : ""}</w:pPr>${runs}</w:p>`

export function docxBlob(content) {
  const body = []
  for (const b of content.blocks) {
    const [kind, a, rows] = b
    if (kind === "kicker") body.push(wP(wRun(a, { bold: true, size: 18, color: "4F46E5" })))
    else if (kind === "h1")
      body.push(wP(wRun(a, { bold: true, size: 36, color: "0F172A" }), { after: 200 }))
    else if (kind === "h2")
      body.push(wP(wRun(a, { bold: true, size: 26, color: "1E293B" }), { after: 100 }))
    else if (kind === "p") body.push(wP(wRun(a)))
    else if (kind === "note") body.push(wP(wRun(a, { italic: true, color: "92400E" })))
    else if (kind === "ul" || kind === "ol")
      a.forEach((it, i) =>
        body.push(
          wP(wRun(`${kind === "ol" ? `${i + 1}.` : "•"}  ${it}`), { after: 60, indent: 360 }),
        ),
      )
    else if (kind === "meta")
      a.forEach(([k, v]) => body.push(wP(wRun(`${k}: `, { bold: true }) + wRun(v), { after: 40 })))
    else if (kind === "table") {
      const border =
        '<w:top w:val="single" w:sz="4" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:color="CBD5E1"/><w:insideV w:val="single" w:sz="4" w:color="CBD5E1"/>'
      const tr = (cells, head) =>
        `<w:tr>${cells.map((c) => `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="EEF2FF"/>' : ""}</w:tcPr>${wP(wRun(String(c), { bold: head, size: 20 }), { after: 0 })}</w:tc>`).join("")}</w:tr>`
      body.push(
        `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${border}</w:tblBorders></w:tblPr><w:tblGrid>${a.map(() => '<w:gridCol w:w="1800"/>').join("")}</w:tblGrid>${tr(a, true)}${rows.map((r) => tr(r, false)).join("")}</w:tbl>`,
      )
      body.push(wP(""))
    } else if (kind === "sign") {
      body.push(wP("", { after: 480 }))
      body.push(wP(a.map(() => wRun("______________________     ")).join("")))
      body.push(wP(a.map((n) => wRun(`${n}          `, { size: 20 })).join("")))
    }
  }
  const doc = `${XML_HEAD}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1260" w:bottom="1440" w:left="1260" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`
  const blob = zip([
    {
      name: "[Content_Types].xml",
      data: `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    { name: "word/document.xml", data: doc },
  ])
  return new Blob([blob], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })
}

/** Standart PDF yazı tipleri Türkçe harfleri taşımıyor; PDF'te ASCII'ye çevrilir. */
const ASCII = {
  ç: "c",
  Ç: "C",
  ğ: "g",
  Ğ: "G",
  ı: "i",
  İ: "I",
  ö: "o",
  Ö: "O",
  ş: "s",
  Ş: "S",
  ü: "u",
  Ü: "U",
  "—": "-",
  "–": "-",
  "₺": "TL",
  "•": "-",
  "…": "...",
  "’": "'",
  "“": '"',
  "”": '"',
}
const pdfText = (s) =>
  String(s ?? "")
    .replace(/[çÇğĞıİöÖşŞüÜ—–₺•…’“”]/g, (c) => ASCII[c])
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")

export function pdfBlob(content, title) {
  const pages = [[]]
  let y = 790
  const push = (text, size, bold = false, x = 56) => {
    if (y < 60) {
      pages.push([])
      y = 790
    }
    pages[pages.length - 1].push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfText(text)}) Tj ET`,
    )
  }
  const lines = (text, size, bold, max, x) => {
    for (const l of wrap(text, max)) {
      push(l, size, bold, x)
      y -= size + 5
    }
  }
  const blocks =
    content?.type === "doc"
      ? content.blocks
      : [
          ["h1", title],
          ["p", plainTextOf(content)],
        ]
  for (const b of blocks) {
    const [kind, a, rows] = b
    if (kind === "kicker") (lines(a, 9, true, 100), (y -= 6))
    else if (kind === "h1") (lines(a, 20, true, 48), (y -= 8))
    else if (kind === "h2") ((y -= 6), lines(a, 13, true, 70), (y -= 2))
    else if (kind === "p" || kind === "note") (lines(a, 10.5, false, 98), (y -= 6))
    else if (kind === "ul" || kind === "ol")
      (a.forEach((it, i) =>
        lines(`${kind === "ol" ? `${i + 1}.` : "-"} ${it}`, 10.5, false, 92, 70),
      ),
        (y -= 6))
    else if (kind === "meta")
      (a.forEach(([k, v]) => lines(`${k}: ${v}`, 10.5, false, 98)), (y -= 6))
    else if (kind === "table") {
      const cw = 483 / a.length
      ;[a, ...rows].forEach((r, ri) => {
        r.forEach((c, ci) =>
          push(String(c).slice(0, Math.floor(cw / 5.2)), 9.5, ri === 0, 56 + ci * cw),
        )
        y -= 16
      })
      y -= 8
    } else if (kind === "sign") {
      y -= 30
      a.forEach((n, i) => push(`____________________   ${n}`, 10, false, 56 + i * 260))
      y -= 20
    }
  }
  const objs = []
  const add = (s) => objs.push(s)
  const pageIds = pages.map((_, i) => 5 + i * 2)
  add("<< /Type /Catalog /Pages 2 0 R >>")
  add(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  )
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
  pages.forEach((ops, i) => {
    const stream = ops.join("\n")
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[i] + 1} 0 R >>`,
    )
    add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })
  let out = "%PDF-1.4\n"
  const offsets = []
  objs.forEach((o, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xrefAt = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info << /Title (${pdfText(title)}) /Producer (Vega Global Demo) >> >>\nstartxref\n${xrefAt}\n%%EOF\n`
  return new Blob([out], { type: "application/pdf" })
}

export function csvBlob(content) {
  const s = content.sheets[0]
  const cell = (v) => {
    const t = typeof v === "number" ? String(v).replace(".", ",") : String(v ?? "")
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
  }
  const lines = [s.cols, ...s.rows].map((r) => r.map(cell).join(";"))
  const BOM = String.fromCharCode(0xfeff) // Excel UTF-8'i ancak BOM ile tanıyor
  return new Blob([`${BOM}${lines.join("\r\n")}\r\n`], { type: "text/csv;charset=utf-8" })
}

async function pngBlob(svg, w, h) {
  try {
    const img = new Image()
    img.src = svgUrl(svg)
    await img.decode()
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    canvas.getContext("2d").drawImage(img, 0, 0, w, h)
    return await new Promise((res) => canvas.toBlob((b) => res(b), "image/png"))
  } catch {
    return null
  }
}

/** Logo paketi gibi bir arşivin içi. */
function logoZip() {
  const logo = (bg, fg) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="160" viewBox="0 0 480 160"><rect width="480" height="160" fill="${bg}"/><circle cx="80" cy="80" r="44" fill="${fg}" opacity="0.9"/><path d="M58 60 L80 104 L102 60" stroke="${bg}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="146" y="96" font-family="${FONT}" font-size="46" font-weight="800" fill="${fg}" letter-spacing="3">VEGA GLOBAL</text></svg>`
  return zip([
    { name: "Vega Global Logo - Renkli.svg", data: logo("#ffffff", "#4338ca") },
    { name: "Vega Global Logo - Koyu Zemin.svg", data: logo("#1e1b4b", "#ffffff") },
    { name: "Vega Global Logo - Tek Renk.svg", data: logo("#ffffff", "#0f172a") },
    {
      name: "OKUBENI.txt",
      data: "Vega Global logo paketi (demo)\r\nRenk kodları: Lacivert #1E1B4B, İndigo #4338CA, Turkuaz #22D3EE\r\nKullanım kuralları için Marka Kılavuzu'na bakın.\r\n",
    },
  ])
}

/**
 * Dosyanın indirilebilir hâli. Üretilemeyen tür için `null` (ör. pptx:
 * düzgün bir sunu dosyası elle kurulamayacak kadar büyük — indirme düğmesi
 * çizilmez, önizleme ve "PowerPoint'te aç" yerinde kalır).
 */
export async function fileBlob(node, content) {
  switch (node.ext) {
    case "xlsx":
      return content?.type === "sheet" ? xlsxBlob(content) : null
    case "csv":
      return content?.type === "sheet" ? csvBlob(content) : null
    case "docx":
      return content?.type === "doc" ? docxBlob(content) : null
    case "pdf":
      return pdfBlob(content, node.name.replace(/\.[^.]+$/, ""))
    case "txt":
      return new Blob([content?.text ?? ""], { type: "text/plain;charset=utf-8" })
    case "png":
    case "jpg":
    case "jpeg":
      return content?.type === "image" ? pngBlob(artSvg(content.art), 1200, 800) : null
    case "zip":
      return logoZip()
    default:
      return null
  }
}
