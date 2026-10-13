// Posta eklerinin baytları — tarayıcıda, istek anında üretilir (dışarıdan tek bir
// görsel bile gelmez). Üç tür:
//   · image — bülten kapakları: <canvas> ile çizilen JPEG (akış yalnız raster
//     tipleri kabul ediyor; SVG bilinçli olarak listede yok).
//   · pdf   — belge sayfası <canvas>ta çizilip tek sayfalık bir PDF'e gömülür
//     (Türkçe karakterler bozulmasın diye metin değil görüntü).
//   · csv   — Excel'in açtığı noktalı virgüllü metin.
// Üretilen bayt kimlik başına önbelleğe girer: liste ile içerik aynı boyu söyler.

const FONT = `"Inter Variable", "Segoe UI", system-ui, sans-serif`
const cache = new Map()

export function toBase64(bytes) {
  let s = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(s)
}

async function canvasBytes(w, h, draw, type = "image/jpeg", quality = 0.86) {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  draw(ctx, w, h)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality))
  return new Uint8Array(await blob.arrayBuffer())
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Metni verilen genişliğe sarar; en fazla `max` satır. */
function wrap(ctx, text, width, max = 3) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ""
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > width && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  if (lines.length > max) {
    lines.length = max
    lines[max - 1] = `${lines[max - 1].replace(/\s+\S*$/, "")}…`
  }
  return lines
}

const white = (a) => `rgba(255,255,255,${a})`

