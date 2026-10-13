import { countText, money, number, totalsList } from "../kinds"

/** Kırılım satırının görünen adı: boş anahtar "Belirtilmemiş", durumda kategori adı. */
export function rowLabel(row, t, { status = false } = {}) {
  if (status) return t(`selfService.status.${row.key === "none" ? "other" : row.key}`)
  return row.label || t("selfService.report.unspecified")
}

/**
 * Satırın değerde gösterilen para birimi: ana para biriminde tutarı varsa o, yoksa satırın
 * kendi en büyük tutarı ("Ulaşım (Yurtdışı) $83" — "₺0" yazmak yanlış olurdu).
 */
export function shownCurrency(row, currency) {
  if (currency && row.totals?.[currency]) return currency
  return totalsList(row.totals).find(([, a]) => a)?.[0] ?? currency
}

/** Satırın değeri: gün ("12 gün", gün yoksa saat) ya da tutar (`shownCurrency`). */
export function rowValue(row, kind, currency, t, locale) {
  if (kind === "days") {
    if (row.value) return countText(t, locale, "selfService.days", row.value)
    if (row.hours) return t("selfService.hours", { n: number(row.hours, locale) })
    return countText(t, locale, "selfService.days", 0)
  }
  if (kind === "count") return countText(t, locale, "selfService.list.count", row.count)
  const cur = shownCurrency(row, currency)
  return cur ? money(row.totals?.[cur] ?? 0, cur, locale) : "—"
}

/** Değerde gösterilmeyen öteki para birimleri ("€80 · $50"); yoksa "". */
export function otherMoney(row, currency, locale) {
  const cur = shownCurrency(row, currency)
  return totalsList(row.totals)
    .filter(([c, a]) => c !== cur && a)
    .map(([c, a]) => money(a, c, locale))
    .join(" · ")
}
