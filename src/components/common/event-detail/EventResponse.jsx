import { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { RsvpButtons } from "@/components/common/RsvpButtons"
import { useLocale } from "@/hooks/useLocale"
import { useRsvp } from "@/hooks/useRsvp"
import { RSVP_RESULT } from "@/lib/calendarInvites"
import { cn } from "@/lib/utils"

const RESPONSE_TEXT = {
  accepted: "calendar.respAccepted",
  tentativelyAccepted: "calendar.respTentative",
  declined: "calendar.respDeclined",
}

/**
 * Kartın "kim davet etti · yanıtım" bölümü. Yanıtlanmamış davette Kabul et ·
 * Belki · Reddet durumun yanında küçük haplar; yanıt gidince metin hemen
 * değişir (takvim arkada yeniden okunur). Başkasının takvimindeki etkinliğe
 * (`owner`) buradan yanıt verilemez — Outlook bağlantısı kalır. Bitmiş
 * toplantıya yanıt istenmez (`ended`): yalnız durum yazar.
 */
export function EventResponse({
  event,
  ended,
  iOrganize,
  photoOf,
  presenceOf,
  onPerson,
  onAnswered,
}) {
  const { t } = useLocale()
  const { busy, answer } = useRsvp()
  const [mine, setMine] = useState(null)
  const response = mine ?? event.myResponse
  const open = !iOrganize && !event.isCancelled && !ended
  const needsAnswer = open && (response === "none" || response === "notResponded")
  const canAnswer = open && !event.owner && response === "notResponded"

  async function onAnswer(action) {
    if (!(await answer(event, action))) return
    setMine(RSVP_RESULT[action])
    onAnswered?.()
  }

  if (!event.organizer && iOrganize) return null
  const presence = presenceOf(event.organizerAddress)
  return (
    <>
      <Separator />
      <div className="space-y-2.5 p-3.5 py-3">
        {event.organizer && (
          <button
            type="button"
            disabled={iOrganize}
            onClick={() => onPerson({ name: event.organizer, address: event.organizerAddress })}
            aria-label={iOrganize ? undefined : t("person.openCard", { name: event.organizer })}
            className="-mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2 rounded-lg px-1.5 py-1 text-left transition enabled:hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <PersonAvatar
              name={event.organizer}
              photo={photoOf(event.organizerAddress)}
              response={null}
              presence={presence}
              presenceLabel={presence ? t(`calendar.presence.${presence}`) : undefined}
              className="size-7"
            />
            <span className="min-w-0 text-foreground/85 [overflow-wrap:anywhere]">
              {iOrganize
                ? t("calendar.respOrganizer")
                : t("calendar.invitedYou", { name: event.organizer })}
            </span>
          </button>
        )}
        {!iOrganize && (
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
            <span
              className={cn(
                needsAnswer ? "font-medium text-foreground/85" : "text-muted-foreground",
              )}
            >
              {t(RESPONSE_TEXT[response] ?? "calendar.respNone")}
            </span>
            {event.webLink && needsAnswer && !canAnswer && (
              <a
                href={event.webLink}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[0.6875rem] font-semibold text-foreground/85 transition hover:bg-accent/60"
              >
                {t("calendar.rsvp")}
              </a>
            )}
            {canAnswer && <RsvpButtons pending={busy[event.id]} onAnswer={onAnswer} />}
          </div>
        )}
      </div>
    </>
  )
}
