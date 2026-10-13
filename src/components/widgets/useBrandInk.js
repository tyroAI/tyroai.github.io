import { useEffect, useState } from "react"

// Göreli parlaklık (WCAG): sRGB 0–255 → 0–1.
function luminance(r, g, b) {
  const ch = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
}

/** Saf karar: iki tonun parlaklığından mürekkep ve gölge gücü (testli). */
export function inkFor(from, via, threshold = 0.36) {
  const avg = (from + via) / 2
  return {
    ink: avg > threshold ? "dark" : "light",
    veil: Math.min(0.95, Math.max(0.5, (avg - 0.04) / 0.26)),
  }
}

/**
 * Marka degradesinin üstündeki yazı beyaz mı, koyu mu olmalı: yazının durduğu
 * tonlar (`--brand-from` ile `--brand-via`nın ortalaması) açıksa koyu mürekkep.
 * `veil`: beyaz yazının altındaki koyu gölgenin gücü — zaten koyu paletlerde
 * hafif (renk canlı kalsın), orta tonlarda güçlü (kontrast AA).
 * Renk hex de oklch de olabildiği için tarayıcı 1 piksellik tuvale boyar, oradan
 * okunur. Palet ya da tema değişince (`data-palette` · `class`) yeniden hesaplanır.
 */
export function useBrandInk(threshold = 0.36) {
  const [ink, setInk] = useState({ ink: "light", veil: 0.95 })
  useEffect(() => {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const g = canvas.getContext("2d", { willReadFrequently: true })
    if (!g) return undefined
    const lum = (name) => {
      const color = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      if (!color) return null
      g.clearRect(0, 0, 1, 1)
      g.fillStyle = "#000"
      g.fillStyle = color
      g.fillRect(0, 0, 1, 1)
      const [r, gg, b] = g.getImageData(0, 0, 1, 1).data
      return luminance(r, gg, b)
    }
    const read = () => {
      const from = lum("--brand-from")
      const via = lum("--brand-via")
      if (from == null || via == null) return
      setInk(inkFor(from, via, threshold))
    }
    const id = requestAnimationFrame(read)
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-palette", "data-theme"],
    })
    return () => {
      cancelAnimationFrame(id)
      mo.disconnect()
    }
  }, [threshold])
  return ink
}
