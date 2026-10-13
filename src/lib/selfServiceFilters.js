import { matches, monthKey } from "@/lib/selfServiceModel"
import { addTotals, totalsOf } from "@/lib/selfServiceReport"
import { countsInTotals, foldText, STATUS_ORDER, statusKind } from "@/lib/selfServiceStatus"

/**
 * Self Servis — liste süzgeçleri (saf). Adresteki karşılıkları: `year` (dönem), `m` (ay,
 * "YYYY-MM"), `status` (durum kategorisi), `f` (sekmeye göre: izin türü · masraf kategorisi ·
 * avans türü); arama yerel. Kayıtlar `withNames`ten geçmiş olmalı (adlarla da eşleşsin).
 */

const kindOf = (r) => r.statusKind ?? statusKind(r.status)
const same = (a, b) => Boolean(a) && foldText(a) === foldText(b)

/** Masraf kalemi kategori süzgecine uyuyor mu (ERP değeri ya da başlık). */
export function lineInFacet(line, facet) {
  if (!facet) return true
  return same(line?.category, facet) || same(line?.categoryName, facet)
}

/**
 * Kayıt tür süzgecine uyuyor mu: izinde tür (kod ya da ad), masrafta en az bir kalemin
 * kategorisi, avansta amaç (anahtar, ERP değeri ya da ad).
 */
export function inFacet(record, facet) {
  if (!facet) return true
  if (record.kind === "expense") return (record.lines ?? []).some((l) => lineInFacet(l, facet))
  const keys =
    record.kind === "leave"
      ? [record.typeCode, record.type, record.typeName]
      : [record.purposeKey, record.purpose, record.purposeName]
  return keys.some((k) => same(k, facet))
}

/**
 * Süzülmüş liste. `year`: sayı ya da null (tüm yıllar) · `month`: "YYYY-MM" · `status`:
 * kategori ("all"/boş = hepsi) · `facet`: tür/kategori · `query`: arama metni.
 */
export function applyFilters(
  records,
  { year = null, month = null, status = null, facet = null, query = "" } = {},
) {
  return (records ?? []).filter(
    (r) =>
      (year == null || r.date?.getFullYear() === year) &&
      (!month || monthKey(r.date) === month) &&
      (!status || status === "all" || kindOf(r) === status) &&
      inFacet(r, facet) &&
      matches(r, query),
  )
}

/** Durum çipleri: bulunan kategoriler, sayılarıyla, sabit sırada (`none` çip değildir). */
export function statusOptions(records) {
  const counts = {}
  for (const r of records ?? []) counts[kindOf(r)] = (counts[kindOf(r)] ?? 0) + 1
  return STATUS_ORDER.filter((id) => counts[id]).map((id) => ({ id, count: counts[id] }))
}

/** Seçili durum bu kayıtlarda yoksa "Tümü"ye düşülür (`null`). */
export function validStatus(status, records) {
  if (!status || status === "all") return null
  return statusOptions(records).some((o) => o.id === status) ? status : null
}

/** Kaydın tür süzgeci değerleri `[{ key, label }]` — masrafta kalemlerin kategorileri. */
export function facetsOf(record) {
  if (record.kind === "expense") {
    const seen = new Map()
    for (const l of record.lines ?? [])
      if (l.category && !seen.has(l.category))
        seen.set(l.category, { key: l.category, label: l.categoryName || l.category })
    return [...seen.values()]
  }
  const key =
    record.kind === "leave" ? record.typeCode || record.type : record.purposeKey || record.purpose
  const label =
    record.kind === "leave" ? record.typeName || record.type : record.purposeName || record.purpose
  return key ? [{ key, label: label || key }] : []
}

/** Tür/kategori seçicisinin seçenekleri `[{ key, label, count }]` — çoktan aza, sonra ada göre. */
export function facetOptions(records) {
  const map = new Map()
  for (const r of records ?? []) {
    for (const f of facetsOf(r)) {
      const row = map.get(f.key) ?? { ...f, count: 0 }
      row.count += 1
      map.set(f.key, row)
    }
  }
  return [...map.values()].sort(
    (a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label), "tr"),
  )
}

/** Ay seçicisinin seçenekleri `[{ key: "2026-03", date, count }]` — yeniden eskiye. */
export function monthOptions(records) {
  const map = new Map()
  for (const r of records ?? []) {
    const key = monthKey(r.date)
    if (!key) continue
    const row = map.get(key) ?? {
      key,
      date: new Date(r.date.getFullYear(), r.date.getMonth(), 1),
      count: 0,
    }
    row.count += 1
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key))
}

/**
 * Süzülmüş listenin başlık özeti ("6 kayıt · ₺12.400 · 1 toplam dışı"): `count` bütün satırlar,
 * `counted`/`totals`/`days` toplama girenler, `excluded` toplam dışılar.
 */
export function filteredSummary(records) {
  const out = {
    count: 0,
    counted: 0,
    totals: {},
    days: 0,
    hours: 0,
    excluded: { count: 0, totals: {} },
  }
  for (const r of records ?? []) {
    out.count += 1
    if (!countsInTotals(r)) {
      out.excluded.count += 1
      addTotals(out.excluded.totals, totalsOf(r))
      continue
    }
    out.counted += 1
    addTotals(out.totals, totalsOf(r))
    out.days += r.days ?? 0
    out.hours += r.hours ?? 0
  }
  return out
}

/**
 * Kategori süzgeci açıkken listenin özeti RAPORUN değil, uyan KALEMLERİN toplamıdır ("Ulaşım
 * (Yurtdışı): $83"): `{ lines, totals }` — yalnız toplama giren raporların kalemleri.
 */
export function facetLineTotals(records, facet) {
  const out = { lines: 0, totals: {} }
  if (!facet) return out
  for (const r of records ?? []) {
    if (r.kind !== "expense" || !countsInTotals(r)) continue
    for (const l of r.lines ?? []) {
      if (!lineInFacet(l, facet) || l.amount == null) continue
      out.lines += 1
      out.totals[l.currency || "TRY"] = (out.totals[l.currency || "TRY"] ?? 0) + l.amount
    }
  }
  return out
}
