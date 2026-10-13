import CalendarAdd01Icon from "@hugeicons/core-free-icons/CalendarAdd01Icon"
import { CalendarAdd01Icon as AnimatedCalendarIcon } from "@/components/ui/calendar-add-01"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAnimatedIcon } from "@/hooks/useAnimatedIcon"
import { useLocale } from "@/hooks/useLocale"
import { ClockText } from "@/components/common/ClockText"
import { useMinuteNow } from "@/hooks/useMinuteNow"
import { formatClock } from "@/lib/clockFormat"

/**
 * Header date pill. Spreads unknown props and forwards `ref` onto the button
 * so it can act as a Radix trigger (CalendarPopover uses it as one) — React
 * 19 passes ref as a plain prop, so no forwardRef wrapper is needed.
 */
/**
 * ⚠️ **ROZETİN RENGİ PALETTEN GELİYOR.** Buradaki eski not "sabit turkuaz"
 * diyordu ve YANLIŞTI: `index.css`in kuralı `--badge: var(--brand-to)` /
 * `--badge-foreground: var(--brand-deep)`, yani rozet aktif paletin son
 * durağını taşıyor. Tek renkli beş palet (black, amber, navy, sky, violet)
 * bunu `soft`/`text` çiftiyle eziyor, çünkü orada bütün duraklar aynı renk
 * ve rakam kendi zeminine karışırdı. Yeni palet eklerken kontrol: `--brand-to`
 * `--brand-deep`ten farklı olmalı, değilse override şart.
 */
/**
 * ⚠️ `icon`/`animatedIcon`: hap İKİ paneli birden tetikliyor — ajanda
 * takvimi (`CalendarPopover`) ve özel günler (`SpecialDaysPopover`,
 * 2026-09-21). Glif ÇAĞIRANIN kararı: aynı hap iki ayrı şeyi açarken
 * aynı ikonu taşısaydı, kullanıcı hangisinin açılacağını tahmin
 * edemezdi. Varsayılan takvimdir, yani mevcut çağrı yerleri değişmedi.
 *
 * ⚠️ Hareketli karşılığı OLMAYAN bir glif geçilebilir (bayrağınki kayıt
 * defterinde yok): o durumda ikon sabit çizilir, hover animasyonu
 * yoktur. Uydurma bir animasyon eşlemek, ikonun kendi tasarımını
 * bozardı.
 */
export function DateTimePill({
  className = "",
  badge = 0,
  badgeLabel,
  icon,
  animatedIcon,
  ref,
  ...props
}) {
  const { locale } = useLocale()
  const now = useMinuteNow()
  // Same treatment as the mail button beside it: a plain glyph on the header
  // surface, animating when the control is hovered. The gradient chip this
  // icon used to sit in is gone — it was the only painted square up there and
  // read as a status light rather than as a button.
  const { icon: calendarIcon, hoverProps } = useAnimatedIcon({
    icon: icon ?? CalendarAdd01Icon,
    animatedIcon: icon ? animatedIcon : AnimatedCalendarIcon,
  })

  const { weekdayLong, fullDate, time } = formatClock(now, locale)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          ref={ref}
          {...props}
          {...hoverProps}
          // ⚠️ ROZET SAYISI EKRAN OKUYUCUYA DA SÖYLENİR. Rakam görsel bir
          // katman; adı geçmezse hapı duyan kişi "3" diye bir şeyin
          // orada durduğunu hiç bilmez. Etiketi ÇAĞIRAN verir, çünkü
          // sayının ne saydığı hapa göre değişiyor (okunmamış posta mı,
          // yaklaşan tatil mi).
          aria-label={
            badge > 0 && badgeLabel
              ? `${weekdayLong}, ${fullDate} · ${time} · ${badgeLabel}`
              : `${weekdayLong}, ${fullDate} · ${time}`
          }
          // Mobilde İKON, md'den itibaren tam hap. Eskiden `hidden md:flex`
          // ile tamamen kayboluyordu: telefonda takvim paneline hiçbir yoldan
          // ulaşılamıyordu. Tarih yazısı dar ekranda ~46px yer tutuyor ve
          // header zaten sınırda, o yüzden düşen yalnızca yazı — düğmenin
          // kendisi ve rozeti kalır.
          className={
            "relative flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2 transition hover:bg-accent md:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [&_svg]:!size-5 md:pl-1.5 md:pr-2 pointer-coarse:after:absolute pointer-coarse:after:-inset-1 " +
            className
          }
        >
          {/* ⚠️ Rozet ikonun sağ üstünden TAŞIYOR (`-right-2`); yazı hemen yanında
              başlayınca rakam ilk harfin üstüne biniyordu ("2CUM", ölçüldü).
              Rozet varken ikonun sağına o kadar pay. */}
          <span className={"relative grid place-items-center" + (badge > 0 ? " md:mr-1.5" : "")}>
            {calendarIcon}
            {badge > 0 && (
              <span className="absolute -top-1.5 -right-2 grid h-[0.9375rem] min-w-[0.9375rem] place-items-center rounded-full bg-badge px-1 text-[0.5625rem] font-bold leading-none text-badge-foreground ring-2 ring-background">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </span>
          <ClockText now={now} locale={locale} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="flex-col items-center gap-0 px-3 py-2 text-center"
      >
        {/* Tooltip primitive paints bg-foreground + text-background, so use
            text-background (NOT text-foreground) — otherwise the text is
            invisible against the matching bg. */}
        <div className="text-[0.6875rem] font-semibold uppercase tracking-wider text-background">
          {weekdayLong}
        </div>
        <div className="mt-0.5 text-xs text-background/90">{fullDate}</div>
        <div className="mt-0.5 text-[0.6875rem] tabular-nums text-background/65">{time}</div>
      </TooltipContent>
    </Tooltip>
  )
}
