import { useLayoutEffect, useState } from "react"

/**
 * Ölçü kopyasının (`ghostRef`, görünmez, `w-max`) doğal genişliği kutuya
 * (`boxRef`) sığıyor mu? Düğme etiketleri dile ve kart genişliğine göre
 * kademeli kısalsın, hiçbiri kesilmesin diye. Kutu ya da kopya boyut
 * değiştirince ve yazı tipi yüklenince yeniden ölçülür.
 */
export function useFits(boxRef, ghostRef) {
  const [fits, setFits] = useState(true)
  useLayoutEffect(() => {
    const box = boxRef.current
    const ghost = ghostRef.current
    if (!box || !ghost) return
    let live = true
    const check = () => {
      if (live) setFits(ghost.scrollWidth <= box.clientWidth + 0.5)
    }
    const ro = new ResizeObserver(check)
    ro.observe(box)
    ro.observe(ghost)
    document.fonts?.ready.then(check, () => {})
    return () => {
      live = false
      ro.disconnect()
    }
  }, [boxRef, ghostRef])
  return fits
}
