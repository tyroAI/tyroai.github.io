import { useId, useRef } from "react"
import { LayoutGroup, motion } from "motion/react"
import { isRtl, rovingIndex } from "@/lib/rovingKeys"
import { cn } from "@/lib/utils"

const GLIDE = { type: "spring", stiffness: 520, damping: 40, mass: 0.7 }

/**
 * Tek seçimli çipler, seçim vurgusu seçenekler arasında kayar. Arc'ın segmented-control
 * bileşeninden uyarlandı (uiarc.dev, MIT): yalnız seçili çip sekme durağı, oklar · Home · End
 * seçimi taşır (sağdan sola dilde oklar ters), vurgu `layoutId` ile kayar.
 * `wrap`: uzun liste (izin türü, avans amacı) satıra sığmazsa alta geçer; değilse eşit dilimli
 * bölmeli düğme (ödeme, belge).
 */
export function ChoiceChips({ labelledBy, options, value, onChange, labelOf, wrap = false }) {
  const group = useId()
  const refs = useRef([])
  const at = Math.max(0, options.indexOf(value))

  const onKeyDown = (e) => {
    const next = rovingIndex(e.key, at, options.length, isRtl(e.currentTarget))
    if (next < 0) return
    e.preventDefault()
    onChange(options[next])
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn(
        "isolate flex gap-1.5",
        wrap ? "flex-wrap" : "rounded-xl bg-foreground/[0.05] p-1",
      )}
    >
      <LayoutGroup id={group}>
        {options.map((o, i) => {
          const on = o === value
          return (
            <button
              key={o}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={i === at ? 0 : -1}
              onClick={() => onChange(o)}
              onKeyDown={onKeyDown}
              className={cn(
                "relative inline-flex min-w-0 items-center justify-center rounded-[0.625rem] px-3 text-[0.8125rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                wrap ? "h-9 border pointer-coarse:h-11" : "h-8 flex-1 pointer-coarse:h-11",
                wrap && (on ? "border-transparent" : "border-border bg-background"),
                on ? "text-brand-ink" : "text-foreground/75 hover:text-foreground",
              )}
            >
              {on && (
                <motion.span
                  layoutId="choice"
                  aria-hidden="true"
                  transition={GLIDE}
                  className={cn(
                    "absolute -inset-px -z-10 rounded-[inherit]",
                    wrap
                      ? "bg-brand/[0.1] ring-1 ring-brand/35"
                      : "bg-card shadow-sm ring-1 ring-border/70",
                  )}
                />
              )}
              <span className="truncate">{labelOf(o)}</span>
            </button>
          )
        })}
      </LayoutGroup>
    </div>
  )
}
