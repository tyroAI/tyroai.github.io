/**
 * Günün brifingi — saf hesap (`components/widgets/BriefWidget`).
 *
 * Kart bir LİSTE değil, bir EYLEM PANELİ: her madde bir sayım ve tek bir
 * eylem; sıra önceliğe göre (yanıt bekleyen insanlar önce, bilgi en son).
 * Hafta sonunda bugünün yerine bir sonraki iş gününe hazırlık anlatılır.
 */

/** Cumartesi · pazar (Türkiye'nin hafta sonu). */
export function isWeekend(date) {
  const d = date.getDay()
  return d === 0 || d === 6
}

/** Bir sonraki iş gününün başlangıcı (yerel gece yarısı). */
export function nextWorkday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  do d.setDate(d.getDate() + 1)
  while (isWeekend(d))
  return d
}

/** Günün bölümü: sabah (<12) · öğleden sonra (<18) · akşam. */
export function dayPart(date) {
  const h = date.getHours()
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"
}

/** Bir günün (yerel) toplantıları: kendi takvimin, reddedilmemiş, tüm gün değil. */
export function meetingsOn(events, day, from = null) {
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return (events ?? [])
    .filter(
      (e) =>
        !e.owner &&
        !e.isAllDay &&
        e.myResponse !== "declined" &&
        e.start < end &&
        e.end > (from && from > start ? from : start),
    )
    .sort((a, b) => a.start - b.start)
}

/**
 * Brifingin maddeleri, öncelik sırasıyla. Her madde: `{ id, n, ...ek }`.
 * Sıfır sayılı madde DÖNMEZ — "0 davet" bir şey anlatmaz.
 */
export function briefItems({
  invites = 0,
  unread = 0,
  important = 0,
  overdue = 0,
  open = 0,
  feed = 0,
}) {
  const items = []
  if (invites) items.push({ id: "invites", n: invites })
  if (unread) items.push({ id: "mail", n: unread, important })
  if (overdue) items.push({ id: "overdue", n: overdue })
  if (open) items.push({ id: "tasks", n: open })
  if (feed) items.push({ id: "feed", n: feed })
  return items
}

/** Son ziyaretten sonra gelen posta sayısı (`since`: önceki ziyaretin anı). */
export function newSince(messages, since) {
  if (!since) return 0
  return (messages ?? []).filter((m) => m.received && m.received > since).length
}
