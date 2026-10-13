import { getDateTimeFormat } from "@/lib/intl-cache"

// Sabit seçenek nesneleri: dil başına Intl önbelleğinin anahtarı aynı kalsın.
const OPTS_WEEKDAY_SHORT = { weekday: "short" }
const OPTS_DATE_SHORT = { day: "numeric", month: "short" }
const OPTS_WEEKDAY_LONG = { weekday: "long" }
const OPTS_FULL_DATE = { day: "numeric", month: "long", year: "numeric" }
const OPTS_TIME = { hour: "2-digit", minute: "2-digit" }
const OPTS_TIME_12 = { hour: "numeric", minute: "2-digit" }

/**
 * Saat: 24 saatlik dillerde iki haneli ("09:05"), 12 saatlik dillerde baştaki sıfırsız
 * ("9:05 AM") — İngilizcede "01:52 PM" kimsenin yazmadığı bir biçim.
 */
export function timeFormatter(locale) {
  const f = getDateTimeFormat(locale, OPTS_TIME)
  return f.resolvedOptions().hour12 ? getDateTimeFormat(locale, OPTS_TIME_12) : f
}

/** Header saatinin metinleri: kısa (hapta) ve uzun (balon, ekran okuyucu). */
export function formatClock(now, locale) {
  return {
    weekdayShort: getDateTimeFormat(locale, OPTS_WEEKDAY_SHORT).format(now),
    dateShort: getDateTimeFormat(locale, OPTS_DATE_SHORT).format(now),
    weekdayLong: getDateTimeFormat(locale, OPTS_WEEKDAY_LONG).format(now),
    fullDate: getDateTimeFormat(locale, OPTS_FULL_DATE).format(now),
    time: timeFormatter(locale).format(now),
  }
}
