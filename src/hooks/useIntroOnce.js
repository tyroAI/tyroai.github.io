import { useEffect, useState } from "react"

// Sayfa yüklemesi başına bir kez: Anasayfa'ya geri dönen kişi girişi yeniden izlemez.
const seen = new Set()

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/** `key`in giriş animasyonu bu yüklemede oynatılsın mı (hareket azaltılmışsa hiç). */
export function useIntroOnce(key) {
  const [play] = useState(() => !seen.has(key) && !reducedMotion())
  useEffect(() => {
    seen.add(key)
  }, [key])
  return play
}
