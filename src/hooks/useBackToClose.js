import { useEffect, useRef } from "react"

// Geri alınan adımın `popstate`i beklenirken yeni adım eklenmez: menü çekmecesi kapanıp form
// açılırken eklenen adımı, geri alınan eski adımın yolculuğu yemesin.
let settling = null

/** Bekleyen geri adım varsa bittikten sonra çalıştırır (adresi değiştiren seçim, `ReportBar`). */
export function afterBackSettles(fn) {
  setTimeout(() => (settling ?? Promise.resolve()).then(fn), 0)
}

/**
 * Telefonda açık çekmeceyi Geri tuşu kapatsın, sayfadan çıkarmasın: açılınca aynı adrese bir
 * geçmiş adımı eklenir; Geri o adımı yer ve `onBack()` çağrılır. `onBack` `false` dönerse (ör.
 * silinecek veri için onay soruluyor) adım yeniden eklenir, sonraki Geri de yakalanır. Çekmece
 * başka yoldan kapanırsa eklenen adım geri alınır: fazladan "boş" Geri kalmaz.
 */
export function useBackToClose(active, onBack) {
  const cb = useRef(onBack)
  useEffect(() => {
    cb.current = onBack
  })
  useEffect(() => {
    if (!active) return undefined
    const mark = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    const ours = () => window.history.state?.backToClose === mark
    const push = () => window.history.pushState({ ...window.history.state, backToClose: mark }, "")
    const onPop = () => {
      if (!ours() && cb.current?.() === false) push()
    }
    let live = true
    // Ertelenir: StrictMode'un kur → sök → kur'u iki adım ekleyip birini geri almasın.
    afterBackSettles(() => {
      if (!live) return
      push()
      window.addEventListener("popstate", onPop)
    })
    return () => {
      live = false
      window.removeEventListener("popstate", onPop)
      if (!ours()) return
      settling = new Promise((done) =>
        window.addEventListener(
          "popstate",
          () => {
            settling = null
            done()
          },
          { once: true },
        ),
      )
      window.history.back()
    }
  }, [active])
}
