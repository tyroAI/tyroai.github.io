import {
  ADVANCE_EXTRAS,
  dateOnly,
  extrasOf,
  HEADER_EXTRAS,
  label,
  LEAVE_EXTRAS,
  LINE_EXTRAS,
  toNumber,
} from "@/lib/selfServiceFields"
import { expenseCategoryName, leaveTypeCode, purposeKeyOf } from "@/lib/selfServiceNames"
import { foldText, statusKind } from "@/lib/selfServiceStatus"

/**
 * Self Servis — ERP satırlarını ekrana çeviren SAF işlevler (izin, izin bakiyesi, masraf, iş
 * avansı, çalışan). Kaynak: İK ortamının Dataverse'ündeki F&O sanal tabloları (`mserp_*`),
 * sorgular `lib/selfServiceApi.js`te, alan okuma `lib/selfServiceFields.js`te.
 */

export { dateOnly, label, toNumber } from "@/lib/selfServiceFields"
export { statusTone } from "@/lib/selfServiceStatus"

/**
 * İzin satırının durum alanı. tyraHR'de ve İK MCP'sinde izin tablosunda durum kolonu görülmedi;
 * doğrulanmış bir alan bulunana dek izinde durum YOK (adında "status" geçen herhangi bir
 * kolonu almak, Dataverse'ün `statuscode`/`statecode` sistem alanlarını durum sanmaktı).
 */
const LEAVE_STATUS_FIELD = null

/** İzin bakiyesi satırı → `{ claim, used, remain }` (gün). */
export function toBalance(row) {
  if (!row) return null
  return {
    claim: toNumber(row.mserp_allowanceyearlyclaimday),
    used: toNumber(row.mserp_allowanceyearlyusedday),
    remain: toNumber(row.mserp_allowanceyearlyremainday),
  }
}

