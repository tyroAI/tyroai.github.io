import { motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import MinusSignIcon from "@hugeicons/core-free-icons/MinusSignIcon"
import Video01Icon from "@hugeicons/core-free-icons/Video01Icon"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { JoinButton } from "@/components/common/JoinButton"
import { OPTS_TIME, duration } from "@/components/common/event-detail/eventFormat"
import { prepareMeeting } from "@/components/common/event-detail/prepareMeeting"
import { useLocale } from "@/hooks/useLocale"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { useJoinUrl } from "@/hooks/useJoinUrl"
import { uniqueAttendees } from "@/lib/calendarPeople"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { formatCountdown } from "@/lib/meetingAlert"
import { meetingChatUrl } from "@/lib/meetingInsights"
import { cn } from "@/lib/utils"
import { AttendeeStack } from "./AttendeeStack"
import { CountdownRing } from "./CountdownRing"

const BTN =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-[0.8125rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/**
 * Sıradaki toplantının geri sayım penceresi (ekranın ortası). Halka 15 dk'dan
 * boşalır; son dakikada turuncuya döner, rakamlar nefes alır, kartın çevresi
 * nabız gibi parlar; sıfırda "Toplantı başladı" ve Katıl öne çıkar.
 * × küçültür (sağ altta hap), "Bu toplantı için gösterme" tümden kapatır.
 */
export function MeetingCountdown({ alert }) {
  const { t, locale } = useLocale()
  const still = useReducedMotion()
  const { event, msLeft, phase } = alert
  const time = getDateTimeFormat(locale, OPTS_TIME)
  const people = uniqueAttendees(event)
  const photos = usePeoplePhotos(people.slice(0, 30).map((a) => a.address))
  const accepted = people.filter((a) => a.response === "accepted").length
  const { url: joinUrl, pending } = useJoinUrl(event)
  const online = Boolean(joinUrl)
  const chatUrl = online ? meetingChatUrl(joinUrl) : null
  const final = phase === "final"
  const started = phase === "started"
  const eyebrow = started
    ? "meetingAlert.started"
    : final
      ? "meetingAlert.soon"
      : "meetingAlert.next"

  return (
    <Dialog open onOpenChange={(open) => !open && alert.minimize()}>
      <DialogContent
        showCloseButton={false}
        // Yalnız kişinin eylemi küçültür (Esc, ×, arka plana tıklama): başka bir
        // pencere ya da kompozitör odağı alınca kart sessizce küçülmesin.
        onFocusOutside={(e) => e.preventDefault()}
        className="w-[min(26rem,calc(100vw-2rem))] gap-0 overflow-visible rounded-3xl p-0 sm:max-w-[26rem]"
      >
        {/* Son dakikada kartın çevresi nabız gibi parlar. */}
        {final && !still && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-[1.75rem] ring-4 ring-orange-500/40"
            animate={{ opacity: [0.25, 1, 0.25], scale: [1, 1.015, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div className="relative overflow-hidden rounded-3xl">
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent",
              final ? "from-orange-500/15" : "from-brand/12",
            )}
          />
          <button
            type="button"
            onClick={alert.minimize}
            aria-label={t("meetingAlert.minimize")}
            title={t("meetingAlert.minimize")}
            className="absolute end-3 top-3 z-10 grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <HugeiconsIcon icon={MinusSignIcon} className="size-4" strokeWidth={2} />
          </button>

          <div className="relative flex flex-col items-center px-6 pb-6 pt-7 text-center">
            <p
              className={cn(
                "text-[0.6875rem] font-semibold uppercase tracking-[0.14em]",
                final ? "text-orange-600 dark:text-orange-400" : "text-brand",
              )}
            >
              {t(eyebrow)}
              {event.preview && ` · ${t("meetingAlert.preview")}`}
            </p>

            <CountdownRing msLeft={msLeft} phase={phase} className="mt-4">
              {started ? (
                <HugeiconsIcon icon={Video01Icon} className="size-9 text-brand" strokeWidth={1.8} />
              ) : (
                <>
                  <motion.span
                    className={cn(
                      "text-[2.5rem] font-semibold leading-none tracking-tight tabular-nums",
                      final && "text-orange-600 dark:text-orange-400",
                    )}
                    animate={final && !still ? { scale: [1, 1.07, 1] } : { scale: 1 }}
                    transition={
                      final && !still ? { duration: 1, repeat: Infinity } : { duration: 0.2 }
                    }
                  >
                    {formatCountdown(msLeft)}
                  </motion.span>
                  <span className="mt-1 text-[0.75rem] text-muted-foreground">
                    {t("meetingAlert.left")}
                  </span>
                </>
              )}
            </CountdownRing>

            <DialogTitle className="mt-5 text-[1.125rem] font-semibold leading-snug [overflow-wrap:anywhere]">
              {event.subject || t("calendar.noSubject")}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-[0.8125rem] text-muted-foreground">
              {time.format(event.start)} – {time.format(event.end)} · {duration(event, t)}
            </DialogDescription>
            <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-foreground/80">
              <HugeiconsIcon
                icon={online ? Video01Icon : Location01Icon}
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.8}
              />
              <span className="min-w-0 truncate">
                {event.location || (online ? t("calendar.teamsMeeting") : "—")}
              </span>
            </p>

            {people.length > 0 && (
              <div className="mt-4 flex items-center gap-2.5">
                <AttendeeStack
                  people={people}
                  photoOf={(address) => photos.get((address || "").toLowerCase())}
                />
                <span className="text-[0.75rem] text-muted-foreground">
                  {t("meetingAlert.accepted", { n: accepted })}
                </span>
              </div>
            )}

            <div className="mt-6 flex w-full gap-2">
              <JoinButton
                url={joinUrl}
                pending={pending}
                onJoin={alert.minimize}
                className={cn(BTN, "flex-1 bg-brand-fill-deep text-brand-on-brand shadow-sm")}
                activeClassName={cn(
                  "hover:brightness-110",
                  (final || started) && "shadow-lg shadow-brand/30",
                )}
              >
                <HugeiconsIcon icon={Video01Icon} className="size-4" strokeWidth={2} />
                {t("calendar.join")}
              </JoinButton>
              <button
                type="button"
                onClick={() => {
                  alert.minimize()
                  prepareMeeting(event, t, locale)
                }}
                className={cn(
                  BTN,
                  "border border-brand/30 bg-brand/5 text-brand hover:bg-brand/10",
                )}
              >
                <HugeiconsIcon icon={AiChat02Icon} className="size-4" strokeWidth={2} />
                {t("calendar.prepareShort")}
              </button>
              {chatUrl && (
                <a
                  href={chatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("calendar.chat")}
                  title={t("calendar.chat")}
                  className={cn(
                    BTN,
                    "border border-border px-3 text-foreground/80 hover:bg-accent",
                  )}
                >
                  <HugeiconsIcon icon={BubbleChatIcon} className="size-4" strokeWidth={2} />
                </a>
              )}
            </div>

            <button
              type="button"
              onClick={alert.dismiss}
              className="mt-4 rounded-sm text-[0.75rem] font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              {t("meetingAlert.dismiss")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
