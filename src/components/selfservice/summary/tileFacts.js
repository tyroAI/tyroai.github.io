import { upcomingLeave } from "@/lib/selfServiceAlerts"
import { inYear } from "@/lib/selfServiceModel"
import { leaveReport } from "@/lib/selfServiceReport"
import { countsInTotals, STATUS_ORDER } from "@/lib/selfServiceStatus"
import { totalsList } from "../kinds"

/** Ayrıntıda gösterilen izin türü sayısı (raporun "Türe göre" sırasıyla, en büyükler). */
const TOP_TYPES = 3

/**
 * Para kutusunun ayrıntısı — `summarize`ın dönem özetinden (toplam kuralı aynı): toplama
 * girenlerin para birimine göre toplamı, toplama giren durum kategorilerinin sayısı, toplam
 * dışı sayı ve dönemin en yeni kaydı. Durumu boş kayıt (`none`) "Diğer"e katılır.
 */
function moneyFacts(part, records) {
  const by = part?.byStatus ?? {}
  const statuses = STATUS_ORDER.filter(countsInTotals)
    .map((key) => ({ key, count: (by[key] ?? 0) + (key === "other" ? (by.none ?? 0) : 0) }))
    .filter((s) => s.count)
  const latest = records.reduce((a, r) => (!a || (r.date ?? 0) > (a.date ?? 0) ? r : a), null)
  return {
    all: part?.all ?? 0,
    totals: totalsList(part?.totals),
    statuses,
    excluded: part?.excluded?.count ?? 0,
    latest,
  }
}

/**
 * Özet kutularının hover/çekmece ayrıntısı (saf). Girdi: adlı veri, `summarize(data, year)`
 * ve dönem. İzin: sıradaki izin (`upcomingLeave`, uyarıyla aynı kural) ve dönemin türe göre
 * ilk üçü (`leaveReport`, raporla aynı kırılım); bakiye ve hak ediş çağıranda.
 */
export function tileFacts(data, summary, year, now = new Date()) {
  return {
    leave: {
      next: upcomingLeave(data?.leaves, now),
      types: leaveReport(data?.leaves, year)
        .byType.rows.filter((r) => r.count)
        .slice(0, TOP_TYPES),
    },
    expense: moneyFacts(summary?.expense, inYear(data?.expenses ?? [], year)),
    advance: moneyFacts(summary?.advance, inYear(data?.advances ?? [], year)),
  }
}
