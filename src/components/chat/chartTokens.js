import { useMemo } from "react"
import { useLocale } from "@/hooks/useLocale"

/* Grafik ve içgörü kartlarının paylaştığı iki şey. Ayrı dosyada, çünkü
   bileşen dosyasından sabit/kanca ihraç etmek fast refresh'i bozuyor
   (react-refresh/only-export-components). */

/* Paleti izleyen seri renkleri (bkz. index.css `--series-*`). `--chart-3/4`
   DEĞİL: onlar freight'te palet bağımsız turuncu. */
export const SERIES_TOKENS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
]

/** Compact axis labels — 688029 is unreadable at tick size, 688B is not. */
export function useCompact(unit) {
  const { locale } = useLocale()
  return useMemo(() => {
    const fmt = new Intl.NumberFormat(locale || "tr", {
      notation: "compact",
      maximumFractionDigits: 1,
    })
    const full = new Intl.NumberFormat(locale || "tr", { maximumFractionDigits: 2 })
    const small = new Intl.NumberFormat(locale || "tr", { maximumFractionDigits: 2 })
    return {
      tick: (v) => fmt.format(v),
      // On a bar label, the compact form of 0.03 is "0" — which reads as
      // nothing spent rather than three cents. Anything that would round away
      // gets its real value instead.
      label: (v) => (v !== 0 && Math.abs(v) < 1 ? small.format(v) : fmt.format(v)),
      full: (v) => `${full.format(v)}${unit ? ` ${unit}` : ""}`,
      // Manşet rakamı: birimsiz tam sayı; birim yanına küçük yazılır.
      plain: (v) => full.format(v),
    }
  }, [locale, unit])
}
