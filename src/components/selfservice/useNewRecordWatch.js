import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { arrivals, watchDelay } from "@/lib/selfServiceWatch"

const NO_KEYS = new Set()
const hidden = () => typeof document !== "undefined" && document.visibilityState === "hidden"

/**
 * YENİ KAYIT GÖZCÜSÜ. Yeni talep düğmesi talebi sohbette başlatınca (`start(kind)`), sayfa açık
 * ve sekme görünürken ERP verisi artan aralıklarla yeniden okunur (`WATCH_AT_MS`). Sekme
 * gizliyken sayaç durur (kalan süre saklanır), sayfadan çıkınca biter: durum bu bileşende.
 *
 * - `newKeys`: İLK düğmedeki yüklemede olmayan kayıtlar — "Yeni" rozeti, sayfada kaldıkça durur.
 * - `arrived`: SON düğmeden sonra gelen, o düğmenin türünden kayıt; gelince yoklama biter.
 * - `stop()`: satırı kapatır ve yoklamayı bitirir; rozetler kalır.
 *
 * Önbellek ve çıkış kuralı `useSelfService`te; burada yalnız `refresh()` çağrılır.
 */
export function useNewRecordWatch({ data, refresh }) {
  // { id, kind, first, last, step, off } — first: ilk düğmedeki veri, last: son düğmedeki.
  const [watch, setWatch] = useState(null)
  const refreshRef = useRef(refresh)
  useEffect(() => {
    refreshRef.current = refresh
  })

  const start = useCallback(
    (kind) => {
      // Veri hazır değilse karşılaştırılacak bir başlangıç yok: yoklama anlamsız.
      if (!data) return
      setWatch((w) => ({
        id: (w?.id ?? 0) + 1,
        kind,
        first: w?.first ?? data,
        last: data,
        step: 0,
        off: false,
      }))
    },
    [data],
  )
  const stop = useCallback(() => setWatch((w) => (w ? { ...w, off: true } : w)), [])

  const newKeys = useMemo(
    () => (watch && data ? arrivals(watch.first, data, watch.kind).keys : NO_KEYS),
    [watch, data],
  )
  const arrived = useMemo(
    () => (watch && !watch.off && data ? arrivals(watch.last, data, watch.kind).first : null),
    [watch, data],
  )

  const id = watch?.id
  const step = watch?.step
  const live = Boolean(watch && !watch.off && !arrived)
  useEffect(() => {
    const delay = live ? watchDelay(step) : null
    if (delay == null) return
    let left = delay
    let since = 0
    let timer = null
    const fire = () => {
      timer = null
      refreshRef.current?.()
      setWatch((w) => (w?.id === id ? { ...w, step: w.step + 1 } : w))
    }
    const resume = () => {
      if (timer || hidden()) return
      since = Date.now()
      timer = setTimeout(fire, left)
    }
    const pause = () => {
      if (!timer) return
      clearTimeout(timer)
      timer = null
      left = Math.max(0, left - (Date.now() - since))
    }
    const onVisibility = () => (hidden() ? pause() : resume())
    document.addEventListener("visibilitychange", onVisibility)
    resume()
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      if (timer) clearTimeout(timer)
    }
  }, [id, step, live])

  return { active: Boolean(watch && !watch.off), arrived, newKeys, start, stop }
}
