import { formatClock, timeFormatter } from "@/lib/clockFormat"
import { cn } from "@/lib/utils"

/**
 * Header saati: üstte saat, altında "Paz 11 Eki" — iki satır da dolu, saat ağırlık ve
 * renkle ayrışır. 12 saatlik dillerde "AM/PM" bir kademe küçük ve soluk. Telefonda gizli
 * (yalnız ikon kalır).
 */
export function ClockText({ now, locale, className }) {
  const { weekdayShort, dateShort } = formatClock(now, locale)
  return (
    <span className={cn("hidden flex-col items-start leading-none md:flex", className)}>
      <time
        dateTime={now.toISOString()}
        className="whitespace-nowrap text-[0.625rem] font-semibold tabular-nums text-foreground/85"
      >
        {timeFormatter(locale)
          .formatToParts(now)
          .map((p, i) =>
            p.type === "dayPeriod" ? (
              <span key={i} className="text-[0.5625rem] font-medium text-muted-foreground">
                {p.value}
              </span>
            ) : (
              p.value
            ),
          )}
      </time>
      <span className="mt-[0.1875rem] whitespace-nowrap text-[0.625rem] font-semibold text-muted-foreground [&::first-letter]:uppercase">
        {weekdayShort} {dateShort}
      </span>
    </span>
  )
}
