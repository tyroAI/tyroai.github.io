import { useMemo } from "react"
import AirplaneTakeOff01Icon from "@hugeicons/core-free-icons/AirplaneTakeOff01Icon"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { upcomingTrips } from "@/lib/travel"
import { cityName, wallClock } from "@/lib/worldClock"
import { WidgetEmpty } from "./WidgetEmpty"
import { WidgetFrame } from "./WidgetFrame"
import { PageBody, Pager } from "./paging/Pager"
import { usePager } from "./paging/usePager"

const OPTS_DAY = { weekday: "short", day: "numeric", month: "short" }

/**
 * Seyahatim — önümüzdeki üç haftanın yolculukları (takvimde "seyahat",
 * "uçuş", "ziyaret", "fuar"… geçen ya da birden çok güne yayılan etkinlikler):
 * tarih, yer ve varılan şehir dünya saatinde varsa oranın şu anki saati.
 */
export function TravelWidget({ ctx, className }) {
  const { cal, now } = ctx
  const { t, locale } = useLocale()
  const trips = useMemo(() => upcomingTrips(cal.events, now), [cal.events, now])
  const pager = usePager(trips, 2)
  const day = getDateTimeFormat(locale, OPTS_DAY)
  return (
    <WidgetFrame
      id="travel"
      title={t("widgets.travel.title")}
      icon={AirplaneTakeOff01Icon}
      busy={cal.status === "loading"}
      className={className}
      pager={<Pager pager={pager} label={t("widgets.travel.title")} />}
    >
      {cal.status === "loading" ? (
        <span aria-hidden="true" className="ms-skeleton mt-3 block h-12 rounded-2xl" />
      ) : trips.length ? (
        <PageBody pager={pager} className="mt-3 space-y-1.5">
          {pager.items.map((trip) => {
            const clock = trip.city ? wallClock(trip.city.tz, new Date(now)) : null
            const pad = (n) => String(n).padStart(2, "0")
            return (
              <li key={trip.id} className="rounded-2xl bg-muted/40 px-3 py-2">
                <span className="block truncate text-[0.8125rem] font-medium">{trip.subject}</span>
                <span className="block truncate text-[0.6875rem] text-muted-foreground">
                  {day.format(trip.start)}
                  {trip.end - trip.start > 86_400_000 && ` – ${day.format(new Date(trip.end - 1))}`}
                  {trip.location && ` · ${trip.location}`}
                </span>
                {clock && (
                  <span className="mt-0.5 block text-[0.6875rem] text-sky-700 dark:text-sky-400">
                    {t("widgets.travel.localTime", {
                      city: cityName(trip.city, locale),
                      time: `${pad(clock.h)}:${pad(clock.mi)}`,
                    })}
                  </span>
                )}
              </li>
            )
          })}
        </PageBody>
      ) : (
        <WidgetEmpty icon={AirplaneTakeOff01Icon} hint={t("widgets.travel.hint")}>
          {t("widgets.travel.none")}
        </WidgetEmpty>
      )}
    </WidgetFrame>
  )
}
