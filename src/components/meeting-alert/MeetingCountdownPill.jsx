import { HugeiconsIcon } from "@hugeicons/react"
import Video01Icon from "@hugeicons/core-free-icons/Video01Icon"
import { JoinButton } from "@/components/common/JoinButton"
import { useJoinUrl } from "@/hooks/useJoinUrl"
import { useLocale } from "@/hooks/useLocale"
import { formatCountdown } from "@/lib/meetingAlert"
import { cn } from "@/lib/utils"
import { CountdownRing } from "./CountdownRing"

/**
 * Küçültülmüş geri sayım: sağ altta belirgin kart — halka, iri süre, konu ve
 * doğrudan Katıl. Kartın kendisine basınca pencere yeniden açılır. Son
 * dakikada turuncu, kenarı nabız gibi atar.
 */
export function MeetingCountdownPill({ alert }) {
  const { t } = useLocale()
  const { event, msLeft, phase } = alert
  const final = phase === "final"
  const started = phase === "started"
  const { url, pending } = useJoinUrl(event)
  return (
    <div
      className={cn(
        "fixed bottom-6 end-6 z-50 flex items-center gap-3 rounded-2xl bg-popover/95 p-2.5 pe-3 shadow-xl ring-1 backdrop-blur",
        final ? "ring-orange-500/60" : "ring-border",
      )}
    >
      {final && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 animate-pulse rounded-[1.2rem] ring-2 ring-orange-500/50 motion-reduce:animate-none"
        />
      )}
      <button
        type="button"
        onClick={alert.expand}
        aria-label={t("meetingAlert.open")}
        className="flex min-w-0 items-center gap-3 rounded-xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <CountdownRing msLeft={msLeft} phase={phase} size={52} stroke={5}>
          <HugeiconsIcon
            icon={Video01Icon}
            className={cn("size-5", final ? "text-orange-600 dark:text-orange-400" : "text-brand")}
            strokeWidth={1.8}
          />
        </CountdownRing>
        <span className="min-w-0">
          <span
            className={cn(
              "block text-[0.625rem] font-semibold uppercase tracking-[0.12em]",
              final ? "text-orange-600 dark:text-orange-400" : "text-brand",
            )}
          >
            {t(
              started ? "meetingAlert.started" : final ? "meetingAlert.soon" : "meetingAlert.next",
            )}
          </span>
          {!started && (
            <span
              className={cn(
                "block text-[1.375rem] font-semibold leading-tight tabular-nums",
                final && "text-orange-600 dark:text-orange-400",
              )}
            >
              {formatCountdown(msLeft)}
            </span>
          )}
          <span className="block max-w-[12rem] truncate text-[0.75rem] text-muted-foreground">
            {event.subject || t("calendar.noSubject")}
          </span>
        </span>
      </button>
      <JoinButton
        url={url}
        pending={pending}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-brand-fill-deep px-3.5 text-[0.8125rem] font-semibold text-brand-on-brand shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        activeClassName="hover:brightness-110"
      >
        <HugeiconsIcon icon={Video01Icon} className="size-4" strokeWidth={2} />
        {t("calendar.join")}
      </JoinButton>
    </div>
  )
}
