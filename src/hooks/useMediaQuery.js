import { useCallback, useSyncExternalStore } from "react"

/**
 * Bir CSS medya sorgusunun cevabı, React durumunda.
 *
 * `useIsMobile` 768'e (md) çivili; çentik ise `lg`+ (1024). Header'ın
 * "çentik ekranda mı" kararı ikinci eşiği soruyor ve eşiği bir daha
 * kopyalamak yerine sorguyu parametre alan bir kanca var. Sunucu/ilk boyama
 * `false`: yanlış "geniş" bir düğmeyi gizler, yanlış "dar" yalnız bir kare
 * fazladan gösterir — ikincisi ucuz.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (cb) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", cb)
      return () => mql.removeEventListener("change", cb)
    },
    [query],
  )
  const get = useCallback(() => window.matchMedia(query).matches, [query])
  return useSyncExternalStore(subscribe, get, () => false)
}
