import { cn } from "@/lib/utils"
import { countdownLabel, parseIso } from "./dayMath"

/**
 * Bir özel günün listedeki satırı; basınca o gün takvimde seçilir.
 * Vurgu `bg-brand/[0.08]` (`bg-brand-soft` koyu temada açık kalıyordu).
 * Aralık `formatRange` ile: ay/gün sırası dilin kararı ("March 20–22").
 */
export function DayRow({ entry, todayIso, fmtDayMonth, fmtWeekday, t, onPick, dim, highlight }) {
  const from = parseIso(entry.from)
  const when = countdownLabel(entry, todayIso, t)

  return (
    <button
      type="button"
      onClick={() => onPick(from)}
      className={cn(
        "flex w-full items-baseline gap-3 px-4 py-2 text-start transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
        highlight && "bg-brand/[0.08]",
      )}
    >
      <span
        className={cn(
          "w-[5.25rem] shrink-0 text-[0.71875rem] font-semibold tabular-nums",
          dim ? "text-muted-foreground/50" : "text-foreground",
        )}
      >
        {entry.from === entry.to
          ? fmtDayMonth.format(from)
          : fmtDayMonth.formatRange(from, parseIso(entry.to))}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[0.8125rem] leading-snug",
            dim ? "text-muted-foreground/50" : "text-foreground",
          )}
        >
          {t(`special.day.${entry.id}`)}
        </span>
        <span className="mt-0.5 block text-[0.6875rem] text-muted-foreground/70">
          {fmtWeekday.format(from)}
          {when ? ` · ${when}` : null}
        </span>
      </span>
      {highlight && (
        <span aria-hidden className="size-1.5 shrink-0 translate-y-1 rounded-full bg-brand" />
      )}
    </button>
  )
}
