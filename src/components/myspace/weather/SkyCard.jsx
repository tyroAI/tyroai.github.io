import { useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import SunriseIcon from "@hugeicons/core-free-icons/SunriseIcon"
import SunsetIcon from "@hugeicons/core-free-icons/SunsetIcon"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { sunArc, sunTimes } from "@/lib/sun"
import { CARD_ARC } from "@/lib/daylightArc"
import { localDayKey } from "@/lib/weather"
import { cardSkyOf } from "@/lib/weatherSky"
import { CelebrationChips } from "./CardParty"
import { CelebrationFace } from "./CelebrationFace"
import { EstateLayer, EstateToggle } from "./EstateLayer"
import { WeatherDialog } from "./WeatherDialog"
import { CardSymbol } from "./WeatherSymbols"
import { useArcIntro } from "./useArcIntro"
import { useEstatePref } from "./useEstatePref"
import { useMinuteClock, useOnScreen } from "./useSkyClock"
import { arcEnds, dateOfKey } from "./weatherDays"
import { OPTS_CARD_TIME_12, OPTS_TIME, condKey, useWeatherFormat } from "./weatherFormat"

/* ─────────────────────────────────────────────────────────────────────────
   AKIŞIM'IN HAVA KARTI — Astra'nın "Sky / Karşılama" kartı, birebir (kaynak
   `sky-weather-widget 3`; istek ve turlar docs/features/anasayfa-hava-kart.md). Görünüm
   ve gerekçeleri `skyCard.css`te (üst bölümü kaynağın kendisi).

   ⚠️ SELAMLAMA KARTIN İÇİNDE, konumun üstünde (kaynağın `__welcome`u) ve bir
   `<h2>` — düğmenin DIŞINDA: `<button>` bir başlık taşıyamaz.
   ⚠️ HAVA ÇİZİMİ YAYIN ÜZERİNDEKİ İŞARET (`sunArc`): gündüz güneş
   doğuştan batışa, gece ay batıştan doğuşa — ikisi de çizginin başından,
   yatayda zamanla doğrusal; gece uçların etiketleri yer değiştirir. Kutup
   gününde/gecesinde işaret tepede.
   ⚠️ KARTIN TAMAMI TIKLANIR (düğmenin gerilmiş `::after`i) ve ayrıntı
   penceresini açar. Düğmenin adı görünen metnin kendisi (WCAG 2.5.3): "18°,
   Sağanak. Ayrıntılar için aç"; selamlama, konum, doğuş ve batış düğmenin
   DIŞINDA düz metin.
   ⚠️ Okunamazsa (off · error) KART YOK, selamlama düz hâline döner ("çalışmazsa
   yok"). Yüklenirken AYNI kutu: selamlama yazılı, gerisi hayalet.
   ───────────────────────────────────────────────────────────────────────── */

/* Kaynağın yıldızları (`8 + i·17 mod 85`, `18 + i·29 mod 65`); damlalar `WeatherSymbols`te. */
const CARD_STARS = Array.from({ length: 14 }, (_, i) => [
  8 + ((i * 17) % 85),
  18 + ((i * 29) % 65),
  i * -0.7,
])

// Kaynaktaki konum iğnesi (13 px) — hugeicons'ta aynı çizgi kalınlığı yok, ama
// deponun tek ikon kaynağı kuralı gereği iğne hugeicons'tan.
const PIN_STROKE = 1.7

export function SkyCard({ w, greeting, firstName, celebration = null }) {
  const { t, locale } = useLocale()
  const f = useWeatherFormat()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const cardRef = useRef(null)
  const live = useOnScreen(cardRef)
  const ready = w.status === "ready"
  // Dokunuşta basılı hâl — `:active` dokunmatikte güvenilir değil (deponun dersi).
  const [pressed, setPressed] = useState(false)
  // Köşk arka planı (varsayılan açık, göz düğmesiyle); kutlama gününün kendi yüzü var.
  const [estateOn, toggleEstate] = useEstatePref()
  const estate = estateOn && !celebration
  const now = useMinuteClock()
  const c = ready ? w.forecast.current : null
  const coords = ready ? w.forecast.coords : null
  const dayKey = localDayKey(now)
  const sun = useMemo(
    () => (coords ? sunTimes(coords.lat, coords.lon, dateOfKey(dayKey)) : null),
    [coords, dayKey],
  )
  // Yaydaki yer GÜNDÜZ VE GECE: gündüz güneş doğuştan batışa,
  // gece ay batıştan doğuşa — ikisi de çizginin başından. Gece/gündüz de
  // güneşin gerçek evresinden (tahminin saatlik bayrağı batıştan sonraki
  // dakikalarda "gündüz" diyebiliyor); yay yoksa (kutup, koordinat yok)
  // tahminin bayrağı ve işaret tepede.
  const arc = useMemo(() => (coords ? sunArc(coords.lat, coords.lon, now) : null), [coords, now])
  const night = ready ? (arc ? arc.night : c.night) : false
  const arcParam = useArcIntro(arc ? CARD_ARC.param(arc.progress) : null)
  const mark = CARD_ARC.point(arcParam ?? 0.5)
  const ends = arcEnds(arc, sun, t)
  const time24 = getDateTimeFormat(locale, OPTS_TIME)
  const timeFmt = time24.resolvedOptions().hour12
    ? getDateTimeFormat(locale, OPTS_CARD_TIME_12)
    : time24
  const weather = ready ? cardSkyOf(c.kind) : "cloudy"
  const place = ready ? w.place.name || t("myspace.weather.here") : ""
  const cond = ready ? t(condKey(c.kind, night)) : ""
  // Yerel saat yerine konumun gerçek batışı: bulut ve yağışta da gün evresi doğru kalır.
  const evening = sun?.set && Math.abs(now - sun.set) < 45 * 60 * 1000

  return (
    <>
      <div
        ref={cardRef}
        // En az boy satırla aynı birimde (14.5rem = 16 px kökte 232 px): alçak pencerede kök
        // küçülünce satır da küçülüyor; pikselde kalan kart satırdan taşıp soru kutusunun
        // altına giriyordu.
        className="sky-weather h-auto min-h-[14.5rem] max-w-none flex-1"
        data-weather={weather}
        data-time={night ? "night" : "day"}
        data-state={ready ? "ready" : "loading"}
        data-kind={c?.kind}
        data-live={live ? "on" : "off"}
        data-estate={estate ? "on" : undefined}
        data-estate-phase={evening ? "evening" : night ? "night" : "day"}
        data-pressed={pressed ? "" : undefined}
        data-greeting={greeting ? undefined : "off"}
        data-celebration={
          celebration ? (celebration.birthday ? "birthday" : "anniversary") : undefined
        }
        aria-busy={ready ? undefined : true}
        onPointerDown={ready ? (e) => e.pointerType !== "mouse" && setPressed(true) : undefined}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
      >
        {estate && <EstateLayer weather={weather} kind={c?.kind} night={night} />}
        <div className="sky-weather__haze" aria-hidden="true" />
        {/* Kutlama gününde ön yüz o güne ait; hava dipte tek satır, tık ayrıntıyı açar. */}
        {celebration && (
          <CelebrationFace
            celebration={celebration}
            greeting={greeting}
            firstName={firstName}
            ready={ready}
            weatherLine={ready ? `${f.temp(c.temp)} · ${cond}` : ""}
            temp={ready ? f.temp(c.temp) : ""}
            place={place}
            triggerRef={triggerRef}
            onOpen={() => setOpen(true)}
          />
        )}
        {!celebration && (
          <>
            {ready && night && (
              <div className="sky-weather__stars" aria-hidden="true">
                {CARD_STARS.map(([x, y, d], i) => (
                  <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />
                ))}
              </div>
            )}
            {/* Yay + işaret kartın boyundan türeyen kutuda (`__sky`, skyCard.css). */}
            <div className="sky-weather__sky" aria-hidden="true">
              {/* Ufuk: yayın uçları — güneş/ay oraya inince ufkun altındaki kısmı
              kesilir (`__horizon`, skyCard.css). */}
              {ready && (
                <div className="sky-weather__horizon">
                  <CardSymbol
                    kind={c.kind}
                    night={night}
                    style={{
                      left: `${(mark.x / CARD_ARC.box.w) * 100}%`,
                      top: `${(mark.y / CARD_ARC.box.h) * 100}%`,
                    }}
                  />
                </div>
              )}
              <svg
                className="sky-weather__orbit"
                viewBox={`0 0 ${CARD_ARC.box.w} ${CARD_ARC.box.h}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path className="sky-weather__route" d={CARD_ARC.d} />
                {arcParam != null && (
                  <path className="sky-weather__route-done" d={CARD_ARC.pathTo(arcParam)} />
                )}
              </svg>
            </div>
            <div className="sky-weather__header">
              <div className="sky-weather__welcome">
                {greeting ? (
                  <div className="sky-weather__greeting-row">
                    <h2 className="sky-weather__greeting">
                      {greeting}, <span className="sky-weather__name">{firstName}</span>!
                    </h2>
                    <EstateToggle on={estateOn} onToggle={toggleEstate} />
                  </div>
                ) : (
                  <h2 className="sr-only">{t("myspace.weather.title")}</h2>
                )}
                <div className="sky-weather__location">
                  {celebration && <CelebrationChips celebration={celebration} />}
                  <HugeiconsIcon
                    icon={Location01Icon}
                    strokeWidth={PIN_STROKE}
                    aria-hidden="true"
                  />
                  {ready ? (
                    <span className="sky-weather__place">
                      {place}
                      {w.place.approx && ` · ${t("myspace.weather.approxShort")}`}
                    </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="sky-weather__skel !static inline-block h-2.5 w-20"
                    />
                  )}
                  {/* Saat konumun yanında, ikonuyla. Tarayıcının saati, dakika sınırında yürür
                  (`useMinuteClock`); yer adı uzunsa yer adı kısalır, saat değil. */}
                  <span className="sky-weather__clock">
                    <HugeiconsIcon icon={Clock01Icon} strokeWidth={PIN_STROKE} aria-hidden="true" />
                    <time dateTime={now.toISOString()}>{timeFmt.format(now)}</time>
                  </span>
                </div>
                {/* Selamlamasızken göz konum satırının ucunda (aynı yatay yer). */}
                {!greeting && <EstateToggle on={estateOn} onToggle={toggleEstate} />}
              </div>
            </div>
            <div className="sky-weather__main">
              {ready ? (
                <button
                  ref={triggerRef}
                  type="button"
                  data-weather-trigger=""
                  aria-haspopup="dialog"
                  onClick={() => setOpen(true)}
                  className="sky-weather__trigger"
                >
                  <span className="sky-weather__reading">
                    {/* Kaynağın biçimi: sayı + `<span>°</span>` (üst simge). Görünen
                    kopya gizli, ekran okuyucu "18°"yi duyar. */}
                    <span aria-hidden="true" className="sky-weather__temperature">
                      {Number.isFinite(c.temp) ? (
                        <>
                          {f.num(c.temp)}
                          <span>°</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                    <span className="sr-only">{f.temp(c.temp)}</span>
                    <span className="sky-weather__condition">
                      <span className="sr-only">, </span>
                      {cond}
                    </span>
                  </span>
                  <span className="sr-only">. {t("myspace.weather.openShort")}</span>
                </button>
              ) : (
                <span aria-hidden="true" className="sky-weather__reading">
                  <span className="sky-weather__skel !static mx-auto h-11 w-20 rounded-2xl" />
                  <span className="sky-weather__skel !static mx-auto mt-2.5 h-2.5 w-16" />
                </span>
              )}
            </div>
            {ends ? (
              <div className="sky-weather__footer">
                <div className="sky-weather__daylight">
                  {ends.map((e) => (
                    <span key={e.key} className="sky-weather__daylight-end">
                      <span className="sr-only">{e.label}: </span>
                      <HugeiconsIcon
                        icon={e.key === "rise" ? SunriseIcon : SunsetIcon}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      <strong>{e.at ? timeFmt.format(e.at) : "—"}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
        {!ready && <span className="sr-only">{t("myspace.loading")}</span>}
      </div>
      {ready && (
        <WeatherDialog open={open} onOpenChange={setOpen} w={w} returnFocusRef={triggerRef} />
      )}
    </>
  )
}
