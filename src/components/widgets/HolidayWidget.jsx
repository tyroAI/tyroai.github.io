import { useMemo } from "react"
import Beach02Icon from "@hugeicons/core-free-icons/Beach02Icon"
import { useLocale } from "@/hooks/useLocale"
import { bridgeFor, upcomingHolidays } from "@/lib/holidays"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { WidgetEmpty } from "./WidgetEmpty"
import { WidgetFrame } from "./WidgetFrame"
import { PageBody, Pager } from "./paging/Pager"
import { usePager } from "./paging/usePager"

const OPTS_DATE = { day: "numeric", month: "long", weekday: "long" }
const OPTS_SHORT = { day: "numeric", month: "short" }
const OPTS_WD = { weekday: "long" }

/**
 * Sıradaki resmî tatil — Türkiye takvimi (`lib/holidays`): kaç gün kaldı,
 * yarım günlük arife, köprü önerisi ("Cuma izin alırsan 4 gün") ve ardından
 * gelen iki tatil.
 */
export function HolidayWidget({ ctx, className }) {
  const { now } = ctx
  const { t, locale } = useLocale()
  const list = useMemo(() => upcomingHolidays(new Date(now)).slice(0, 8), [now])
  const pager = usePager(list, 1)
  const next = pager.items[0]
  const after = list[pager.page + 1]
  const fmt = getDateTimeFormat(locale, OPTS_DATE)
  const short = getDateTimeFormat(locale, OPTS_SHORT)
  const bridge = next ? bridgeFor(next) : null
  return (
    <WidgetFrame
      id="holiday"
      title={t("widgets.holiday.title")}
      shortTitle={t("widgets.holiday.titleShort")}
      icon={Beach02Icon}
      className={className}
      pager={<Pager pager={pager} label={t("widgets.holiday.title")} />}
    >
      {next ? (
        <PageBody pager={pager} as="div" className="flex min-h-0 flex-1 flex-col">
          {/* Dar kartta (içerik < 16rem) büyük rakam yer kaplıyor, her şey sıkışıyordu:
              geri sayım tarihin yanında hap, ad en çok iki satır, köprü kutusu sıkı. */}
          <div className="mt-2 flex items-end justify-between gap-3 @max-[16rem]/widget:mt-1.5 @max-[16rem]/widget:block">
            <span className="min-w-0">
              <span
                title={t(`widgets.holiday.name.${next.key}`)}
                className="block text-[1.0625rem] font-semibold leading-snug @max-[16rem]/widget:line-clamp-2 @max-[16rem]/widget:text-[0.9375rem] @max-[16rem]/widget:leading-tight"
              >
                {t(`widgets.holiday.name.${next.key}`)}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[0.75rem] text-muted-foreground [&::first-letter]:uppercase">
                  {fmt.format(next.from)}
                  {next.days > 1 && ` · ${t("widgets.holiday.days", { n: next.days })}`}
                </span>
                <span className="hidden h-5 items-center rounded-full bg-brand/[0.08] px-2 text-[0.6875rem] font-semibold text-brand-ink tabular-nums @max-[16rem]/widget:inline-flex">
                  {next.inDays > 0 ? t("widgets.holiday.left", { n: next.inDays }) : "🎉"}
                </span>
              </span>
            </span>
            <span className="shrink-0 text-end @max-[16rem]/widget:hidden">
              <span className="block text-[1.75rem] font-semibold leading-none tabular-nums">
                {next.inDays <= 0 ? "🎉" : next.inDays}
              </span>
              {next.inDays > 0 && (
                <span className="text-[0.6875rem] text-muted-foreground">
                  {t("widgets.holiday.daysLeft")}
                </span>
              )}
            </span>
          </div>
          {next.eve && (
            <p className="mt-2 text-[0.75rem] text-muted-foreground @max-[16rem]/widget:mt-1.5">
              {t("widgets.holiday.eve", {
                date: short.format(new Date(next.eve.replace(/-/g, "/"))),
              })}
            </p>
          )}
          {bridge && (
            <p className="mt-2 rounded-xl bg-emerald-500/[0.08] px-3 py-2 text-[0.75rem] text-emerald-800 dark:text-emerald-300 @max-[16rem]/widget:px-2.5 @max-[16rem]/widget:py-1.5 @max-[16rem]/widget:text-[0.71875rem] @max-[16rem]/widget:leading-snug">
              {t("widgets.holiday.bridge", {
                day: getDateTimeFormat(locale, OPTS_WD).format(bridge.bridge),
                n: bridge.total,
              })}
            </p>
          )}
          {after && (
            <p className="mt-auto flex justify-between gap-2 pt-2 text-[0.75rem] text-muted-foreground">
              <span className="truncate">
                {t("widgets.holiday.after", { name: t(`widgets.holiday.name.${after.key}`) })}
              </span>
              <span className="shrink-0 tabular-nums">{short.format(after.from)}</span>
            </p>
          )}
        </PageBody>
      ) : (
        <WidgetEmpty icon={Beach02Icon}>{t("widgets.holiday.none")}</WidgetEmpty>
      )}
    </WidgetFrame>
  )
}
