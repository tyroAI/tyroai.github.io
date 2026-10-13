import { memo } from "react"
import { cn } from "@/lib/utils"

/**
 * En üstteki "Mesaideki ofisler" satırı: ana şehrin her saatinde kaç şehrin
 * mesaide (08–18) olduğu — rengin yoğunluğu sayıyla artar, en yüksek saat(ler)
 * çerçeveli. Toplantı saati ararken satır satır göz gezdirmek yerine tek
 * bakış. Kaydırırken üstte kalır (`sticky`); hücreye basmak o saati seçer.
 */
export const OverlapRow = memo(function OverlapRow({
  counts,
  total,
  homeStrip,
  t,
  onHover,
  onPick,
}) {
  const max = Math.max(0, ...counts)
  const fmt = (slot) =>
    slot ? `${String(slot.h).padStart(2, "0")}:${String(slot.mi).padStart(2, "0")}` : ""
  const bestAt = max > 0 ? counts.indexOf(max) : -1
  const bestLabel =
    bestAt >= 0 &&
    `${t("worldClock.best")}: ${t("worldClock.overlapCell", { time: fmt(homeStrip?.[bestAt]), n: max, total })}`
  return (
    <div className="sticky top-0 z-[4] flex items-center border-b border-border/60 bg-popover py-2">
      <div className="sticky start-0 z-[3] flex w-[var(--info)] shrink-0 flex-col justify-center self-stretch bg-popover pe-3 ps-[4.25rem]">
        <p className="text-[0.75rem] font-semibold">{t("worldClock.overlap")}</p>
        <p className="text-[0.6875rem] text-muted-foreground">{t("worldClock.overlapHint")}</p>
        {bestLabel && <p className="sr-only">{bestLabel}</p>}
      </div>
      <div className="flex h-8 shrink-0 ps-2" onPointerLeave={() => onHover(null)}>
        {counts.map((n, i) => {
          const slot = homeStrip?.[i]
          const share = total ? n / total : 0
          const best = max > 0 && n === max
          const label = t("worldClock.overlapCell", { time: fmt(slot), n, total })
          return (
            <span
              key={i}
              title={best ? `${label} · ${t("worldClock.best")}` : label}
              aria-hidden="true"
              onPointerEnter={(e) => e.pointerType === "mouse" && onHover(i)}
              onClick={() => onPick(i)}
              className={cn(
                "grid w-[var(--cell)] shrink-0 cursor-pointer select-none place-items-center p-0.5",
              )}
            >
              <span
                className={cn(
                  "grid size-full place-items-center rounded-md text-[0.6875rem] font-semibold tabular-nums",
                  n === 0
                    ? "text-muted-foreground/50"
                    : share > 0.5
                      ? "text-white"
                      : "text-emerald-950 dark:text-emerald-50",
                  best &&
                    "ring-2 ring-emerald-600 ring-offset-1 ring-offset-popover dark:ring-emerald-400",
                )}
                style={
                  n > 0
                    ? {
                        backgroundColor: `color-mix(in oklab, var(--color-emerald-500) ${Math.round(14 + share * 76)}%, transparent)`,
                      }
                    : undefined
                }
              >
                {n}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
})
