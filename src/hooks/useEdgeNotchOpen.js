import { useCallback, useSyncExternalStore } from "react"
import { edgeNotchFallback, readEdgeNotchOpen, subscribeEdgeNotch } from "@/lib/edgeNotchState"

/** Çentik bu kapsamda açık mı (kullanıcı tercihi, bu tarayıcıda; bkz. `edgeNotchState`). */
export function useEdgeNotchOpen(scope = "pages") {
  const read = useCallback(() => readEdgeNotchOpen(scope), [scope])
  return useSyncExternalStore(subscribeEdgeNotch, read, () => edgeNotchFallback(scope))
}
