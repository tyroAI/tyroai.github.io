import { HugeiconsIcon } from "@hugeicons/react"
import FastWindIcon from "@hugeicons/core-free-icons/FastWindIcon"
import HumidityIcon from "@hugeicons/core-free-icons/HumidityIcon"
import UmbrellaIcon from "@hugeicons/core-free-icons/UmbrellaIcon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { RAIN_ON_CARD, useWeatherFormat } from "./weatherFormat"

const STAT_TONE = {
  humidity: "from-teal-500/[0.09] text-teal-700 dark:text-teal-300",
  wind: "from-slate-500/[0.09] text-slate-600 dark:text-slate-300",
  rain: "from-sky-500/[0.1] text-sky-700 dark:text-sky-300",
}

/**
 * Üçlü kutucuk — değer KALIN ve mürekkepte, etiket küçük ve soluk.
 * ⚠️ İlk sürüm değeri kartın derecesi gibi İNCE (300) çiziyordu: 18 px'te ince
 * yazı soluk tonla birleşince okunmuyordu. İnce rakam yalnız büyük boyda (kahramanın 4,5rem'lik
 * derecesi) çalışır. Simge ETİKETİN ÜSTÜNDE (yanındayken RU "Влажность" hecenin
 * ortasından kırılıyordu — eski kutucukların ölçülmüş dersi).
 * ⚠️ Etiket `foreground/70`, `muted-foreground` DEĞİL: kutunun türünün hafif
 * tonu var ve `muted-foreground` beyazda zaten yalnız 4,74:1'di; en hafif dolgu
 * onu 4,5'in altına itiyordu.
 */
function Tiles({ rows, className }) {
  return (
    <dl className={cn("grid grid-cols-3 gap-2.5", className)}>
      {rows.map((r) => (
        <div
          key={r.key}
          className={cn(
            "flex min-w-0 flex-col justify-between gap-3 rounded-2xl bg-gradient-to-br to-transparent p-3 ring-1 ring-inset ring-foreground/[0.07]",
            STAT_TONE[r.key].split(" ")[0],
          )}
        >
          <dt className="flex flex-col items-start gap-1.5 text-[0.6875rem] font-semibold leading-tight text-foreground/70">
            <span
              aria-hidden="true"
              className={cn(
                "grid size-6 place-items-center rounded-full bg-background/80 shadow-[0_1px_2px_rgb(10_30_60/0.12)]",
                STAT_TONE[r.key].split(" ").slice(1).join(" "),
              )}
            >
              <HugeiconsIcon icon={r.icon} className="size-3.5" strokeWidth={2} />
            </span>
            <span className="min-w-0 max-w-full [overflow-wrap:break-word]">{r.label}</span>
          </dt>
          {/* 1,125rem her genişlikte: kutucuk masaüstünde de dar (sol sütunun
              üçte biri, ~105 px iç) ve 1,375rem'de "30 km/sa" birimin ortasından
              kırılıyordu. Kırılacaksa sayı ile birim arasından kırılsın. */}
          <dd
            className={cn(
              "text-[1.125rem] font-semibold leading-tight tracking-[-0.01em] text-foreground tabular-nums",
              r.tone,
            )}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Nem · rüzgâr · yağış — ŞİMDİ için anlık değerler (6 saatte yağış), SEÇİLEN GÜN
 * için o günün ortalama nemi, en sert rüzgârı ve toplam yağışı.
 */
export function StatTiles({ w, day, className }) {
  const { t } = useLocale()
  const f = useWeatherFormat()
  const c = w.forecast.current
  const humidity = day ? day.humidity : c.humidity
  const wind = day ? day.windMax : c.wind
  const rain = day ? day.precip : c.precip6h
  const rows = [
    {
      key: "humidity",
      icon: HumidityIcon,
      label: t(day ? "myspace.weather.humidityAvg" : "myspace.weather.humidity"),
      value: humidity != null ? f.pct(humidity) : "—",
    },
    {
      key: "wind",
      icon: FastWindIcon,
      label: t(day ? "myspace.weather.windMax" : "myspace.weather.wind"),
      value: wind != null ? `${f.num(wind)}\u00a0${t("myspace.weather.kmh")}` : "—",
    },
    {
      key: "rain",
      icon: UmbrellaIcon,
      label: t(day ? "myspace.weather.precipDay" : "myspace.weather.precip6h"),
      value: rain != null ? f.mm(rain) : "—",
      tone: rain > 0 ? RAIN_ON_CARD : "",
    },
  ]
  return <Tiles rows={rows} className={className} />
}
