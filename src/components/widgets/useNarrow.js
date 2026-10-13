import { useEffect, useState } from "react"

/**
 * Kartın içeriği dar mı (`limit` px altında) — sayfa başına öğe sayısı gibi JS'in
 * vermesi gereken kararlar için. Görünümün kendisi kap sorgusunda (`@container/widget`);
 * eşik aynı tutulur.
 */
export function useNarrow(ref, limit) {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return undefined
    const ro = new ResizeObserver(() => setNarrow(el.offsetWidth < limit))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, limit])
  return narrow
}
