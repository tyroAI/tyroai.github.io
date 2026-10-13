import { useMemo } from "react"
import { motion } from "motion/react"
import { useLocale } from "@/hooks/useLocale"
import { formFields, leaveWorkdays } from "@/lib/requestForm"
import { cn } from "@/lib/utils"
import { countText, number, range } from "../kinds"
import { SlotField } from "./SlotField"

/**
 * İzin talebi: önce tür (çipler), sonra başlangıç · bitiş (başlangıç seçilince bitişin takvimi
 * açılır) ve ön izleme — tahmini iş günü, yıllık izinde bakiye önce → sonra.
 */
export function LeaveForm({ form, idBase, balance }) {
  const fields = useMemo(() => {
    const byName = Object.fromEntries(formFields("leaveRequest").main.map((f) => [f.name, f]))
    return { kind: byName.kind, dates: [byName.start, byName.end] }
  }, [])
  const { values, errors } = form
  const common = { tkey: "leaveRequest", idBase, values, onChange: form.setSlot }
  return (
    <div className="space-y-5">
      <SlotField {...common} field={fields.kind} error={errors?.kind} />
      <div className="grid grid-cols-2 gap-3">
        {fields.dates.map((f) => (
          <SlotField
            key={f.name}
            {...common}
            field={f}
            error={errors?.[f.name]}
            dateOpen={form.openDate === f.name}
            onDateOpen={(o) => form.setOpenDate(o ? f.name : null)}
          />
        ))}
      </div>
      <LeavePreview values={values} balance={balance} />
    </div>
  )
}

function LeavePreview({ values, balance }) {
  const { t, locale } = useLocale()
  const { start, end, kind } = values
  const days = leaveWorkdays(start, end)
  const remain = kind === "annual" ? (balance?.remain ?? null) : null
  const fmt = (n) => countText(t, locale, "selfService.days", n)
  if (days == null) {
    return remain == null ? null : (
      <p className="text-[0.75rem] text-muted-foreground">
        {t("selfService.form.balanceNow", { days: fmt(remain) })}
      </p>
    )
  }
  const after = remain == null ? null : remain - days
  const share = remain > 0 ? Math.min(days / remain, 1) : 1
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      aria-live="polite"
      className="rounded-2xl border border-border/70 bg-muted/40 p-4"
    >
      <div className="flex items-center gap-4">
        <div className="shrink-0 text-center">
          <p className="text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums">
            {number(days, locale)}
          </p>
          <p className="mt-1 text-[0.6875rem] font-medium text-muted-foreground">
            {t("selfService.form.workdays")}
          </p>
        </div>
        <div className="min-w-0 flex-1 border-s border-border/70 ps-4">
          <p className="text-[0.8125rem] font-semibold">{range(start, end, locale)}</p>
          {after != null && (
            <>
              <p className="mt-1 text-[0.75rem] text-muted-foreground">
                {t("selfService.form.balanceAfter", { from: fmt(remain), to: fmt(after) })}
              </p>
              <span
                aria-hidden="true"
                className="mt-2 block h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]"
              >
                <span
                  className={cn(
                    "block h-full rounded-full",
                    after < 0 ? "bg-amber-500" : "bg-brand-fill-deep",
                  )}
                  style={{ width: `${Math.max(share * 100, 4)}%` }}
                />
              </span>
              {after < 0 && (
                <p className="mt-1.5 text-[0.75rem] font-medium text-amber-800 dark:text-amber-300">
                  {t("selfService.form.balanceOver", { days: fmt(-after) })}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <p className="mt-3 text-[0.6875rem] leading-snug text-muted-foreground">
        {t("selfService.form.daysNote")}
      </p>
    </motion.div>
  )
}
