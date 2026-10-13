import { useLocale } from "@/hooks/useLocale"
import { getNumberFormat } from "@/lib/intl-cache"
import { cardSkyOf } from "@/lib/weatherSky"

export const SOURCE_URL = "https://www.met.no/en/free-meteorological-data"

// Saatlik şerit yalnız SAAT yazar ("16" · "4 PM" · "٤ م"): ardışık saatlerde
// ":00" gürültü, ilk hücre zaten "Şimdi".
export const OPTS_HOUR = { hour: "numeric" }

// Ekran okuyucunun duyduğu tam saat ("20:00" · "08:00 PM").
export const OPTS_TIME = { hour: "2-digit", minute: "2-digit" }

export const OPTS_WEEKDAY = { weekday: "short" }

export const OPTS_DAY = { day: "numeric", month: "short" }

// Seçilen günün başlığı ve canlı bölgesi: "2 Ekim Cuma" · "Friday, October 2".
export const OPTS_DAY_LONG = { weekday: "long", day: "numeric", month: "long" }

const OPTS_INT = { maximumFractionDigits: 0 }

const OPTS_MM = { maximumFractionDigits: 1 }

// Birim de dilin: "0,9 mm" · "0.9 mm" · "0,9 мм" · "٠٫٩ مم" (lejant zaten "осадки, мм"
// diyordu, değer Latin "mm" kalıyordu). Intl araya sıradan boşluk koyuyor →
// bölünmez boşluk, sayı ile birim satır sonunda ayrılmasın.
const OPTS_MM_UNIT = {
  style: "unit",
  unit: "millimeter",
  unitDisplay: "short",
  maximumFractionDigits: 1,
}

const OPTS_PCT = { style: "percent", maximumFractionDigits: 0 }

// Gökyüzü üstündeki yağış damlası — bütün göklerde ≥ 3,10:1 (spec §B).
export const RAIN_ON_SKY = "text-[#7CC2FF]"

export const RAIN_ON_CARD = "text-sky-700 dark:text-sky-400"

/** Dilin rakamları, ayracı ve birimiyle: "%67" ↔ "67%", "0,9 mm" ↔ "0.9 mm" ↔ "0,9 мм". */
export function useWeatherFormat() {
  const { locale } = useLocale()
  const int = getNumberFormat(locale, OPTS_INT)
  const mm = getNumberFormat(locale, OPTS_MM)
  const mmUnit = getNumberFormat(locale, OPTS_MM_UNIT)
  const pct = getNumberFormat(locale, OPTS_PCT)
  return {
    // Okunamayan derece "0°" DEĞİL "—" (Intl `null`u 0 yazar).
    temp: (n) => (Number.isFinite(n) ? `${int.format(n)}°` : "—"),
    num: (n) => int.format(n),
    dec: (n) => mm.format(n),
    mm: (n) => mmUnit.format(n).replace(/ /g, "\u00a0"),
    pct: (n) => pct.format(n / 100),
  }
}

/**
 * Durumun ADI — en çok iki kelime ("Güneşli", "Sağanak"). Açık gök gündüz "Güneşli", gece "Açık": gece
 * yarısı "Güneşli" yazmak yalan olurdu.
 */
export const condKey = (kind, night) =>
  kind === "clear" && night ? "myspace.weather.c.clearNight" : `myspace.weather.c.${kind}`

/** Hücreye kendi göğünün değişkenlerini veren nitelikler (`skyCard.css` › `.wxd-sky`). */
export const skyAttrs = (kind, night) => ({
  "data-weather": cardSkyOf(kind),
  "data-time": night ? "night" : "day",
})

// 12 saatlik dillerde baştaki sıfır atılır ("6:15 PM", "06:15 PM" değil) — tarih
// hapının kuralı; 24 saatlik dillerde "06:15" kalır.
export const OPTS_CARD_TIME_12 = { hour: "numeric", minute: "2-digit" }
