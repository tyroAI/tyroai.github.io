import { useCallback, useEffect, useState } from "react"
import { useLocale } from "@/hooks/useLocale"
import { WEATHER } from "@/lib/weatherPolicy"
import {
  currentPosition,
  fetchForecast,
  geolocationGranted,
  lookupPlace,
  parseForecast,
} from "@/lib/weather"

/**
 * Hava durumu — konum + tahmin (gerekçeler `lib/weather.js`te).
 *
 * ⚠️ ÖNBELLEK YALNIZ BELLEKTE (30 dk, `WEATHER.ttlMs`) ve çıkışta düşer
 * (`msal.js` LOGOUT zinciri): kişinin kendi konumu da bir kişisel veri,
 * paylaşılan bir tarayıcıda bir sonraki kullanıcıya kalmasın. Diske hiçbir
 * şey yazılmaz — konum iznini tarayıcı zaten hatırlıyor.
 * ⚠️ Uçuştaki tur paylaşılır: StrictMode'un çift efekti iki istek atmasın.
 */
let cache = null // { at, locale, place, forecast }
let inflight = null
let preferPrecise = false

export function clearWeatherCache() {
  cache = null
  inflight = null
  preferPrecise = false
}

async function resolvePlace(locale, precise) {
  if (precise || preferPrecise || (await geolocationGranted())) {
    try {
      const pos = await currentPosition()
      const place = await lookupPlace({ ...pos, locale }).catch(() => ({ name: "" }))
      return { name: place.name, lat: pos.lat, lon: pos.lon, approx: false }
    } catch (e) {
      // Kullanıcı bastıysa reddi söyle; kendiliğinden denendiyse IP'ye düş.
      if (precise) throw e
    }
  }
  return lookupPlace({ locale })
}

async function load(locale, precise = false) {
  const place = await resolvePlace(locale, precise)
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) throw new Error("noplace")
  const forecast = parseForecast(await fetchForecast(place.lat, place.lon))
  if (!forecast) throw new Error("noforecast")
  return { at: Date.now(), locale, place, forecast }
}

const HOUR = 60 * 60 * 1000
// ⚠️ "Taze" İKİ şart: önbellek ömrü (30 dk) VE tahminin "şimdi"si bitmemiş olmalı.
// Ömür tek başına yetmiyordu: saat dönünce hap ve "Şimdi" hücresi geçen saati
// anlatıyordu (ölçüldü: 19:55'te alınan tahmin 20:20'de hâlâ 19:00'u gösteriyordu).
const fresh = (locale) =>
  cache &&
  cache.locale === locale &&
  Date.now() - cache.at < WEATHER.ttlMs &&
  Date.now() < cache.forecast.current.at.getTime() + HOUR

/**
 * @returns {{ status: "off"|"loading"|"ready"|"error", place?, forecast?,
 *   locating: boolean, notice: ""|"denied"|"unavailable", locateMe: () => Promise<void> }}
 */
/**
 * `enabled: false` → hiç istek yok, durum `off`. Çağıran kancayı KOŞULSUZ
 * çağırır. (2026-10-03'e kadar Akışım kutlama günü kapatıyordu; artık tebrik
 * hava kartının içinde ve kart o gün de çizilir — bugün tüketicisi yok.)
 */
export function useWeather({ enabled = true } = {}) {
  const on = WEATHER.enabled && enabled
  const { locale } = useLocale()
  const [state, setState] = useState(() =>
    !WEATHER.enabled
      ? { status: "off" }
      : cache
        ? { status: "ready", ...cache }
        : { status: "loading" },
  )
  const [nonce, setNonce] = useState(0)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    if (!on || fresh(locale)) return undefined
    let alive = true
    if (!inflight) inflight = load(locale).finally(() => (inflight = null))
    inflight.then(
      (v) => {
        cache = v
        if (alive) setState({ status: "ready", ...v })
      },
      () => {
        if (alive) setState((s) => (s.status === "ready" ? s : { status: "error" }))
      },
    )
    return () => {
      alive = false
    }
  }, [locale, nonce, on])

  // Sayfa açık ve GÖRÜNÜR kaldıkça "şimdi" ilerlesin: tahminin şimdisi bitince bir
  // kez tazele (en geç bir saat). Gizli sekmede tetiklenmez — dönüşte aşağıdaki
  // `visibilitychange` zaten soruyor. Uçuştaki tur paylaşıldığı için iki tüketici
  // iki istek atmaz.
  const currentAt = state.status === "ready" ? state.forecast.current.at.getTime() : 0
  useEffect(() => {
    if (!on || !currentAt) return undefined
    const id = setTimeout(
      () => {
        if (document.visibilityState === "visible" && !fresh(locale)) setNonce((n) => n + 1)
      },
      Math.max(0, currentAt + HOUR - Date.now()) + 15_000,
    )
    return () => clearTimeout(id)
  }, [currentAt, locale, on])

  // Sekmeye dönüşte bayatsa tazele (sayfa gün boyu açık kalabiliyor).
  useEffect(() => {
    if (!on) return undefined
    const onVisible = () => {
      if (document.visibilityState === "visible" && !fresh(locale)) setNonce((n) => n + 1)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [locale, on])

  const locateMe = useCallback(async () => {
    setLocating(true)
    setNotice("")
    try {
      const v = await load(locale, true)
      preferPrecise = true
      cache = v
      setState({ status: "ready", ...v })
    } catch (e) {
      setNotice(e?.code === "denied" ? "denied" : "unavailable")
    } finally {
      setLocating(false)
    }
  }, [locale])

  return on
    ? { ...state, locating, notice, locateMe }
    : { status: "off", locating: false, notice: "", locateMe }
}
