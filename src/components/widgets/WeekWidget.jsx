import { useMemo } from "react"
import ChartAverageIcon from "@hugeicons/core-free-icons/ChartAverageIcon"
import { duration } from "@/components/common/event-detail/eventFormat"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { weekStats } from "@/lib/weekStats"
import { cn } from "@/lib/utils"
import { WidgetFrame } from "./WidgetFrame"

const OPTS_DAY = { weekday: "long" }
const span = (minutes) => ({ start: new Date(0), end: new Date(minutes * 60_000) })

/**
 * Haftam — Toplantı ritminin özeti: bu hafta toplantıda geçen süre, kalan iş
 * günlerindeki boş odak süresi, mesai dışı toplantılar ve en yoğun gün; dört
 * eşit kutucuk (`lib/weekStats`).
 */
export function WeekWidget({ ctx, className }) {
  const { cal, now } = ctx
  const { t, locale } = useLocale()
  const s = useMemo(() => weekStats(cal.events, now), [cal.events, now])
  const tiles = [
    {
      id: "meetings",
      value: duration(span(s.minutes), t),
      sub: t("widgets.week.meetingsSub", { n: s.count }),
    },
    { id: "focus", value: duration(span(s.focusMinutes), t), sub: t("widgets.week.focusSub") },
    {
      id: "after",
      value: s.afterHours,
      sub: t("widgets.week.afterSub"),
      warn: s.afterHours > 0,
    },
    {
      id: "busiest",
      value: s.busiest ? getDateTimeFormat(locale, OPTS_DAY).format(s.busiest.date) : "—",
      sub: s.busiest ? duration(span(s.busiest.minutes), t) : t("widgets.week.calm"),
    },
  ]
  return (
    <WidgetFrame
      id="week"
      title={t("widgets.week.title")}
      icon={ChartAverageIcon}
      busy={cal.status === "loading"}
      className={className}
    >
      <ul className="mt-2.5 grid flex-1 grid-cols-2 gap-2">
        {tiles.map((x) => (
          <li
            key={x.id}
            className="flex min-h-0 flex-col justify-between rounded-2xl bg-muted/40 px-3 py-2 @max-[16rem]/widget:px-2.5"
          >
            <span className="text-[0.6875rem] text-muted-foreground">
              {t(`widgets.week.${x.id}`)}
            </span>
            {cal.status === "loading" ? (
              <span aria-hidden="true" className="ms-skeleton mt-2 block h-5 w-16 rounded-full" />
            ) : (
              <span>
                <span
                  className={cn(
                    "block truncate text-[1.0625rem] font-semibold leading-tight tabular-nums @max-[16rem]/widget:text-[0.9375rem] [&::first-letter]:uppercase",
                    x.warn && "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {x.value}
                </span>
                {/* En dar kartta alt satır ikiye kırılabilir: kırpılan bilgi olmasın. */}
                <span className="line-clamp-2 block text-[0.6875rem] leading-tight text-muted-foreground">
                  {x.sub}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </WidgetFrame>
  )
}
