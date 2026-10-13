import { useEffect, useRef } from "react"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { useWidgetEditor } from "./widgetEditorContext"

const PILL =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[0.8125rem] font-medium text-foreground/80 transition pointer-coarse:h-11 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-background"

/**
 * Düzenlerken sayfanın ÜSTÜNDE, header'ın hemen altında duran çubuk — kip
 * header'dan açılır, düğmeleri burada: Widget ekle (katalog) · Varsayılana dön · Bitti.
 * Altta gözden kaçıyordu; üstte ve kaydırırken de orada (`sticky`). Sayfanın
 * üst boşluğuna oturur (negatif üst pay): kip açılınca kartlar az kayar.
 * Açılınca odak çubuğa gelir.
 */
export function BoardEditBar() {
  const { t } = useLocale()
  const { editing, layout, actions } = useWidgetEditor()
  const bar = useRef(null)

  useEffect(() => {
    if (editing) bar.current?.querySelector("button")?.focus({ preventScroll: true })
  }, [editing])

  if (!editing) return null
  return (
    <div className="pointer-events-none sticky top-3 z-40 -mt-4 mb-6 flex justify-center sm:-mt-6 lg:-mt-10">
      <motion.div
        ref={bar}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        role="region"
        aria-label={t(layout.labels?.bar ?? "widgets.editBar")}
        className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur"
      >
        <p className="hidden px-3 text-[0.8125rem] text-muted-foreground @[48rem]/myspace:block">
          {t("widgets.editHint")}
        </p>
        <button
          type="button"
          aria-disabled={!layout.hidden.length || undefined}
          onClick={() => layout.hidden.length && actions.openCatalog()}
          className={PILL}
        >
          <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
          {t("widgets.add")}
        </button>
        <button
          type="button"
          aria-disabled={layout.isDefault || undefined}
          onClick={actions.reset}
          className={PILL}
        >
          {t("widgets.reset")}
        </button>
        <button
          type="button"
          onClick={actions.done}
          className={cn(
            PILL,
            "border-transparent bg-brand-fill-deep text-brand-on-brand hover:bg-brand-fill-deep hover:text-brand-on-brand hover:brightness-110",
          )}
        >
          {t("widgets.done")}
        </button>
      </motion.div>
    </div>
  )
}
