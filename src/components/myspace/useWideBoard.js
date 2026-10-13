import { useLayoutEffect, useState } from "react"
import { flushSync } from "react-dom"

/**
 * Karşılama bölümü iki kolonlu düzende mi? Karar CSS'İN KENDİ KARARINDAN
 * okunur: bölüm o düzende `grid` (`@[60rem]/myspace:grid`). Eşiği JS'te yeniden
 * hesaplamak 1280×800'de yanıldı — pano tam eşikte (921,6 px) ve yarım
 * piksellik yuvarlama farkıyla balon solda kalırken ızgara üç kart bekliyordu
 * (ölçüldü).
 * `flushSync` ResizeObserver'ın geri çağrısında: ilk ölçüm boyamadan ÖNCE
 * geliyor ve güncelleme de öyle işlensin — yoksa açılışta balon bir kare solda
 * doğup sağa zıplardı. Kök punto görüntü alanının YÜKSEKLİĞİYLE değişiyor
 * (`clamp`), yani eşik pano genişlemeden de kayabilir: pencere boyutu da
 * dinleniyor.
 */
export function useWideBoard(boardRef, welcomeRef) {
  const [wide, setWide] = useState(false)
  useLayoutEffect(() => {
    const el = boardRef.current
    const welcome = welcomeRef.current
    if (!el || !welcome) return undefined
    let last = null
    const check = () => {
      const next = getComputedStyle(welcome).display === "grid"
      if (next === last) return
      last = next
      flushSync(() => setWide(next))
    }
    const ro = new ResizeObserver(check)
    ro.observe(el)
    window.addEventListener("resize", check)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", check)
    }
  }, [boardRef, welcomeRef])
  return wide
}
