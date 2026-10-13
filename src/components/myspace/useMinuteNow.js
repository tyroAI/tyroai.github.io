import { useEffect, useState } from "react"

/**
 * Dakika saati — bir sonraki DAKİKA SINIRINA kurulur ve sekmeye dönüşte anında
 * tazelenir (tarih hapının kuralı): mount anından 60 sn'de bir yürüyen bir saat
 * 59 saniyeye kadar geride kalırdı.
 */
export function useMinuteNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let id
    const arm = () => {
      const d = new Date()
      id = setTimeout(
        () => {
          setNow(Date.now())
          arm()
        },
        60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50,
      )
    }
    arm()
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      clearTimeout(id)
      setNow(Date.now())
      arm()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearTimeout(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])
  return now
}
