import { motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"

/**
 * Tanıtım sayfalarının (Hakkımızda · Ekibimiz) başlığı: gezinmedeki ikon gradyan
 * karoda, başlık ve bir paragraf. İki sayfada AYNI bileşen ve aynı üst boşluk —
 * aralarında geçerken başlık yerinden, boyundan oynamasın.
 */
export function PublicPageTitle({ icon, title, subtitle, isDark, dir }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="text-center"
    >
      <h1 className="inline-flex items-center gap-3 text-[2.25rem] font-semibold tracking-[-0.03em] sm:text-[2.75rem]">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-white shadow-lg sm:size-12"
        >
          <HugeiconsIcon icon={icon} className="size-6" strokeWidth={1.6} />
        </span>
        {title}
      </h1>
      <p
        dir={dir}
        className={cn(
          "mx-auto mt-2 max-w-xl text-balance text-[1rem] leading-relaxed",
          isDark ? "text-white/65" : "text-[#1a1a1a]/65",
        )}
      >
        {subtitle}
      </p>
    </motion.div>
  )
}
