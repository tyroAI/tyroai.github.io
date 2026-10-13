import { motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { AnimatedCounter } from "@/components/common/AnimatedCounter"
import { useLocale } from "@/hooks/useLocale"

const RING_R = 22
const RING_C = 2 * Math.PI * RING_R

/** İzin bakiyesi halkası: kullanılan / hak; ilk çizimde dolarak gelir. */
export function BalanceRing({ balance }) {
  const reduce = useReducedMotion()
  const claim = balance?.claim ?? 0
  const used = balance?.used ?? 0
  const share = claim > 0 ? Math.min(used / claim, 1) : 0
  return (
    <svg viewBox="0 0 52 52" className="size-11 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="26" cy="26" r={RING_R} fill="none" strokeWidth="4" className="stroke-muted" />
      <motion.circle
        cx="26"
        cy="26"
        r={RING_R}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={RING_C}
        initial={reduce ? false : { strokeDashoffset: RING_C }}
        animate={{ strokeDashoffset: RING_C * (1 - share) }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="stroke-brand"
      />
    </svg>
  )
}

/**
 * Kutunun yüzü — yalnız metin ve şekil (span'ler: düğmenin içinde de geçerli). `counter`
 * verilirse değer sayaçla döner (dönem değişince); `value` sayacın düz metni ve yedeği.
 */
export function TileFace({ tab, title, short, value, counter, caption, note, hint, art, loading }) {
  const { locale } = useLocale()
  return (
    <>
      <span className="hidden @[44rem]/ss:contents">
        {art ?? (
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-ink">
            <HugeiconsIcon icon={tab.icon} className="size-5" strokeWidth={1.8} />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.75rem] font-medium text-foreground/65">
          {/* Telefonda kısa ad (yılsız): üç kutu tek satırda. */}
          <span className="@[44rem]/ss:hidden">{short ?? title}</span>
          <span className="hidden @[44rem]/ss:inline">{title}</span>
        </span>
        {loading ? (
          <span className="ms-skeleton mt-1 block h-6 w-24 rounded-md" />
        ) : (
          <span className="block truncate text-[0.9375rem] font-semibold tabular-nums tracking-[-0.02em] text-foreground @[44rem]/ss:text-[1.25rem]">
            {counter ? <AnimatedCounter {...counter} locale={locale} fallback={value} /> : value}
          </span>
        )}
        <span className="hidden truncate text-[0.6875rem] text-foreground/65 @[44rem]/ss:block">
          {caption}
        </span>
        {note && (
          <span className="hidden truncate text-[0.6875rem] text-foreground/65 @[56rem]/ss:block">
            {note}
          </span>
        )}
        {hint && <span className="sr-only">{hint}</span>}
      </span>
    </>
  )
}
