import { useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown02Icon from "@hugeicons/core-free-icons/ArrowDown02Icon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import { DialogClose } from "@/components/ui/dialog"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { sunTimes } from "@/lib/sun"
import { CARD_ARC } from "@/lib/daylightArc"
import { localDayKey } from "@/lib/weather"
import { cn } from "@/lib/utils"
import { HourlyStrip } from "./HourlyStrip"
import { CardSymbol } from "./WeatherSymbols"
import { arcEnds, dateOfKey } from "./weatherDays"
import { OPTS_DAY_LONG, OPTS_TIME, condKey, useWeatherFormat } from "./weatherFormat"

/** Gökyüzü üstündeki yer satırı — beyaz mürekkebin %85'i (bütün göklerde ≥ 4,77:1). */
function PlaceLine({ place, className }) {
  const { t } = useLocale()
  return (
    // ⚠️ Hiçbir şey kırpılmaz: uzun ilçe adı satır kaydırır ve "· tahmini" adın
    // SON kelimesinin ardından gelir — ayrı bir esnek öğeyken kaydırılan bir adın
    // ortasında, noktası ortadan kaymış duruyordu.
    // ⚠️ `leading-snug` çağıranın yazı boyundan SONRA: tailwind-merge `text-[…]`
    // görünce ondan önceki satır yüksekliğini siliyor (CLAUDE.md'deki tuzak).
    <p
      className={cn(
        "flex min-w-0 items-start gap-1.5 font-medium text-white/85",
        className,
        "leading-snug",
      )}
    >
      <HugeiconsIcon
        icon={Location01Icon}
        className="mt-px size-3.5 shrink-0"
        strokeWidth={1.9}
        aria-hidden="true"
      />
      <span className="min-w-0 [overflow-wrap:anywhere]">
        {place.name || t("myspace.weather.here")}
        {place.approx && (
          <span className="whitespace-nowrap"> · {t("myspace.weather.approxShort")}</span>
        )}
      </span>
    </p>
  )
}

/* Kahramanın gece yıldızları (kartın deseniyle aynı dağılım). */
const HERO_STARS = Array.from({ length: 18 }, (_, i) => [5 + ((i * 23) % 90), 6 + ((i * 37) % 80)])

/**
 * Pencerenin kahramanı — ön yüzdeki kartın büyüğü: kesik çizgili gün yayı ve
 * üstünde kartın gerçekçi simgesi (gündüz güneşin GERÇEK yerinde, gece ve
 * seçilen günde tepede), kubbenin altında ince büyük derece, durum, ↑↓ ve
 * hissedilen; ayakların altında doğuş · gün uzunluğu · batış; en altta saatlik
 * cam bant.
 * ⚠️ `<header>` DEĞİL `<div>`: pencerenin içinde `banner` yer imi açıyordu.
 * ⚠️ Seçilen günün yayında güneş YOK — o günün "şimdi"si yok; simge tepede
 * (kartın gecedeki kuralı), yolun hiçbiri "gidilmiş" çizilmez.
 * ⚠️ Kahraman ŞİMDİ ↔ GÜN arasında ZIPLAMAZ: üst satır (kaş) her iki hâlde de
 * dolu ("Şimdi" · günün adı), meta satırı da.
 */
export function WeatherHero({ w, day, kind, night, arc, now, onBack, ref }) {
  const { t, locale } = useLocale()
  const f = useWeatherFormat()
  const c = w.forecast.current
  const coords = w.forecast.coords
  const longDay = getDateTimeFormat(locale, OPTS_DAY_LONG)
  const timeFmt = getDateTimeFormat(locale, OPTS_TIME)
  // `now` ve `arc` pencereden (tek dakika saati, kartın kuralı); seçilen günde
  // `arc` yok — o günün "şimdi"si yok, işaret tepede.
  const dayKey = day ? day.key : localDayKey(now)
  const sun = useMemo(
    () => (coords ? sunTimes(coords.lat, coords.lon, dateOfKey(dayKey)) : null),
    [coords, dayKey],
  )
  const param = arc ? CARD_ARC.param(arc.progress) : null
  const mark = CARD_ARC.point(param ?? 0.5)
  const ends = arcEnds(arc, sun, t)
  const feels = !day && Number.isFinite(c.feels) ? c.feels : null
  const dur = (mins) =>
    mins % 60
      ? t("calendar.durationHoursMinutes", {
          hours: f.num(Math.floor(mins / 60)),
          minutes: f.num(mins % 60),
        })
      : t("calendar.durationHours", { hours: f.num(mins / 60) })
  // Ortadaki sayı evrenin uzunluğu: gündüz "Gün uzunluğu", gece "Gece uzunluğu"
  // (batıştan doğuşa) — iki ucun arası, yayın kendisi.
  const length = arc
    ? dur(Math.round((arc.to - arc.from) / 60000))
    : !sun
      ? null
      : sun.polar === "day"
        ? t("myspace.weather.polarDay")
        : sun.polar === "night"
          ? t("myspace.weather.polarNight")
          : dur(sun.daylight)
  const temp = day ? day.max : c.temp
  const hi = day ? day.max : w.forecast.range24?.max
  const lo = day ? day.min : w.forecast.range24?.min

  return (
    <div ref={ref} className="wxd-hero shrink-0">
      {night && (
        <div aria-hidden="true" className="wxd-stars">
          {HERO_STARS.map(([x, y], i) => (
            <i
              key={i}
              style={{ left: `${x}%`, top: `${y}%`, opacity: 0.35 + ((i * 7) % 5) / 10 }}
            />
          ))}
        </div>
      )}
      {/* ⚠️ `relative z-10`: sahne negatif üst payla bu satırın altına giriyor
          (yay kubbesi yer adına yaklaşsın) ve DOM'da SONRA geldiği için düğmelerin
          üstüne biniyordu — "Şimdiye dön"e tıklanamıyordu (isabet sınamasıyla
          bulundu). */}
      <div className="relative z-10 flex items-start justify-between gap-3 pl-5 pr-3 pt-4 sm:pl-6 sm:pr-4">
        <PlaceLine place={w.place} className="pt-1.5 text-[0.8125rem] text-white/95" />
        <div className="flex shrink-0 items-start gap-1.5">
          {/* ⚠️ Başlık satırında, gün bloğunun içinde DEĞİL: orada kahramanı
              şimdi ↔ gün arasında zıplatıyordu. `bg-black/15`, beyaz yıkama
              DEĞİL: en açık gökte de beyaz yazı okunsun. */}
          {day && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-black/15 pl-2 pr-3 text-[0.75rem] font-semibold ring-1 ring-inset ring-white/30 backdrop-blur-sm transition hover:bg-black/25 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/90 [@media(pointer:coarse)]:-my-1.5 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:px-3.5"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                className="size-3.5"
                strokeWidth={2.2}
                aria-hidden="true"
              />
              {t("myspace.weather.backToNow")}
            </button>
          )}
          <DialogClose asChild>
            <button
              type="button"
              aria-label={t("myspace.weather.close")}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-black/10 text-white ring-1 ring-inset ring-white/20 transition hover:bg-black/20 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/90 [@media(pointer:coarse)]:-my-1.5 [@media(pointer:coarse)]:size-11"
            >
              <HugeiconsIcon
                icon={Cancel01Icon}
                className="size-4"
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
          </DialogClose>
        </div>
      </div>

      <div className="wxd-stage">
        <svg
          aria-hidden="true"
          className="wxd-orbit"
          viewBox={`0 0 ${CARD_ARC.box.w} ${CARD_ARC.box.h}`}
          preserveAspectRatio="none"
        >
          <path d={CARD_ARC.d} className="wxd-orbit-rest" />
          {param != null && <path d={CARD_ARC.pathTo(param)} className="wxd-orbit-done" />}
        </svg>
        <div className="wxd-horizon">
          <CardSymbol
            kind={kind}
            night={night}
            style={{
              left: `${(mark.x / CARD_ARC.box.w) * 100}%`,
              top: `${(mark.y / CARD_ARC.box.h) * 100}%`,
            }}
          />
        </div>
        <div className="wxd-reading">
          <p className="wxd-kicker">
            {day ? longDay.format(dateOfKey(day.key)) : t("myspace.weather.now")}
          </p>
          <p className="wxd-temp">
            {/* Seçilen günde büyük sayı en yüksek, en düşük meta satırında. */}
            <span aria-hidden="true">
              {Number.isFinite(temp) ? (
                <>
                  {f.num(temp)}
                  <span className="wxd-temp-deg">°</span>
                </>
              ) : (
                "—"
              )}
            </span>
            <span className="sr-only">
              {day
                ? t("myspace.weather.dayHighLow", { max: f.num(day.max), min: f.num(day.min) })
                : f.temp(c.temp)}
            </span>
          </p>
          <p className="wxd-cond">{t(condKey(kind, night))}</p>
          <div className="wxd-meta">
            {Number.isFinite(hi) && Number.isFinite(lo) && (
              <span className="inline-flex items-center gap-2">
                <span className="sr-only">
                  {day ? "" : t("myspace.weather.highLow", { max: f.num(hi), min: f.num(lo) })}
                </span>
                <span aria-hidden="true" className="inline-flex items-center gap-0.5">
                  <HugeiconsIcon icon={ArrowUp02Icon} className="size-3" strokeWidth={2.2} />
                  {f.temp(hi)}
                </span>
                <span aria-hidden="true" className="inline-flex items-center gap-0.5">
                  <HugeiconsIcon icon={ArrowDown02Icon} className="size-3" strokeWidth={2.2} />
                  {f.temp(lo)}
                </span>
              </span>
            )}
            {feels != null && (
              <span>
                {t("myspace.weather.feelsLike")} {f.temp(feels)}
              </span>
            )}
          </div>
        </div>
      </div>

      {ends && (
        <div className="wxd-daylight">
          <p>
            {ends[0].label}
            <strong>{ends[0].at ? timeFmt.format(ends[0].at) : "—"}</strong>
          </p>
          <p>
            {t(arc?.night ? "myspace.weather.nightLength" : "myspace.weather.dayLength")}
            <strong>{length}</strong>
          </p>
          <p>
            {ends[1].label}
            <strong>{ends[1].at ? timeFmt.format(ends[1].at) : "—"}</strong>
          </p>
        </div>
      )}
      {/* `key`: gün değişince şerit baştan — kaydırma konumu ve uç ölçüsü öncekinden kalmasın. */}
      {day ? (
        <HourlyStrip key={day.key} hours={day.slots} heading={t("myspace.weather.dayStrip")} />
      ) : (
        <HourlyStrip
          key="now"
          hours={w.forecast.hourly}
          heading={t("myspace.weather.hourly")}
          upcoming
        />
      )}
    </div>
  )
}
