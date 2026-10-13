import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon"
import StarIcon from "@hugeicons/core-free-icons/StarIcon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { SkelLine } from "@/components/common/bento"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { dueLabel, keyToDate } from "@/lib/todoInsights"
import { cn } from "@/lib/utils"
import { STATUS_TONES as TONES } from "./statusTones"

const OPTS_DAY = { day: "numeric", month: "short" }
const MUTED_CHIP = "bg-foreground/[0.05] text-muted-foreground/70"
/** Sayı rengi: yalnız gecikmiş renkli (küçük yazıda AA için 700 tonu); sıfır sakin. */
const VALUE_TONE = { overdue: "text-amber-700 dark:text-amber-400" }

/**
 * Tepside hücreler arası ince çizgi: hücre değil ÇİZGİ, dokunma hedefini daraltmaz. Tablette
 * dört hücre tek sırada (soldan çizgi), genişte 2×2 (alt sıranın üstünde yatay çizgi).
 */
const LINE_START =
  "before:pointer-events-none before:absolute before:inset-y-3 before:start-0 before:w-px before:bg-foreground/[0.07]"
const LINE_TOP =
  "@[64rem]/todo:after:pointer-events-none @[64rem]/todo:after:absolute @[64rem]/todo:after:inset-x-3 @[64rem]/todo:after:top-0 @[64rem]/todo:after:h-px @[64rem]/todo:after:bg-foreground/[0.07]"
const LINES = [
  "",
  LINE_START,
  cn(LINE_START, "@[64rem]/todo:before:hidden", LINE_TOP),
  cn(LINE_START, LINE_TOP),
]

const TRAY_CELL =
  "@container/stat relative flex min-h-[4.5rem] min-w-0 flex-col justify-between gap-2 rounded-[0.875rem] @[64rem]/todo:justify-center px-3 py-2.5 text-start outline-none transition-colors enabled:hover:bg-foreground/[0.04] enabled:hover:before:opacity-0 enabled:hover:after:opacity-0 focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-default"
const SHEET_CELL =
  "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-2xl bg-muted/45 px-3 py-2.5 text-start outline-none transition-colors enabled:hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-default"

/** Dört durumun verisi: tepsi ve çekmece aynı listeyi çizer, sayı ikinci kez hesaplanmaz. */
function useStatusItems(summary, planned, today) {
  const { t, locale } = useLocale()
  const overdue = summary.overdue.length
  const important = summary.important.length
  const trend = summary.last7Total - summary.prev7Total
  const trendText = trend > 0 ? `+${trend}` : `−${-trend}`
  const oldest = overdue
    ? t("todo.kpi.overdueOldest", {
        date: getDateTimeFormat(locale, OPTS_DAY)
          .format(keyToDate(summary.overdue[0].dueKey))
          .replace(/ /g, " "),
      })
    : t("todo.kpi.overdueNone")
  const next = planned.length
    ? t("todo.status.next", { date: dueLabel(planned[0].dueKey, today, t, locale) })
    : t("todo.status.plannedNone")
  const importantText = important ? summary.important[0].title : t("todo.kpi.importantNone")
  const doneText = t("todo.status.doneWeek")

  return [
    {
      key: "overdue",
      icon: Alert02Icon,
      view: "planned",
      label: t("todo.kpi.overdue"),
      value: overdue,
      text: oldest,
      caption: overdue ? (
        oldest
      ) : (
        <span className="inline-flex items-center gap-1">
          <HugeiconsIcon
            icon={Tick02Icon}
            className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400"
            strokeWidth={2.6}
          />
          {oldest}
        </span>
      ),
    },
    {
      key: "important",
      icon: StarIcon,
      filled: true,
      view: "important",
      label: t("todo.kpi.important"),
      value: important,
      text: importantText,
      caption: importantText,
    },
    {
      key: "planned",
      icon: Calendar03Icon,
      view: "planned",
      label: t("todo.view.planned"),
      value: planned.length,
      text: next,
      caption: next,
    },
    {
      key: "done",
      icon: CheckmarkCircle02Icon,
      view: "done",
      label: t("todo.view.done"),
      value: summary.last7Total,
      text: trend ? `${doneText} · ${trendText}` : doneText,
      caption: (
        <>
          {doneText}
          {trend !== 0 && (
            <span
              title={t("todo.status.trend")}
              className={cn(
                "ms-1 font-semibold tabular-nums",
                trend > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground",
              )}
            >
              · <bdi>{trendText}</bdi>
            </span>
          )}
        </>
      ),
    },
  ]
}

