import { HugeiconsIcon } from "@hugeicons/react"
import CalendarAdd01Icon from "@hugeicons/core-free-icons/CalendarAdd01Icon"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import { cn } from "@/lib/utils"
import { PERIOD, PERIODS } from "./periods"

const PILL =
  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.75rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
const MEETING_MS = 30 * 60000

/** Teams'in toplantı planlama bağlantısı — seçili saatten 30 dakika. */
const teamsMeeting = (at) =>
  `https://teams.microsoft.com/l/meeting/new?startTime=${encodeURIComponent(at.toISOString())}&endTime=${encodeURIComponent(new Date(at.getTime() + MEETING_MS).toISOString())}`

/** Renklerin anlamı: gün dilimleri + şu an çizgisi + seçili saat. */
function Legend({ t }) {
  const swatch = "inline-block h-3 w-4 rounded-[0.25rem]"
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.75rem] text-muted-foreground">
      {PERIODS.map((p) => (
        <li key={p} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn(swatch, PERIOD[p])} />
          {t(`worldClock.legend.${p}`)}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="relative inline-block h-3 w-4">
          <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-brand" />
        </span>
        {t("worldClock.legend.now")}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className={cn(swatch, "border-2 border-brand bg-brand/10")} />
        {t("worldClock.legend.selected")}
      </li>
    </ul>
  )
}

/**
 * Pencerenin dibi: saat seçili değilken lejant + kısa not; seçiliyken seçilen
 * saat ve eylemleri (Teams'te toplantı oluştur · saatleri kopyala · seçimi
 * kaldır). Sağda her zaman "Varsayılan şehirler".
 */
export function ClockFooter({
  pinnedAt,
  homeName,
  timeOf,
  dateOf,
  homeTz,
  onCopy,
  onClear,
  onReset,
  t,
}) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      {pinnedAt ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="me-1 text-[0.8125rem]">
            <span className="text-muted-foreground">{t("worldClock.selected")}: </span>
            <span className="font-semibold tabular-nums">
              {timeOf(homeTz, pinnedAt)} · {dateOf(homeTz, pinnedAt)} ({homeName})
            </span>
          </span>
          <a
            href={teamsMeeting(pinnedAt)}
            target="_blank"
            rel="noopener noreferrer"
            title={t("worldClock.scheduleTitle")}
            className={`${PILL} bg-brand text-white hover:brightness-110`}
          >
            <HugeiconsIcon icon={CalendarAdd01Icon} className="size-3.5" strokeWidth={2} />
            {t("worldClock.schedule")}
          </a>
          <button
            type="button"
            onClick={onCopy}
            className={`${PILL} bg-brand/10 text-brand hover:bg-brand/15`}
          >
            <HugeiconsIcon icon={Copy01Icon} className="size-3.5" strokeWidth={2} />
            {t("worldClock.copy")}
          </button>
          <button
            type="button"
            onClick={onClear}
            className={`${PILL} text-muted-foreground hover:bg-accent`}
          >
            {t("worldClock.clear")}
          </button>
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <Legend t={t} />
          <p className="mt-1.5 text-[0.6875rem] text-muted-foreground/80">
            {t("worldClock.pick")} {t("worldClock.note")}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={onReset}
        className={`${PILL} self-start text-muted-foreground hover:bg-accent hover:text-foreground sm:self-auto`}
      >
        {t("worldClock.reset")}
      </button>
    </div>
  )
}
