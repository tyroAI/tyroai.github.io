import { HugeiconsIcon } from "@hugeicons/react"
import HourglassIcon from "@hugeicons/core-free-icons/HourglassIcon"
import { useLocale } from "@/hooks/useLocale"
import { startOfDay } from "@/lib/calendarRange"
import { getNumberFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"
import { useMinuteNow } from "./useMinuteNow"

/**
 * GERİ SAYIM — görünen toplantının başlamasına kalan süre.
 *
 * | kalan | yazı |
 * |---|---|
 * | sürüyor | nabız atan nokta + "Şimdi" (marka mürekkebi) |
 * | < 1 sa | ⏳ "35 dk" — 15 dk ve altında marka tonunda |
 * | < 24 sa | ⏳ "3 sa" |
 * | daha uzak | ⏳ "2 gün" — TAKVİM günü farkı, slaydın "Pazartesi"siyle aynı sayım (`Intl` birim biçimi, çoğulu dil çözer) |
 *
 * ⚠️ **KISA VE ARKA PLANSIZ, ÖLÇÜLDÜ.** Kart 1440 px'te ~160 px iç genişlikte
 * ve başlık ("Sıradaki toplantın") ~104 px: yanında ~47 px kalıyor (1280'de
 * ~39). Dolu bir hap ("⏳ 35 dk sonra", 92 px) başlığı iki satıra itip kartı —
 * ve onunla ızgara satırını — uzatırdı. "sonra" kelimesini kum saati
 * taşıyor; TAM cümle ("Başlamasına 3 sa 20 dk") `title`da ve ekran okuyucuda.
 * ⚠️ Dakika YUKARI yuvarlanır: 30 saniye kala "0 dk" yazmasın; başladığı an
 * "Şimdi"ye döner. Rakamlar dilin rakamıyla (`getNumberFormat` — AR).
 */
export function MeetingCountdown({ event }) {
  const { t, locale } = useLocale()
  const now = useMinuteNow()
  const start = event.start.getTime()
  const live = start <= now && event.end.getTime() > now
  const num = getNumberFormat(locale)
  let short = ""
  let full = ""
  if (!live) {
    const mins = Math.max(1, Math.ceil((start - now) / 60000))
    if (mins < 60) short = full = t("myspace.meeting.unit.m", { m: num.format(mins) })
    else if (mins < 24 * 60) {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      short = t("myspace.meeting.unit.h", { h: num.format(h) })
      full = m ? t("myspace.meeting.unit.hm", { h: num.format(h), m: num.format(m) }) : short
    } else {
      const days = Math.max(
        1,
        Math.round((startOfDay(event.start) - startOfDay(new Date(now))) / 86400000),
      )
      short = full = getNumberFormat(locale, {
        style: "unit",
        unit: "day",
        unitDisplay: "long",
      }).format(days)
    }
  }
  const soon = !live && start - now <= 15 * 60000
  const label = live ? t("myspace.meeting.liveFull") : t("myspace.meeting.in", { time: full })
  return (
    <span
      title={live ? undefined : label}
      className={cn(
        "-mr-0.5 inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap text-[0.71875rem] font-semibold tabular-nums",
        live || soon ? "text-brand-text" : "text-muted-foreground",
      )}
    >
      {live ? (
        <span aria-hidden="true" className="relative flex size-1.5">
          <span className="absolute inset-0 rounded-full bg-current opacity-60 motion-safe:animate-ping" />
          <span className="relative size-1.5 rounded-full bg-current" />
        </span>
      ) : (
        <HugeiconsIcon
          icon={HourglassIcon}
          className="size-3.5 shrink-0"
          strokeWidth={2}
          aria-hidden="true"
        />
      )}
      <span aria-hidden="true">{live ? t("myspace.meeting.live") : short}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
