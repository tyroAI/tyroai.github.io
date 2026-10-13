import { EXTRA_CITIES, OFFICE_CITIES } from "@/data/worldCities"

// Seyahat sözcükleri (TR · EN): sözcük BAŞI eşleşir, sonu serbest — Türkçe ekler
// ("ziyareti", "fuarı", "uçuşu") kaçmasın. `\b` Türkçe harfleri tanımıyor.
const WORDS =
  /(^|[^\p{L}])(seyahat|yolculu|uçuş|ucus|iş gezi|ziyaret|fuar|otel|travel|trip|flight|visit|fair|hotel)/iu
const CITIES = [...OFFICE_CITIES, ...EXTRA_CITIES]

/** Metinde geçen ilk katalog şehri (TR ya da EN adıyla) — saat dilimi için. */
export function cityIn(text) {
  const s = String(text ?? "").toLocaleLowerCase("tr")
  if (!s) return null
  return (
    CITIES.find((c) =>
      Object.values(c.names ?? {}).some((n) => n && s.includes(String(n).toLocaleLowerCase("tr"))),
    ) ?? null
  )
}

/**
 * Önümüzdeki `days` gün içindeki yolculuklar: konusu ya da yeri seyahat
 * anlatan ya da birden çok güne yayılan tüm gün etkinlikleri (yeri olan).
 * Kendi takvimin, reddedilmemiş; tekrarlayan seri tek kez.
 */
export function upcomingTrips(events, now, days = 21) {
  const from = new Date(now)
  const to = new Date(from.getTime() + days * 86_400_000)
  const seen = new Set()
  return (events ?? [])
    .filter((e) => !e.owner && e.myResponse !== "declined" && e.end > from && e.start < to)
    .filter((e) => {
      const text = `${e.subject ?? ""} ${e.location ?? ""}`
      const multiDay = e.isAllDay && e.end - e.start > 86_400_000 && e.location
      return WORDS.test(text) || multiDay
    })
    .filter((e) => {
      const key = e.seriesMasterId ?? e.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.start - b.start)
    .map((e) => ({ ...e, city: cityIn(`${e.location} ${e.subject}`) }))
}