function Chip({ item, active, className }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center",
        active ? TONES[item.key].chip : MUTED_CHIP,
        className,
      )}
    >
      <HugeiconsIcon
        icon={item.icon}
        className={cn("size-3.5", active && item.filled && "fill-current")}
        strokeWidth={1.9}
      />
    </span>
  )
}

function Value({ item, state, className }) {
  if (state.loading)
    return (
      <span aria-hidden="true" className={cn("relative leading-none", className)}>
        <span className="invisible">0</span>
        <span className="ms-skeleton absolute inset-y-0 start-0 block w-6 rounded-lg" />
      </span>
    )
  const active = state.live && item.value > 0
  return (
    <span
      className={cn(
        "font-semibold leading-none tracking-[-0.02em] tabular-nums",
        active ? (VALUE_TONE[item.key] ?? "text-foreground") : "text-muted-foreground",
        className,
      )}
    >
      {state.live ? item.value : "—"}
    </span>
  )
}

/**
 * Dört durum: Gecikmiş · Önemli · Planlanan · Tamamlanan, her biri listenin aynı adlı
 * görünümüne kapı. Renk ancak işi varken; soramadıysak "—" (sahte sıfır yok).
 * - `tray`: kartın tepsisi. Üstte çip + ad, altta sayı + açıklama; açıklama dar hücrede
 *   gizlenir (tamamı `title`da), ad iki satıra iner.
 * - `sheet`: telefon çekmecesi, satır başına bir durum.
 */
export function TodoStatusTiles({ summary, planned, today, state, onView, variant = "tray" }) {
  const items = useStatusItems(summary, planned, today)
  const sheet = variant === "sheet"
  return (
    <div
      className={cn(
        "grid min-w-0",
        sheet ? "gap-2" : "grid-cols-4 @[64rem]/todo:grid-cols-2 @[64rem]/todo:grid-rows-2",
      )}
    >
      {items.map((item, i) => {
        const active = state.live && item.value > 0
        const common = {
          type: "button",
          onClick: () => onView(item.view),
          disabled: !state.live,
          "aria-label": `${item.label}: ${state.live ? item.value : "—"}`,
          title: state.live ? item.text : undefined,
        }
        if (sheet)
          return (
            <button key={item.key} {...common} className={SHEET_CELL}>
              <Chip item={item} active={active} className="size-8 rounded-xl" />
              <span className="min-w-0">
                <span className="block truncate text-[0.8125rem] font-medium text-foreground/85">
                  {item.label}
                </span>
                {state.loading ? (
                  <SkelLine text="text-[0.6875rem] leading-snug" width="w-16" />
                ) : (
                  <span className="block truncate text-[0.6875rem] leading-snug text-muted-foreground">
                    {state.unavailable ? " " : item.caption}
                  </span>
                )}
              </span>
              <Value item={item} state={state} className="text-[1.375rem]" />
            </button>
          )
        return (
          <button key={item.key} {...common} className={cn(TRAY_CELL, LINES[i])}>
            <span className="flex min-w-0 items-center gap-2">
              <Chip item={item} active={active} className="size-6 rounded-lg" />
              <span className="line-clamp-2 min-w-0 hyphens-auto text-[0.8125rem] font-medium leading-tight text-foreground/85 [overflow-wrap:anywhere] @[10.5rem]/stat:truncate">
                {item.label}
              </span>
            </span>
            <span className="flex min-w-0 items-baseline gap-2">
              <Value item={item} state={state} className="text-[1.5rem]" />
              {state.loading ? (
                <SkelLine
                  text="text-[0.75rem] leading-tight"
                  width="w-16"
                  className="hidden @[9rem]/stat:block"
                />
              ) : (
                state.live && (
                  <span className="hidden min-w-0 truncate text-[0.75rem] leading-tight text-muted-foreground @[9rem]/stat:block">
                    {item.caption}
                  </span>
                )
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
