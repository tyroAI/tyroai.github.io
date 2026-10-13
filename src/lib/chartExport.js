/**
 * Save a chat chart as a PNG.
 *
 * Recharts draws SVG, so the obvious move — serialise it and rasterise — falls
 * apart twice here, and both traps are handled below.
 *
 * 1. Every colour in the chart is a CSS variable (`var(--chart-1)`). Once the
 *    markup is detached from the document there is nothing to resolve those
 *    against, so a naive export comes out black. Each node's computed style is
 *    read off the LIVE element and written onto the clone as a literal.
 *
 * 2. Those literals can be `oklch()` — several palettes are authored that way —
 *    and an oklch value inside an SVG rendered through an <img> is not
 *    reliably supported. They go through a one-pixel canvas, the same
 *    conversion the map colours use, which forces sRGB whatever the source.
 *
 * The legend is drawn by hand afterwards because recharts renders it as HTML
 * beside the SVG, not inside it — serialising the chart alone would silently
 * drop it, and a two-series chart with no key is a puzzle rather than a chart.
 */

const STYLE_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-opacity",
  "opacity",
  "font-size",
  "font-weight",
  "font-family",
  "text-anchor",
]

/** Any CSS colour → `rgb()`/`rgba()`. Non-colours pass through untouched. */
function toSrgb(value) {
  if (!value || value === "none" || value.startsWith("url(")) return value
  if (value.startsWith("rgb")) return value
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return value
  const SENTINEL = "#010203"
  ctx.fillStyle = SENTINEL
  ctx.fillStyle = value
  if (ctx.fillStyle === SENTINEL) return value
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
}

function readToken(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return toSrgb(raw) || fallback
}

/** Resolve a colour that may still be written as `var(--token)`. The canvas
 *  cannot parse `var()`, and a value it cannot parse leaves fillStyle at
 *  whatever was set last — which is how every legend swatch came out the same
 *  colour on the first cut of this. */
function resolveCssColor(value, fallback = "#888888") {
  const match = /^var\((--[^),]+)\)$/.exec((value || "").trim())
  if (match) return readToken(match[1], fallback)
  return toSrgb(value) || fallback
}

/** Clone the SVG with every computed style baked in as a literal. */
function inlineStyles(svg) {
  const clone = svg.cloneNode(true)
  const originals = [svg, ...svg.querySelectorAll("*")]
  const clones = [clone, ...clone.querySelectorAll("*")]

  originals.forEach((node, i) => {
    const target = clones[i]
    if (!target || !(node instanceof Element)) return
    const computed = getComputedStyle(node)
    const declarations = []
    for (const prop of STYLE_PROPS) {
      let value = computed.getPropertyValue(prop)
      if (!value) continue
      if (prop === "fill" || prop === "stroke") value = toSrgb(value.trim())
      declarations.push(`${prop}:${value}`)
    }
    target.setAttribute("style", declarations.join(";"))
  })

  return clone
}

/**
 * Render `svg` to a PNG and hand it to the browser as a download.
 *
 * `meta` supplies the title line and the legend, which live outside the SVG.
 * Returns a promise so the caller can show a failure — an export that quietly
 * does nothing is indistinguishable from a broken button.
 */
export async function downloadChartPng(svg, { filename, title, series, colors }) {
  const rect = svg.getBoundingClientRect()
  const width = Math.max(320, Math.round(rect.width))
  const height = Math.max(200, Math.round(rect.height))

  const PAD = 16
  const TITLE_H = title ? 26 : 0
  const LEGEND_H = series && series.length > 1 ? 24 : 0
  const totalW = width + PAD * 2
  const totalH = height + TITLE_H + LEGEND_H + PAD * 2

  const clone = inlineStyles(svg)
  clone.setAttribute("width", String(width))
  clone.setAttribute("height", String(height))
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")

  const markup = new XMLSerializer().serializeToString(clone)
  // Blob over a base64 data URI: the labels are Turkish and btoa() throws on
  // anything outside Latin-1.
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }))

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("svg-render-failed"))
      img.src = url
    })

    // Export at 2× so the PNG holds up pasted into a deck or a mail.
    const scale = 2
    const canvas = document.createElement("canvas")
    canvas.width = totalW * scale
    canvas.height = totalH * scale
    const ctx = canvas.getContext("2d")
    ctx.scale(scale, scale)

    ctx.fillStyle = readToken("--card", "#ffffff")
    ctx.fillRect(0, 0, totalW, totalH)

    const ink = readToken("--foreground", "#111111")
    if (title) {
      ctx.fillStyle = ink
      ctx.font = "600 13px system-ui, -apple-system, sans-serif"
      ctx.textBaseline = "middle"
      ctx.fillText(title, PAD, PAD + TITLE_H / 2)
    }

    ctx.drawImage(image, PAD, PAD + TITLE_H, width, height)

    if (LEGEND_H) {
      let x = PAD
      const y = PAD + TITLE_H + height + LEGEND_H / 2
      ctx.font = "500 11px system-ui, -apple-system, sans-serif"
      ctx.textBaseline = "middle"
      series.forEach((name, i) => {
        ctx.fillStyle = resolveCssColor(colors[i % colors.length])
        ctx.fillRect(x, y - 4, 8, 8)
        ctx.fillStyle = ink
        ctx.fillText(name, x + 12, y)
        x += 12 + ctx.measureText(name).width + 16
      })
    }

    const href = canvas.toDataURL("image/png")
    const link = document.createElement("a")
    link.href = href
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Filesystem-safe name from the chart's own labels. */
export function chartFilename(label, unit) {
  const stamp = new Date().toISOString().slice(0, 10)
  const base = [label, unit].filter(Boolean).join("-")
  const safe =
    base
      .toLowerCase()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "grafik"
  return `tyro-${safe}-${stamp}.png`
}
