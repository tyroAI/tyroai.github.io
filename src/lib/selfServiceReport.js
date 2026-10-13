import { inYear, monthKey } from "@/lib/selfServiceModel"
import { isAbsence } from "@/lib/selfServiceNames"
import { countsInTotals, STATUS_ORDER, statusKind } from "@/lib/selfServiceStatus"

/**
 * Self Servis — özet ve rapor (saf). Toplam kuralı tek yerde (`countsInTotals`): gönderilmemiş,
 * reddedilmiş ve iptal edilmiş kayıtlar özet kutularına ve rapor kırılımlarına girmez; yalnız
 * "Duruma göre" kırılımı hepsini gösterir (toplam dışılar işaretli). Rapor seçili DÖNEMİN
 * tamamını özetler — listenin süzgeçlerinden bağımsız.
 */

const kindOf = (r) => r.statusKind ?? statusKind(r.status)

/** Kaydın para tutarları `{ TRY: 1200 }` (masrafta rapor toplamı, avansta talep). İzinde boş. */
export function totalsOf(record) {
  if (record?.kind === "expense") return record.totals ?? {}
  if (record?.kind === "advance" && record.amount != null)
    return { [record.currency || "TRY"]: record.amount }
  return {}
}

/** `into`ya `totals`ı ekler (para birimine göre). */
export function addTotals(into, totals) {
  for (const [cur, amount] of Object.entries(totals ?? {})) into[cur] = (into[cur] ?? 0) + amount
  return into
}

/** Ana para birimi: TRY varsa TRY, yoksa tutarı en büyük olan; hiç yoksa null. */
export function primaryCurrency(totals) {
  const list = Object.entries(totals ?? {})
  if (!list.length) return null
  if ("TRY" in totals) return "TRY"
  return list.sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))[0][0]
}

/**
 * Para kayıtlarının (masraf, avans) özeti: `all` dönemdeki bütün kayıtlar; `count`, `totals`
 * yalnız toplama girenler; `pending` onaydakiler (sayı + tutar); `excluded` toplam dışılar;
 * `byStatus` kategori → sayı (hepsi).
 */
export function moneySummary(records) {
  const out = {
    all: 0,
    count: 0,
    totals: {},
    pending: 0,
    pendingTotals: {},
    excluded: { count: 0, totals: {} },
    byStatus: {},
  }
  for (const r of records ?? []) {
    const kind = kindOf(r)
    out.all += 1
    out.byStatus[kind] = (out.byStatus[kind] ?? 0) + 1
    if (!countsInTotals(kind)) {
      out.excluded.count += 1
      addTotals(out.excluded.totals, totalsOf(r))
      continue
    }
    out.count += 1
    addTotals(out.totals, totalsOf(r))
    if (kind === "pending") {
      out.pending += 1
      addTotals(out.pendingTotals, totalsOf(r))
    }
  }
  return out
}

/**
 * İzinlerin özeti (toplam kuralıyla): bütün türlerin gün ve saati, devamsızlık günleri (Dış
 * Görev, Kart Unutuldu, Evden Çalışma hariç), yıllık izin (TR01) ayrı.
 */
export function leaveSummary(leaves) {
  const out = {
    all: 0,
    count: 0,
    days: 0,
    hours: 0,
    absenceDays: 0,
    annualDays: 0,
    excluded: { count: 0 },
  }
  for (const r of leaves ?? []) {
    out.all += 1
    if (!countsInTotals(r)) {
      out.excluded.count += 1
      continue
    }
    out.count += 1
    out.days += r.days ?? 0
    out.hours += r.hours ?? 0
    if (isAbsence(r)) out.absenceDays += r.days ?? 0
    if (r.typeCode === "TR01") out.annualDays += r.days ?? 0
  }
  return out
}

/**
 * Özet kutularının verisi — seçili dönem (`year`; `null` = tüm yıllar). İzin bakiyesi ERP'nin
 * yıllık bakiyesidir, dönemden bağımsız (`data.balance`).
 */