// ── Kapak motifleri (sağdaki görsel alan) ─────────────────────────────────
const MOTIFS = {
  bars(ctx, x, y, w, h, data = {}) {
    const values = data.values ?? [62, 74, 81, 108]
    const labels = data.labels ?? ["T1", "T2", "T3", "T4"]
    const max = Math.max(...values) * 1.15
    const bw = w / (values.length * 1.6)
    values.forEach((v, i) => {
      const bh = (v / max) * (h - 60)
      const bx = x + i * bw * 1.6 + bw * 0.3
      const by = y + h - 30 - bh
      ctx.fillStyle = i === (data.highlight ?? values.length - 1) ? white(0.95) : white(0.35)
      roundRect(ctx, bx, by, bw, bh, 10)
      ctx.fill()
      ctx.fillStyle = white(0.8)
      ctx.font = `600 20px ${FONT}`
      ctx.textAlign = "center"
      ctx.fillText(labels[i], bx + bw / 2, y + h - 4)
      if (i === (data.highlight ?? values.length - 1)) {
        ctx.font = `800 30px ${FONT}`
        ctx.fillStyle = white(1)
        ctx.fillText(data.badge ?? `%${v}`, bx + bw / 2, by - 14)
      }
    })
    ctx.textAlign = "left"
  },
  line(ctx, x, y, w, h, data = {}) {
    const pts = data.values ?? [20, 28, 26, 38, 44, 41, 55, 63, 70]
    const max = Math.max(...pts) * 1.1
    const step = w / (pts.length - 1)
    const px = (i) => x + i * step
    const py = (v) => y + h - (v / max) * h
    ctx.beginPath()
    pts.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))))
    ctx.lineTo(px(pts.length - 1), y + h)
    ctx.lineTo(x, y + h)
    ctx.closePath()
    ctx.fillStyle = white(0.16)
    ctx.fill()
    ctx.beginPath()
    pts.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))))
    ctx.strokeStyle = white(0.95)
    ctx.lineWidth = 5
    ctx.lineJoin = "round"
    ctx.stroke()
    const last = pts.length - 1
    ctx.beginPath()
    ctx.arc(px(last), py(pts[last]), 11, 0, Math.PI * 2)
    ctx.fillStyle = white(1)
    ctx.fill()
  },
  avatars(ctx, x, y, w, h, data = {}) {
    const people = data.people ?? ["IS", "TK", "DÖ"]
    const colors = ["#f59e0b", "#10b981", "#6366f1", "#ec4899", "#0ea5e9"]
    const r = Math.min(70, w / (people.length * 2.2))
    const total = people.length * r * 2 + (people.length - 1) * 18
    let cx = x + (w - total) / 2 + r
    people.forEach((initials, i) => {
      const cy = y + h / 2 + (i % 2 ? 26 : -26)
      ctx.beginPath()
      ctx.arc(cx, cy, r + 6, 0, Math.PI * 2)
      ctx.fillStyle = white(0.9)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = colors[i % colors.length]
      ctx.fill()
      ctx.fillStyle = "#ffffff"
      ctx.font = `700 ${Math.round(r * 0.72)}px ${FONT}`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(initials, cx, cy + 2)
      cx += r * 2 + 18
    })
    ctx.textAlign = "left"
    ctx.textBaseline = "alphabetic"
  },
  tag(ctx, x, y, w, h, data = {}) {
    ctx.save()
    ctx.translate(x + w / 2, y + h / 2)
    ctx.rotate(-0.18)
    ctx.fillStyle = white(0.94)
    roundRect(ctx, -150, -85, 300, 170, 26)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(-110, 0, 16, 0, Math.PI * 2)
    ctx.fillStyle = data.ink ?? "#1e3a8a"
    ctx.fill()
    ctx.font = `800 64px ${FONT}`
    ctx.textAlign = "center"
    ctx.fillText(data.text ?? "2027", 20, 10)
    ctx.font = `600 20px ${FONT}`
    ctx.fillText(data.sub ?? "FİYAT LİSTESİ", 20, 48)
    ctx.restore()
  },
  calendar(ctx, x, y, w, h, data = {}) {
    const cw = 250
    const ch = 250
    const cx = x + (w - cw) / 2
    const cy = y + (h - ch) / 2
    ctx.fillStyle = white(0.95)
    roundRect(ctx, cx, cy, cw, ch, 26)
    ctx.fill()
    ctx.fillStyle = data.ink ?? "#be123c"
    roundRect(ctx, cx, cy, cw, 66, 26)
    ctx.fill()
    ctx.fillRect(cx, cy + 40, cw, 26)
    ctx.fillStyle = "#ffffff"
    ctx.font = `700 26px ${FONT}`
    ctx.textAlign = "center"
    ctx.fillText(data.month ?? "EKİM", cx + cw / 2, cy + 44)
    ctx.fillStyle = "#0f172a"
    ctx.font = `800 104px ${FONT}`
    ctx.fillText(data.day ?? "24", cx + cw / 2, cy + 180)
    ctx.font = `600 22px ${FONT}`
    ctx.fillStyle = "#475569"
    ctx.fillText(data.label ?? "", cx + cw / 2, cy + 222)
    ctx.textAlign = "left"
  },
  trophy(ctx, x, y, w, h, data = {}) {
    const cx = x + w / 2
    const cy = y + h / 2 - 10
    ctx.fillStyle = white(0.85)
    ctx.beginPath()
    ctx.moveTo(cx - 70, cy + 60)
    ctx.lineTo(cx - 110, cy + 175)
    ctx.lineTo(cx - 60, cy + 150)
    ctx.lineTo(cx - 30, cy + 190)
    ctx.lineTo(cx - 5, cy + 70)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx + 70, cy + 60)
    ctx.lineTo(cx + 110, cy + 175)
    ctx.lineTo(cx + 60, cy + 150)
    ctx.lineTo(cx + 30, cy + 190)
    ctx.lineTo(cx + 5, cy + 70)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy, 108, 0, Math.PI * 2)
    ctx.fillStyle = white(0.95)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy, 86, 0, Math.PI * 2)
    ctx.fillStyle = data.ink ?? "#f59e0b"
    ctx.fill()
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const rr = i % 2 ? 22 : 52
      const px = cx + Math.cos(a) * rr
      const py = cy + Math.sin(a) * rr
      if (i) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    }
    ctx.closePath()
    ctx.fillStyle = "#ffffff"
    ctx.fill()
  },
  gauge(ctx, x, y, w, h, data = {}) {
    const cx = x + w / 2
    const cy = y + h * 0.72
    const r = Math.min(w / 2 - 10, h * 0.62)
    ctx.lineCap = "round"
    ctx.lineWidth = 34
    ctx.strokeStyle = white(0.22)
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI)
    ctx.stroke()
    const value = data.value ?? 62
    ctx.strokeStyle = white(0.95)
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI, Math.PI + (Math.PI * (value + 100)) / 200)
    ctx.stroke()
    ctx.fillStyle = white(1)
    ctx.font = `800 84px ${FONT}`
    ctx.textAlign = "center"
    ctx.fillText(String(value), cx, cy - 6)
    ctx.font = `600 22px ${FONT}`
    ctx.fillStyle = white(0.85)
    ctx.fillText(data.label ?? "NPS", cx, cy + 34)
    ctx.textAlign = "left"
    ctx.lineCap = "butt"
  },
  shield(ctx, x, y, w) {
    const cx = x + w / 2
    const top = y + 20
    ctx.beginPath()
    ctx.moveTo(cx, top)
    ctx.lineTo(cx + 120, top + 40)
    ctx.quadraticCurveTo(cx + 120, top + 220, cx, top + 290)
    ctx.quadraticCurveTo(cx - 120, top + 220, cx - 120, top + 40)
    ctx.closePath()
    ctx.fillStyle = white(0.95)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx - 48, top + 140)
    ctx.lineTo(cx - 12, top + 178)
    ctx.lineTo(cx + 56, top + 104)
    ctx.strokeStyle = "#0f766e"
    ctx.lineWidth = 18
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()
    ctx.lineCap = "butt"
  },
  route(ctx, x, y, w, h) {
    ctx.setLineDash([2, 20])
    ctx.lineCap = "round"
    ctx.lineWidth = 9
    ctx.strokeStyle = white(0.9)
    ctx.beginPath()
    ctx.moveTo(x + 10, y + h - 30)
    ctx.bezierCurveTo(x + w * 0.3, y + h * 0.2, x + w * 0.55, y + h * 1.05, x + w - 30, y + 40)
    ctx.stroke()
    ctx.setLineDash([])
    for (const [px, py] of [
      [x + 10, y + h - 30],
      [x + w - 30, y + 40],
    ]) {
      ctx.beginPath()
      ctx.arc(px, py, 20, 0, Math.PI * 2)
      ctx.fillStyle = white(1)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(px, py, 9, 0, Math.PI * 2)
      ctx.fillStyle = "#f97316"
      ctx.fill()
    }
    ctx.font = `800 40px ${FONT}`
    ctx.fillStyle = white(1)
    ctx.textAlign = "right"
    ctx.fillText("42 km", x + w - 20, y + h - 6)
    ctx.textAlign = "left"
    ctx.lineCap = "butt"
  },
  window(ctx, x, y, w, h, data = {}) {
    const ww = w - 20
    const wh = h - 30
    const wx = x + 10
    const wy = y + 15
    ctx.fillStyle = white(0.96)
    roundRect(ctx, wx, wy, ww, wh, 20)
    ctx.fill()
    ctx.fillStyle = "#e2e8f0"
    roundRect(ctx, wx, wy, ww, 44, 20)
    ctx.fill()
    ctx.fillRect(wx, wy + 24, ww, 20)
    ;["#f87171", "#fbbf24", "#34d399"].forEach((c, i) => {
      ctx.beginPath()
      ctx.arc(wx + 26 + i * 22, wy + 22, 7, 0, Math.PI * 2)
      ctx.fillStyle = c
      ctx.fill()
    })
    const ink = data.ink ?? "#4f46e5"
    const cols = [0.62, 0.4, 0.85, 0.55]
    cols.forEach((v, i) => {
      ctx.fillStyle = i === 2 ? ink : "#cbd5e1"
      roundRect(ctx, wx + 30, wy + 74 + i * 46, (ww - 60) * v, 22, 11)
      ctx.fill()
    })
    ctx.fillStyle = ink
    ctx.font = `800 26px ${FONT}`
    ctx.fillText(data.badge ?? "v5.3", wx + ww - 110, wy + wh - 26)
  },
  play(ctx, x, y, w, h) {
    const cw = w - 40
    const chh = h - 40
    const cx = x + 20
    const cy = y + 20
    ctx.fillStyle = white(0.18)
    roundRect(ctx, cx, cy, cw, chh, 26)
    ctx.fill()
    ctx.strokeStyle = white(0.6)
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + cw / 2, cy + chh / 2, 62, 0, Math.PI * 2)
    ctx.fillStyle = white(0.96)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx + cw / 2 - 18, cy + chh / 2 - 30)
    ctx.lineTo(cx + cw / 2 + 32, cy + chh / 2)
    ctx.lineTo(cx + cw / 2 - 18, cy + chh / 2 + 30)
    ctx.closePath()
    ctx.fillStyle = "#7c3aed"
    ctx.fill()
    ctx.fillStyle = white(0.85)
    roundRect(ctx, cx + 24, cy + chh - 34, cw - 48, 8, 4)
    ctx.fill()
    ctx.fillStyle = white(1)
    roundRect(ctx, cx + 24, cy + chh - 34, (cw - 48) * 0.35, 8, 4)
    ctx.fill()
  },
  broadcast(ctx, x, y, w, h) {
    const cx = x + w * 0.35
    const cy = y + h / 2
    for (let i = 4; i >= 1; i--) {
      ctx.beginPath()
      ctx.arc(cx, cy, i * 46, -Math.PI / 3, Math.PI / 3)
      ctx.strokeStyle = white(0.18 + i * 0.12)
      ctx.lineWidth = 12
      ctx.lineCap = "round"
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.arc(cx, cy, 24, 0, Math.PI * 2)
    ctx.fillStyle = white(1)
    ctx.fill()
    ctx.lineCap = "butt"
  },
  handshake(ctx, x, y, w, h, data = {}) {
    const cx = x + w / 2
    const cy = y + h / 2
    ctx.beginPath()
    ctx.arc(cx - 60, cy, 92, 0, Math.PI * 2)
    ctx.fillStyle = white(0.9)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + 60, cy, 92, 0, Math.PI * 2)
    ctx.fillStyle = white(0.55)
    ctx.fill()
    ctx.fillStyle = data.ink ?? "#0f172a"
    ctx.font = `800 40px ${FONT}`
    ctx.textAlign = "center"
    ctx.fillText(data.left ?? "VG", cx - 76, cy + 14)
    ctx.fillStyle = "#ffffff"
    ctx.fillText(data.right ?? "NL", cx + 76, cy + 14)
    ctx.textAlign = "left"
  },
}

