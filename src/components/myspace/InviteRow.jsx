import { HugeiconsIcon } from "@hugeicons/react"
import RepeatIcon from "@hugeicons/core-free-icons/RepeatIcon"
import { RsvpButtons } from "@/components/common/RsvpButtons"
import { useLocale } from "@/hooks/useLocale"
import { EventSidePreview } from "./EventSidePreview"

/**
 * Davet listesinin tek kartı. Karta basınca toplantı önizlemesi açılır:
 * masaüstünde ipucunun yanında (`EventSidePreview`), telefonda pencerede
 * (`onOpen`).
 */
export function InviteRow({ invite, fmt, pending, onAnswer, open, onOpenChange, onOpen, mobile }) {
  const { t } = useLocale()
  const subject = invite.subject || t("calendar.noSubject")
  const when = invite.isAllDay
    ? t("calendar.allDay")
    : `${fmt.time.format(invite.start)} – ${fmt.time.format(invite.end)}`

  const trigger = (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={mobile ? () => onOpen(invite) : undefined}
      lang="tr"
      className="block rounded-sm text-start text-[0.8125rem] font-semibold leading-snug decoration-white/40 underline-offset-[0.2em] outline-none [overflow-wrap:anywhere] after:absolute after:inset-0 after:rounded-xl after:content-[''] group-hover/inv:underline focus-visible:after:ring-2 focus-visible:after:ring-white/50"
    >
      {subject}
    </button>
  )

  return (
    <EventSidePreview event={invite} open={open} onOpenChange={onOpenChange} mobile={mobile}>
      {(wrap) => (
        // Kartın tamamı önizlemeyi açar (konu düğmesinin `::after`'ı kartı
        // kaplar); yanıt simgeleri onun üstünde, kendi başına basılır.
        <li className="group/inv relative flex items-start gap-3 rounded-xl bg-white/[0.05] p-3 ring-1 ring-white/[0.08] transition-colors focus-within:bg-white/[0.08] hover:bg-white/[0.08] has-[[data-state=open]]:bg-white/[0.1] has-[[data-state=open]]:ring-white/25">
          <span
            aria-hidden="true"
            className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-white/10 py-1.5 leading-none"
          >
            <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-[color-mix(in_oklch,var(--brand-to)_62%,white)]">
              {fmt.month.format(invite.start)}
            </span>
            <span className="mt-1 text-[1.0625rem] font-semibold tabular-nums">
              {fmt.day.format(invite.start)}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            {wrap(trigger)}
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="min-w-0 text-[0.75rem] leading-snug tabular-nums text-white/60">
                {fmt.weekday.format(invite.start)} · {when}
              </span>
              <RsvpButtons
                tone="dark"
                iconOnly
                className="relative z-[1]"
                pending={pending}
                onAnswer={onAnswer}
              />
            </div>
            {invite.organizer && (
              <p className="mt-1 text-[0.75rem] leading-snug text-white/60 [overflow-wrap:anywhere]">
                {t("myspace.invite.organizer", { name: invite.organizer })}
              </p>
            )}
            {invite.series && (
              <p className="mt-1 flex items-center gap-1 text-[0.6875rem] text-white/55">
                <HugeiconsIcon
                  icon={RepeatIcon}
                  className="size-3 shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                {t("myspace.invite.series")}
              </p>
            )}
          </div>
        </li>
      )}
    </EventSidePreview>
  )
}
