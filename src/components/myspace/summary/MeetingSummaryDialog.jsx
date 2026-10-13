import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiMagicIcon from "@hugeicons/core-free-icons/AiMagicIcon"
import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon"
import LockKeyIcon from "@hugeicons/core-free-icons/LockKeyIcon"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useLocale } from "@/hooks/useLocale"
import { useMeetingInsight } from "@/hooks/useMeetingInsight"
import { uniqueAttendees } from "@/lib/calendarPeople"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { INSIGHT, insightText, meetingChatUrl } from "@/lib/meetingInsights"
import { SummaryBody } from "./SummaryBody"
import { SummaryShare } from "./SummaryShare"

const OPTS_DAY = { weekday: "long", day: "numeric", month: "long" }
const OPTS_TIME = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
const BTN =
  "inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[0.8125rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/** Özetin olmadığı/alınamadığı durumların kartı — neden ve ne yapılabilir. */
function StateCard({ icon, title, hint, children }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <HugeiconsIcon icon={icon} className="size-6" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <p className="mt-4 text-[0.9375rem] font-semibold">{title}</p>
      {hint && (
        <p className="mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}

function SummaryContent({ event, t, locale }) {
  const res = useMeetingInsight(event)
  const subject = event.subject || t("calendar.noSubject")
  const time = getDateTimeFormat(locale, OPTS_TIME)
  const when = `${getDateTimeFormat(locale, OPTS_DAY).format(event.start)} · ${time.format(event.start)}–${time.format(event.end)}`
  const chatUrl = meetingChatUrl(event.joinUrl, res.threadId)
  const ready = res.status === INSIGHT.ready
  const teamsLink = chatUrl && (
    <a
      href={chatUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${BTN} bg-brand/10 text-brand hover:bg-brand/15`}
    >
      <HugeiconsIcon icon={BubbleChatIcon} className="size-4" strokeWidth={2} aria-hidden="true" />
      {t("meetingSummary.openTeams")}
    </a>
  )

  let body
  if (res.status === INSIGHT.loading) {
    body = (
      <div aria-busy="true" className="space-y-3 py-2">
        <span className="sr-only">{t("meetingSummary.loading")}</span>
        {["92%", "78%", "86%", "54%"].map((w) => (
          <span
            key={w}
            aria-hidden="true"
            className="ms-skeleton block h-4 rounded-full"
            style={{ width: w }}
          />
        ))}
      </div>
    )
  } else if (ready) {
    body = <SummaryBody insight={res.insight} subject={subject} t={t} locale={locale} />
  } else if (res.needsConsent) {
    body = (
      <StateCard
        icon={LockKeyIcon}
        title={t("meetingSummary.consent")}
        hint={t("meetingSummary.consentHint")}
      >
        <button
          type="button"
          onClick={res.grant}
          className={`${BTN} bg-brand text-white hover:brightness-110`}
        >
          {t("meetingSummary.allow")}
        </button>
      </StateCard>
    )
  } else if (res.status === INSIGHT.denied) {
    body = (
      <StateCard
        icon={LockKeyIcon}
        title={t("meetingSummary.denied")}
        hint={t("meetingSummary.deniedHint")}
      >
        {teamsLink}
      </StateCard>
    )
  } else if (res.status === INSIGHT.none) {
    body = (
      <StateCard
        icon={InformationCircleIcon}
        title={t("meetingSummary.none")}
        hint={t("meetingSummary.noneHint")}
      >
        {teamsLink}
      </StateCard>
    )
  } else {
    body = (
      <StateCard icon={InformationCircleIcon} title={t("meetingSummary.error")}>
        <button
          type="button"
          onClick={res.retry}
          className={`${BTN} bg-brand/10 text-brand hover:bg-brand/15`}
        >
          {t("calendar.retry")}
        </button>
        {teamsLink}
      </StateCard>
    )
  }

  const attendees = [
    ...new Set(
      [event.organizerAddress, ...uniqueAttendees(event).map((a) => a.address)]
        .filter(Boolean)
        .map((a) => a.toLowerCase()),
    ),
  ]
  const text = ready
    ? insightText(
        res.insight,
        { title: subject, when },
        {
          notes: t("meetingSummary.notes"),
          actions: t("meetingSummary.actions"),
          owner: (name) => t("meetingSummary.owner", { name }),
        },
      )
    : ""

  return (
    <>
      <header className="flex items-start gap-3 border-b border-border px-5 pb-4 pt-5 sm:px-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-white shadow-sm">
          <HugeiconsIcon
            icon={AiMagicIcon}
            className="size-5"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-brand">
            {t("meetingSummary.title")}
          </p>
          <DialogTitle
            dir="auto"
            className="mt-0.5 line-clamp-2 text-[1.0625rem] font-semibold leading-snug"
          >
            {subject}
          </DialogTitle>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-muted-foreground">
            <span className="[&::first-letter]:uppercase">{when}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium">
              {t("meetingSummary.source")}
            </span>
          </p>
        </div>
        <DialogClose
          aria-label={t("sheet.close")}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
        </DialogClose>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-gutter:auto]! sm:px-6">
        {body}
      </div>
      {ready && (
        <footer className="border-t border-border px-5 py-3.5 sm:px-6">
          <SummaryShare
            text={text}
            subject={subject}
            attendees={attendees}
            chatUrl={chatUrl}
            t={t}
          />
        </footer>
      )}
    </>
  )
}

/**
 * Toplantının yapay zekâ özeti penceresi (Microsoft 365 Copilot). Toplantı
 * ritminin ipucundan "Özet"le açılır; telefonda tam ekran. Kapanış
 * animasyonu bitene kadar son toplantı çizilir.
 */
export function MeetingSummaryDialog({ event, onClose }) {
  const { t, locale } = useLocale()
  const [last, setLast] = useState(null)
  if (event && event !== last) setLast(event)
  const shown = event ?? last
  return (
    <Dialog open={Boolean(event)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[min(46rem,calc(100dvh-3rem))] sm:w-full sm:max-w-[40rem] sm:rounded-2xl sm:p-0"
      >
        {shown && <SummaryContent key={shown.id} event={shown} t={t} locale={locale} />}
      </DialogContent>
    </Dialog>
  )
}
