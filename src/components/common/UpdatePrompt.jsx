import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { useRegisterSW } from "virtual:pwa-register/react"
import { toast } from "sonner"
import { UpdateCard } from "./update/UpdateCard"
import { useReleaseNotes } from "./update/useReleaseNotes"

/**
 * Yeni sürüm hazır — servis çalışanını kaydeder, yeni sürümü yoklar ve kullanıcının kendi
 * basacağı kartı açar (`UpdateCard`). Diyalog değil toast: güncelleme acil değil, akan bir
 * cevabın önüne modal konmaz. Sabit `id`: ikinci bir sürüm kartı yerinde tazeler.
 * Gerekçeler ve tarihçe: `docs/deployment.md` › PWA.
 */
const TOAST_ID = "tyro-update-ready"

// Tarayıcı `sw.js`'i yalnız gerçek navigasyonda yokluyor; SPA'da hiç kıpırdamayan sekme
// günün sürümünü bu zemin yoklamasıyla öğrenir.
const IDLE_CHECK_MS = 60 * 60 * 1000
// Hareket (rota, tıklama, tuş, sekmeye dönüş) de yoklar; her harekette istek olmasın diye fren.
const ACTIVITY_COOLDOWN_MS = 2 * 60 * 1000
// "Devral"dan sonra `controlling` olayı gelmezse sayfayı biz yenileriz (sağlıklı yolda ~100 ms).
const RELOAD_FALLBACK_MS = 3000
// "Sonra" kartı kalıcı kapatmaz: bu süre sonra yeniden sorar.
const SNOOZE_MS = 2 * 60 * 60 * 1000

export function UpdatePrompt() {
  const location = useLocation()
  // Kayıt state'te: yoklama efekti onu beklemeli; bileşen /login ile kabuk arasında yeniden mount olur.
  const [registration, setRegistration] = useState(null)
  const lastCheckRef = useRef(0)
  const snoozeRef = useRef(0)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) setRegistration(reg)
    },
  })
  const release = useReleaseNotes(needRefresh)

  useEffect(() => {
    if (!registration) return undefined

    const check = (force = false) => {
      if (navigator.onLine === false) return
      const now = Date.now()
      if (!force && now - lastCheckRef.current < ACTIVITY_COOLDOWN_MS) return
      lastCheckRef.current = now
      registration.update().catch(() => {})
    }

    // `pointerdown` (click değil: sürükleme ve uzun basma da harekettir); pasif ve yakalama
    // fazında — hiçbir şeyi engellemez, olayı durduran bileşen olsa da bize ulaşır.
    const onActivity = () => check()
    const onVisible = () => {
      if (document.visibilityState === "visible") check()
    }
    document.addEventListener("pointerdown", onActivity, { capture: true, passive: true })
    document.addEventListener("keydown", onActivity, { capture: true, passive: true })
    document.addEventListener("visibilitychange", onVisible)
    const id = setInterval(() => check(true), IDLE_CHECK_MS)

    return () => {
      document.removeEventListener("pointerdown", onActivity, { capture: true })
      document.removeEventListener("keydown", onActivity, { capture: true })
      document.removeEventListener("visibilitychange", onVisible)
      clearInterval(id)
    }
  }, [registration])

  // Rota değişimi de yoklar; aynı frenden geçer.
  useEffect(() => {
    if (!registration || navigator.onLine === false) return
    const now = Date.now()
    if (now - lastCheckRef.current < ACTIVITY_COOLDOWN_MS) return
    lastCheckRef.current = now
    registration.update().catch(() => {})
  }, [registration, location.pathname])

  useEffect(() => () => clearTimeout(snoozeRef.current), [])

  const apply = useCallback(() => {
    // `updateServiceWorker` yalnız "devral" mesajını gönderir; sayfayı `controlling` olayı
    // yeniler. Olay gelmezse (bekleyen çalışan yok, başka sekme devraldı) biz yenileriz:
    // navigasyon ağdan okunduğu için yenileme bugünün HTML'ini getirir.
    updateServiceWorker(true)
    window.setTimeout(() => window.location.reload(), RELOAD_FALLBACK_MS)
  }, [updateServiceWorker])

  const later = useCallback(() => {
    toast.dismiss(TOAST_ID)
    // `needRefresh` sıfırlanmazsa efekt kartı hemen yeniden açar.
    setNeedRefresh(false)
    clearTimeout(snoozeRef.current)
    snoozeRef.current = window.setTimeout(() => setNeedRefresh(true), SNOOZE_MS)
  }, [setNeedRefresh])

  useEffect(() => {
    if (!needRefresh) return
    // Alt-ortada: sürüm duyurusu sağ alttaki iş bildirimlerinden ayrı durur. Çakışırlarsa
    // (dar ekran) bildirim yığını kartın üstüne çıkar — `UpdateCard` kaçınma alanı.
    toast.custom(() => <UpdateCard release={release} onApply={apply} onLater={later} />, {
      id: TOAST_ID,
      duration: Infinity,
      position: "bottom-center",
    })
  }, [needRefresh, release, apply, later])

  return null
}
