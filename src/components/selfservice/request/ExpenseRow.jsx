import { HugeiconsIcon } from "@hugeicons/react"
import Attachment01Icon from "@hugeicons/core-free-icons/Attachment01Icon"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon"
import { useLocale } from "@/hooks/useLocale"
import { parseAmount } from "@/lib/requestForm"
import { cn } from "@/lib/utils"
import { day, money } from "../kinds"
import { ReceiptPicker } from "./ReceiptPicker"
import { SlotGrid } from "./SlotGrid"

const ICON_BTN =
  "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-40 pointer-coarse:size-11 [&_svg]:size-4"
const DANGER = "hover:bg-destructive/10 hover:text-destructive"

function Badge({ n, invalid }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold tabular-nums",
        invalid ? "bg-destructive/12 text-destructive" : "bg-brand/10 text-brand-ink",
      )}
    >
      {n}
    </span>
  )
}

/**
 * Masraf kalemi. Açıkken bütün alanlar ve fişler; kapalıyken tek satır özet (kategori, tarih,
 * tutar, fiş sayısı) — basınca açılır. Eksik alanı olan kapalı kalemin numarası kırmızı.
 */
export function ExpenseRow({ form, row, n, idBase, open, errors, canAdd, onCopy, onRemove }) {
  const { t, locale } = useLocale()
  const rows = form.expense
  const base = `${idBase}-${row.id}`
  const title = t("selfService.form.row", { n })
  const invalid = Boolean(errors && Object.keys(errors).length)
  const removeBtn = onRemove && (
    <button
      type="button"
      onClick={onRemove}
      aria-label={t("selfService.form.rowRemove", { n })}
      title={t("selfService.form.rowRemove", { n })}
      className={cn(ICON_BTN, DANGER)}
    >
      <HugeiconsIcon icon={Delete02Icon} aria-hidden="true" strokeWidth={1.8} />
    </button>
  )

  if (!open) {
    const v = row.values
    const sum = parseAmount(v.amount, locale)
    return (
      <div className="flex items-center gap-2 py-0.5">
        <button
          type="button"
          aria-expanded="false"
          onClick={() => rows.activate(row.id)}
          className="-my-1 -ms-1 flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-1 text-start transition hover:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <Badge n={n} invalid={invalid} />
          <span className="sr-only">{title}:</span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-[0.8125rem] font-semibold",
                !v.category && "text-muted-foreground",
              )}
            >
              {v.category ?? t("selfService.form.noCategory")}
            </span>
            <span className="flex items-center gap-1.5 truncate text-[0.75rem] text-muted-foreground">
              {day(v.date, locale)}
              {row.files.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <HugeiconsIcon icon={Attachment01Icon} aria-hidden="true" className="size-3" />
                  <span>{t("selfService.form.receiptCount", { n: row.files.length })}</span>
                </>
              )}
              {invalid && (
                <span className="font-medium text-destructive">
                  · {t("selfService.form.rowInvalid")}
                </span>
              )}
            </span>
          </span>
          <span className="shrink-0 text-[0.875rem] font-semibold tabular-nums">
            {sum == null ? "—" : money(sum, v.currency, locale)}
          </span>
        </button>
        {removeBtn}
      </div>
    )
  }

  return (
    <>
      <header className="-mt-1 mb-3 flex items-center gap-2">
        <Badge n={n} invalid={false} />
        <h3 id={`${base}-title`} className="min-w-0 flex-1 text-[0.8125rem] font-semibold">
          {title}
        </h3>
        <button
          type="button"
          disabled={!canAdd}
          onClick={onCopy}
          aria-label={t("selfService.form.rowCopy", { n })}
          title={t("selfService.form.rowCopy", { n })}
          className={ICON_BTN}
        >
          <HugeiconsIcon icon={Copy01Icon} aria-hidden="true" strokeWidth={1.8} />
        </button>
        {removeBtn}
      </header>
      <div data-row-start="">
        <SlotGrid
          tkey="expense"
          idBase={base}
          values={row.values}
          errors={errors}
          onChange={(name, v) => rows.set(row.id, name, v)}
          onAdd={(f) => rows.addSlot(row.id, f)}
          onRemove={(name) => rows.removeSlot(row.id, name)}
        >
          <ReceiptPicker
            idBase={base}
            files={row.files}
            onAdd={(files) => rows.addFiles(row.id, files)}
            onRemove={(fileId) => rows.removeFile(row.id, fileId)}
          />
        </SlotGrid>
      </div>
    </>
  )
}
