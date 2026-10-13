import { useEffect, useMemo, useRef } from "react"

/**
 * Fareyle açılan bir kartın zamanlaması: üstüne gelince kısa bir beklemeyle
 * açar, çıkınca kısa bir beklemeyle kapatır (karta geçen imleç `cancel` ile
 * kapanışı durdurur). Yalnız FAREYLE açılmış kartı kapatır — basılıp
 * sabitlenmiş kart imleç çıkınca kapanmaz.
 */
export function useHoverIntent({ openDelay = 250, closeDelay = 200 } = {}) {
  const timer = useRef(null)
  const hovered = useRef(false)
  useEffect(() => () => clearTimeout(timer.current), [])
  return useMemo(() => {
    const cancel = () => clearTimeout(timer.current)
    const later = (fn, ms) => {
      cancel()
      timer.current = setTimeout(fn, ms)
    }
    return {
      cancel,
      open: (fn) =>
        later(() => {
          hovered.current = true
          fn()
        }, openDelay),
      close: (fn) => hovered.current && later(fn, closeDelay),
      isHover: () => hovered.current,
      reset: () => {
        hovered.current = false
      },
    }
  }, [openDelay, closeDelay])
}
