import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiMagicIcon from "@hugeicons/core-free-icons/AiMagicIcon"
import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLocale } from "@/hooks/useLocale"
import { meetingChatUrl } from "@/lib/meetingInsights"
import { cn } from "@/lib/utils"
import { EventSidePreview } from "./EventSidePreview"

const LIMIT = 3
const PILL =
  "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/70 [@media(pointer:coarse)]:h-9"

/**
 * Toplantı ritminin ipucundaki liste — bir günün toplantıları (saat · konu).
 * Konuya basınca toplantı önizlemesi açılır (özetin öteki ipuçlarıyla aynı).
 * GEÇMİŞ bir Teams toplantısının üstüne gelince (klavye odağında ve
 * dokunmatikte hep) iki eylem açılır: **Sohbet** (Teams'te toplantı sohbeti;
 * katılma linkinden kurulabiliyorsa) ve **Özet** (Copilot'un yapay zekâ özeti —
 * `MeetingSummaryDialog`). Düğmeler kapalıyken yer tutmaz.
 */
export function RhythmMeetingList({ items, timeFmt, now, onOpen, onSummary }) {
  const { t } = useLocale()
  const isMobile = useIsMobile()
  const [openId, setOpenId] = useState(null)
  const [all, setAll] = useState(false)
  const hidden = items.length - LIMIT
  const shown = hidden > 0 && !all ? items.slice(0, LIMIT) : items
  const nowMs = +now

  return (
    <>
      <ul
        className={cn(
          "mt-2.5 flex flex-col text-[0.8125rem] leading-snug",
          all &&
            "max-h-[min(50vh,20rem)] overflow-y-auto overscroll-contain pe-1 [scrollbar-width:thin]",
        )}
      >
        {shown.map(({ from, event }) => {
          const past = event.end?.getTime() < nowMs
          const online = Boolean(event.isOnlineMeeting && event.joinUrl)
          const chatUrl = online ? meetingChatUrl(event.joinUrl) : null
          return (
            <EventSidePreview
              key={`${event.id}:${from}`}
              event={event}
              open={openId === event.id}
              onOpenChange={(next) => setOpenId(next ? event.id : null)}
              mobile={isMobile}
            >
              {(wrap) => (
                <li className="group/rm relative -mx-2 rounded-lg px-2 py-1.5 transition-colors focus-within:bg-white/[0.07] hover:bg-white/[0.07] has-[[data-state=open]]:bg-white/[0.1]">
                  <div className="grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-3">
                    <span className="tabular-nums text-white/55">
                      {timeFmt.format(new Date(from))}
                    </span>
                    {wrap(
                      <button
                        type="button"
                        aria-haspopup="dialog"
                        onClick={isMobile ? () => onOpen(event) : undefined}
                        lang="tr"
                        className="rounded-sm text-start font-medium decoration-white/40 underline-offset-[0.2em] outline-none [overflow-wrap:anywhere] after:absolute after:inset-0 after:rounded-lg after:content-[''] group-hover/rm:underline focus-visible:after:ring-2 focus-visible:after:ring-white/50"
                      >
                        {event.subject || t("calendar.noSubject")}
                      </button>,
                    )}
                  </div>
                  {past && online && (
                    <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 group-focus-within/rm:grid-rows-[1fr] group-focus-within/rm:opacity-100 group-hover/rm:grid-rows-[1fr] group-hover/rm:opacity-100 motion-reduce:transition-none [@media(pointer:coarse)]:grid-rows-[1fr] [@media(pointer:coarse)]:opacity-100">
                      <div className="min-h-0 overflow-hidden">
                        <div className="relative z-[1] flex flex-wrap gap-1.5 ps-[3.75rem] pt-2">
                          {chatUrl && (
                            <a
                              href={chatUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={t("myspace.rhythm.chatTitle")}
                              className={`${PILL} bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20`}
                            >
                              <HugeiconsIcon
                                icon={BubbleChatIcon}
                                className="size-3.5"
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                              {t("myspace.rhythm.chat")}
                            </a>
                          )}
                          <button
                            type="button"
                            title={t("myspace.rhythm.summaryTitle")}
                            onClick={() => onSummary(event)}
                            className={`${PILL} bg-white text-neutral-900 hover:bg-white/90`}
                          >
                            <HugeiconsIcon
                              icon={AiMagicIcon}
                              className="size-3.5"
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            {t("myspace.rhythm.summary")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )}
            </EventSidePreview>
          )
        })}
      </ul>
      {hidden > 0 && !all && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-1.5 self-start rounded-sm text-[0.75rem] font-medium text-white/70 underline decoration-white/25 underline-offset-[0.2em] outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 [@media(pointer:coarse)]:min-h-10"
        >
          {t("myspace.tip.more", { n: hidden })}
        </button>
      )}
    </>
  )
}
