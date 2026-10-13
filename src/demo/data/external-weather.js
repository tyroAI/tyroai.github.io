// Hava durumu — TÜMÜ KURGUSAL ama İstanbul'un o ayki iklimine uygun.
//
// MET Norway `locationforecast/2.0/compact` yanıtının BİREBİR şekli (`lib/weather.js`
// › `parseForecast`), BigDataCloud `reverse-geocode-client` yanıtının da öyle.
// Değerler ZAMANA göre belirlenir (tohum = yerel gün/saat): aynı gün içinde her
// yenilemede aynı tahmin gelir, ertesi gün yenisi — demo her açılışta "canlı" görünür.
import { isSunDown } from "@/lib/sun"

export const ISTANBUL = { lat: 41.08, lon: 29.01, alt: 38 }

const HOUR = 3_600_000
const DAY = 24 * HOUR
const TZ_OFFSET = 3 * HOUR // İstanbul: kalıcı UTC+3 (yaz saati yok)

/** Ay başına [ort. en düşük, ort. en yüksek, yağışlı gün olasılığı, nem %, rüzgâr m/s]. */
const NORMALS = [
  [3.5, 9, 0.55, 80, 4.6], // Oca
  [3, 9.5, 0.5, 78, 4.5],
  [4.5, 12, 0.45, 76, 4.2],
  [8, 16.5, 0.33, 74, 3.6],
  [12.5, 21.5, 0.26, 73, 3.2],
  [17, 26, 0.18, 70, 3.4],
  [20, 28.5, 0.1, 67, 4.2],
  [21, 29, 0.1, 68, 4.1],
  [17.5, 25, 0.2, 71, 3.8],
  [13.5, 20, 0.33, 76, 3.9],
  [9.5, 15, 0.45, 78, 4.2],
  [5.5, 11, 0.55, 80, 4.6],
]

