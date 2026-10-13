import { DEFAULT_CITY_IDS, EXTRA_CITIES, HOME_CITY, OFFICE_CITIES } from "@/data/worldCities"
import { getDateTimeFormat } from "@/lib/intl-cache"

export const STORAGE_KEY = "tyro-world-clock-v1"
const HOUR = 3600000

const CATALOG = new Map([...OFFICE_CITIES, ...EXTRA_CITIES].map((c) => [c.id, c]))

export function isValidZone(tz) {
  try {
    getDateTimeFormat("en", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** "America/Sao_Paulo" → "Sao Paulo". */
export function zoneCityName(tz) {
  return tz.split("/").pop().replace(/_/g, " ")
}

/** Katalogdaki şehir ya da IANA'dan türetilen `tz:Bölge/Şehir`; yoksa `null`. */
export function cityById(id) {
  if (CATALOG.has(id)) return CATALOG.get(id)
  if (typeof id === "string" && id.startsWith("tz:")) {
    const tz = id.slice(3)
    return isValidZone(tz) ? { id, tz, cc: null, names: { en: zoneCityName(tz) } } : null
  }
  return null
}

export function cityName(city, locale) {
  return city.names[locale] ?? city.names.en ?? city.names.tr
}

/** Saat diliminin o anki UTC farkı (dakika) — yaz saati dahil. */
export function offsetMinutes(tz, date) {
  const parts = getDateTimeFormat("en", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(
    date,
  )
  const value = parts.find((p) => p.type === "timeZoneName")?.value ?? ""
  const m = value.match(/GMT([+-])(\d{1,2}):?(\d{2})?/)
  if (!m) return 0
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0))
}

/** Şehrin duvar saati: { y, mo, d, h, mi } (ay 1 tabanlı). */
export function wallClock(tz, date) {
  const parts = getDateTimeFormat("en", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(date)
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour") % 24, mi: get("minute") }
}

/** İki şehrin takvim günü farkı (-1 · 0 · +1) — "yarın"/"dün" işareti için. */
export function dayDiff(tz, homeTz, date) {
  const a = wallClock(tz, date)
  const b = wallClock(homeTz, date)
  return Math.round((Date.UTC(a.y, a.mo - 1, a.d) - Date.UTC(b.y, b.mo - 1, b.d)) / 86400000)
}

/** Ana şehre göre fark etiketi: "+5", "−7", "+5:30", "±0". */
export function offsetLabel(minutes) {
  if (minutes === 0) return "±0"
  const sign = minutes > 0 ? "+" : "−"
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return m ? `${sign}${h}:${String(m).padStart(2, "0")}` : `${sign}${h}`
}

/** Ana şehirde `y-mo-d` gününün gece yarısı (UTC anı). */
export function homeMidnight(homeTz, y, mo, d) {
  const guess = Date.UTC(y, mo - 1, d)
  let at = guess - offsetMinutes(homeTz, new Date(guess)) * 60000
  // Yaz saati geçişine denk gelirse fark bir kez daha düzeltilir.
  at = guess - offsetMinutes(homeTz, new Date(at)) * 60000
  return at
}

/**
 * Gün dilimi — şeridin rengi: gece · sabah erken / akşam · mesai.
 * Toplantı için uygun saatler (08–18) bir bakışta seçilsin.
 */
export function dayPeriod(hour) {
  if (hour < 6 || hour >= 22) return "night"
  if (hour < 8 || hour >= 18) return "edge"
  return "work"
}

/** Ana şehrin seçili gününün 24 saati boyunca şehrin yerel saatleri. */
export function hourStrip(tz, start) {
  return Array.from({ length: 24 }, (_, i) => {
    const at = new Date(start + i * HOUR)
    const w = wallClock(tz, at)
    return { at, ...w, period: dayPeriod(w.h) }
  })
}

/** Arama için: küçük harf, aksansız, Türkçe ı/İ düz. */
export function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/g, "i")
    .trim()
}

function zoneList() {
  try {
    return Intl.supportedValuesOf?.("timeZone") ?? []
  } catch {
    return []
  }
}

/**
 * Şehir araması: önce katalog (ad · ülke adı · saat dilimi), sonra tarayıcının
 * IANA listesi (katalogda olmayan her şehir). Listede olanlar çıkarılır.
 */
export function searchCities(
  query,
  { locale = "en", regionName = () => "", exclude = [], limit = 8 } = {},
) {
  const q = normalize(query)
  if (!q) return []
  const skip = new Set(exclude)
  const out = []
  const seenTz = new Set()
  const score = (texts) => {
    const n = texts.map(normalize)
    if (n.some((x) => x.startsWith(q))) return 2
    if (n.some((x) => x.includes(q))) return 1
    return 0
  }
  const catalog = [...CATALOG.values()]
    .map((c) => ({ c, s: score([...Object.values(c.names), regionName(c.cc), c.tz]) }))
    .filter((x) => x.s > 0 && !skip.has(x.c.id))
    .sort((a, b) => b.s - a.s || cityName(a.c, locale).localeCompare(cityName(b.c, locale)))
  for (const { c } of catalog) {
    out.push(c)
    seenTz.add(`${c.tz}|${normalize(c.names.en)}`)
  }
  for (const tz of zoneList()) {
    if (out.length >= limit * 2) break
    const name = zoneCityName(tz)
    const id = `tz:${tz}`
    if (skip.has(id) || seenTz.has(`${tz}|${normalize(name)}`)) continue
    if (score([name, tz]) > 0) out.push({ id, tz, cc: null, names: { en: name } })
  }
  return out.slice(0, limit)
}

export const DEFAULT_STATE = { home: HOME_CITY, cities: DEFAULT_CITY_IDS }

/** Kayıttan durumu okur; bozuk ya da eski kayıt `null` (varsayılan kullanılır). */
export function parseStored(raw) {
  try {
    const s = JSON.parse(raw)
    if (s?.v !== 1 || !Array.isArray(s.cities)) return null
    const cities = [...new Set(s.cities)].filter((id) => cityById(id))
    if (!cities.length) return null
    return { home: cities.includes(s.home) ? s.home : cities[0], cities }
  } catch {
    return null
  }
}

/** Görüntü sırası: ana şehir başta, ötekiler batıdan doğuya (UTC farkına göre). */
export function orderCities(ids, home, date) {
  const cities = ids.map(cityById).filter(Boolean)
  const homeCity = cities.find((c) => c.id === home)
  const rest = cities
    .filter((c) => c.id !== home)
    .map((c) => ({ c, off: offsetMinutes(c.tz, date) }))
    .sort((a, b) => a.off - b.off)
    .map((x) => x.c)
  return homeCity ? [homeCity, ...rest] : rest
}
