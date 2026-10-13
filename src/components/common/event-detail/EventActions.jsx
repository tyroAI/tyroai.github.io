import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import AiMagicIcon from "@hugeicons/core-free-icons/AiMagicIcon"
import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon"
import Video01Icon from "@hugeicons/core-free-icons/Video01Icon"
import { useJoinUrl } from "@/hooks/useJoinUrl"
import { useLocale } from "@/hooks/useLocale"
import { meetingChatUrl } from "@/lib/meetingInsights"
import { openMeetingSummary } from "@/lib/summaryBus"
import { cn } from "@/lib/utils"
import { joinInTeams } from "@/lib/teamsJoin"

// Düğmeler satırı eşit paylaşır; sığmayan (RU, AR) alt satıra iner.
const BTN =
  "flex h-8 flex-1 basis-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[0.75rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
const SOLID = "bg-brand text-white hover:brightness-110"
const GHOST = "border border-border text-foreground/85 hover:bg-accent/60"
const TINT = "border border-brand/30 bg-brand/5 text-brand hover:bg-brand/10"

/**
 * Kartın eylem satırı — tek sıra. Toplantı sürerken/gelecekteyse **Katıl** ve
 * düzenleyenle **Sohbet**. BİTMİŞ bir Teams toplantısında Katıl kalkar;
 * Sohbet toplantının kendi sohbetini açar (özet ve kayıt oraya düşer) ve
 * yanına **Özet** gelir — Copilot'un yapay zekâ özeti (`openMeetingSummary`).
 * Sonda **Hazırlan** (asistanla; tam adı `title`da) — yalnız bitmemiş toplantıda:
 * geçmiş toplantıya hazırlanılmaz.
 */
export function EventActions({ event, live, ended, iOrganize, onPrepare }) {
  const { t } = useLocale()
  // Link listede yoksa davetin gövdesinden (klasik Teams eklentisi).
  const { url: joinUrl } = useJoinUrl(event)
  const pastOnline = ended && Boolean(joinUrl)
  const meetingChat = pastOnline ? meetingChatUrl(joinUrl) : null
  const chatHref =
    meetingChat ??
    (event.organizerAddress && !iOrganize
      ? `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(event.organizerAddress)}`
      : null)
  const icon = (glyph) => (
    <HugeiconsIcon icon={glyph} className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
  )

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {joinUrl && !ended && (
        <a
          href={joinUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => joinInTeams(e, joinUrl, t)}
          className={cn(BTN, SOLID, live && "shadow-md")}
        >
          {icon(Video01Icon)}
          {t("calendar.join")}
        </a>
      )}
      {chatHref && (
        <a
          href={chatHref}
          target="_blank"
          rel="noopener noreferrer"
          title={meetingChat ? t("myspace.rhythm.chatTitle") : undefined}
          className={cn(BTN, GHOST)}
        >
          {icon(BubbleChatIcon)}
          {t("calendar.chat")}
        </a>
      )}
      {pastOnline && (
        <button
          type="button"
          onClick={() => openMeetingSummary(joinUrl ? { ...event, joinUrl } : event)}
          title={t("calendar.summaryTitle")}
          className={cn(BTN, SOLID)}
        >
          {icon(AiMagicIcon)}
          {t("calendar.summary")}
        </button>
      )}
      {!ended && (
        <button
          type="button"
          onClick={onPrepare}
          title={t("calendar.prepare")}
          className={cn(BTN, TINT)}
        >
          {icon(AiChat02Icon)}
          {t("calendar.prepareShort")}
        </button>
      )}
    </div>
  )
}