// ---- tohumlu rastgele -------------------------------------------------------
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // murmur3 fmix32: yakın tohumlar (gün 1, gün 2…) birbirine benzer sayı vermesin
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}
function rng(seed) {
  let a = hash(seed)
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round1 = (n) => Math.round(n * 10) / 10
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

/** İstanbul yerel günü: 0 tabanlı gün sırası (UTC+3'e göre). */
const localDayIndex = (t) => Math.floor((t + TZ_OFFSET) / DAY)
const localHour = (t) => new Date(t + TZ_OFFSET).getUTCHours()
const monthOf = (dayIndex) => new Date(dayIndex * DAY).getUTCMonth()

/** Günün ham sıcaklık sapması (°C) — yalnız kendi tohumundan. */
const rawOffset = (dayIndex) => (rng(`wx-off-${dayIndex}`)() - 0.5) * 4

/**
 * Günün "rejimi": hava türü, yağış penceresi, sıcaklık sapması, rüzgâr yönü.
 * Ardışık günler biraz birbirine bağlı (önceki günün ham sapması yarı yarıya
 * taşınır) ki tahmin rastgele zıplamasın — hesap çağrı sırasından BAĞIMSIZ.
 */
const regimeCache = new Map()
function regime(dayIndex) {
  if (regimeCache.has(dayIndex)) return regimeCache.get(dayIndex)
  const r = rng(`wx-day-${dayIndex}`)
  const month = monthOf(dayIndex)
  const [, , rainProb] = NORMALS[month]
  let kind
  const roll = r()
  if (roll < rainProb) {
    const sub = r()
    const summer = month >= 5 && month <= 9
    if (summer && sub < 0.25) kind = "thunder"
    else if (sub < 0.55) kind = "showers"
    else if (sub < 0.85) kind = "rain"
    else kind = "lightrain"
  } else {
    const sub = r()
    const misty = (month >= 9 || month <= 2) && sub > 0.93
    kind = misty
      ? "fog"
      : sub < 0.3
        ? "clear"
        : sub < 0.55
          ? "fair"
          : sub < 0.82
            ? "partly"
            : "cloudy"
  }
  const wet = ["rain", "lightrain", "showers", "thunder"].includes(kind)
  const offset = clamp(
    rawOffset(dayIndex - 1) * 0.5 + rawOffset(dayIndex) - (wet ? 1.5 : 0),
    -4.5,
    4,
  )
  const value = {
    kind,
    wet,
    offset,
    amp: wet || kind === "cloudy" ? 0.6 : kind === "clear" ? 1.1 : 0.9,
    // yağmurun yağdığı saatler (yerel): sürekli yağmurda bir pencere, sağanakta dağınık
    rainFrom: 6 + Math.floor(r() * 10),
    rainLen: 3 + Math.floor(r() * 6),
    // poyraz (KD) ya da lodos (GB)
    windDir: r() < 0.62 ? 25 + r() * 40 : 195 + r() * 40,
    windBoost: (r() - 0.3) * 3,
    pressure: 1008 + r() * 16,
  }
  regimeCache.set(dayIndex, value)
  if (regimeCache.size > 400) regimeCache.delete(regimeCache.keys().next().value)
  return value
}

/** Saatin değerleri: sıcaklık, nem, rüzgâr, bulut, tür ve o saatin yağışı (mm). */
function hourly(t) {
  const day = localDayIndex(t)
  const h = localHour(t)
  const month = monthOf(day)
  const [lo, hi, , hum, wind] = NORMALS[month]
  const today = regime(day)
  // sapmayı öğlen-öğlen arası yumuşat: gece yarısında sıcaklık zıplamasın
  const frac = (((t + TZ_OFFSET) % DAY) / DAY + 1) % 1
  const other = regime(frac < 0.5 ? day - 1 : day + 1)
  const w = frac < 0.5 ? 0.5 - frac : frac - 0.5 // 0 öğlen, 0.5 gece yarısı
  const offset = today.offset * (1 - w) + other.offset * w
  const amp = today.amp * (1 - w) + other.amp * w
  const mean = (lo + hi) / 2 + offset
  const half = ((hi - lo) / 2) * amp
  // en düşük ~06:00, en yüksek ~15:00 (asimetrik gün eğrisi)
  const phase = h >= 6 && h <= 15 ? (h - 6) / 9 : h > 15 ? 1 - (h - 15) / 15 : 1 - (h + 9) / 15
  const noise = rng(`wx-hour-${Math.floor(t / HOUR)}`)
  const temp = mean - half + 2 * half * Math.sin((phase * Math.PI) / 2) + (noise() - 0.5) * 0.6

  let kind = today.kind
  let precip = 0
  if (today.kind === "fog") kind = h >= 4 && h <= 10 ? "fog" : "partly"
  if (today.wet) {
    const inWindow = h >= today.rainFrom && h < today.rainFrom + today.rainLen
    if (today.kind === "showers" || today.kind === "thunder") {
      const raining = h >= 10 && h <= 21 && noise() < 0.38
      kind = raining ? today.kind : "partly"
      if (raining) precip = today.kind === "thunder" ? 1 + noise() * 5 : 0.2 + noise() * 2.6
    } else if (inWindow) {
      kind = today.kind
      precip = today.kind === "lightrain" ? 0.1 + noise() * 0.5 : 0.5 + noise() * 2
      if (today.kind === "rain" && precip > 2.2) kind = "heavyrain"
    } else kind = "cloudy"
    // soğuk havada yağış kar ya da karla karışık yağmur (İstanbul kışı)
    if (precip > 0 && temp < 1.5) kind = "snow"
    else if (precip > 0 && temp < 3.5) kind = "sleet"
  }
  const cloudBy = { clear: 6, fair: 22, partly: 52, cloudy: 92, fog: 100 }
  const cloud = clamp((cloudBy[kind] ?? 95) + (noise() - 0.5) * 12, 0, 100)
  const night = h < 7 || h > 19
  const humidity = clamp(
    hum + (night ? 7 : h >= 12 && h <= 17 ? -9 : 0) + (precip > 0 ? 12 : 0) + (noise() - 0.5) * 6,
    35,
    98,
  )
  const windSpeed = clamp(
    wind + today.windBoost + (h >= 11 && h <= 18 ? 1.2 : -0.6) + noise(),
    0.6,
    13,
  )
  return {
    temp: round1(temp),
    humidity: round1(humidity),
    windSpeed: round1(windSpeed),
    windDir: round1(today.windDir + (noise() - 0.5) * 30),
    pressure: round1(today.pressure + (noise() - 0.5) * 2),
    cloud: round1(cloud),
    kind,
    precip: round1(precip),
  }
}

const SEVERITY = [
  "clear",
  "fair",
  "partly",
  "cloudy",
  "fog",
  "lightrain",
  "showers",
  "rain",
  "sleet",
  "snow",
  "heavyrain",
  "thunder",
]

/** Türü MET sembol koduna çevirir; gündüz/gece eki güneşin konumundan. */
function symbol(kind, t, lat, lon) {
  const phase = isSunDown(lat, lon, new Date(t + 30 * 60_000)) ? "night" : "day"
  switch (kind) {
    case "clear":
      return `clearsky_${phase}`
    case "fair":
      return `fair_${phase}`
    case "partly":
      return `partlycloudy_${phase}`
    case "showers":
      return `rainshowers_${phase}`
    case "thunder":
      return `rainshowersandthunder_${phase}`
    default:
      return kind // cloudy · fog · lightrain · rain · heavyrain (eksiz)
  }
}

/** `hours` saatlik pencerenin özeti: en şiddetli tür + toplam yağış. */
function windowSummary(t, hours, lat, lon) {
  let worst = "clear"
  let precip = 0
  for (let i = 0; i < hours; i++) {
    const x = hourly(t + i * HOUR)
    precip += x.precip
    if (SEVERITY.indexOf(x.kind) > SEVERITY.indexOf(worst)) worst = x.kind
  }
  // 6/12 saatlik pencerelerde MET güneşin pencerenin ortasındaki konumuna bakar
  return { symbol: symbol(worst, t + (hours / 2 - 0.5) * HOUR, lat, lon), precip: round1(precip) }
}

function instant(t) {
  const x = hourly(t)
  return {
    details: {
      air_pressure_at_sea_level: x.pressure,
      air_temperature: x.temp,
      cloud_area_fraction: x.cloud,
      relative_humidity: x.humidity,
      wind_from_direction: x.windDir,
      wind_speed: x.windSpeed,
    },
  }
}

/** MET `compact` yanıtı — ilk ~60 saat saatlik, sonra UTC 00/06/12/18'de 6 saatlik, ~9,5 gün. */
export function metForecast({ lat = ISTANBUL.lat, lon = ISTANBUL.lon, now = Date.now() } = {}) {
  const start = Math.floor(now / HOUR) * HOUR
  const end = start + 228 * HOUR
  const series = []
  for (let i = 0; i < 60; i++) {
    const t = start + i * HOUR
    const one = hourly(t)
    const six = windowSummary(t, 6, lat, lon)
    const twelve = windowSummary(t, 12, lat, lon)
    series.push({
      time: new Date(t).toISOString().replace(".000Z", "Z"),
      data: {
        instant: instant(t),
        next_12_hours: { summary: { symbol_code: twelve.symbol }, details: {} },
        next_1_hours: {
          summary: { symbol_code: symbol(one.kind, t, lat, lon) },
          details: { precipitation_amount: one.precip },
        },
        next_6_hours: {
          summary: { symbol_code: six.symbol },
          details: { precipitation_amount: six.precip },
        },
      },
    })
  }
  let t = start + 60 * HOUR
  t = Math.ceil(t / (6 * HOUR)) * 6 * HOUR
  for (; t <= end; t += 6 * HOUR) {
    const last = t + 6 * HOUR > end
    const data = { instant: instant(t) }
    if (!last) {
      const six = windowSummary(t, 6, lat, lon)
      data.next_6_hours = {
        summary: { symbol_code: six.symbol },
        details: { precipitation_amount: six.precip },
      }
      if (t + 12 * HOUR <= end)
        data.next_12_hours = {
          summary: { symbol_code: windowSummary(t, 12, lat, lon).symbol },
          details: {},
        }
    }
    series.push({ time: new Date(t).toISOString().replace(".000Z", "Z"), data })
  }
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat, ISTANBUL.alt] },
    properties: {
      meta: {
        updated_at: new Date(start - 23 * 60_000).toISOString().replace(/\.\d+Z$/, "Z"),
        units: {
          air_pressure_at_sea_level: "hPa",
          air_temperature: "celsius",
          cloud_area_fraction: "%",
          precipitation_amount: "mm",
          relative_humidity: "%",
          wind_from_direction: "degrees",
          wind_speed: "m/s",
        },
      },
      timeseries: series,
    },
  }
}