/** Bülten kapağı: marka şeridi + başlık solda, motif sağda. 1200×630 JPEG. */
export function renderPoster(spec) {
  return canvasBytes(1200, 630, (ctx, w, h) => {
    const [c1, c2] = spec.colors ?? ["#1e3a8a", "#0ea5e9"]
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, c1)
    g.addColorStop(1, c2)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    // Yumuşak ışık ve doku.
    const glow = ctx.createRadialGradient(w * 0.85, h * 0.1, 10, w * 0.85, h * 0.1, w * 0.6)
    glow.addColorStop(0, white(0.28))
    glow.addColorStop(1, white(0))
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = white(0.06)
    ctx.beginPath()
    ctx.arc(w * 0.08, h * 1.02, 260, 0, Math.PI * 2)
    ctx.fill()
    for (let gx = 40; gx < w; gx += 36) {
      for (let gy = 40; gy < h; gy += 36) {
        ctx.fillStyle = white(((gx * 7 + gy * 3) % 11) / 260)
        ctx.fillRect(gx, gy, 2, 2)
      }
    }
    // Marka.
    ctx.beginPath()
    ctx.arc(76, 74, 22, 0, Math.PI * 2)
    ctx.fillStyle = white(0.95)
    ctx.fill()
    ctx.fillStyle = c1
    ctx.font = `800 24px ${FONT}`
    ctx.textAlign = "center"
    ctx.fillText("V", 76, 83)
    ctx.textAlign = "left"
    ctx.fillStyle = white(0.92)
    ctx.font = `700 21px ${FONT}`
    ctx.fillText("MIDEA", 112, 82)
    // Etiket.
    if (spec.eyebrow) {
      ctx.font = `700 19px ${FONT}`
      const tw = ctx.measureText(spec.eyebrow).width
      ctx.fillStyle = white(0.18)
      roundRect(ctx, 56, 150, tw + 36, 40, 20)
      ctx.fill()
      ctx.fillStyle = white(1)
      ctx.fillText(spec.eyebrow, 74, 177)
    }
    // Başlık.
    ctx.fillStyle = white(1)
    ctx.font = `800 54px ${FONT}`
    const lines = wrap(ctx, spec.title, 620, 3)
    lines.forEach((l, i) => ctx.fillText(l, 56, 262 + i * 64))
    if (spec.subtitle) {
      ctx.font = `500 25px ${FONT}`
      ctx.fillStyle = white(0.86)
      wrap(ctx, spec.subtitle, 600, 2).forEach((l, i) =>
        ctx.fillText(l, 56, 262 + lines.length * 64 + 18 + i * 34),
      )
    }
    const motif = MOTIFS[spec.motif]
    if (motif) motif(ctx, 740, 130, 400, 380, spec.data ?? {})
  })
}

