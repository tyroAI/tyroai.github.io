import { CalendarEventRow } from "@/components/common/CalendarEventRow"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * Ajandanın bir günü: Outlook'un gri gün bandı ("Bugün · Pazartesi · 10
 * Ağustos", bugünün bandı marka renginde) ve o günün toplantıları; boş gün
 * "Zamanlanan etkinlik yok" der — boşluk da bilgidir ("çarşamba boş mu?").
 */
export function AgendaDay({ bucket, label }) {
  const { t } = useLocale()
  return (
    <section>
      {/* Outlook's grey day band: "Bugün · Pazartesi · 10 Ağustos",
          with today's row carrying the brand blue. */}
      <h4
        className={cn(
          "sticky top-0 z-10 flex items-baseline gap-1.5 border-b border-border/40 bg-muted/80 px-3 py-1.5 text-[0.6875rem] backdrop-blur",
          label.isToday ? "text-brand" : "text-foreground/75",
        )}
      >
        {label.prefix && (
          <>
            <span className="font-bold">{label.prefix}</span>
            <span aria-hidden="true" className="opacity-50">
              ·
            </span>
          </>
        )}
        <span className="inline-block font-semibold [&::first-letter]:uppercase">
          {label.weekday}
        </span>
        <span aria-hidden="true" className="opacity-50">
          ·
        </span>
        <span className="font-medium">{label.date}</span>
        {bucket.events.length > 0 && (
          <span className="ml-auto text-[0.625rem] font-medium tabular-nums opacity-70">
            {bucket.events.length}
          </span>
        )}
      </h4>
      {bucket.events.length > 0 ? (
        <ul className="divide-y divide-border/30">
          {bucket.events.map((event) => (
            <CalendarEventRow key={`${bucket.day.toISOString()}-${event.id}`} event={event} />
          ))}
        </ul>
      ) : (
        <p className="px-3 py-2.5 text-[0.71875rem] text-muted-foreground">
          {t("calendar.noEventsDay")}
        </p>
      )}
    </section>
  )
}
