import { foldTr } from "@/lib/feed"

/**
 * Takvim panelinin araması ve filtresi — saf. Arama konu, düzenleyen, yer
 * ve katılımcı adlarında; Türkçe harfler ve aksanlar düz ("İş" = "is").
 * Filtreler: Teams toplantıları · yanıt bekleyenler · düzenlediklerim.
 * Arama takvimin YÜKLÜ aralığında yapılır (görünen ay ± birkaç hafta).
 */
export const CALENDAR_FILTERS = ["all", "teams", "pending", "mine"]

const PASS = {
  all: () => true,
  teams: (e) => Boolean(e.isOnlineMeeting),
  pending: (e) => !e.owner && e.myResponse === "notResponded",
  mine: (e) => e.myResponse === "organizer",
}

function haystack(e) {
  return foldTr(
    [e.subject, e.organizer, e.location, ...(e.attendees ?? []).map((a) => a.name)]
      .filter(Boolean)
      .join(" "),
  )
}

/** Sorgu + filtreye uyan etkinlikler, başlangıca göre sıralı. */
export function filterEvents(events, { query = "", filter = "all" } = {}) {
  const words = foldTr(query).split(/\s+/).filter(Boolean)
  const pass = PASS[filter] ?? PASS.all
  return (events ?? [])
    .filter((e) => {
      if (!pass(e)) return false
      const hay = words.length ? haystack(e) : ""
      return words.every((w) => hay.includes(w))
    })
    .sort((a, b) => a.start - b.start)
}

/** Yalnız eşleşmesi olan günler: [{ day, events }] — boş gün yok. */
export function bucketsOf(events) {
  const out = []
  for (const e of events) {
    const day = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate())
    const last = out[out.length - 1]
    if (last && last.day.getTime() === day.getTime()) last.events.push(e)
    else out.push({ day, events: [e] })
  }
  return out
}

export const isSearching = ({ query = "", filter = "all" } = {}) =>
  query.trim().length > 0 || filter !== "all"