/** ERP adları BÜYÜK harfle gelir; Türkçe kuralla baş harfler büyük. */
function titleCase(raw) {
  return String(raw ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr") + w.slice(1).toLocaleLowerCase("tr"))
    .join(" ")
}

/**
 * Çalışan satırı → `{ alias, personnel, name?, title?, position?, workerNumber? }`. Ad, unvan ve
 * görev profil başlığında yalnız Graph'ta boş kalırsa kullanılır.
 */
export function toWorker(row, alias) {
  const personnel = String(row?.mserp_borax_oldemplid ?? "").trim()
  if (!personnel) return null
  const worker = { alias, personnel }
  const name = titleCase(row.mserp_dirperson_name)
  if (name) worker.name = name
  const title = String(row.mserp_hcm_titleid ?? "").trim()
  if (title) worker.title = title
  const position = String(row.mserp_position_description ?? "").trim()
  if (position) worker.position = position
  const number = String(row.mserp_hcmworker_personnelnumber ?? "").trim()
  if (number) worker.workerNumber = number
  return worker
}

/** Satırın Dataverse birincil anahtarı (`…id` ile biten GUID alanı) — sohbet bağlantısı için. */
function rowId(row, entity) {
  return (
    row?.[`${entity}id`] ??
    Object.entries(row ?? {}).find(
      ([k, v]) => /id$/.test(k) && /^[0-9a-f-]{36}$/i.test(String(v)),
    )?.[1] ??
    null
  )
}

export function toLeave(row) {
  const start = dateOnly(row.mserp_startdate)
  const end = dateOnly(row.mserp_enddate) ?? start
  const type = label(row, "mserp_allowancetypeid")
  const days = toNumber(row.mserp_noofdays)
  const status = LEAVE_STATUS_FIELD ? label(row, LEAVE_STATUS_FIELD) : ""
  // Saat yalnız gün altı izinde anlamlı; tam günlük izinde vardiya saatleri gürültü.
  const extra = extrasOf(row, LEAVE_EXTRAS).filter(
    (x) => x.kind !== "time" || days == null || days < 1,
  )
  return {
    kind: "leave",
    id:
      rowId(row, "mserp_boraxallowancetransselfserviceentity") ??
      `${row.mserp_startdate}-${row.mserp_allowancetypeid}`,
    type,
    typeCode: leaveTypeCode(type),
    start,
    end,
    days,
    hours: toNumber(row.mserp_noofhours),
    description: label(row, "mserp_description"),
    status,
    statusKind: statusKind(status),
    extra,
    date: start,
  }
}

export function toAdvance(row) {
  const currency = label(row, "mserp_currency") || "TRY"
  const status = label(row, "mserp_cashadvancestatus")
  const purpose = label(row, "mserp_purpose")
  return {
    kind: "advance",
    id: String(row.mserp_cashadvancenumber ?? ""),
    number: String(row.mserp_cashadvancenumber ?? ""),
    date: dateOnly(row.mserp_requesteddate),
    purpose,
    purposeKey: purposeKeyOf(purpose),
    location: label(row, "mserp_location"),
    amount: toNumber(row.mserp_requestedamount),
    currency,
    note: label(row, "mserp_note"),
    status,
    statusKind: statusKind(status),
    extra: extrasOf(row, ADVANCE_EXTRAS, { currency }),
  }
}

const same = (a, b) => a != null && b != null && Math.abs(a - b) < 0.005

/** Kalemin ek alanları; şirket para birimi tutarı satır tutarıyla aynıysa kur ve karşılık gürültü. */
function lineExtras(row, amount) {
  const extra = extrasOf(row, LINE_EXTRAS)
  const mst = extra.find((x) => x.key === "amountMst")?.value
  const domestic = mst == null ? false : same(mst, amount)
  return extra.filter((x) => {
    if (x.key === "amountMst") return !domestic
    if (x.key === "exchangeRate") return !domestic && x.value !== 1
    if (x.key === "amountReporting") return !same(x.value, amount) && !same(x.value, mst)
    return true
  })
}

function toLine(row, number, index) {
  const amount = toNumber(row.mserp_amount)
  const category = label(row, "mserp_costtype")
  const order = toNumber(row.mserp_employeexpensetrans_recid)
  return {
    id: order != null ? String(order) : `${number}#${index}`,
    order,
    date: dateOnly(row.mserp_transdate),
    category,
    categoryName: expenseCategoryName(category),
    amount,
    currency: label(row, "mserp_currency") || "TRY",
    explanation: label(row, "mserp_explanation"),
    company: label(row, "mserp_referencedataareaid"),
    extra: lineExtras(row, amount),
  }
}

// Kalemler tarihe göre; aynı günde ERP'ye giriş sırası (RecId).
const byDate = (a, b) =>
  (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity) ||
  (a.order ?? Infinity) - (b.order ?? Infinity)

const unique = (list) => [...new Set(list.filter(Boolean))]

/**
 * Masraf SATIRLARI → masraf RAPORLARI (aynı `mserp_expnumber`). Ekranın birimi rapor: durum ve
 * başlık alanları rapora ait (`headers`: no. → başlık satırı; eski biçim no. → durum metni da
 * olur), kalemler ayrıntıda. Para birimi karışıksa rapor toplamı para birimine göre ayrı.
 */
export function toExpenses(rows, headers = {}) {
  const reports = new Map()
  for (const row of rows ?? []) {
    const number = String(row.mserp_expnumber ?? "")
    if (!number) continue
    const report = reports.get(number) ?? { kind: "expense", id: number, number, lines: [] }
    report.lines.push(toLine(row, number, report.lines.length))
    reports.set(number, report)
  }
  return [...reports.values()].map((r) => {
    const lines = r.lines.sort(byDate)
    const dates = lines.map((l) => l.date).filter(Boolean)
    const head = headers[r.number]
    const status = typeof head === "string" ? head : head ? label(head, "mserp_workflowstatus") : ""
    return {
      ...r,
      lines,
      date: dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null,
      categories: unique(lines.map((l) => l.category)),
      categoryNames: unique(lines.map((l) => l.categoryName)),
      company: lines.find((l) => l.company)?.company ?? "",
      totals: sumByCurrency(lines),
      status,
      statusKind: statusKind(status),
      extra: head && typeof head === "object" ? extrasOf(head, HEADER_EXTRAS) : [],
    }
  })
}

/** `[{ amount, currency }]` → `{ TRY: 1200, USD: 50 }`. */
export function sumByCurrency(items) {
  const out = {}
  for (const it of items ?? []) {
    if (it.amount == null) continue
    out[it.currency] = (out[it.currency] ?? 0) + it.amount
  }
  return out
}

/** Bir yılın kayıtları (`date`e göre). `year == null` → hepsi. */
export function inYear(records, year) {
  return year == null ? records : records.filter((r) => r.date?.getFullYear() === year)
}

/** Kayıtların yılları, yeniden eskiye (yıl seçicisi). */
export function yearsOf(...lists) {
  const set = new Set()
  for (const list of lists) for (const r of list ?? []) if (r.date) set.add(r.date.getFullYear())
  return [...set].sort((a, b) => b - a)
}

/** Ay anahtarı "2026-03" (adresteki `m` süzgeci ve aylık gruplar). */
export function monthKey(date) {
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : ""
}

/** Aylara göre gruplama — liste başlıkları. Tarihsiz kayıtlar sonda. */
export function groupByMonth(records) {
  const groups = new Map()
  for (const r of records) {
    const key = monthKey(r.date) || "none"
    if (!groups.has(key)) groups.set(key, { key, date: r.date, items: [] })
    groups.get(key).items.push(r)
  }
  return [...groups.values()].sort((a, b) =>
    a.key === "none" ? 1 : b.key === "none" ? -1 : b.key.localeCompare(a.key),
  )
}

/** Kaydın aranan metinleri: kodlar, adlar, durum, kalemlerin açıklama ve metin ek alanları. */
function haystack(r) {
  const extras = (list) =>
    (list ?? []).filter((x) => typeof x.value === "string" && !x.i18n).map((x) => x.value)
  return [
    r.number,
    r.type,
    r.typeCode,
    r.typeName,
    r.description,
    r.purpose,
    r.purposeName,
    r.location,
    r.note,
    r.status,
    r.statusName,
    ...(r.categories ?? []),
    ...(r.categoryNames ?? []),
    ...extras(r.extra),
    ...(r.lines ?? []).flatMap((l) => [l.explanation, l.company, ...extras(l.extra)]),
  ]
}

/** Arama: kaydın görünen metinlerinde; büyük/küçük harf ve aksan duyarsız ("yillik" → "Yıllık"). */
export function matches(record, query) {
  const q = foldText(query)
  if (!q) return true
  return foldText(haystack(record).filter(Boolean).join(" \u0001 ")).includes(q)
}

/** Kaydın kalıcı anahtarı (`leave:…`, `expense:HRMS-062202`). */
export const recordKey = (r) => `${r.kind}:${r.id}`

/**
 * Önceki yüklemede OLMAYAN kayıtların anahtarları — yeni talep ERP'ye yansıyınca "Yeni" rozeti.
 * Önceki yükleme yoksa ya da bölüm okunamamışsa (null) o bölümde hiçbir şey "yeni" sayılmaz.
 */
export function newRecordKeys(prev, next) {
  const out = new Set()
  for (const part of ["leaves", "expenses", "advances"]) {
    if (!prev?.[part] || !next?.[part]) continue
    const seen = new Set(prev[part].map(recordKey))
    for (const r of next[part]) if (!seen.has(recordKey(r))) out.add(recordKey(r))
  }
  return out
}
