/** Dosyalarım'ın tarih kuralları: süzgeç presetleri ve gün bantları — `lib/filesQuery.js`in parçası. */

/** Tarih süzgecinin seçenekleri; `""` = her zaman. */
export const DATE_PRESETS = ["today", "7d", "30d", "90d", "year", "older"]
const PRESET_DAYS = { today: 0, "7d": 6, "30d": 29, "90d": 89, year: 364, older: 365 }

/**
 * Presetin YEREL gece yarısı sınırı (epoch ms). "Son 7 gün" bugün dahil
 * yedi takvim günü: bugünün gece yarısından altı gün geri.
 *
 * ⚠️ Sınır tarih PARÇALARINDAN kuruluyor, `toISOString()`ten DEĞİL: UTC'ye
 * çevirip günü kesmek, gece yarısı ile UTC farkı arasında (İstanbul'da
 * 00:00–03:00) sınırı bir gün kaydırırdı. Aynı gün içinde sabit kalıyor, yani
 * dakika tikinde sorgu değişip yeniden istek atılmıyor.
 */
export function dateFloor(preset, now = Date.now()) {
  if (!(preset in PRESET_DAYS)) return null
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - PRESET_DAYS[preset])
  return d.getTime()
}

/** Tarihin preset'e uyup uymadığı — istemci tarafı yeniden sınama. */
export function matchesDate(iso, preset, now = Date.now()) {
  if (!preset) return true
  const floor = dateFloor(preset, now)
  if (floor == null) return true
  const t = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(t)) return false
  return preset === "older" ? t < floor : t >= floor
}

/** Yerel gün anahtarı — `toISOString()` DEĞİL (bkz. `dateFloor`). */
function localDay(t) {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/**
 * Tarih bantları: Bugün · Dün · Bu hafta · Bu ay · Daha eski. Hafta başı
 * dilin kuralı (`firstDay`, `lib/weekStart.js`), ızgarayla aynı tablo.
 * Sırayı DEĞİŞTİRMEZ — çağıran önce tarihe göre sıralar.
 */
export function dayBucket(iso, now = Date.now(), firstDay = 1) {
  const t = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(t)) return "older"
  if (localDay(t) === localDay(now)) return "today"
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (localDay(t) === localDay(y.getTime())) return "yesterday"
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() - firstDay + 7) % 7))
  if (t >= start.getTime()) return "week"
  const month = new Date(now)
  if (
    new Date(t).getFullYear() === month.getFullYear() &&
    new Date(t).getMonth() === month.getMonth()
  )
    return "month"
  return "older"
}

export const DAY_BUCKETS = ["today", "yesterday", "week", "month", "older"]

/** Ardışık aynı banttaki satırlar tek grup: `[{ id, items }]`. */
export function groupByDay(items, now = Date.now(), firstDay = 1) {
  const groups = []
  for (const it of items) {
    const id = dayBucket(it.modified, now, firstDay)
    const g = groups[groups.length - 1]
    if (g && g.id === id) g.items.push(it)
    else groups.push({ id, items: [it] })
  }
  return groups
}
