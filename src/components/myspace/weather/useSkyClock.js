import { useEffect, useState } from "react"

/** Kart ekranda mı — değilse süs döngüleri durur (CSS `data-live`). */
export function useOnScreen(ref) {
  const [on, setOn] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return undefined
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return on
}

/**
 * Dakika saati — bir sonraki DAKİKA SINIRINA kurulan zamanlayıcı ve sekmeye
 * dönüşte anında (tarih hapının kuralı: `setInterval(60 sn)` mount anından
 * saydığı için görünen saat 59 saniyeye kadar geri kalırdı).
 */
export function useMinuteClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let id
    const arm = () => {
      const d = new Date()
      id = setTimeout(
        () => {
          setNow(new Date())
          arm()
        },
        60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50,
      )
    }
    arm()
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      clearTimeout(id)
      setNow(new Date())
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
