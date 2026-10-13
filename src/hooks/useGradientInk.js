import { useEffect, useState } from "react"
import { gradientInk } from "@/lib/gradientInk"

/**
 * Marka gradyanının üstündeki mürekkep (`"light"` · `"dark"`), palet ya da
 * tema değişince YENİDEN ÖLÇÜLÜR (kural ve ölçümler `lib/gradientInk.js`).
 *
 * ⚠️ **`<html>`İ İZLER, sağlayıcıyı değil.** Palet ve tema sağlayıcıları
 * özniteliği ebeveynin PASİF etkisinde yazıyor; çocuğun etkisi ondan ÖNCE
 * koşuyor ve eski paleti okurdu. `MutationObserver` özniteliğin gerçekten
 * değiştiği anı yakalıyor; ölçüm bir sonraki karede (stil çözülmüş olsun).
 */
export function useGradientInk() {
  const [ink, setInk] = useState(() => gradientInk())
  useEffect(() => {
    const root = document.documentElement
    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setInk(gradientInk()))
    }
    measure()
    const observer = new MutationObserver(measure)
    observer.observe(root, { attributes: true, attributeFilter: ["data-palette", "class"] })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])
  return ink
}
