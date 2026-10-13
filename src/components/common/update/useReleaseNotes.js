import { useEffect, useState } from "react"

/**
 * Bekleyen yeni sürümün `version.json`'ı (sha, derleme zamanı, en yeni kayıtlar). Yalnız
 * kart açıkken bir kez okunur; ön-önbellekte yok, sorgu dizesi HTTP önbelleğini atlatır.
 * Okunamazsa `null`: kart genel metinle çıkar.
 */
export function useReleaseNotes(active) {
  const [release, setRelease] = useState(null)
  useEffect(() => {
    if (!active) return undefined
    let alive = true
    fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        // Okunduğu an: kart derleme zamanını "bugün mü" diye buna göre yazar (render saf kalır).
        if (alive && data) setRelease({ ...data, fetchedAt: Date.now() })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [active])
  return release
}
