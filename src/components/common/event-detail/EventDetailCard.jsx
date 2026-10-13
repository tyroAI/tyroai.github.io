import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import SquareArrowExpand01Icon from "@hugeicons/core-free-icons/SquareArrowExpand01Icon"
import Video01Icon from "@hugeicons/core-free-icons/Video01Icon"
import { Separator } from "@/components/ui/separator"
import { PersonCard } from "@/components/common/PersonCard"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { usePresence } from "@/hooks/usePresence"
import { useLocale } from "@/hooks/useLocale"
import { uniqueAttendees } from "@/lib/calendarPeople"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"
import { EventActions } from "./EventActions"
import { prepareMeeting } from "./prepareMeeting"
import { EventAttendees } from "./EventAttendees"
import { EventResponse } from "./EventResponse"
import { OPTS_DAY_FULL, OPTS_TIME, agendaText, duration, responseChip } from "./eventFormat"

/**
 * Outlook'un etkinlik kartı: başlık, ne zaman · nerede, Katıl / Sohbet (bitmiş
 * Teams toplantısında Sohbet / Özet),
 * asistanla hazırlan, kim davet etti ve yanıtım (yanıtlanmamışsa Kabul et ·
 * Belki · Reddet), gündemin ilk satırları, katılımcılar.
 *
 * Header takvimi, çentik, Anasayfa'nın sıradaki toplantısı ve özetin davetleri
 * AYNI kartı açar — ikinci bir önizleme zamanla bundan ayrışırdı.
 * Metinler kırpılmaz (kısaltılmış satırın tam hâlini göstermek kartın işi).
 *
 * `onAnswered`: davete yanıt gittikten sonra (ör. pencereyi kapatmak için).
 */
export function EventDetailCard({ event, live, onAnswered }) {
  const { locale, t } = useLocale()
  const timeFmt = getDateTimeFormat(locale, OPTS_TIME)
  const online = event.isOnlineMeeting
  const people = uniqueAttendees(event)
  const iOrganize = event.myResponse === "organizer"
  const [now] = useState(() => Date.now())
  const ended = event.end?.getTime() < now
  const agenda = agendaText(event.bodyPreview)

  const photos = usePeoplePhotos([
    event.organizerAddress,
    ...people.slice(0, 12).map((a) => a.address),
  ])
  const photoOf = (address) => photos.get((address || "").toLowerCase())
  const presence = usePresence([...people.map((a) => a.address), event.organizerAddress])
  const presenceOf = (address) => presence.get((address || "").toLowerCase())

  // Kişiye basınca kart O KİŞİYE geçer (geri ok toplantıya döner): fareyle
  // açılan kartın içinden ikinci bir kart açmak ikisini birden kapatırdı.
  // Geçişte kart kısalmaz — imleç kartın dışında kalıp önizlemeyi kapatmasın.
  const [who, setWhoState] = useState(null)
  const rootRef = useRef(null)
  const [minH, setMinH] = useState(0)
  const setWho = (next) => {
    const h = rootRef.current?.offsetHeight ?? 0
    setMinH((m) => Math.max(m, h))
    setWhoState(next)
  }
  const chip = responseChip(event.myResponse, event.isCancelled)

  const prepareWithAssistant = () => prepareMeeting(event, t, locale)

  if (who) {
    return (
      <div ref={rootRef} style={minH ? { minHeight: minH } : undefined}>
        <PersonCard
          person={who}
          onBack={() => setWho(null)}
          backLabel={t("person.backToMeeting")}
          focusBack
        />
      </div>
    )
  }

  return (
    <div ref={rootRef} style={minH ? { minHeight: minH } : undefined} className="text-[0.75rem]">
      <div className="p-3.5 pb-3">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
              chip.className,
            )}
            style={chip.style}
          >
            <HugeiconsIcon icon={Calendar03Icon} className="size-4" strokeWidth={2} />
          </span>
          <p className="min-w-0 flex-1 text-[0.90625rem] font-semibold leading-snug">
            {event.subject || t("calendar.noSubject")}
          </p>
          {event.webLink && (
            <a
              href={event.webLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("calendar.openEvent")}
              title={t("calendar.openEvent")}
              className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
            >
              <HugeiconsIcon icon={SquareArrowExpand01Icon} className="size-3.5" strokeWidth={2} />
            </a>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2 text-foreground/85">
            <HugeiconsIcon
              icon={Clock01Icon}
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              strokeWidth={1.8}
            />
            <div className="min-w-0">
              <p className="[&::first-letter]:uppercase">
                {getDateTimeFormat(locale, OPTS_DAY_FULL).format(event.start)}
              </p>
              <p className="text-muted-foreground">
                {event.isAllDay
                  ? t("calendar.allDay")
                  : `${timeFmt.format(event.start)} - ${timeFmt.format(event.end)}`}
                {" · "}
                {duration(event, t)}
              </p>
            </div>
          </div>
          {(event.location || online) && (
            <div className="flex items-start gap-2 text-foreground/85">
              <HugeiconsIcon
                icon={online && !event.location ? Video01Icon : Location01Icon}
                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.8}
              />
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {event.location || t("calendar.teamsMeeting")}
              </span>
            </div>
          )}
        </div>

        <EventActions
          event={event}
          live={live}
          ended={ended}
          iOrganize={iOrganize}
          onPrepare={prepareWithAssistant}
        />
      </div>

      <EventResponse
        key={event.id}
        event={event}
        ended={ended}
        iOrganize={iOrganize}
        photoOf={photoOf}
        presenceOf={presenceOf}
        onPerson={setWho}
        onAnswered={onAnswered}
      />

      {agenda && (
        <>
          <Separator />
          {/* Kırpma yerine kaydırma: gündemin devamı da okunabilsin. */}
          <div className="max-h-[9rem] overflow-y-auto overscroll-contain p-3.5 py-3 [scrollbar-gutter:auto]!">
            <p className="whitespace-pre-line text-[0.71875rem] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              {agenda}
            </p>
          </div>
        </>
      )}

      {people.length > 0 && (
        <EventAttendees
          people={people}
          organizerAddress={event.organizerAddress}
          photoOf={photoOf}
          presenceOf={presenceOf}
          onPerson={setWho}
        />
      )}
    </div>
  )
}