/** A4 belge sayfası (JPEG): başlık bandı, künye satırları, tablo ve paragraflar. */
function renderDocPage(doc) {
  return canvasBytes(
    1240,
    1754,
    (ctx, w) => {
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, w, 1754)
      ctx.fillStyle = doc.color ?? "#1e3a8a"
      ctx.fillRect(0, 0, w, 150)
      ctx.fillStyle = "#ffffff"
      ctx.font = `800 34px ${FONT}`
      ctx.fillText("MIDEA", 96, 92)
      ctx.font = `500 22px ${FONT}`
      ctx.textAlign = "right"
      ctx.fillText(doc.badge ?? "Gizli — Şirket İçi", w - 96, 92)
      ctx.textAlign = "left"
      let y = 250
      ctx.fillStyle = "#0f172a"
      ctx.font = `800 46px ${FONT}`
      for (const l of wrap(ctx, doc.title, w - 192, 2)) {
        ctx.fillText(l, 96, y)
        y += 58
      }
      ctx.font = `500 24px ${FONT}`
      ctx.fillStyle = "#52606d"
      for (const m of doc.meta ?? []) {
        y += 8
        ctx.fillText(m, 96, y)
        y += 30
      }
      y += 30
      ctx.fillStyle = "#e4e7eb"
      ctx.fillRect(96, y, w - 192, 2)
      y += 60
      if (doc.table) {
        const [head, ...rows] = doc.table
        const colW = (w - 192) / head.length
        ctx.fillStyle = "#f1f5f9"
        ctx.fillRect(96, y - 40, w - 192, 58)
        ctx.font = `700 24px ${FONT}`
        ctx.fillStyle = "#0f172a"
        head.forEach((c, i) => {
          ctx.textAlign = i ? "right" : "left"
          ctx.fillText(c, i ? 96 + colW * (i + 1) - 18 : 114, y)
        })
        y += 58
        ctx.font = `500 24px ${FONT}`
        rows.forEach((r, ri) => {
          if (ri % 2) {
            ctx.fillStyle = "#f8fafc"
            ctx.fillRect(96, y - 40, w - 192, 58)
          }
          ctx.fillStyle = "#1f2933"
          r.forEach((c, i) => {
            ctx.textAlign = i ? "right" : "left"
            ctx.fillText(c, i ? 96 + colW * (i + 1) - 18 : 114, y)
          })
          y += 58
        })
        ctx.textAlign = "left"
        y += 40
      }
      ctx.font = `400 26px ${FONT}`
      ctx.fillStyle = "#1f2933"
      for (const p of doc.paragraphs ?? []) {
        for (const l of wrap(ctx, p, w - 192, 8)) {
          ctx.fillText(l, 96, y)
          y += 38
        }
        y += 22
      }
      ctx.fillStyle = "#9aa5b1"
      ctx.font = `500 20px ${FONT}`
      ctx.fillText(`${doc.footer ?? "Midea Ticaret A.Ş."} · Sayfa 1 / 1`, 96, 1690)
    },
    "image/jpeg",
    0.8,
  )
}

