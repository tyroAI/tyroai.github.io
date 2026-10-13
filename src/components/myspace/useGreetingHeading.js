import { useLocale } from "@/hooks/useLocale"
import { getNumberFormat, pluralKey } from "@/lib/intl-cache"

/**
 * Selamlamanın METNİ (hava kartı ve Pano'nun Karşılama kartı ortak). ⚠️ İş yıl
 * dönümü "Nice yıllara" DEĞİL: Türkçede o bir doğum günü dileği. Yıl dönümü işe
 * özgü ve yılı söylüyor — "Birlikte 5 yıl, Doğukan!"; çoğul dilin kuralıyla
 * (`myspace.cel.greet.years.<kategori>`, RU "5 лет", AR "٥ سنوات"). İkisi aynı
 * gündeyse doğum günü başlığı.
 */
export function useGreetingHeading(greeting, celebration) {
  const { t, locale } = useLocale()
  if (celebration?.birthday) return t("myspace.cel.greet.birthday")
  const years = celebration?.anniversary?.years
  if (Number.isFinite(years))
    return t(pluralKey("myspace.cel.greet.years", locale, years), {
      n: getNumberFormat(locale).format(years),
    })
  return t(greeting)
}