export function summarize(data, year = null) {
  const { leaves, expenses, advances } = data ?? {}
  return {
    year,
    leave: leaveSummary(inYear(leaves ?? [], year)),
    expense: moneySummary(inYear(expenses ?? [], year)),
    advance: moneySummary(inYear(advances ?? [], year)),
  }
}

/**
 * Satırları çubuk listesine çevirir: `value` çubuğun boyu, `share` en büyüğe oranı (0–1).
 * Para kırılımında `value` ana para birimindeki tutar; öteki birimler `totals`ta (metin).
 */
function finish(rows, { money }) {
  const totals = {}
  if (money) for (const r of rows) addTotals(totals, r.totals)
  const currency = money ? primaryCurrency(totals) : null
  for (const r of rows) if (money) r.value = currency ? (r.totals[currency] ?? 0) : 0
  const max = Math.max(0, ...rows.map((r) => Math.abs(r.value)))
  for (const r of rows) r.share = max ? Math.abs(r.value) / max : 0
  return { rows, currency, totals, value: rows.reduce((n, r) => n + r.value, 0) }
}

const byValue = (a, b) =>
  Math.abs(b.value) - Math.abs(a.value) ||
  b.count - a.count ||
  String(a.label).localeCompare(String(b.label), "tr")

/**
 * Genel kırılım: `keyOf(item)` → satır; `labelOf` görünen ad; para için `totalsOf`, gün gibi
 * sayı için `valueOf`. Dönüş `{ rows: [{ key, label, count, value, totals, share }], currency,
 * totals, value }` — satırlar büyükten küçüğe.
 */
export function breakdown(items, { keyOf, labelOf = keyOf, valueOf, totalsOf: money } = {}) {
  const map = new Map()
  for (const it of items ?? []) {
    const key = String(keyOf(it) ?? "")
    const row = map.get(key) ?? { key, label: labelOf(it) || key, count: 0, value: 0, totals: {} }
    row.count += 1
    if (money) addTotals(row.totals, money(it))
    else row.value += valueOf ? (valueOf(it) ?? 0) : 1
    map.set(key, row)
  }
  // Para satırının boyu ana para birimi seçilince belli olur: sıralama ondan sonra.
  const out = finish([...map.values()], { money: Boolean(money) })
  out.rows.sort(byValue)
  return out
}

/** Zaman kırılımı: yıl seçiliyse o yılın 12 ayı ("2026-01"…), Tümü'nde kayıtların yılları. */
export function byPeriod(records, year, { valueOf, totalsOf: money } = {}) {
  const rows = []
  const index = new Map()
  const add = (key, extra) => {
    const row = { key, count: 0, value: 0, totals: {}, ...extra }
    index.set(key, row)
    rows.push(row)
  }
  if (year != null)
    for (let m = 0; m < 12; m += 1) add(monthKey(new Date(year, m, 1)), { month: m })
  for (const r of records ?? []) {
    if (!r.date) continue
    const key = year != null ? monthKey(r.date) : String(r.date.getFullYear())
    if (!index.has(key)) {
      if (year != null) continue
      add(key, { year: r.date.getFullYear() })
    }
    const row = index.get(key)
    row.count += 1
    if (money) addTotals(row.totals, money(r))
    else row.value += valueOf ? (valueOf(r) ?? 0) : 1
  }
  if (year == null) rows.sort((a, b) => a.key.localeCompare(b.key))
  return finish(rows, { money: Boolean(money) })
}

/**
 * "Duruma göre": HER kayıt (toplam dışılar `excluded: true`), kategori sırasıyla. Kırılımın
 * kendi `totals`/`value`'su yine yalnız toplama girenlerden.
 */
