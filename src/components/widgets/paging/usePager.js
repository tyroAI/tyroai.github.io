import { useRef, useState } from "react"

const SWIPE_PX = 40

/**
 * Sabit boylu kartta liste sayfaları: kart büyümez, fazlası sağa/sola sayfa.
 * Dokunmatikte yatay kaydırma da sayfa çevirir (dikey kaydırma sayfanındır:
 * `touch-action: pan-y`). Liste kısalırsa sayfa kendiliğinden geri çekilir.
 */
export function usePager(items, size) {
  const list = items ?? []
  const pages = Math.max(1, Math.ceil(list.length / size))
  const [raw, setRaw] = useState(0)
  const [dir, setDir] = useState(1)
  const start = useRef(null)
  const page = Math.min(raw, pages - 1)

  const go = (step) => {
    const next = page + step
    if (next < 0 || next >= pages) return
    setDir(step)
    setRaw(next)
  }

  return {
    page,
    pages,
    dir,
    items: list.slice(page * size, page * size + size),
    prev: () => go(-1),
    next: () => go(1),
    swipe:
      pages > 1
        ? {
            style: { touchAction: "pan-y" },
            onPointerDown: (e) => {
              if (e.pointerType !== "mouse") start.current = { x: e.clientX, y: e.clientY }
            },
            onPointerUp: (e) => {
              const s = start.current
              start.current = null
              if (!s) return
              const dx = e.clientX - s.x
              const dy = e.clientY - s.y
              if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
            },
            onPointerCancel: () => {
              start.current = null
            },
          }
        : {},
  }
}
