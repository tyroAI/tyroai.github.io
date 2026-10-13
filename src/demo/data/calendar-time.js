// Takvim ve To Do demo verisinin ortak zaman yardımcıları. Her şey İSTEK ANINA
// göredir (`new Date()`); yalnız "canlı" toplantı oturumun açıldığı ana çapalı
// (`SESSION_NOW`) — aksi hâlde her yeniden okumada bir dakika kayardı.

export const MIN = 60_000
export const HOUR = 60 * MIN
export const DAY = 24 * HOUR

/** Modülün yüklendiği an: sayfanın açıldığı an. */
export const SESSION_NOW = new Date()

export const pad = (n) => String(n).padStart(2, "0")

export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Yerel takvim günü: `2026-10-13`. */
export function dayKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Kimliklerde kullanılan sıkı biçim: `20261013`. */
export const compactKey = (d) => dayKey(d).replace(/-/g, "")

export function fromCompact(s) {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(String(s ?? ""))
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

/** `day` gününün yerel `dakika` anı (gün içi dakika: 570 = 09:30). */
export function atMinute(day, minutes) {
  const x = startOfDay(day)
  x.setMinutes(minutes)
  return x
}

/** a → b kaç takvim günü (yaz saati geçişinde de tam sayı). */
export const dayDiff = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY)

export const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6

export function browserZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

const formatters = new Map()
function formatterFor(zone) {
  if (!formatters.has(zone)) {
    formatters.set(
      zone,
      new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }),
    )
  }
  return formatters.get(zone)
}

/** Bir anın `zone`daki duvar saati — Graph'ın ofsetsiz `dateTime` biçimi. */
export function wallClock(ms, zone = "UTC") {
  let parts
  try {
    parts = formatterFor(zone).formatToParts(new Date(ms))
  } catch {
    return wallClock(ms, "UTC")
  }
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "00"
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}.0000000`
}

/** Graph `dateTimeTimeZone` → ms. Saat dilimi tarayıcınınsa yerel, UTC ise UTC, değilse Intl ile. */
export function zonedToMs(value) {
  const raw = String(value?.dateTime ?? "")
  if (!raw) return NaN
  const zone = value?.timeZone || "UTC"
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(raw)) return Date.parse(raw)
  if (zone.toUpperCase() === "UTC") return Date.parse(`${raw}Z`)
  if (zone === browserZone()) return new Date(raw).getTime()
  // Başka bir bölge: tahmin et, ofseti ölç, düzelt (iki tur yeter).
  const asUtc = Date.parse(`${raw.slice(0, 19)}Z`)
  let guess = asUtc
  for (let i = 0; i < 2; i += 1) {
    const shown = Date.parse(`${wallClock(guess, zone).slice(0, 19)}Z`)
    guess += asUtc - shown
  }
  return guess
}

/** `Prefer: outlook.timezone="X"` başlığındaki bölge; yoksa UTC (Graph'ın varsayılanı). */
export function preferredZone(headers) {
  const entry = Object.entries(headers ?? {}).find(([k]) => k.toLowerCase() === "prefer")
  const m = /outlook\.timezone="?([^",;]+)"?/i.exec(entry?.[1] ?? "")
  if (!m) return "UTC"
  try {
    formatterFor(m[1])
    return m[1]
  } catch {
    return "UTC"
  }
}

/** ms → `{ dateTime, timeZone }`. */
export const graphDate = (ms, zone) => ({ dateTime: wallClock(ms, zone), timeZone: zone })

/** Tüm gün etkinliğinin başı/sonu: o günün gece yarısı, istenen bölgede (Graph'ın yaptığı gibi). */
export const allDayDate = (day, zone) => ({
  dateTime: `${dayKey(day)}T00:00:00.0000000`,
  timeZone: zone,
})

/** Basit, deterministik dize özeti. */
export function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Tohumlu rastgele (mulberry32) — aynı gün aynı içerik. */
export function seeded(str) {
  let a = hash(str)
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pick = (list, rnd) => list[Math.floor(rnd() * list.length) % list.length]
