import { useEffect, useState } from "react"
import { useIntroOnce } from "@/hooks/useIntroOnce"

const DURATION = 1700
const ease = (x) => 1 - Math.pow(1 - x, 3)

/**
 * Yaydaki işaretin girişi: ilk açılışta güneş/ay yayın başından doğup
 * gerçek yerine kayar, renkli gidilen yol onunla dolar. Parametre uzayında
 * (`CARD_ARC.param`) — nokta ile çizginin ucu birlikte yürür.
 */
export function useArcIntro(target) {
  const play = useIntroOnce("weather-arc")
  const [k, setK] = useState(play ? 0 : 1)
  const ready = target != null
  useEffect(() => {
    if (!play || !ready) return undefined
    let raf
    let start
    const tick = (now) => {
      start ??= now
      const p = Math.min(1, (now - start) / DURATION)
      setK(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [play, ready])
  return ready ? target * ease(k) : target
}