export function byStatus(records, { totalsOf: money = totalsOf } = {}) {
  const map = new Map()
  for (const r of records ?? []) {
    const key = kindOf(r)
    const row = map.get(key) ?? { key, count: 0, value: 0, totals: {} }
    row.count += 1
    addTotals(row.totals, money(r))
    map.set(key, row)
  }
  const order = [...STATUS_ORDER, "none"]
  const rows = [...map.values()]
    .map((r) => ({ ...r, excluded: !countsInTotals(r.key) }))
    .sort((a, b) => a.excluded - b.excluded || order.indexOf(a.key) - order.indexOf(b.key))
  const out = finish(rows, { money: true })
  out.totals = {}
  for (const r of rows) if (!r.excluded) addTotals(out.totals, r.totals)
  out.value = rows.reduce((n, r) => n + (r.excluded ? 0 : r.value), 0)
  return out
}

const counted = (records) => (records ?? []).filter((r) => countsInTotals(r))
const linesOf = (reports) =>
  reports.flatMap((r) => (r.lines ?? []).map((l) => ({ ...l, report: r.number })))
const lineTotals = (l) => (l.amount == null ? {} : { [l.currency || "TRY"]: l.amount })

/** Masraf kalemlerinin kategoriye göre kırılımı (kalem düzeyi; rapor ayrıntısında da kullanılır). */
export function byCategory(lines) {
  const out = breakdown(lines, {
    keyOf: (l) => l.category,
    labelOf: (l) => l.categoryName || l.category,
    totalsOf: lineTotals,
  })
  for (const row of out.rows) {
    row.reports = new Set(
      lines.filter((l) => String(l.category ?? "") === row.key).map((l) => l.report),
    ).size
  }
  return out
}

/** İzin raporu: türe göre (gün, saat, kayıt) ve zamana göre (gün; yalnız saatlik ayda saat). */
export function leaveReport(leaves, year = null) {
  const list = counted(inYear(leaves ?? [], year))
  const byType = breakdown(list, {
    keyOf: (r) => r.typeCode || r.type,
    labelOf: (r) => r.typeName || r.type,
    valueOf: (r) => r.days ?? 0,
  })
  for (const row of byType.rows) {
    row.hours = list
      .filter((r) => (r.typeCode || r.type) === row.key)
      .reduce((n, r) => n + (r.hours ?? 0), 0)
  }
  const period = byPeriod(list, year, { valueOf: (r) => r.days ?? 0 })
  const rowOf = new Map(period.rows.map((row) => [row.key, row]))
  for (const r of list) {
    if (!r.date || !r.hours) continue
    const row = rowOf.get(year != null ? monthKey(r.date) : String(r.date.getFullYear()))
    if (row) row.hours = (row.hours ?? 0) + r.hours
  }
  return { byType, byPeriod: period }
}

/** Masraf raporu: kategori (kalem), zaman, durum (hepsi), şirket (kalem; birden çoksa göster). */
export function expenseReport(reports, year = null) {
  const all = inYear(reports ?? [], year)
  const list = counted(all)
  const lines = linesOf(list)
  return {
    byCategory: byCategory(lines),
    byPeriod: byPeriod(list, year, { totalsOf }),
    byStatus: byStatus(all),
    byCompany: breakdown(lines, { keyOf: (l) => l.company, totalsOf: lineTotals }),
  }
}

/** Avans raporu: amaç (tür), zaman, durum (hepsi), gidilecek yer. */
export function advanceReport(advances, year = null) {
  const all = inYear(advances ?? [], year)
  const list = counted(all)
  return {
    byPurpose: breakdown(list, {
      keyOf: (r) => r.purposeKey || r.purpose,
      labelOf: (r) => r.purposeName || r.purpose,
      totalsOf,
    }),
    byPeriod: byPeriod(list, year, { totalsOf }),
    byStatus: byStatus(all),
    byLocation: breakdown(list, { keyOf: (r) => r.location, totalsOf }),
  }
}

/** Sekmenin raporu — `tab`: leave · expense · advance. */
export function reportFor(tab, data, year = null) {
  if (tab === "leave") return leaveReport(data?.leaves, year)
  if (tab === "expense") return expenseReport(data?.expenses, year)
  return advanceReport(data?.advances, year)
}
