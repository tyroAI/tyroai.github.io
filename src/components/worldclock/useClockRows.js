import { useCallback, useMemo } from "react"
import { bcp47, getDateTimeFormat } from "@/lib/intl-cache"
import {
  cityById,
  cityName,
  dayDiff,
  homeMidnight,
  hourStrip,
  offsetLabel,
  offsetMinutes,
  orderCities,
} from "@/lib/worldClock"

const DAY = 86400000
const HOUR = 3600000

/** UTC gün sayısı ↔ { y, mo, d } — gün seçimi saat diliminden bağımsız. */
export const epochDay = ({ y, mo, d }) => Date.UTC(y, mo - 1, d) / DAY
const ymd = (n) => {
  const x = new Date(n * DAY)
  return { y: x.getUTCFullYear(), mo: x.getUTCMonth() + 1, d: x.getUTCDate() }
}

// Arapçada da miladi takvim ve Latin rakam: şeritteki gün numaralarıyla aynı.
const timeOpts = (timeZone) => ({
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone,
  numberingSystem: "latn",
})
const dateOpts = (timeZone) => ({
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone,
  calendar: "gregory",
  numberingSystem: "latn",
})
const OPTS_MONTH = { month: "short", timeZone: "UTC", calendar: "gregory" }

function tzPart(locale, tz, style, date) {
  return (
    getDateTimeFormat(locale, { timeZone: tz, timeZoneName: style })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? ""
  )
}

/**
 * Dünya saatinin görünümü: sıralı şehirler, her birinin bilgisi ve ana
 * şehrin seçili gününe hizalı 24 saatlik şeridi. Şeritler yalnız gün ya da
 * şehir listesi değişince yeniden hesaplanır (fareyle sütun gezmek satırları
 * yeniden çizdirmez — satırlar `memo`).
 */
export function useClockRows({ ids, home, now, dayN, locale, t }) {
  const homeTz = cityById(home)?.tz ?? "Europe/Istanbul"
  const nowDate = useMemo(() => new Date(now), [now])
  const regions = useMemo(() => {
    try {
      return new Intl.DisplayNames([bcp47(locale)], { type: "region" })
    } catch {
      return null
    }
  }, [locale])

  const describe = useCallback(
    (city) =>
      city.cc
        ? (regions?.of(city.cc) ?? city.cc)
        : tzPart(locale, city.tz, "longGeneric", new Date()),
    [regions, locale],
  )
  const timeOf = useCallback(
    (tz, at = new Date()) => getDateTimeFormat(locale, timeOpts(tz)).format(at),
    [locale],
  )
  const dateOf = useCallback(
    (tz, at) => getDateTimeFormat(locale, dateOpts(tz)).format(at),
    [locale],
  )

  // Sıra UTC farkına bağlı; fark yalnız yaz saati geçişinde değişir.
  const ordered = useMemo(() => orderCities(ids, home, nowDate), [ids, home, nowDate])
  const { y, mo, d } = ymd(dayN)
  const start = useMemo(() => homeMidnight(homeTz, y, mo, d), [homeTz, y, mo, d])
  const strips = useMemo(
    () => new Map(ordered.map((c) => [c.id, hourStrip(c.tz, start)])),
    [ordered, start],
  )

  const rows = useMemo(() => {
    const homeOff = offsetMinutes(homeTz, nowDate)
    return ordered.map((city) => ({
      city,
      name: cityName(city, locale),
      region: describe(city),
      abbr: tzPart("en", city.tz, "short", nowDate),
      isHome: city.id === home,
      offset: offsetLabel(offsetMinutes(city.tz, nowDate) - homeOff),
      time: timeOf(city.tz, nowDate),
      date: dateOf(city.tz, nowDate),
      otherDay: dayDiff(city.tz, homeTz, nowDate) !== 0,
      strip: strips.get(city.id),
    }))
  }, [ordered, strips, nowDate, homeTz, home, locale, describe, timeOf, dateOf])

  const nowPos = (now - start) / HOUR // dakika hassasiyetinde konum (şu an çizgisi)
  const nowCol = Math.floor(nowPos)
  // Her saatte mesaide (08–18) olan şehir sayısı — en uygun toplantı saati.
  const overlap = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) =>
        rows.reduce((n, r) => n + (r.strip[i]?.period === "work" ? 1 : 0), 0),
      ),
    [rows],
  )
  const monthFmt = getDateTimeFormat(locale, OPTS_MONTH)
  const hourLabel = useCallback(
    (slot) =>
      t("worldClock.hour", {
        time: `${String(slot.h).padStart(2, "0")}:${String(slot.mi).padStart(2, "0")}`,
      }),
    [t],
  )

  return {
    rows,
    homeTz,
    nowCol: nowCol >= 0 && nowCol < 24 ? nowCol : null,
    nowPos: nowPos >= 0 && nowPos < 24 ? nowPos : null,
    overlap,
    describe,
    timeOf,
    dateOf,
    monthFmt,
    hourLabel,
  }
}
