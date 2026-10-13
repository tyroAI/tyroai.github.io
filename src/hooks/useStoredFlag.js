import { useCallback, useState } from "react"

/**
 * localStorage'da tutulan açık/kapalı tercihi (ör. katlanan bir kartın durumu). Depolama
 * kapalıysa (gizli pencere, kota) tercih yalnız bu oturumda yaşar; hata fırlatılmaz.
 */
export function useStoredFlag(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = window.localStorage.getItem(key)
      return saved === null ? initial : saved === "1"
    } catch {
      return initial
    }
  })
  const set = useCallback(
    (next) => {
      setValue(next)
      try {
        window.localStorage.setItem(key, next ? "1" : "0")
      } catch {
        /* yalnız oturumluk */
      }
    },
    [key],
  )
  return [value, set]
}
