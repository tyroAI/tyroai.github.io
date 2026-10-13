import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLocale } from "@/hooks/useLocale"
import { useRsvp } from "@/hooks/useRsvp"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"
import { InviteRow } from "./InviteRow"

const OPTS_TIME = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
const OPTS_MONTH = { month: "short" }
const OPTS_DAY = { day: "numeric" }
const OPTS_WEEKDAY = { weekday: "short" }

/**
 * Yanıt bekleyen davetler — özetin ipucundaki liste. Her davet bir kart:
 * tarih yaprağı, konu, saat · düzenleyen; saatin yanında Kabul et · Belki ·
 * Reddet simgeleri (renkli, her zaman görünür — dokunmatikte de aynı). Karta
 * basınca toplantı önizlemesi açılır: masaüstünde ipucunun yanında, telefonda
 * pencerede (`onOpen`) — sıradaki toplantının kartı (`InviteRow`).
 */
export function InviteList({ invites, onOpen }) {
  const { t, locale } = useLocale()
  const { busy, answer } = useRsvp()
  const [all, setAll] = useState(false) // "+n daha" basıldı mı
  const hidden = invites.length - 3
  const [openId, setOpenId] = useState(null) // yanında önizlemesi açık davet
  const isMobile = useIsMobile()
  const fmt = {
    time: getDateTimeFormat(locale, OPTS_TIME),
    month: getDateTimeFormat(locale, OPTS_MONTH),
    day: getDateTimeFormat(locale, OPTS_DAY),
    weekday: getDateTimeFormat(locale, OPTS_WEEKDAY),
  }

  return (
    <>
      <ul
        className={cn(
          "mt-3 flex flex-col gap-2",
          all &&
            "max-h-[min(55vh,26rem)] overflow-y-auto overscroll-contain pe-1 [scrollbar-width:thin]",
        )}
      >
        {(all ? invites : invites.slice(0, 3)).map((invite) => (
          <InviteRow
            key={invite.id}
            invite={invite}
            fmt={fmt}
            pending={busy[invite.id]}
            onAnswer={(action) => answer(invite, action)}
            open={openId === invite.id}
            onOpenChange={(next) => setOpenId(next ? invite.id : null)}
            onOpen={onOpen}
            mobile={isMobile}
          />
        ))}
      </ul>
      {hidden > 0 && !all && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-2 self-start rounded-sm text-[0.75rem] font-medium text-white/70 underline decoration-white/25 underline-offset-[0.2em] outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 [@media(pointer:coarse)]:min-h-10"
        >
          {t("myspace.tip.more", { n: hidden })}
        </button>
      )}
    </>
  )
}
