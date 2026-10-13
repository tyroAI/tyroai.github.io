import { HugeiconsIcon } from "@hugeicons/react"
import CheckmarkBadge01Icon from "@hugeicons/core-free-icons/CheckmarkBadge01Icon"
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { BriefRows } from "./BriefRows"
import { plural, useBrief } from "./useBrief"
import { WidgetFrame } from "./WidgetFrame"

// En çok üç satır: kart karşılamanın boyunda kalsın; gerisi tek satırlık "Ayrıca".
const MAX_ROWS = 3
const OPTS_DATE = { weekday: "long", day: "numeric", month: "long" }

/**
 * Günün brifingi — eylem paneli: öncelik sırasıyla maddeler (yanıt bekleyen
 * insanlar önce), her birinde sayı ve TEK eylem; davetler kartta yanıtlanır.
 * Başlık günün bölümüne göre (sabah · öğleden sonra · akşam kapanış), hafta
 * sonunda bir sonraki iş gününe hazırlık. Saf hesap `lib/brief.js`te.
 */
export function BriefWidget({ ctx, className }) {
  const { t, locale } = useLocale()
  const brief = useBrief(ctx)
  const { date, weekend, part, items, nextMeetings, dayName, doneToday, meetingLine, fresh } = brief
  const shown = items.length > MAX_ROWS ? items.slice(0, MAX_ROWS - 1) : items
  const rest = items.length > MAX_ROWS ? items.slice(MAX_ROWS - 1) : []
  const loading = brief.loading

  let headline
  if (weekend)
    headline = nextMeetings.length
      ? plural(t, "widgets.brief.weekend", nextMeetings.length, { day: dayName })
      : t("widgets.brief.weekendCalm", { day: dayName })
  else if (part === "evening")
    headline = `${plural(t, "widgets.brief.evening", doneToday)}${
      nextMeetings.length
        ? ` ${plural(t, "widgets.brief.tomorrow", nextMeetings.length, { day: dayName })}`
        : ""
    }`
  else if (items.length) headline = plural(t, `widgets.brief.waiting.${part}`, items.length)
  else headline = t("widgets.brief.clear")

  return (
    <WidgetFrame
      id="brief"
      title={t("widgets.brief.title")}
      icon={SparklesIcon}
      busy={loading}
      className={className}
      action={
        <span className="text-[0.71875rem] text-muted-foreground [&::first-letter]:uppercase">
          {getDateTimeFormat(locale, OPTS_DATE).format(date)}
          {weekend && ` · ${t("widgets.brief.weekendTag")}`}
        </span>
      }
    >
      {loading ? (
        <div aria-hidden="true" className="mt-2 space-y-1">
          <span className="ms-skeleton block h-5 w-3/4 rounded-full" />
          <span className="ms-skeleton block h-3.5 w-1/2 rounded-full" />
          <div className="space-y-1 pt-2.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="ms-skeleton block h-8 rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1.5 truncate text-[1rem] font-semibold leading-snug tracking-[-0.01em]">
            {headline}
          </p>
          {meetingLine && (
            <p className="mt-0.5 truncate text-[0.75rem] text-muted-foreground">{meetingLine}</p>
          )}
          {items.length ? (
            <BriefRows shown={shown} rest={rest} fresh={fresh} data={brief.tipData} />
          ) : (
            <div className="mt-3 flex flex-1 items-center gap-3 rounded-2xl bg-emerald-500/[0.07] px-3 py-3">
              <HugeiconsIcon
                icon={CheckmarkBadge01Icon}
                className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400"
                strokeWidth={1.8}
              />
              <span className="text-[0.8125rem] text-foreground/80">
                {t("widgets.brief.clearBody")}
              </span>
            </div>
          )}
        </>
      )}
    </WidgetFrame>
  )
}
