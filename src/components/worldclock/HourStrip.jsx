import { memo } from "react"
import { cn } from "@/lib/utils"
import { PERIOD } from "./periods"

/**
 * Bir şehrin 24 saatlik şeridi (ana şehrin seçili gününe hizalı). Gece
 * yarısı hücresi ayı ve günü taşır (şehrin kendi takviminden; `monthFmt`
 * UTC'de biçimler); günler ayrı "hap" gibi okunsun diye gün
 * sınırında köşe yuvarlanır. Ana şehrin şeridi düğmelerden oluşur (klavyeyle
 * saat seçimi); ötekilerde hücreye fareyle basmak da aynı saati seçer.
 */
export const HourStrip = memo(function HourStrip({
  strip,
  monthFmt,
  interactive,
  hourLabel,
  label,
  onHover,
  onPick,
}) {
  return (
    <div
      role={interactive ? "group" : "img"}
      aria-label={label}
      className="flex h-10 shrink-0"
      onPointerLeave={() => onHover(null)}
    >
      {strip.map((slot, i) => {
        const dayStart = slot.h === 0 || i === 0
        const dayEnd = slot.h === 23 || i === 23
        const cls = cn(
          "relative flex w-[var(--cell)] shrink-0 select-none flex-col items-center justify-center text-[0.8125rem] leading-none tabular-nums transition-[filter] hover:brightness-95",
          PERIOD[slot.period],
          dayStart && "rounded-s-lg",
          dayEnd && "rounded-e-lg",
          slot.h === 0 && i > 0 && "shadow-[inset_2px_0_0_var(--color-popover)]",
        )
        const body =
          slot.h === 0 && slot.mi === 0 ? (
            <>
              <span className="text-[0.5625rem] font-semibold uppercase tracking-wide opacity-80">
                {monthFmt.format(new Date(Date.UTC(slot.y, slot.mo - 1, 15)))}
              </span>
              <span className="mt-0.5 font-semibold">{slot.d}</span>
            </>
          ) : (
            <span>
              {slot.h}
              {slot.mi > 0 && <sup className="ms-px text-[0.5625rem] opacity-75">{slot.mi}</sup>}
            </span>
          )
        const pointer = {
          onPointerEnter: (e) => e.pointerType === "mouse" && onHover(i),
          onClick: () => onPick(i),
        }
        return interactive ? (
          <button
            key={i}
            type="button"
            aria-label={hourLabel(slot)}
            className={cn(
              cls,
              "focus-visible:z-[2] focus-visible:outline-2 focus-visible:outline-brand",
            )}
            onFocus={() => onHover(i)}
            {...pointer}
          >
            {body}
          </button>
        ) : (
          <span key={i} aria-hidden="true" className={cls} {...pointer}>
            {body}
          </span>
        )
      })}
    </div>
  )
})
