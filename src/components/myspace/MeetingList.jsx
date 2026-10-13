import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { EventSidePreview } from "./EventSidePreview"

/**
 * Özetin "bugün kalan toplantılar" ipucundaki liste — saat · konu. Satıra
 * basınca toplantı önizlemesi açılır (davetlerle aynı): masaüstünde ipucunun
 * yanında (`EventSidePreview`), telefonda pencerede (`onOpen`). İlk `limit`
 * satır + "+n daha" (basınca hepsi, uzunsa kayar).
 */
export function MeetingList({ meetings, timeFmt, onOpen, limit = 3 }) {
  const { t } = useLocale()
  const isMobile = useIsMobile()
  const [openId, setOpenId] = useState(null)
  const [all, setAll] = useState(false)
  const hidden = meetings.length - limit
  const shown = hidden > 0 && !all ? meetings.slice(0, limit) : meetings

  return (
    <>
      <ul
        className={cn(
          "mt-2.5 flex flex-col text-[0.8125rem] leading-snug",
          all &&
            "max-h-[min(50vh,18rem)] overflow-y-auto overscroll-contain pe-1 [scrollbar-width:thin]",
        )}
      >
        {shown.map((e) => (
          <EventSidePreview
            key={e.id}
            event={e}
            open={openId === e.id}
            onOpenChange={(next) => setOpenId(next ? e.id : null)}
            mobile={isMobile}
          >
            {(wrap) => (
              // Satırın tamamı önizlemeyi açar (konu düğmesinin `::after`'ı satırı kaplar).
              <li className="group/mt relative -mx-2 grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.07] has-[[data-state=open]]:bg-white/[0.1]">
                <span className="tabular-nums text-white/55">{timeFmt.format(e.start)}</span>
                {wrap(
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={isMobile ? () => onOpen(e) : undefined}
                    lang="tr"
                    className="rounded-sm text-start font-medium decoration-white/40 underline-offset-[0.2em] outline-none [overflow-wrap:anywhere] after:absolute after:inset-0 after:rounded-lg after:content-[''] group-hover/mt:underline focus-visible:after:ring-2 focus-visible:after:ring-white/50"
                  >
                    {e.subject || t("calendar.noSubject")}
                  </button>,
                )}
              </li>
            )}
          </EventSidePreview>
        ))}
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
