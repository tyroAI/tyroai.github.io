import { useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { sunArc } from "@/lib/sun"
import { localDayKey } from "@/lib/weather"
import { tempTrack } from "@/lib/weatherSky"
import { DayList } from "./DayList"
import { LocationRow } from "./LocationRow"
import { StatTiles } from "./StatTiles"
import { WeatherHero } from "./WeatherHero"
import { useMinuteClock } from "./useSkyClock"
import { dateOfKey, weekKeys } from "./weatherDays"
import { OPTS_DAY_LONG, SOURCE_URL, skyAttrs } from "./weatherFormat"

/**
 * PENCERE — ÖN YÜZDEKİ KARTIN DİLİ. Pencerenin
 * tamamı o anın (ya da seçilen günün) GÖĞÜ: kartın gökleri, gerçekçi simgesi,
 * kesik çizgili yayı, ince derecesi; gövde göğün üstüne kayan bir SAYFA.
 * Kurallar ve ölçümler `weatherDialog.css` ile CLAUDE.md'de.
 *
 * İşlevler DEĞİŞMEDİ (dördüncü turdan beri): geniş ekranda kahraman tam
 * genişlikte, altında iki sütun (solda seçilen anın ayrıntısı + konum, sağda
 * günler); bir güne basınca kahraman O GÜNE geçer, "Bugün" satırı ya da
 * "Şimdiye dön" anlık hâle döndürür; kapanınca seçim düşer.
 */
export function WeatherDialog({ open, onOpenChange, w, returnFocusRef }) {
  const { t, locale } = useLocale()
  // ⚠️ Haftalar GÜNE bağlı: pencere sayfa açık kaldıkça mount kalıyor ve yalnız
  // `locale`e bağlı bir memo gece yarısından sonra dünü "Bu hafta"nın başında,
  // pazartesiyi "Gelecek hafta"nın içinde tutuyordu (ölçüldü).
  const todayKey = localDayKey(new Date())
  const { thisWeek, nextWeek } = useMemo(
    () => weekKeys(locale, dateOfKey(todayKey)),
    [locale, todayKey],
  )
  const byKey = useMemo(() => new Map(w.forecast.days.map((d) => [d.key, d])), [w.forecast.days])
  // Sıcaklık çubuklarının ORTAK ölçeği + o ölçeğin TEK renk gradyanı.
  const scale = useMemo(() => {
    const shown = [...thisWeek, ...nextWeek].map((d) => byKey.get(localDayKey(d))).filter(Boolean)
    if (!shown.length) return { lo: 0, span: 1, track: tempTrack(0, 1) }
    const lo = Math.min(...shown.map((d) => d.min))
    const hi = Math.max(...shown.map((d) => d.max))
    const span = Math.max(1, hi - lo)
    return { lo, span, track: tempTrack(lo, lo + span) }
  }, [thisWeek, nextWeek, byKey])
  const [picked, setPicked] = useState(null) // gün anahtarı; null = şimdi
  const [announce, setAnnounce] = useState("")
  const heroRef = useRef(null)
  const longDay = getDateTimeFormat(locale, OPTS_DAY_LONG)
  // Seçilen gün tahminden düştüyse (yenileme) sessizce şimdiye döner.
  const day = picked && picked !== todayKey ? (byKey.get(picked) ?? null) : null
  const c = w.forecast.current
  // Pencerenin göğü: şimdi → o anın türü ve gece/gündüzü; gün → o günün türü,
  // GÜNDÜZ (bir günün özeti öğleden sonrasının havası).
  const kind = day ? day.kind : c.kind
  // Şimdi: gece/gündüz güneşin gerçek evresinden (kartın kuralı); gün: GÜNDÜZ.
  const now = useMinuteClock()
  const coords = w.forecast.coords
  const arc = useMemo(() => (coords ? sunArc(coords.lat, coords.lon, now) : null), [coords, now])
  const night = day ? false : arc ? arc.night : c.night

  const pick = (key) => {
    const next = key === todayKey ? null : key
    setPicked(next)
    setAnnounce(
      next
        ? t("myspace.weather.showingDay", { day: longDay.format(dateOfKey(next)) })
        : t("myspace.weather.showingNow"),
    )
    // Kısa ekranda bütün pencere tek kaydırıcı (index.css) ve kahraman yukarıda
    // kalmış olabilir: basılan günün NE gösterdiği görünmeli.
    const dlg = heroRef.current?.closest(".wx-dialog")
    if (dlg && dlg.scrollTop > 0) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      dlg.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
    }
  }

  // "Şimdiye dön" basılınca kaybolur; odak `<body>`ye düşmesin — artık basılı
  // olan "Bugün" satırına geçer. `preventScroll`: telefonda tek kaydırıcıda
  // odak satırı görünür kılmak için pencereyi kahramandan aşağı kaydırırdı.
  const backToNow = () => {
    pick(todayKey)
    requestAnimationFrame(() => {
      heroRef.current
        ?.closest(".wx-dialog")
        ?.querySelector('button[aria-pressed="true"]')
        ?.focus({ preventScroll: true })
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPicked(null)
          setAnnounce("")
        }
        onOpenChange(o)
      }}
    >
      {/* ⚠️ `sm:max-w-*` (taban `sm:max-w-sm`i ezmek için) ve odak elle tetiğe
          (Radix yalnız kendi tetiğine döner) — ilk turun iki ölçülmüş tuzağı.
          `md:` genişliği `min(…, 100% - 2rem)`: tabanın kenar payı md'de de kalsın.
          ⚠️ `sm:max-h-…` ve `sm:pb-0` AYRICA yazılır: tailwind-merge yalnız AYNI
          varyant yazımını tekilleştiriyor (`FeedPostDialog`ın dersi).
          ⚠️ `showCloseButton={false}`: kendi kapat düğmemiz kahramanın içinde.
          ⚠️ Escape RIHTIMA KAÇMAZ (sohbet rıhtımı pencerede Escape dinliyor).
          ⚠️ `wx-dialog` / `wx-dialog-body` / `wx-dialog-col`: geniş ekranda iki
          sütun, kısa ekranda tek kaydırıcı — kurallar index.css'te, katman dışında.
          ⚠️ `ring-0`: tabanın saç teli halkası göğün kenarında gri bir çizgi
          çiziyordu; kenarı göğün kendi iç ışığı (`.wxd` gölgesi) taşıyor. */}
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.stopPropagation()}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          returnFocusRef.current?.focus()
        }}
        {...skyAttrs(kind, night)}
        className="wx-dialog wxd wxd-sky flex max-h-[min(92dvh,52rem)] flex-col gap-0 overflow-hidden rounded-[1.75rem] p-0 ring-0 sm:max-h-[min(92dvh,52rem)] sm:max-w-[40rem] sm:pb-0 md:max-w-[min(54rem,calc(100%-2rem))]"
      >
        <DialogTitle className="sr-only">{t("myspace.weather.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("myspace.weather.desc")}</DialogDescription>
        <p aria-live="polite" className="sr-only">
          {announce}
        </p>
        <WeatherHero
          ref={heroRef}
          w={w}
          day={day}
          kind={kind}
          night={night}
          arc={day ? null : arc}
          now={now}
          onBack={backToNow}
        />
        <div className="wx-dialog-body wxd-sheet relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="wx-dialog-col relative pb-4 pt-3">
            <StatTiles w={w} day={day} className="px-5 pt-3 sm:px-6" />
            <LocationRow w={w} />
          </div>
          <div className="wx-dialog-col relative pb-4 pt-1 md:border-l md:border-border/60">
            <DayList
              title={t("myspace.weather.thisWeek")}
              days={thisWeek}
              byKey={byKey}
              scale={scale}
              todayKey={todayKey}
              current={c}
              selected={picked ?? todayKey}
              onPick={pick}
            />
            <DayList
              title={t("myspace.weather.nextWeek")}
              days={nextWeek}
              byKey={byKey}
              scale={scale}
              todayKey={todayKey}
              current={c}
              selected={picked ?? todayKey}
              onPick={pick}
            />
          </div>
        </div>
        {/* `p-0` tabanın güvenli alan dolgusunu sildi; ana ekran çubuğu atfın üstüne binmesin. */}
        <p className="wxd-foot shrink-0 border-t border-border/70 px-5 pb-[max(env(safe-area-inset-bottom),0.625rem)] pt-2.5 text-[0.6875rem] sm:px-6">
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-foreground/70"
          >
            {t("myspace.weather.source")}
          </a>
        </p>
      </DialogContent>
    </Dialog>
  )
}
