import { useEffect, useState } from "react"

/**
 * Ekranda duran saat için "şimdi": bir sonraki DAKİKA SINIRINA kurulan zamanlayıcıyla
 * tazelenir (her tur yeniden hizalanır, sapma birikmez; `setInterval(60 sn)` duvardaki
 * saatten 59 sn geri kalabiliyordu). Sekmeye dönülünce hemen tazelenir.
 */
export function useMinuteNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50)
    }
    const tick = () => {
      setNow(new Date())
      schedule()
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") tick()
    }
    schedule()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])
  return now
}
