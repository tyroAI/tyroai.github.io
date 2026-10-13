/**
 * Türkiye resmî tatilleri ve köprü önerisi — Sıradaki tatil widget'ı.
 * `eve`: yarım günlük arife. Adlar sözlükte (`widgets.holiday.name.<key>`).
 *
 * DEMO: liste BUGÜNE GÖRE kurulur (geçen yıl → üç yıl sonrası), yani kart hangi
 * yıl açılırsa açılsın yaklaşan tatilleri gösterir. Sabit tarihli bayramlar her
 * yıl aynı; dini bayramların ilk günleri aşağıdaki tablodan (Diyanet takvimine
 * yakın, yaklaşık), tablonun ötesi ay yılı adımıyla (354,37 gün) tahmin edilir.
 */
const FIXED = [
  ["newYear", "01-01", 1],
  ["sovereignty", "04-23", 1],
  ["labour", "05-01", 1],
  ["youth", "05-19", 1],
  ["democracy", "07-15", 1],
  ["victory", "08-30", 1],
  ["republic", "10-29", 1, true],
]

/** Dini bayramların ilk günü (yaklaşık). */
const RELIGIOUS = {
  ramadan: {
    days: 3,
    starts: [
      "2025-03-30",
      "2026-03-20",
      "2027-03-09",
      "2028-02-26",
      "2029-02-14",
      "2030-02-05",
      "2031-01-24",
      "2032-01-14",
    ],
  },
  sacrifice: {
    days: 4,
    starts: [
      "2025-06-06",
      "2026-05-27",
      "2027-05-16",
      "2028-05-05",
      "2029-04-24",
      "2030-04-13",
      "2031-04-02",
      "2032-03-22",
    ],
  },
}
const LUNAR_YEAR_DAYS = 354.367

const pad2 = (n) => String(n).padStart(2, "0")
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const shiftIso = (iso, days) => {
  const [y, m, d] = iso.split("-").map(Number)
  return isoOf(new Date(y, m - 1, d + days))
}

/** `fromYear`–`toYear` arası tatiller, tarihe göre sıralı. */
export function holidaysBetween(fromYear, toYear) {
  const out = []
  for (let y = fromYear; y <= toYear; y++) {
    for (const [key, md, days, hasEve] of FIXED) {
      const start = `${y}-${md}`
      out.push(hasEve ? { key, start, days, eve: shiftIso(start, -1) } : { key, start, days })
    }
  }
  for (const [key, { days, starts }] of Object.entries(RELIGIOUS)) {
    const list = [...starts]
    let last = list[list.length - 1]
    let n = 1
    while (Number(last.slice(0, 4)) <= toYear) {
      const [y, m, d] = starts[starts.length - 1].split("-").map(Number)
      last = isoOf(new Date(y, m - 1, d + Math.round(n * LUNAR_YEAR_DAYS)))
      list.push(last)
      n++
    }
    for (const start of list) {
      const y = Number(start.slice(0, 4))
      if (y >= fromYear && y <= toYear) out.push({ key, start, days, eve: shiftIso(start, -1) })
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start))
}

const THIS_YEAR = new Date().getFullYear()
export const TR_HOLIDAYS = holidaysBetween(THIS_YEAR - 1, THIS_YEAR + 3)

const toDate = (key) => {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}
const DAY = 86_400_000
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6

/** Bugün ya da sonrasındaki tatiller (bitmemişler), sırasıyla: `{ ...h, from, to, inDays }`. */
export function upcomingHolidays(today, list = TR_HOLIDAYS) {
  const base = new Date(today)
  base.setHours(0, 0, 0, 0)
  return list
    .map((h) => {
      const from = toDate(h.start)
      const to = new Date(from.getTime() + (h.days - 1) * DAY)
      return { ...h, from, to, inDays: Math.round((from - base) / DAY) }
    })
    .filter((h) => h.to >= base)
}

/**
 * Köprü: tatil bloğu ile hafta sonu arasında TEK iş günü kalıyorsa o gün
 * izin alınınca kaç gün üst üste tatil olur. `{ bridge: Date, total }` ya da null.
 */
export function bridgeFor(holiday) {
  const before = new Date(holiday.from.getTime() - DAY)
  const after = new Date(holiday.to.getTime() + DAY)
  const span = (a, b) => Math.round((b - a) / DAY) + 1
  // Salı başlayan: pazartesi köprü (cumartesiden başlar).
  if (!isWeekend(before) && isWeekend(new Date(before.getTime() - DAY))) {
    const start = new Date(before.getTime() - 2 * DAY)
    let end = holiday.to
    while (isWeekend(new Date(end.getTime() + DAY))) end = new Date(end.getTime() + DAY)
    return { bridge: before, total: span(start, end) }
  }
  // Perşembe biten: cuma köprü (pazara kadar).
  if (!isWeekend(after) && isWeekend(new Date(after.getTime() + DAY))) {
    let start = holiday.from
    while (isWeekend(new Date(start.getTime() - DAY))) start = new Date(start.getTime() - DAY)
    return { bridge: after, total: span(start, new Date(after.getTime() + 2 * DAY)) }
  }
  return null
}
