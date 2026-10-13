import { useLocale } from "@/hooks/useLocale"
import { countText, money, number, totalsList } from "../kinds"
import { SuspectNote } from "./SuspectNote"

/**
 * Süzülmüş listenin özeti — toplam kuralıyla: "6 kayıt · ₺12.400 + €80 · 1 toplam dışı"
 * (izinde gün; masrafta kategori süzgeci açıkken uyan kalemlerin toplamı). Tutar ve gün yalnız
 * toplama girenlerden; toplam dışılar sayıyla not edilir. `suspect`: hesaba katılmayan tutarsız
 * kayıtlar — köşede uyarı çipi.
 */
export function ListSummary({ tab, summary, facetLabel, suspect }) {
  const { t, locale } = useLocale()
  if (!summary?.count && !suspect?.length) return null
  const parts = [countText(t, locale, "selfService.list.count", summary.count ?? 0)]
  const moneyOf = (totals) =>
    totalsList(totals)
      .map(([c, a]) => money(a, c, locale))
      .join(" + ")
  if (tab === "leave") {
    if (summary.days) parts.push(countText(t, locale, "selfService.days", summary.days))
    else if (summary.hours) parts.push(t("selfService.hours", { n: number(summary.hours, locale) }))
  } else if (summary.facet && facetLabel) {
    // Kategori süzgeci: uyan kalemlerin toplamı ("Ulaşım (Yurtdışı): $83,00").
    const amount = moneyOf(summary.facet.totals)
    if (amount) parts.push(`${facetLabel}: ${amount}`)
  } else {
    const amount = moneyOf(summary.totals)
    if (amount) parts.push(amount)
  }
  const excluded = summary.excluded?.count ?? 0
  return (
    <p
      className="flex flex-wrap items-baseline gap-x-1.5 px-1 text-[0.75rem] text-muted-foreground"
      aria-live="polite"
    >
      <span className="font-semibold tabular-nums text-foreground/85">{parts.join(" · ")}</span>
      {excluded > 0 && (
        <span className="tabular-nums" title={t("selfService.tile.excludedHint")}>
          · {t("selfService.tile.excluded", { n: excluded })}
          <span className="sr-only"> — {t("selfService.tile.excludedHint")}</span>
        </span>
      )}
      <SuspectNote items={suspect} />
    </p>
  )
}