/** Tek sayfalık PDF: sayfayı kaplayan JPEG (DCTDecode). */
function pdfFromJpeg(jpeg, pxW, pxH) {
  const enc = new TextEncoder()
  const parts = []
  const offsets = []
  let len = 0
  const push = (x) => {
    const b = typeof x === "string" ? enc.encode(x) : x
    parts.push(b)
    len += b.length
  }
  const obj = (n, s) => {
    offsets[n] = len
    push(s)
  }
  push("%PDF-1.4\n")
  obj(1, "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
  obj(2, "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
  obj(
    3,
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
  )
  obj(
    4,
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  )
  push(jpeg)
  push("\nendstream\nendobj\n")
  const content = "q 595.28 0 0 841.89 0 0 cm /Im0 Do Q"
  obj(5, `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`)
  const xref = len
  push(
    `xref\n0 6\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
      .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
  )
  const out = new Uint8Array(len)
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

/** Excel'in Türkçe karakterleri doğru okuması için UTF-8 imzası. */
const BOM = String.fromCharCode(0xfeff)

function csvBytes(rows) {
  const text = rows
    .map((r) => r.map((c) => (/[;"\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(";"))
    .join("\r\n")
  return new TextEncoder().encode(`${BOM}${text}\r\n`)
}

/**
 * Ekin baytları ve tipi. `key` ileti + ek kimliği; aynı ek ikinci kez üretilmez.
 * @returns {Promise<{ bytes: Uint8Array, contentType: string }>}
 */
export function attachmentBytes(key, att) {
  if (cache.has(key)) return cache.get(key)
  const job = (async () => {
    if (att.kind === "image") {
      return { bytes: await renderPoster(att.poster), contentType: "image/jpeg" }
    }
    if (att.kind === "pdf") {
      const jpeg = await renderDocPage(att.doc)
      return { bytes: pdfFromJpeg(jpeg, 1240, 1754), contentType: "application/pdf" }
    }
    if (att.kind === "csv") return { bytes: csvBytes(att.rows), contentType: "text/csv" }
    return { bytes: new TextEncoder().encode(att.text ?? ""), contentType: "text/plain" }
  })()
  cache.set(key, job)
  // Üretim düşerse önbellekte kalmasın: bir sonraki istek yeniden denesin.
  job.catch(() => cache.delete(key))
  return job
}
