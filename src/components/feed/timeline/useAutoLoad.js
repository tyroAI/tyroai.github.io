import { useEffect, useRef } from "react"

/**
 * Sonsuz akış: liste sonundaki gözcü öğe görüş alanına yaklaşınca (`margin`) `onLoad` çağrılır.
 * `enabled` false iken (yüklüyor, hata, son sayfa) gözlenmez; düğme yedek olarak durur
 * (klavye ve hata sonrası yeniden deneme).
 */
export function useAutoLoad({ enabled, onLoad, root, margin = "800px" }) {
  const ref = useRef(null)
  const load = useRef(onLoad)
  useEffect(() => {
    load.current = onLoad
  })
  useEffect(() => {
    const el = ref.current
    if (!enabled || !el || typeof IntersectionObserver === "undefined") return undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) load.current?.()
      },
      { root: root?.current ?? null, rootMargin: `0px 0px ${margin} 0px` },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [enabled, root, margin])
  return ref
}
