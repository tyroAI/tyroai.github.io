import { useEffect, useId, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { localDayKey, upcomingHours } from "@/lib/weather"
import { cn } from "@/lib/utils"
import { MiniSymbol, RainDrop } from "./WeatherSymbols"
import {
  OPTS_HOUR,
  OPTS_TIME,
  RAIN_ON_SKY,
  condKey,
  skyAttrs,
  useWeatherFormat,
} from "./weatherFormat"

/**
 * Saat şeridi — gökyüzünde, kartın cam bandında. ŞİMDİ için önümüzdeki 24 saat
 * (`upcoming`), SEÇİLEN GÜN için o günün dilimleri: yanıt saatlikken saatlik,
 * sonra 6 saatlik ("12–18", hücre biraz geniş). Her hücrenin simgesi kartın
 * gerçekçi çizimi, kendi türü ve gece/gündüzüyle (`.wxd-sky` hücre).
 * ⚠️ "Şimdi" hücresi KOYULAŞTIRILIR (`.wxd-now`), açılmaz: beyaz yıkama yazının
 * karşıtlığını düşürüyordu.
 * ⚠️ BİTMİŞ SAAT GÖSTERİLMEZ (`upcomingHours`): tahmin 30 dk önbellekte ve saat
 * dönünce ilk girdi geçen saati anlatıyordu.
 * ⚠️ Yer imi TEK: klavyeyle odaklanan kaydırıcı (`role="region"`).
 * ⚠️ Ekran okuyucu her hücrede tam saati ("20:00" · "12:00–18:00") ve yağışın
 * BİRİMİNİ duyar; görünen kısa saat ve çıplak sayı `aria-hidden`.
 */
export function HourlyStrip({ hours, heading, upcoming = false }) {
  const { t, locale } = useLocale()
  const f = useWeatherFormat()
  const hourFmt = getDateTimeFormat(locale, OPTS_HOUR)
  const timeFmt = getDateTimeFormat(locale, OPTS_TIME)
  const headingId = useId()
  const scroller = useRef(null)
  const [edge, setEdge] = useState({ start: true, end: false })
  const [now] = useState(() => Date.now())
  const shown = useMemo(
    () => (upcoming ? upcomingHours(hours, now) : (hours ?? [])),
    [hours, now, upcoming],
  )
  const wet = shown.some((h) => h.precip > 0)
  // 6 saatlik dilim: iki uç AYNI günse `formatRange` ("12–18" · "12 – 6 PM");
  // değilse iki saat ayrı ("21–03" · "18–00" · "9 PM–3 AM") — `formatRange` iki
  // güne yayılan aralığa TARİH ekliyordu ("04.10.2026 23 – 05.10.2026 05").
  // ⚠️ Karşılaştırma bitişin KENDİSİYLE: eski kural bitişten 1 ms önceye
  // bakıyordu ve gece yarısında BİTEN dilimi (18–00) aynı gün sayıp tarihli
  // yazıyordu — hücreden taşıp komşusuna biniyordu.
  const sixLabel = (a, b) =>
    localDayKey(a) === localDayKey(b)
      ? hourFmt.formatRange(a, b)
      : `${hourFmt.format(a)}–${hourFmt.format(b)}`

  // Uçları ölç: setState bir GÖZLEMCİ geri çağrısında (efektin gövdesinde değil —
  // `react-hooks/set-state-in-effect`). Değer DEĞİŞMEDİKÇE yazılmaz: her kaydırma
  // olayı 25 çizimi baştan çizdiriyordu.
  useEffect(() => {
    const el = scroller.current
    if (!el || typeof ResizeObserver === "undefined") return undefined
    const sync = () => {
      const start = el.scrollLeft < 4
      const end = el.scrollLeft + el.clientWidth > el.scrollWidth - 4
      setEdge((p) => (p.start === start && p.end === end ? p : { start, end }))
    }
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    el.addEventListener("scroll", sync, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener("scroll", sync)
    }
  }, [])

  if (!shown.length) return null

  const page = (dir) => {
    const el = scroller.current
    if (!el) return
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: reduce ? "auto" : "smooth" })
  }

  return (
    <div className="group/strip relative mt-3.5 [@media(max-height:40rem)]:mt-2">
      <div className="flex items-baseline justify-between gap-3 px-5 sm:px-6">
        <h3
          id={headingId}
          lang={locale}
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-white/90"
        >
          {heading}
        </h3>
        {wet && (
          <p
            aria-hidden="true"
            className="inline-flex items-center gap-1 text-[0.6875rem] text-white/90"
          >
            <RainDrop className={cn("h-2.5 w-2", RAIN_ON_SKY)} />
            {t("myspace.weather.precipLegend")}
          </p>
        )}
      </div>
      <div className="wxd-band">
        {/* Kaydırılan bölge klavyeyle odaklanır (Safari kaydırıcıyı kendiliğinden odaklamıyor).
            ⚠️ `relative` ŞART: hücrelerdeki `sr-only` metinler mutlak konumlu ve
            konumlandırılmamış bir kaydırıcının kırpmasından KAÇIP bölümü yana
            taşırıyordu (ölçüldü). Odakta kenar maskesi kalkar (index.css). */}
        <div
          ref={scroller}
          tabIndex={0}
          role="region"
          aria-labelledby={headingId}
          className="wx-hscroll relative snap-x snap-proximity overflow-x-auto overscroll-x-contain scroll-px-2 rounded-[1.25rem] px-2 py-1.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/90"
        >
          <ol className="flex w-max gap-0.5">
            {shown.map((h, i) => {
              const isNow = upcoming && i === 0 && h.at.getTime() <= now
              const six = h.step === 6
              const end = six ? new Date(h.at.getTime() + 6 * 60 * 60 * 1000) : null
              return (
                <li
                  key={h.at.toISOString()}
                  {...skyAttrs(h.kind, h.night)}
                  className={cn(
                    "wxd-sky flex shrink-0 snap-start flex-col items-center gap-1 rounded-2xl py-1.5 text-center text-white",
                    six ? "w-[4.75rem]" : "w-[3.25rem]",
                    isNow && "wxd-now",
                  )}
                >
                  {isNow ? (
                    <span className="text-[0.6875rem] font-semibold tabular-nums">
                      {t("myspace.weather.now")}
                    </span>
                  ) : (
                    <>
                      <span
                        aria-hidden="true"
                        className="whitespace-nowrap text-[0.6875rem] font-semibold tabular-nums"
                      >
                        {six ? sixLabel(h.at, end) : hourFmt.format(h.at)}
                      </span>
                      <span className="sr-only">
                        {six
                          ? `${timeFmt.format(h.at)}–${timeFmt.format(end)}`
                          : timeFmt.format(h.at)}
                      </span>
                    </>
                  )}
                  <MiniSymbol kind={h.kind} night={h.night} size={28} />
                  <span className="sr-only">{t(condKey(h.kind, h.night))}</span>
                  <span className="text-[0.9375rem] font-medium tabular-nums">
                    {f.temp(h.temp)}
                  </span>
                  {/* Yağış satırı HER ZAMAN yer tutar: kuru bir gün seçilince şerit —
                      ve kahraman — kısalıp altındaki sütunları zıplatıyordu. */}
                  <span className="flex h-3.5 items-center gap-0.5 text-[0.625rem] font-semibold tabular-nums">
                    {h.precip > 0 && (
                      <>
                        <RainDrop className={cn("h-2.5 w-2", RAIN_ON_SKY)} />
                        <span className="sr-only">
                          {t("myspace.weather.precipLabel")} {f.mm(h.precip)}
                        </span>
                        <span aria-hidden="true">{f.dec(h.precip)}</span>
                      </>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
      {/* Fare için sayfa düğmeleri: klavye bölgeyi oklarla, parmak kaydırarak geziyor.
          ⚠️ `onMouseDown` varsayılanı engellenir: tıklama sayfalar ama odak yerinde
          kalır — yoksa Chrome/Edge odağı ADSIZ (`aria-hidden`) bir düğmeye taşıyordu. */}
      {[-1, 1].map((dir) => (
        <button
          key={dir}
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => page(dir)}
          className={cn(
            "absolute top-[calc(50%+0.75rem)] grid size-7 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 ring-1 ring-white/20 backdrop-blur-sm transition-opacity hover:bg-black/45 group-hover/strip:opacity-100 [@media(pointer:coarse)]:hidden",
            dir < 0 ? "left-2.5" : "right-2.5",
            (dir < 0 ? edge.start : edge.end) && "pointer-events-none group-hover/strip:opacity-0",
          )}
        >
          <HugeiconsIcon
            icon={dir < 0 ? ArrowLeft01Icon : ArrowRight01Icon}
            className="size-4"
            strokeWidth={2.2}
          />
        </button>
      ))}
    </div>
  )
}
