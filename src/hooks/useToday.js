import { useEffect, useState } from "react"

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Bugünün başı; yalnız gün değişince yenilenir (gece yarısı ve sekmeye dönüşte). Sayfa gece açık
 * kalsa da "x gün sonra" gibi değerler eskimez; dakikalık yeniden çizim (`useMinuteNow`) olmaz.
 */
export function useToday() {
  const [today, setToday] = useState(startOfToday)
  useEffect(() => {
    let timer
    const sync = () => {
      const next = startOfToday()
      setToday((prev) => (prev.getTime() === next.getTime() ? prev : next))
      clearTimeout(timer)
      const tomorrow = new Date(next.getFullYear(), next.getMonth(), next.getDate() + 1)
      timer = setTimeout(sync, tomorrow.getTime() - Date.now() + 1000)
    }
    const onVisible = () => document.visibilityState === "visible" && sync()
    sync()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])
  return today
}