// ---- BigDataCloud ters coğrafi kod -------------------------------------------
const CITY = { tr: "İstanbul", en: "Istanbul", ru: "Стамбул", ar: "إسطنبول" }
const LOCALITY = { tr: "Beşiktaş", en: "Besiktas", ru: "Бешикташ", ar: "بشكتاش" }
const COUNTRY = { tr: "Türkiye", en: "Türkiye", ru: "Турция", ar: "تركيا" }

/** `reverse-geocode-client` — koordinat verilirse o nokta, verilmezse "IP'den" İstanbul. */
export function reverseGeocode({ lat, lon, lang = "tr" } = {}) {
  const l = CITY[lang] ? lang : "en"
  const precise = Number.isFinite(lat) && Number.isFinite(lon)
  return {
    latitude: precise ? lat : 41.0122,
    longitude: precise ? lon : 28.976,
    lookupSource: precise ? "coordinates" : "ipGeolocation",
    plusCode: "8GHC2XJF+GQ",
    localityLanguageRequested: lang,
    continent: l === "tr" ? "Avrupa" : "Europe",
    continentCode: "EU",
    countryName: COUNTRY[l],
    countryCode: "TR",
    principalSubdivision: CITY[l],
    principalSubdivisionCode: "TR-34",
    city: CITY[l],
    locality: LOCALITY[l],
    postcode: "34330",
    localityInfo: { administrative: [], informative: [] },
  }
}
