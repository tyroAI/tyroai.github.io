import { useEffect, useState } from "react"

// Parmak titremesi gizle/göster döngüsü başlatmasın.
const JITTER = 6

/**
 * Akışın yapışkan başlığı (Twitter/Instagram üst çubuğu): aşağı kaydırınca gizlenir,
 * yukarı kaydırınca geri gelir. Başlığın yüksekliği kaydırıcıya `--feed-head` olarak
 * yazılır; sağ ray o kadar aşağıda yapışır, başlığın altına girmez.
 */
export function useStickyHeader(scrollerRef, headerRef, enabled) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const scroller = scrollerRef.current
    const header = headerRef.current
    if (!enabled || !scroller || !header) return undefined
    let last = scroller.scrollTop
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const y = scroller.scrollTop
        if (Math.abs(y - last) < JITTER) return
        setHidden(y > last && y > header.offsetHeight * 2)
        last = y
      })
    }
    const ro = new ResizeObserver(() =>
      scroller.style.setProperty("--feed-head", `${header.offsetHeight}px`),
    )
    ro.observe(header)
    scroller.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      scroller.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(frame)
      ro.disconnect()
      scroller.style.removeProperty("--feed-head")
      setHidden(false)
    }
  }, [scrollerRef, headerRef, enabled])

  return enabled && hidden
}
