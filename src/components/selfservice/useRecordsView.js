import { useMemo } from "react"
import {
  applyFilters,
  facetLineTotals,
  facetOptions,
  filteredSummary,
  monthOptions,
  statusOptions,
} from "@/lib/selfServiceFilters"
import { groupByMonth, inYear } from "@/lib/selfServiceModel"
import { validFilters } from "@/lib/selfServiceParams"
import { reportFor, summarize } from "@/lib/selfServiceReport"
import { tabOf } from "./kinds"

/**
 * "Bilgilerim" görünümünün türetilmiş verisi — hepsi bellekte tutulur (sıcak yol: yazarken
 * yalnız arama değişir). Girdi: adlı veri (`withNames`), adresteki seçimler (`readParams`) ve
 * yerel arama. Dönüş:
 *
 *   periodRecords  sekmenin seçili dönemdeki kayıtları (çipler ve seçiciler bunlardan)
 *   filters        geçerli süzgeçler { status, facet, month } (geçersiz → null = Tümü)
 *   shown, groups  süzülmüş liste ve aylık grupları
 *   listSummary    süzülmüş listenin özeti (`filteredSummary`; masrafta kategori süzgeci
 *                  açıkken `facet` = uyan kalemlerin toplamı, `facetLineTotals`)
 *   statusOptions · facetOptions · monthOptions   çip ve seçici seçenekleri (sayılarıyla);
 *                  durum çiplerinin sayısı öteki süzgeçlere ve aramaya uyanlardan (`statusTotal`)
 *   summary        özet kutuları (`summarize`, dönem)
 *   report         raporun kırılımları (`reportFor`, dönem; liste süzgeçlerinden bağımsız)
 *   failed         sekmenin bölümü okunamadı
 *   statusUnknown  masraf raporlarının (bir kısmının) durumu okunamadı: toplam kuralı uygulanamaz
 *   truncated      geçmiş sınıra vardı ve seçili dönem en eski yılı kapsıyor: liste eksik olabilir
 */
export function useRecordsView({ data, sel, query }) {
  const { tab, year, status, facet, month } = sel
  const all = data?.[tabOf(tab).data] ?? null
  const periodRecords = useMemo(() => (all ? inYear(all, year) : []), [all, year])
  const filters = useMemo(
    () => validFilters({ status, facet, month }, periodRecords, year),
    [status, facet, month, periodRecords, year],
  )
  const shown = useMemo(
    () => applyFilters(periodRecords, { ...filters, query }),
    [periodRecords, filters, query],
  )
  const groups = useMemo(() => groupByMonth(shown), [shown])
  const listSummary = useMemo(() => {
    const out = filteredSummary(shown)
    // Masrafta kategori süzgeci: tutar raporun değil uyan kalemlerin toplamı.
    if (tab === "expense" && filters.facet) out.facet = facetLineTotals(shown, filters.facet)
    return out
  }, [shown, tab, filters.facet])
  // Durum çipleri dönemde bulunan kategorilerdir (seçim kaybolmasın); sayıları ise öteki süzgeç
  // ve aramayla daralmış listeden: "Tamamlandı 2"ye basınca boş liste çıkmasın.
  const narrowed = useMemo(
    () => applyFilters(periodRecords, { ...filters, status: null, query }),
    [periodRecords, filters, query],
  )
  const options = useMemo(() => {
    const counts = new Map(statusOptions(narrowed).map((o) => [o.id, o.count]))
    return {
      statusOptions: statusOptions(periodRecords).map((o) => ({
        ...o,
        count: counts.get(o.id) ?? 0,
      })),
      statusTotal: narrowed.length,
      facetOptions: facetOptions(periodRecords),
      monthOptions: monthOptions(periodRecords),
    }
  }, [periodRecords, narrowed])
  const summary = useMemo(() => (data ? summarize(data, year) : null), [data, year])
  const report = useMemo(() => (data ? reportFor(tab, data, year) : null), [data, tab, year])
  const section = tabOf(tab).data
  const truncated = useMemo(() => {
    if (!data?.truncated?.includes(section)) return false
    const years = (all ?? []).map((r) => r.date?.getFullYear()).filter((y) => y != null)
    return year == null || !years.length || year <= Math.min(...years)
  }, [data, section, all, year])
  return {
    failed: Boolean(data?.failed?.includes(section)),
    statusUnknown: tab === "expense" && Boolean(data?.failed?.includes("expenseStatus")),
    truncated,
    periodRecords,
    filters,
    shown,
    groups,
    listSummary,
    ...options,
    summary,
    report,
  }
}
