import { motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import Target02Icon from "@hugeicons/core-free-icons/Target02Icon"
import { useLocale } from "@/hooks/useLocale"

// Hedefin çevresinde parlayan iki kıvılcım: konum (%), boy (px), gecikme (sn).
const SPARKS = [
  [6, 8, 4, 0],
  [88, 70, 3, 0.9],
]

/**
 * Bugünün odağının boş hâli (empty state): küçük, süzülen bir hedef ve tek
 * satır soru. Kartın BOŞ alanına üstten yerleşir (`absolute`) — kartın,
 * dolayısıyla satırın yüksekliğine katkısı yok. Alan dar kalırsa (< 6rem)
 * simge gizlenir, yalnız soru kalır. Hareket azaltılmışsa durağan.
 */
export function FocusEmpty() {
  const { t } = useLocale()
  const still = useReducedMotion()
  const loop = (duration, delay = 0) =>
    still ? { duration: 0 } : { duration, delay, repeat: Infinity, ease: "easeInOut" }

  return (
    <div className="relative min-h-0 flex-1 [container-type:size]">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden text-center">
        <div className="relative size-10 shrink-0 [@container(max-height:6rem)]:hidden">
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center rounded-xl bg-gradient-to-br from-brand-from/15 via-brand-via/15 to-brand-to/20 text-brand"
            animate={still ? undefined : { y: [0, -3, 0] }}
            transition={loop(3.2)}
          >
            <HugeiconsIcon icon={Target02Icon} className="size-5" strokeWidth={1.8} />
          </motion.span>
          {SPARKS.map(([x, y, size, delay]) => (
            <motion.span
              key={`${x}-${y}`}
              aria-hidden="true"
              className="absolute rounded-full bg-brand-via"
              style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
              animate={still ? undefined : { opacity: [0.2, 1, 0.2] }}
              transition={loop(2.2, delay)}
            />
          ))}
        </div>
        <p className="text-[0.8125rem] leading-snug text-muted-foreground">
          {t("myspace.tasks.empty")}
        </p>
      </div>
    </div>
  )
}
