import { useRef } from "react"
import { AnimatePresence, motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon"
import { useLocale } from "@/hooks/useLocale"
import { expenseTotals } from "@/lib/requestForm"
import { cn } from "@/lib/utils"
import { money, totalsList } from "../kinds"
import { ExpenseRow } from "./ExpenseRow"
import { MAX_ROWS } from "./useExpenseRows"

/**
 * Masraf girişi: kalemler alt alta, bir anda tek kalem açık (ötekiler tek satır özet). Kalem
 * eklenir, kopyalanır, silinir; altta para birimine göre toplam.
 */
export function ExpenseForm({ form, idBase }) {
  const { t, locale } = useLocale()
  const addRef = useRef(null)
  const { rows, active } = form.expense
  const full = rows.length >= MAX_ROWS

  // Yeni ya da kopyalanan kalem açık gelir; görünür olur, odak ilk alanına geçer.
  const focusRow = (id) =>
    id &&
    requestAnimationFrame(() => {
      const el = document.getElementById(`${idBase}-${id}`)
      el?.scrollIntoView({ block: "nearest" })
      el?.querySelector("[data-row-start] button, [data-row-start] input")?.focus()
    })

  const totals = totalsList(expenseTotals(rows, locale))
  return (
    <div className="space-y-2.5">
      <AnimatePresence initial={false}>
        {rows.map((r, i) => {
          const open = r.id === active
          return (
            <motion.section
              key={r.id}
              id={`${idBase}-${r.id}`}
              layout="position"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              aria-labelledby={open ? `${idBase}-${r.id}-title` : undefined}
              aria-label={open ? undefined : t("selfService.form.row", { n: i + 1 })}
              className={cn(
                "rounded-2xl border bg-card transition-[border-color,box-shadow]",
                open ? "border-border p-4 shadow-sm" : "border-border/70 px-3 py-2",
              )}
            >
              <ExpenseRow
                form={form}
                row={r}
                n={i + 1}
                idBase={idBase}
                open={open}
                errors={form.rowErrors?.[i]}
                canAdd={!full}
                onCopy={() => focusRow(form.expense.duplicate(r.id))}
                onRemove={
                  rows.length > 1
                    ? () => {
                        form.expense.remove(r.id)
                        addRef.current?.focus({ preventScroll: true })
                      }
                    : null
                }
              />
            </motion.section>
          )
        })}
      </AnimatePresence>
      <button
        ref={addRef}
        type="button"
        disabled={full}
        onClick={() => focusRow(form.expense.append())}
        className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border text-[0.8125rem] font-semibold text-foreground/75 transition hover:border-brand/45 hover:bg-brand/[0.04] hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50 pointer-coarse:h-12"
      >
        <HugeiconsIcon icon={PlusSignIcon} aria-hidden="true" className="size-4" strokeWidth={2} />
        {full ? t("selfService.form.rowsFull", { n: MAX_ROWS }) : t("selfService.form.addRow")}
      </button>
      {totals.length > 0 && (
        <div
          aria-live="polite"
          className="flex items-baseline justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3"
        >
          <span className="text-[0.75rem] text-muted-foreground">
            {t("selfService.form.total", { n: rows.length })}
          </span>
          <span className="min-w-0 text-end text-[0.9375rem] font-semibold tabular-nums">
            {totals.map(([cur, sum]) => money(sum, cur, locale)).join(" · ")}
          </span>
        </div>
      )}
    </div>
  )
}
