import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { localDayKey } from "@/lib/weather"
import { cn } from "@/lib/utils"
import { MiniSymbol, RainDrop } from "./WeatherSymbols"
import {
  OPTS_DAY,
  OPTS_WEEKDAY,
  RAIN_ON_CARD,
  condKey,
  skyAttrs,
  useWeatherFormat,
} from "./weatherFormat"

/**
 * Günler — tahmini olan her gün bir DÜĞME (`aria-pressed`): basınca kahraman o
 * güne geçer. Tahmini olmayan gün düz satır ("Tahmin henüz yok"), basılmaz.
 * Her satırın başında o günün KÜÇÜK GÖĞÜ — ön yüzdeki kartın minyatürü
 * (`.wxd-tile`: kartın göğü + gerçekçi simgesi).
 * ⚠️ İkincil yazılar `foreground/70`, `muted-foreground` DEĞİL: seçili satırın
 * hafif dolgusu `muted-foreground`ı 4,5'in altına itiyordu.
 * ⚠️ Satırın adı içindeki metin: "Cuma 2 Eki, Parçalı bulutlu, en düşük 14°, en
 * yüksek 22°, yağış 1,2 mm" — görünen her şey adın içinde (WCAG 2.5.3).
 */
export function DayList({ title, days, byKey, scale, todayKey, current, selected, onPick }) {
  const { t, locale } = useLocale()
  const wd = getDateTimeFormat(locale, OPTS_WEEKDAY)
  const dm = getDateTimeFormat(locale, OPTS_DAY)
  const f = useWeatherFormat()
  const pos = (v) => Math.min(100, Math.max(0, ((v - scale.lo) / scale.span) * 100))
  // Telefonda sütunlar daralır ki çubuk ≥ 72 px kalsın. Yağış sütunu 3,75rem:
  // 2,75rem'de "10,2 mm" izinden SOLA taşıyordu (ölçüldü).
  const GRID =
    "grid min-h-[3.25rem] w-full grid-cols-[3.25rem_2.25rem_2rem_minmax(4.5rem,1fr)_2rem_3.75rem] items-center gap-x-2 px-2 py-1.5 sm:grid-cols-[5rem_2.25rem_2.5rem_minmax(0,1fr)_2.5rem_3.5rem] sm:gap-x-3"
  return (
    <section className="px-3 pt-5 sm:px-4">
      <h3
        lang={locale}
        className="px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-foreground/60"
      >
        {title}
      </h3>
      <ul className="mt-1.5 space-y-0.5">
        {days.map((date) => {
          const key = localDayKey(date)
          const d = byKey.get(key)
          const isToday = key === todayKey
          const isSel = key === selected
          const name = isToday ? t("myspace.weather.today") : wd.format(date)
          const label = (
            <span className="min-w-0 text-left">
              <span
                className={cn(
                  "block text-[0.875rem] leading-tight [&::first-letter]:uppercase",
                  isToday || isSel ? "font-semibold" : "font-medium",
                )}
              >
                {name}
              </span>
              <span className="block text-[0.6875rem] tabular-nums text-foreground/70">
                {dm.format(date)}
              </span>
            </span>
          )
          if (!d) {
            return (
              <li key={key} className={GRID}>
                {label}
                <span
                  aria-hidden="true"
                  className="size-9 rounded-xl border border-dashed border-foreground/20"
                />
                <span className="col-span-4 text-[0.8125rem] text-foreground/70">
                  {t("myspace.weather.noForecast")}
                </span>
              </li>
            )
          }
          // Dilim en az %4 ve izin İÇİNDE: aynı derecede bir gün de görünür bir
          // dilim çizer; ölçeğin tepesindeki böyle bir gün dilimini izin dışına
          // itip kaybetmez.
          let a = pos(d.min)
          let b = pos(d.max)
          if (b - a < 4) {
            a = Math.min(96, Math.max(0, (a + b) / 2 - 2))
            b = a + 4
          }
          return (
            <li key={key}>
              <button
                type="button"
                aria-pressed={isSel}
                onClick={() => onPick(key)}
                className={cn(
                  GRID,
                  "rounded-2xl text-left transition-[box-shadow,background-color] hover:bg-foreground/[0.035] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/70",
                  isSel &&
                    "bg-foreground/[0.05] ring-[1.5px] ring-inset ring-foreground/45 hover:bg-foreground/[0.06]",
                )}
              >
                {label}
                <span {...skyAttrs(d.kind, false)} className="wxd-sky wxd-tile size-9">
                  <MiniSymbol kind={d.kind} size={24} />
                </span>
                <span className="sr-only">, {t(condKey(d.kind, false))}, </span>
                <span className="text-right text-[0.875rem] tabular-nums text-foreground/70">
                  <span className="sr-only">{t("myspace.weather.minLabel")} </span>
                  {f.temp(d.min)}
                </span>
                {/* Her satır AYNI gradyanın kendi dilimini gösterir: 14° her satırda aynı yerde, aynı renkte. */}
                <span
                  aria-hidden="true"
                  className="relative h-1.5 rounded-full bg-foreground/[0.08] dark:bg-foreground/10"
                >
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundImage: scale.track,
                      clipPath: `inset(0 ${100 - b}% 0 ${a}% round 999px)`,
                    }}
                  />
                  {isToday && Number.isFinite(current?.temp) && (
                    <span
                      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-card"
                      style={{ left: `${pos(current.temp)}%` }}
                    />
                  )}
                </span>
                <span className="text-[0.875rem] font-semibold tabular-nums">
                  <span className="sr-only">, {t("myspace.weather.maxLabel")} </span>
                  {f.temp(d.max)}
                </span>
                <span
                  className={cn(
                    "flex items-center justify-end gap-0.5 text-[0.6875rem] tabular-nums sm:gap-1 sm:text-[0.75rem]",
                    d.precip > 0 && RAIN_ON_CARD,
                  )}
                >
                  {d.precip > 0 && (
                    <>
                      <RainDrop className="h-3 w-2.5 shrink-0" />
                      <span className="sr-only">, {t("myspace.weather.precipLabel")} </span>
                      {f.mm(d.precip)}
                    </>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
