import { HugeiconsIcon } from "@hugeicons/react"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import Video01Icon from "@hugeicons/core-free-icons/Video01Icon"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { useLocale } from "@/hooks/useLocale"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { usePresence } from "@/hooks/usePresence"
import { uniqueAttendees } from "@/lib/calendarPeople"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"
import { EventDetailCard } from "./event-detail/EventDetailCard"
import { ATTENTION, OPTS_TIME, duration } from "./event-detail/eventFormat"
import { joinInTeams } from "@/lib/teamsJoin"

/** Live now, or starting within the next 15 minutes. */
function isImminent(event) {
  const now = Date.now()
  if (event.isAllDay) return false
  return now >= event.start.getTime() - 15 * 60000 && now < event.end.getTime()
}

// Bitmiş toplantıya katılınmaz; kartta yerini Sohbet · Özet alır.
const hasEnded = (event) => event.end.getTime() < Date.now()

/**
 * The rail is the RSVP, exactly as Outlook draws it: a solid bar means this
 * meeting is settled on my calendar (accepted, or mine), diagonal stripes mean
 * it is still waiting on me. The waiting colour is the app's one
 * palette-independent dark orange (--chart-4) so it reads as attention in
 * every palette without becoming an error red.
 */
function railProps(event) {
  if (event.isCancelled || event.myResponse === "declined") {
    return { className: "bg-muted-foreground/30" }
  }
  if (event.myResponse === "organizer" || event.myResponse === "accepted") {
    return { className: "bg-brand" }
  }
  const color = event.myResponse === "tentativelyAccepted" ? "var(--brand-via)" : ATTENTION
  return {
    style: {
      backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
      backgroundImage: `repeating-linear-gradient(135deg, ${color} 0px, ${color} 2.5px, transparent 2.5px, transparent 5.5px)`,
    },
  }
}

export function CalendarEventRow({ event }) {
  const { locale, t } = useLocale()
  const timeFmt = getDateTimeFormat(locale, OPTS_TIME)
  const online = event.isOnlineMeeting
  const where = online ? t("calendar.teamsMeeting") : event.location || t("calendar.noLocation")
  const live = isImminent(event)
  const ended = hasEnded(event)
  const people = uniqueAttendees(event)

  // Photos for what the ROW shows; the detail card asks for its own longer
  // list when it opens. The module cache makes the overlap free.
  const photos = usePeoplePhotos([
    ...people.slice(0, 5).map((a) => a.address),
    event.organizerAddress,
  ])
  const photoOf = (address) => photos.get((address || "").toLowerCase())
  const presence = usePresence([...people.map((a) => a.address), event.organizerAddress])
  const presenceOf = (address) => presence.get((address || "").toLowerCase())

  return (
    <HoverCard openDelay={250} closeDelay={150}>
      <HoverCardTrigger asChild>
        <li
          className={cn(
            "group relative flex items-start gap-2.5 px-3 py-2 transition-colors",
            "hover:bg-accent/50",
          )}
        >
          <div className="w-[2.875rem] shrink-0 pt-px text-right">
            <div className="text-[0.78125rem] font-semibold tabular-nums leading-tight text-foreground">
              {event.isAllDay ? t("calendar.allDayShort") : timeFmt.format(event.start)}
            </div>
            <div className="mt-0.5 text-[0.65625rem] leading-tight text-muted-foreground">
              {duration(event, t)}
            </div>
          </div>

          <span
            aria-hidden="true"
            {...(() => {
              const rail = railProps(event)
              return {
                className: cn(
                  "mt-0.5 w-[0.25rem] shrink-0 self-stretch rounded-full",
                  rail.className,
                ),
                style: rail.style,
              }
            })()}
          />

          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-[0.78125rem] font-semibold leading-snug",
                event.isCancelled ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {event.subject || t("calendar.noSubject")}
            </p>
            {/* Başkasının takviminden gelen etkinlik İŞARETLENİR. Kendi
                etkinliklerinle aynı listede karışmaları, "bu toplantı benim
                mi" sorusunu her satırda sordururdu. */}
            {event.owner && (
              <p className="mt-0.5 truncate text-[0.65625rem] font-medium text-brand-deep">
                {t("calendar.sharedOwner", { name: event.owner.name })}
              </p>
            )}
            <p className="mt-0.5 flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
              <HugeiconsIcon
                icon={online ? Video01Icon : Location01Icon}
                className="size-3 shrink-0"
                strokeWidth={1.8}
              />
              <span className="truncate">{where}</span>
            </p>

            {people.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1">
                {people.slice(0, 5).map((a) => (
                  <PersonAvatar
                    key={a.address || a.name}
                    name={a.name}
                    photo={photoOf(a.address)}
                    response={a.response}
                    presence={presenceOf(a.address)}
                    presenceLabel={
                      presenceOf(a.address)
                        ? t(`calendar.presence.${presenceOf(a.address)}`)
                        : undefined
                    }
                    className="size-6"
                  />
                ))}
                {people.length > 5 && (
                  <span className="grid size-6 place-items-center rounded-full bg-muted text-[0.5625rem] font-semibold text-muted-foreground">
                    +{people.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Join sits on the row itself so it's one click from the list.
              Always visible while the meeting is live — that's when it matters
              and hunting for a hover target is the wrong ask. */}
          {event.joinUrl && !ended && (
            <a
              href={event.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation()
                joinInTeams(e, event.joinUrl, t)
              }}
              className={cn(
                "mt-0.5 shrink-0 rounded-full px-2 py-1 text-[0.65625rem] font-semibold transition",
                live
                  ? "bg-brand text-white shadow-sm hover:brightness-110"
                  : "bg-brand/10 text-brand-deep hover:bg-brand/20 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100",
              )}
            >
              {t("calendar.join")}
            </a>
          )}
        </li>
      </HoverCardTrigger>

      <HoverCardContent side="left" align="start" className="w-[21.5rem] p-0">
        <EventDetailCard event={event} live={live} />
      </HoverCardContent>
    </HoverCard>
  )
}
