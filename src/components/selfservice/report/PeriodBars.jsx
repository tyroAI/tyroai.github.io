import { useEffect, useRef } from "react"
import { motion } from "motion/react"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"
import { countText } from "../kinds"
import { rowValue } from "./reportText"

const SHORT = { month: "short" }
const NARROW = { month: "narrow" }
const LONG = { month: "long", year: "numeric" }
const GROW = { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
// Kısa ay adının sığdığı kap genişliği dile göre (12 sütun, 2 px ara; ölçüldü): TR/EN üç harf
// ("Tem" 19,6 px), RU "февр." (26,7 px), AR kısaltmasız ("أغسطس" 29 px). Altında tek harf.
// Dokunmatikte sütun 44 px: hep kısa ad.
const SHORT_FROM = {
  ru: ["@[22.5rem]/bars:hidden", "@[22.5rem]/bars:inline"],
  ar: ["@[24.5rem]/bars:hidden", "@[24.5rem]/bars:inline"],
}
const SHORT_DEFAULT = ["@[17rem]/bars:hidden", "@[17rem]/bars:inline"]

/**
 * "Aylara göre" (yıl seçiliyken 12 ay) ya da "Yıllara göre" (Tümü) — küçük sütun grafiği.
 * Her sütun bir düğme: ayda basmak listeyi o aya süzer (yeniden basmak kaldırır), yılda basmak
 * dönemi o yıla geçirir. Kaydı olmayan sütun pasif. Sütun süs; ad ve değer `aria-label`da ve
 * ipucunda. Altında tek satır: seçili ayın değeri, yoksa en yüksek dönem (dokunmatikte ipucu yok).
 * Dokunmatikte sütun en az 44 px: dar kapta grafik yana kayar ve seçili (yoksa kaydı olan son)
 * ay görünür açılır. Dar sağ kolonda ay adı tek harf ("O Ş M"): kısaltmalar kesilmesin
 * (`SHORT_FROM`).
 */
export function PeriodBars({ title, breakdown, kind, year, month, onMonth, onYear }) {
  const { t, locale } = useLocale()
  const list = useRef(null)
  const rows = breakdown?.rows ?? []
  const focusKey = month ?? rows.findLast((r) => r.count)?.key ?? null
  useEffect(() => {
    const ul = list.current
    if (!ul || !focusKey || ul.scrollWidth <= ul.clientWidth) return
    const el = ul.querySelector(`[data-key="${focusKey}"]`)
    if (el) ul.scrollLeft = el.offsetLeft - (ul.clientWidth - el.offsetWidth) / 2
  }, [focusKey, rows.length])
  if (!rows.some((r) => r.count)) return null
  const [narrowCls, shortCls] = SHORT_FROM[locale] ?? SHORT_DEFAULT
  const short = getDateTimeFormat(locale, SHORT)
  const narrow = getDateTimeFormat(locale, NARROW)
  const long = getDateTimeFormat(locale, LONG)
  const labelOf = (row) =>
    row.month != null ? long.format(new Date(year, row.month, 1)) : String(row.year)
  const valueOf = (row) => rowValue(row, kind, breakdown.currency, t, locale)
  const picked = month ? rows.find((r) => r.key === month) : null
  const peak = rows.reduce(
    (best, r) => (r.count && (!best || r.share > best.share) ? r : best),
    null,
  )
  const caption = picked
    ? countText(t, locale, "selfService.report.row", picked.count, {
        label: labelOf(picked),
        value: valueOf(picked),
      })
    : peak && rows.filter((r) => r.count).length > 1
      ? t("selfService.report.peak", { label: labelOf(peak), value: valueOf(peak) })
      : ""
  return (
    <section className="@container/bars min-w-0">
      <h4 className="px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {title}
      </h4>
      <ul
        ref={list}
        style={{ "--cols": rows.length }}
        className="relative mt-2 grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] items-end gap-0.5 [scrollbar-width:none] pointer-coarse:grid-cols-[repeat(var(--cols),minmax(2.75rem,1fr))] pointer-coarse:overflow-x-auto"
      >
        {rows.map((row, i) => {
          const isMonth = row.month != null
          const label = labelOf(row)
          const aria = countText(t, locale, "selfService.report.row", row.count, {
            label,
            value: valueOf(row),
          })
          const on = isMonth ? month === row.key : false
          const pick = isMonth ? () => onMonth?.(on ? null : row.key) : () => onYear?.(row.year)
          return (
            <li key={row.key} data-key={row.key} className="min-w-0">
              <button
                type="button"
                disabled={!row.count}
                aria-pressed={isMonth ? on : undefined}
                aria-label={aria}
                title={row.count ? aria : undefined}
                onClick={pick}
                className={cn(
                  "group/bar flex w-full flex-col items-center gap-1 rounded-lg pb-0.5 pt-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-default pointer-coarse:min-h-11",
                  on ? "bg-brand/[0.09]" : "enabled:hover:bg-accent/60",
                )}
              >
                <span aria-hidden="true" className="flex h-14 w-full items-end justify-center">
                  <motion.span
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ ...GROW, delay: i * 0.02 }}
                    style={{
                      height: `${row.count ? Math.max(row.share * 100, 8) : 4}%`,
                      originY: 1,
                    }}
                    className={cn(
                      "block rounded-t-[0.3rem] transition-[height,background-color] duration-500 motion-reduce:transition-none",
                      // Yıllar az sütun: çubuk geniş; 12 ayda ince.
                      isMonth ? "w-[min(100%,0.875rem)]" : "w-[min(60%,2rem)]",
                      !row.count
                        ? "bg-foreground/[0.06]"
                        : on
                          ? "bg-brand"
                          : "bg-brand/55 group-hover/bar:bg-brand/75",
                    )}
                  />
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "max-w-full truncate text-[0.625rem] tabular-nums",
                    on ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {isMonth ? (
                    <>
                      <span className={cn(narrowCls, "pointer-coarse:hidden")}>
                        {narrow.format(new Date(year, row.month, 1))}
                      </span>
                      <span className={cn("hidden", shortCls, "pointer-coarse:inline")}>
                        {short.format(new Date(year, row.month, 1))}
                      </span>
                    </>
                  ) : (
                    row.year
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {caption && (
        <p className="mt-1.5 truncate px-1 text-[0.6875rem] tabular-nums text-muted-foreground">
          {caption}
        </p>
      )}
    </section>
  )
}
