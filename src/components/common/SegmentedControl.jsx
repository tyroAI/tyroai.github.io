import { useEffect, useId, useRef } from "react"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { useScrollFade } from "@/hooks/useScrollFade"
import { isRtl, rovingIndex } from "@/lib/rovingKeys"
import { cn } from "@/lib/utils"

// Arc'ın "morph" yayı: paylaşılan vurgu hafif esneyerek yerine oturur.
const GLIDE = { type: "spring", visualDuration: 0.42, bounce: 0.16 }
const STILL = { duration: 0 }
const FADE = 20

/**
 * BÖLMELİ SEÇİM — birkaç kısa, hemen uygulanan seçenek (dönem yılları, Bilgilerim | Ekibim):
 * seçim vurgusu seçenekler arasında kayar. Arc'ın segmented-control bileşeninden uyarlandı
 * (uiarc.dev, MIT): yalnız seçili seçenek sekme durağı; oklar (sağdan sola dilde ters), Home ve
 * End seçimi taşır. Sığmazsa iz kendi içinde kayar, kenar yalnız devamı olan yanda solar;
 * seçili seçenek görünür alana kaydırılır. Düğmeler `aria-pressed` (`role="group"`).
 * Hareketi azalt tercihinde vurgu kaymaz, atlar.
 *
 * @param {{ value: any, label: string, icon?: object, accessory?: import("react").ReactNode, title?: string }[]} p.options
 * @param {any} p.value seçili değer (`null` da bir değer olabilir: "Tümü")
 * @param {(value: any) => void} p.onChange
 * @param {string} p.label grubun adı (ekran okuyucu)
 * @param {string} [p.iconFrom] ikonun göründüğü kap genişliği sınıfı (ör. "@[30rem]/ss:block")
 * @param {string} [p.itemClassName] seçeneklerin ek sınıfı (dar kapta daha sıkı dolgu)
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  iconFrom,
  itemClassName,
  className,
}) {
  const id = useId()
  const reduce = useReducedMotion()
  const track = useRef(null)
  const refs = useRef([])
  const at = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  // Kenar solması yalnız devamı olan yanda (sağdan sola dilde yönler ters).
  useScrollFade(track, "x", FADE)

  // Seçili seçenek hep tam görünür (solmanın dışında). Yalnız iz kayar, sayfa değil.
  const first = useRef(true)
  useEffect(() => {
    const node = track.current
    const button = refs.current[at]
    const instant = first.current || reduce
    first.current = false
    if (!node || !button || node.scrollWidth <= node.clientWidth) return
    const box = node.getBoundingClientRect()
    const own = button.getBoundingClientRect()
    const delta =
      own.left - FADE < box.left
        ? own.left - FADE - box.left
        : own.right + FADE > box.right
          ? own.right + FADE - box.right
          : 0
    if (delta) node.scrollBy({ left: delta, behavior: instant ? "auto" : "smooth" })
  }, [at, reduce])

  const onKeyDown = (e) => {
    const next = rovingIndex(e.key, at, options.length, isRtl(e.currentTarget))
    if (next < 0) return
    e.preventDefault()
    if (next !== at) onChange(options[next].value)
    refs.current[next]?.focus({ preventScroll: true })
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex min-w-0 max-w-full shrink rounded-full bg-foreground/[0.06] p-0.5",
        className,
      )}
    >
      <LayoutGroup id={id}>
        <div
          ref={track}
          className="isolate flex min-w-0 gap-0.5 overflow-x-auto overscroll-x-contain rounded-full [mask-image:linear-gradient(to_right,transparent,#000_var(--fade-start,0px),#000_calc(100%-var(--fade-end,0px)),transparent)] [scrollbar-width:none] rtl:[mask-image:linear-gradient(to_left,transparent,#000_var(--fade-start,0px),#000_calc(100%-var(--fade-end,0px)),transparent)] [&::-webkit-scrollbar]:hidden"
        >
          {options.map((o, i) => {
            const on = i === at
            return (
              <button
                key={o.value ?? "all"}
                ref={(el) => {
                  refs.current[i] = el
                }}
                type="button"
                aria-pressed={on}
                tabIndex={on ? 0 : -1}
                title={o.title}
                onClick={() => !on && onChange(o.value)}
                onKeyDown={onKeyDown}
                className={cn(
                  "relative inline-flex h-8 min-w-0 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 pointer-coarse:h-11 pointer-coarse:min-w-11",
                  on ? "text-foreground" : "text-foreground/70 hover:text-foreground",
                  itemClassName,
                )}
              >
                {on && (
                  <motion.span
                    layoutId="segment"
                    aria-hidden="true"
                    transition={reduce ? STILL : GLIDE}
                    className="absolute inset-0 -z-10 rounded-full bg-card shadow-sm ring-1 ring-foreground/[0.06]"
                  />
                )}
                {o.icon && (
                  <HugeiconsIcon
                    icon={o.icon}
                    aria-hidden="true"
                    className={cn("size-4 shrink-0", iconFrom && cn("hidden", iconFrom))}
                    strokeWidth={1.9}
                  />
                )}
                <span className="truncate">{o.label}</span>
                {o.accessory}
              </button>
            )
          })}
        </div>
      </LayoutGroup>
    </div>
  )
}
