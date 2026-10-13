export function parseIso(iso) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** `CalendarMonthGrid`in kendi gün anahtarı (ay 0 tabanlı). */
export function gridKey(iso) {
  const [y, m, d] = iso.split("-").map(Number)
  return `${y}-${m - 1}-${d}`
}

export function gridKeyOf(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

/** Tam gün farkı — ikisi de gün başına çekili, yaz saati oynatmasın. */
export function daysBetween(fromIso, toIso) {
  return Math.round((parseIso(toIso) - parseIso(fromIso)) / 86400000)
}

/** "Bugün" · "Yarın" · "N gün kaldı" · "Dün" · "N gün önce" — bugüne göre fark. */
export function relativeDay(offset, t) {
  if (offset === 0) return t("special.today")
  if (offset === 1) return t("special.tomorrow")
  if (offset > 1) return t("special.daysLeft", { n: offset })
  if (offset === -1) return t("special.yesterday")
  return t("special.daysAgo", { n: -offset })
}

/** Bir özel günün geri sayımı; geçmişteyse `null`. */
export function countdownLabel(entry, todayIso, t) {
  if (entry.dates.includes(todayIso)) return t("special.today")
  const left = daysBetween(todayIso, entry.from)
  return left > 0 ? relativeDay(left, t) : null
}

/**
 * Seçili günün kutlananları, türe göre. `inDays` bugüne göre fark; kütük
 * yalnız önümüzdeki `windowDays` günü taşıyor — dışındaki gün için `null`
 * (liste boş değil, BİLİNMİYOR).
 */
export function peopleOn(people, offset, windowDays) {
  if (offset < 0 || offset > windowDays) return null
  const on = people.filter((p) => p.inDays === offset)
  return {
    birthday: on.filter((p) => p.kind === "birthday"),
    anniversary: on.filter((p) => p.kind === "anniversary"),
    joiner: on.filter((p) => p.kind === "joiner"),
  }
}
