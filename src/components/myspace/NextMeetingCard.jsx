import { useMemo, useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { HugeiconsIcon } from "@hugeicons/react"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { EventDetailCard } from "@/components/common/event-detail/EventDetailCard"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"
import { useHoverPopover } from "@/hooks/useHoverPopover"
import { useLocale } from "@/hooks/useLocale"
import { startOfDay } from "@/lib/calendarRange"
import { STATUS, requestGraphScopes } from "@/lib/graph"
import { alignFor } from "@/lib/placement"
import { EDGE_ARROW, edgeSide } from "@/components/common/edgeArrow"
import { cn } from "@/lib/utils"
import { Card, CardTitle } from "./CardShell"
import { HORIZON_DAYS, isImminent } from "./meetingUtils"
import { MeetingTicket } from "./next-meeting/MeetingTicket"
import { MeetingCountdown } from "./MeetingCountdown"
import { CalendarRetry } from "./CalendarRetry"

// Önizleme kartının yaklaşık ölçüsü (px) — yön seçimi için (`lib/placement`).
const CARD_SIZE = { width: 344, height: 520 }
const SIDE_PREFER = ["right", "left"]
// Konu · saat bloğu: biletin önizleme tetiği (aktif slaytta düğme, ötekilerde düz).
const TRIGGER =
  "-mx-1.5 mt-2 flex min-w-0 flex-col items-start rounded-xl px-1.5 py-0.5 text-left outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-brand/30 data-[state=open]:bg-foreground/[0.04]"

/**
 * ⚠️ **"SIRADAKİ" = BİTMEMİŞ İLK TOPLANTI**, bugünle sınırlı değil: akşam
 * açan birine boş bir kart göstermek yerine yarının ilkini gösterir. Tüm gün
 * etkinlikleri ve reddedilenler toplantı değil (bkz. `lib/meetingLoad.js`),
 * başkasının takvimi de değil.
 *
 * ⚠️ **KARUSEL — sonrakiler oklarla.** Pencere bugün + altı gün. Oklar yarı
 * saydam cam, kartın KENARINA oturuyor: içeride dursalar konunun ilk harflerini örterlerdi, kenarda
 * yarısı dolguda yarısı ızgara aralığında. Farede yalnız kartın üstündeyken,
 * dokunmatikte HER ZAMAN görünür (hover yok) ve orada kaydırmak da çalışıyor;
 * klavyede ← →. Uçtaki ok kaybolur ve odağı karşı oka devreder — yoksa odak
 * `body`ye düşerdi.
 *
 * ⚠️ **SLAYTLAR AYNI HÜCREDE ÜST ÜSTE** (`[grid-area:1/1]`), yalnız biri
 * görünür. Hücrenin boyu EN UZUN slaytınki, yani iki satırlık bir konudan tek
 * satırlığa geçince kart — ve onunla bütün ızgara sırası — zıplamıyor.
 * Gizliler `invisible` + `inert`: ne odak alır ne okunur.
 *
 * ⚠️ **ÖNİZLEME ÇENTİĞİN KARTI** (`EventDetailCard`): takvim satırının açtığı
 * kartın AYNISI; ikinci bir detay görünümü zamanla ondan ayrışırdı. Açılış
 * `useHoverPopover` ile — HoverCard telefonda açılmıyor.
 *
 * ⚠️ **İKİ DÜĞME: Hazırlan · Katıl.** Bağlantı varsa Katıl HER ZAMAN görünür:
 * Teams erken gelene lobi açıyor. Canlıyken Katıl dolu (birincil), öncesinde
 * Hazırlan — kartın tek birincil eylemi saate göre el değiştiriyor. "Hazırlan"
 * kısa; tam anlamı düğmenin adında ve `title`ında.
 *
 * ⚠️ **BAŞLIK SATIRINDA GERİ SAYIM** (`MeetingCountdown`): görünen slaydın
 * başlamasına kalan süre. Outlook'ta açmak önizleme kartının
 * (`EventDetailCard`) içinde.
 */
export function NextMeetingCard({ cal, now, className }) {
  const { t } = useLocale()
  const { instance, accounts } = useMsal()
  const isMobile = useIsMobile()
  const preview = useHoverPopover({
    openDelay: 250,
    closeDelay: 150,
    side: "right",
    prefer: SIDE_PREFER,
    size: CARD_SIZE,
  })
  const prevRef = useRef(null)
  const nextRef = useRef(null)
  const swipe = useRef(null)

  const upcoming = useMemo(() => {
    const horizon = startOfDay(new Date(now))
    horizon.setDate(horizon.getDate() + HORIZON_DAYS)
    return (cal.events ?? [])
      .filter(
        (e) =>
          !e.owner &&
          !e.isAllDay &&
          e.myResponse !== "declined" &&
          e.end.getTime() > now &&
          e.start.getTime() < horizon.getTime(),
      )
      .sort((a, b) => a.start - b.start)
  }, [cal.events, now])

  // Seçim KİMLİKLE tutulur, sırayla değil: ilk toplantı bitip listeden
  // düşünce kullanıcının baktığı slayt yerinde kalsın. Kimlik artık yoksa
  // (bitti, iptal) ilk slayda dönülür.
  const [pickedId, setPickedId] = useState(null)
  const index = Math.max(
    0,
    upcoming.findIndex((e) => e.id === pickedId),
  )
  const current = upcoming[index] ?? null
  const count = upcoming.length

  function go(delta) {
    const target = Math.min(count - 1, Math.max(0, index + delta))
    if (target === index) return
    const from = document.activeElement
    preview.close()
    setPickedId(upcoming[target].id)
    // Uçta, odaktaki ok bu slaytta kaybolacak: odağı karşı oka devret, yoksa
    // `body`ye düşer. ⚠️ Karar ŞİMDİ verilir, rAF'ta "odak düştü mü" diye
    // bakılmaz: tarayıcı görünmez olan elemandan odağı rAF'TAN SONRA alıyor
    // (ölçüldü). rAF ise karşı okun
    // görünür olduğu işlemeden sonra koşuyor.
    const vanishing =
      (target === count - 1 && from === nextRef.current) ||
      (target === 0 && from === prevRef.current)
    if (vanishing)
      requestAnimationFrame(() => (from === nextRef.current ? prevRef : nextRef).current?.focus())
  }

  async function connect() {
    const ok = await requestGraphScopes(instance, accounts[0], ["Calendars.Read"])
    if (ok) cal.refresh?.()
  }

  const nav = count > 1 && cal.status === STATUS.ready

  let body
  if (cal.status === "loading") {
    // ⚠️ İSKELET KARTIN KENDİ ŞEKLİNDE: dört yüz, iki satırlık konu, saat
    // satırı ve dipte iki düğme hapı — yüklü kartla aynı boy, yani veri gelince
    // kart ve ızgara sırası zıplamıyor.
    body = (
      <>
        <span className="sr-only">{t("myspace.loading")}</span>
        <div aria-hidden="true" className="mt-3 flex flex-1 flex-col">
          <div className="flex h-7 items-center gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="ms-skeleton size-7 rounded-full" />
            ))}
          </div>
          <span className="ms-skeleton mt-3.5 h-4 w-[88%] rounded-full" />
          <span className="ms-skeleton mt-2 h-4 w-[56%] rounded-full" />
          <span className="ms-skeleton mt-3 h-3 w-[46%] rounded-full" />
          <div className="mt-auto flex gap-1.5 pt-4">
            <span className="ms-skeleton h-[1.6875rem] w-[5.25rem] rounded-full" />
            <span className="ms-skeleton h-[1.6875rem] w-16 rounded-full" />
          </div>
        </div>
      </>
    )
  } else if (cal.status !== STATUS.ready) {
    // ⚠️ Arıza "toplantın yok" diye ÇİZİLMEZ — boş bir gün ile okunamayan bir
    // takvim aynı şey değil; `ready` DIŞINDAKİ her hâl (oturumsuz da) burada.
    // Bağlan düğmesi yalnız `denied`da: oturum yokken ya da ağ düşmüşken
    // basılacak bir izin yok.
    body = (
      <div className="mt-3 space-y-3">
        <p className="text-[0.8125rem] leading-snug text-muted-foreground">
          {t("myspace.meeting.unavailable")}
        </p>
        <CalendarRetry cal={cal} className="" />
        {cal.status === STATUS.denied && (
          <button
            type="button"
            onClick={connect}
            className="rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition hover:bg-accent"
          >
            {t("calendar.connect")}
          </button>
        )}
      </div>
    )
  } else if (!current) {
    body = (
      <p className="mt-3 text-[0.8125rem] leading-snug text-muted-foreground">
        {t("myspace.meeting.none")}
      </p>
    )
  } else {
    body = (
      <Popover open={preview.open} onOpenChange={preview.onOpenChange}>
        <div
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY }
          }}
          onPointerUp={(e) => {
            const s = swipe.current
            swipe.current = null
            if (!s) return
            const dx = e.clientX - s.x
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5)
              go(dx < 0 ? 1 : -1)
          }}
          onPointerCancel={() => (swipe.current = null)}
          className="grid flex-1 touch-pan-y"
        >
          {upcoming.map((event, i) => {
            const active = i === index
            const live = isImminent(event, now)
            return (
              <div
                key={event.id}
                inert={!active}
                aria-hidden={active ? undefined : true}
                className={cn(
                  "flex min-w-0 flex-col [grid-area:1/1] transition-[opacity,translate,visibility] duration-300 ease-out motion-reduce:transition-none",
                  active
                    ? "visible opacity-100"
                    : cn("invisible opacity-0", i < index ? "-translate-x-3" : "translate-x-3"),
                )}
              >
                <MeetingTicket
                  event={event}
                  live={live}
                  active={active}
                  countdown={<MeetingCountdown event={event} />}
                  renderTrigger={(children) =>
                    active ? (
                      <PopoverTrigger asChild>
                        <button type="button" {...preview.triggerProps} className={TRIGGER}>
                          {children}
                        </button>
                      </PopoverTrigger>
                    ) : (
                      <div className={TRIGGER}>{children}</div>
                    )
                  }
                />
              </div>
            )
          })}
        </div>
        <PopoverContent
          side={isMobile ? "bottom" : preview.side}
          align={isMobile ? "start" : alignFor(preview.side)}
          sideOffset={10}
          collisionPadding={12}
          {...preview.contentProps}
          aria-label={current.subject || t("calendar.noSubject")}
          className="max-h-[var(--radix-popover-content-available-height)] w-[21.5rem] gap-0 overflow-y-auto overscroll-contain rounded-xl p-0 shadow-lg"
        >
          <EventDetailCard event={current} live={isImminent(current, now)} />
        </PopoverContent>
      </Popover>
    )
  }

  const arrow = (dir) => {
    const hidden = dir < 0 ? index === 0 : index === count - 1
    return (
      <button
        ref={dir < 0 ? prevRef : nextRef}
        type="button"
        onClick={() => go(dir)}
        aria-label={t(dir < 0 ? "myspace.meeting.prev" : "myspace.meeting.next")}
        className={cn(
          // Kartın içinde, kenarda (`common/edgeArrow`): yan kartın okuyla boşlukta çarpışmaz.
          EDGE_ARROW,
          edgeSide(dir),
          hidden
            ? "invisible opacity-0"
            : "opacity-0 focus-visible:translate-x-0 focus-visible:opacity-100 group-hover/meet:translate-x-0 group-hover/meet:opacity-100 pointer-coarse:translate-x-0 pointer-coarse:opacity-100",
        )}
      >
        <HugeiconsIcon
          icon={dir < 0 ? ArrowLeft01Icon : ArrowRight01Icon}
          className="size-3.5"
          strokeWidth={2.2}
        />
      </button>
    )
  }

  return (
    <Card
      data-tour="meeting"
      className={cn("group/meet @container/meet", className)}
      // ← → kartın İÇİNDEYKEN. `contains` şart: önizleme bir portal ama
      // React olayları portaldan da kabarcıklanıyor — içindeki bir düğmede
      // ok tuşu slaytı değiştirmesin.
      onKeyDown={(e) => {
        if (!nav || !e.currentTarget.contains(e.target)) return
        if (e.key === "ArrowRight") go(1)
        else if (e.key === "ArrowLeft") go(-1)
      }}
      role={nav ? "group" : undefined}
      aria-label={nav ? t("myspace.meeting.title") : undefined}
      aria-busy={cal.status === "loading" ? true : undefined}
    >
      {!(current && cal.status === STATUS.ready) && (
        <CardTitle icon={Calendar03Icon}>{t("myspace.meeting.title")}</CardTitle>
      )}
      {body}
      {nav && (
        <>
          {arrow(-1)}
          {arrow(1)}
          <p className="sr-only" aria-live="polite">
            {t("myspace.meeting.position", { n: index + 1, total: count })}
          </p>
        </>
      )}
    </Card>
  )
}
