import { extraValue } from "@/lib/selfServiceFields"
import { statusText } from "@/lib/selfServiceStatus"

/**
 * Self Servis — süzülmüş listenin CSV'si (saf, istemcide). Excel uyumu: UTF-8 BOM (Türkçe harfler
 * bozulmasın), ";" ayraç ve virgüllü ondalık (TR Excel'inin beklediği), satır sonu CRLF, ISO
 * tarih. Masrafta her satır bir KALEM (rapor no. ve durum tekrar eder). Başlıklar dört dilde
 * (`selfService.field.*`). Metin hücresi "=", "+", "-", "@" ile başlıyorsa önüne "'" konur:
 * ERP'deki açıklama Excel'de formül olarak çalışmasın.
 */

const BOM = "\uFEFF"

const iso = (d) =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    : ""

function cell(value) {
  if (value == null) return ""
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value).replace(".", ",") : ""
  if (value instanceof Date) return iso(value)
  let s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[;"\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s
}

/** Satırlar (dizi dizisi) → CSV metni (BOM'lu). */
export function toCsv(rows) {
  return BOM + rows.map((row) => row.map(cell).join(";")).join("\r\n") + "\r\n"
}

const COLUMNS = {
  leave: ["type", "code", "start", "end", "days", "hours", "description"],
  expense: [
    "number",
    "status",
    "lineDate",
    "category",
    "description",
    "amount",
    "currency",
    "company",
    "vendor",
    "receipt",
    "costCenter",
    "amountMst",
    "exchangeRate",
  ],
  advance: [
    "number",
    "requested",
    "purpose",
    "location",
    "amount",
    "currency",
    "status",
    "note",
    "paymentMode",
    "documented",
    "balance",
  ],
}

const enumText = (list, key, t) => {
  const item = list?.find((x) => x.key === key)
  return item ? (item.i18n ? t(item.i18n) : item.value) : ""
}

function rowsOf(tab, r, t) {
  const status = r.status ? (r.statusName ?? statusText(r.status, t)) : ""
  if (tab === "leave")
    return [[r.typeName || r.type, r.typeCode, r.start, r.end, r.days, r.hours, r.description]]
  if (tab === "advance") {
    return [
      [
        r.number,
        r.date,
        r.purposeName || r.purpose,
        r.location,
        r.amount,
        r.currency,
        status,
        r.note,
        enumText(r.extra, "paymentMode", t),
        enumText(r.extra, "documented", t),
        extraValue(r.extra, "balance"),
      ],
    ]
  }
  return (r.lines ?? []).map((l) => [
    r.number,
    status,
    l.date,
    l.categoryName || l.category,
    l.explanation,
    l.amount,
    l.currency,
    l.company,
    extraValue(l.extra, "vendor"),
    extraValue(l.extra, "receipt"),
    extraValue(l.extra, "costCenter"),
    extraValue(l.extra, "amountMst"),
    extraValue(l.extra, "exchangeRate"),
  ])
}

/** Sekmenin CSV satırları: başlık + kayıtlar (masrafta kalemler). Kayıtlar `withNames`ten geçmiş. */
export function csvRows(tab, records, t) {
  const header = COLUMNS[tab].map((key) => t(`selfService.field.${key}`))
  return [header, ...(records ?? []).flatMap((r) => rowsOf(tab, r, t))]
}

/** Sekmenin CSV metni. */
export function csvFor(tab, records, t) {
  return toCsv(csvRows(tab, records, t))
}

/** Dosya adı: "self-servis-masraflar-2026.csv" (dile göre; yıl yoksa "tum-yillar"). */
export function csvFileName(tab, year, t) {
  return t("selfService.csv.fileName", {
    tab: t(`selfService.csv.tab.${tab}`),
    period: year ?? t("selfService.csv.allYears"),
  })
}
