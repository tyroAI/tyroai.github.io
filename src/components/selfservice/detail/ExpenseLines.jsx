import { useMemo, useState } from "react"
import { useLocale } from "@/hooks/useLocale"
import { extraValue } from "@/lib/selfServiceFields"
import { lineInFacet } from "@/lib/selfServiceFilters"
import { byCategory } from "@/lib/selfServiceReport"
import { BreakdownList } from "../report/BreakdownList"
import { LineCard } from "./LineCard"

const FIRST = 6

/**
 * Masraf raporunun kalemleri: birden çok kategori varsa önce "Kategorilere göre" mini özet,
 * sonra kalem kartları (tarihe göre). Altıdan çok kalemde önce altı + "Tümünü göster";
 * kategori süzgeci açıksa uyan kalemler vurgulu ve gizli kalmasın diye liste açık başlar.
 */
export function ExpenseLines({ record, facet }) {
  const { t } = useLocale()
  const summary = useMemo(
    () => byCategory((record.lines ?? []).map((l) => ({ ...l, report: record.number }))),
    [record.lines, record.number],
  )
  const lines = record.lines ?? []
  // Raporla aynı olan şirket ve masraf merkezi kalem kartlarında tekrarlanmaz.
  const report = { company: record.company, costCenter: extraValue(record.extra, "costCenter") }
  const hiddenMatch = Boolean(facet) && lines.slice(FIRST).some((l) => lineInFacet(l, facet))
  const [all, setAll] = useState(hiddenMatch)
  const shown = all ? lines : lines.slice(0, FIRST)
  return (
    <>
      {summary.rows.length > 1 && (
        <div className="mt-5">
          <BreakdownList
            title={t("selfService.detail.byCategory")}
            breakdown={summary}
            kind="money"
            lines
          />
        </div>
      )}
      <section className="mt-5" aria-labelledby="ss-lines">
        <h3 id="ss-lines" className="text-[0.75rem] font-semibold text-muted-foreground">
          {t("selfService.expense.linesTitle", { n: lines.length })}
        </h3>
        <ul className="mt-2 space-y-2">
          {shown.map((l) => (
            <LineCard
              key={l.id}
              line={l}
              report={report}
              match={Boolean(facet) && lineInFacet(l, facet)}
            />
          ))}
        </ul>
        {lines.length > FIRST && (
          <button
            type="button"
            aria-expanded={all}
            onClick={() => setAll((v) => !v)}
            className="mt-2 w-full rounded-xl border border-dashed border-border px-3 py-2 text-[0.75rem] font-semibold text-brand-ink transition hover:bg-brand/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:min-h-11"
          >
            {all
              ? t("selfService.detail.showLess")
              : t("selfService.detail.showAll", { n: lines.length })}
          </button>
        )}
      </section>
    </>
  )
}
