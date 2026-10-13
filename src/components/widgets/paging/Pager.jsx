import { HugeiconsIcon } from "@hugeicons/react"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { MotionConfig, motion } from "motion/react"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

// Görünüşte 24px; dokunmatikte basılan alan 40px (komşusuna taşmaz, arada sayaç var).
const BTN =
  "relative grid size-6 place-items-center rounded-full text-muted-foreground transition after:absolute after:-inset-2 pointer-coarse:after:content-[''] hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 aria-disabled:cursor-default aria-disabled:opacity-30 aria-disabled:hover:bg-transparent"

/**
 * Başlık satırındaki sayfa çevirici: ‹ 2/3 ›. Tek sayfada hiç çizilmez. En dar
 * kartta sayaç yalnız ekran okuyucuya kalır, başlık kırpılmasın.
 * Kenardaki ok `aria-disabled` (odak kaybolmasın); sayaç değişince ekran
 * okuyucu duyar.
 */
export function Pager({ pager, label }) {
  const { t } = useLocale()
  if (pager.pages < 2) return null
  const first = pager.page === 0
  const last = pager.page === pager.pages - 1
  return (
    <span role="group" aria-label={label} className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        aria-disabled={first || undefined}
        aria-label={t("widgets.pager.prev")}
        onClick={pager.prev}
        className={BTN}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" strokeWidth={2.2} />
      </button>
      <span
        aria-live="polite"
        className="min-w-[2rem] text-center text-[0.6875rem] font-medium tabular-nums text-muted-foreground @max-[16rem]/widget:sr-only"
      >
        {t("widgets.pager.of", { page: pager.page + 1, pages: pager.pages })}
      </span>
      <button
        type="button"
        aria-disabled={last || undefined}
        aria-label={t("widgets.pager.next")}
        onClick={pager.next}
        className={BTN}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" strokeWidth={2.2} />
      </button>
    </span>
  )
}

/**
 * Sayfanın içeriği: sayfa değişince yeni sayfa geldiği yönden kısa bir
 * kaymayla girer (azaltılmış harekette yalnız belirir). `swipe` olayları burada.
 */
export function PageBody({ pager, as = "ul", className, children }) {
  const Tag = motion[as]
  return (
    <MotionConfig reducedMotion="user">
      <Tag
        key={pager.page}
        initial={{ opacity: 0, x: pager.dir * 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        {...pager.swipe}
        className={cn(className)}
      >
        {children}
      </Tag>
    </MotionConfig>
  )
}
