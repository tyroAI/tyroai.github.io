import { HugeiconsIcon } from "@hugeicons/react"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"

const DAY = 86400000
// Gün çipleri UTC'de biçimlenir: gün numarası ana şehrin takvim günü.
const OPTS_WEEKDAY = { weekday: "short", timeZone: "UTC", calendar: "gregory" }
const ARROW =
  "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/**
 * Ana şehrin günü: yedi günlük çip şeridi (ilki dün), oklar bir hafta kayar,
 * "Bugün" geri getirir. Günler UTC gün sayısı (`epoch day`) olarak taşınır —
 * saat dilimi oynamasın. Hafta sonu kırmızımsı (World Time Buddy gibi).
 */
export function DayNav({ base, selected, today, onBase, onSelect, locale, t }) {
  const weekday = getDateTimeFormat(locale, OPTS_WEEKDAY)
  const days = Array.from({ length: 7 }, (_, i) => base + i)
  return (
    <div className="flex min-w-0 items-center gap-1" dir="ltr">
      <button
        type="button"
        onClick={() => onBase(base - 7)}
        aria-label={t("worldClock.prevDays")}
        className={ARROW}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" strokeWidth={2} />
      </button>
      <div className="flex min-w-0 gap-0.5 overflow-x-auto [scrollbar-width:none]">
        {days.map((n) => {
          const date = new Date(n * DAY)
          const weekend = [0, 6].includes(date.getUTCDay())
          const isSel = n === selected
          return (
            <button
              key={n}
              type="button"
              aria-pressed={isSel}
              onClick={() => onSelect(n)}
              className={cn(
                "relative flex w-10 shrink-0 flex-col items-center rounded-lg py-1 leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                isSel ? "bg-brand text-white shadow-sm" : "hover:bg-accent",
                !isSel && weekend && "text-red-600/80 dark:text-red-400/80",
              )}
            >
              <span className={cn("text-[0.625rem] font-medium", !isSel && "opacity-70")}>
                {weekday.format(date)}
              </span>
              <span className="mt-1 text-[0.875rem] font-semibold tabular-nums">
                {date.getUTCDate()}
              </span>
              {n === today && !isSel && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0.5 size-1 rounded-full bg-brand"
                />
              )}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => onBase(base + 7)}
        aria-label={t("worldClock.nextDays")}
        className={ARROW}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" strokeWidth={2} />
      </button>
      {selected !== today && (
        <button
          type="button"
          onClick={() => {
            onBase(today - 1)
            onSelect(today)
          }}
          className="ms-1 shrink-0 rounded-lg px-2.5 py-1.5 text-[0.75rem] font-semibold text-brand transition hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          {t("worldClock.today")}
        </button>
      )}
    </div>
  )
}
