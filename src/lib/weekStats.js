import { freeWindows } from "@/lib/focusWindow"

/**
 * Haftam — bu haftanın (pazartesi–pazar) toplantı yükü: toplam süre, sayı,
 * mesai dışı toplantılar (09:00 öncesi, 18:00 sonrası ya da hafta sonu), en
 * yoğun gün ve kalan iş günlerindeki boş odak süresi (≥1 saatlik boşluklar).
 */
export function weekStats(events, now) {
  const today = new Date(now)
  const monday = new Date(today)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 7)
  const mine = (events ?? []).filter(
    (e) =>
      !e.owner && !e.isAllDay && e.myResponse !== "declined" && e.start < sunday && e.end > monday,
  )
  const byDay = new Map()
  let minutes = 0
  let afterHours = 0
  for (const e of mine) {
    const m = Math.round((Math.min(e.end, sunday) - Math.max(e.start, monday)) / 60_000)
    minutes += m
    const day = new Date(e.start)
    day.setHours(0, 0, 0, 0)
    byDay.set(day.getTime(), (byDay.get(day.getTime()) ?? 0) + m)
    const wkend = e.start.getDay() === 0 || e.start.getDay() === 6
    const endH = e.end.getHours() + e.end.getMinutes() / 60
    if (wkend || e.start.getHours() < 9 || endH > 18) afterHours += 1
  }
  let busiest = null
  for (const [t, m] of byDay)
    if (!busiest || m > busiest.minutes) busiest = { date: new Date(t), minutes: m }
  let focus = 0
  for (let d = new Date(today); d < sunday; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const isToday = d.toDateString() === today.toDateString()
    for (const w of freeWindows(mine, d, isToday ? now : null)) focus += w.minutes
  }
  return { minutes, count: mine.length, afterHours, busiest, focusMinutes: focus }
}
