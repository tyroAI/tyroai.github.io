import { foldText } from "@/lib/selfServiceStatus"

/**
 * Self Servis — ERP satırından alan okuma (saf). Tablolar F&O'ya bağlı Dataverse'ün sanal
 * tabloları; alan adları tyraHR akışlarında ve İK MCP'sinde (`tyro-hr-mcp`) görüldüğü gibi.
 * Doğrulanmamış adlar ($select'e yazılmaz) yalnız "satırda varsa" okunur: yoksa sessiz geçilir.
 */

export const FV = "@OData.Community.Display.V1.FormattedValue"

/** Seçenek kümesi alanının görünen etiketi; yoksa ham değer. */
export function label(row, field) {
  const formatted = row?.[`${field}${FV}`]
  if (formatted != null && formatted !== "") return String(formatted)
  const raw = row?.[field]
  return raw == null ? "" : String(raw)
}

/**
 * `2026-10-12T00:00:00Z` → yerel takvim günü. `new Date(metin)` UTC okuyup eksi saat farkında
 * günü bir geri kaydırırdı; F&O tarihleri takvim günüdür, metinden okunur.
 */
export function dateOnly(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""))
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  // F&O'nun "boş tarih"i 1900-01-01.
  return d.getFullYear() <= 1900 ? null : d
}

export function toNumber(value) {
  if (value == null || value === "") return null
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."))
  return Number.isFinite(n) ? n : null
}

const YES = new Set(["yes", "evet", "да", "نعم", "true", "1"])
const NO = new Set(["no", "hayir", "нет", "لا", "false", "0"])

/** F&O NoYes: Dataverse'te seçenek (200000001 = Evet, ölçüldü) ya da etiket. Bilinmezse null. */
export function toBool(row, field) {
  const raw = row?.[field]
  if (typeof raw === "boolean") return raw
  if (raw === 200000001) return true
  if (raw === 200000000) return false
  const s = foldText(label(row, field))
  return YES.has(s) ? true : NO.has(s) ? false : null
}

/** Günün saniyesi (28800) → "08:00"; 0 ya da geçersizse null. */
export function timeOfDay(seconds) {
  const n = toNumber(seconds)
  if (n == null || n <= 0 || n >= 86400) return null
  const h = Math.floor(n / 3600)
  const m = Math.floor((n % 3600) / 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Etiketi bilinen değer anahtarına çevirir (katlanmış etikette kalıp geçiyorsa); yoksa metin. */
const pick = (table) => (row, field) => {
  const text = label(row, field).trim()
  if (!text) return null
  const s = foldText(text)
  const key = Object.entries(table).find(([, list]) => list.some((w) => s.includes(w)))?.[0]
  return key
    ? { kind: "enum", value: key, i18n: `selfService.value.${key}` }
    : { kind: "text", value: text }
}

const LOCATION = pick({
  abroad: ["abroad", "foreign", "yurtdisi", "yurt disi", "за руб", "خارج"],
  domestic: ["domestic", "yurtici", "yurt ici", "внутр", "محلي"],
})
const PAYMENT = pick({
  bank: ["bank", "банк", "بنك"],
  cash: ["case", "cash", "kasa", "налич", "نقد"],
})

const text = (kind) => (row, field) => {
  const v = label(row, field).trim()
  return v ? { kind, value: v } : null
}
const number = (keep) => (row, field) => {
  const v = toNumber(row?.[field])
  return v != null && keep(v) ? { value: v } : null
}
const positive = number((v) => v > 0)
// Tek kişilik masrafta "1" bilgi taşımaz.
const several = number((v) => v > 1)
const nonZero = number((v) => v !== 0)
const any = number(() => true)
const date = (row, field) => {
  const v = dateOnly(row?.[field])
  return v ? { value: v } : null
}

/**
 * Ek alan tanımları — sıra ekrandaki sıra. `kind`: text · code · company (şirket kodu) · date ·
 * time ("08:00") · number · money (`currency` ile) · enum (`i18n` değer anahtarıyla) · bool.
 * Etiketler `selfService.field.<key>`. ✓ = tyraHR ya da MCP sorgusunda görüldü; diğerleri
 * F&O varlığındaki adından türetildi (satırda yoksa sessiz geçilir).
 */
export const LINE_EXTRAS = [
  { key: "vendor", field: "mserp_companyname", kind: "text", read: text("text") }, // ✓ MCP
  { key: "receipt", field: "mserp_trydocumentnumber", kind: "code", read: text("code") }, // ✓ MCP
  { key: "costLocation", field: "mserp_trycostlocation", kind: "enum", read: LOCATION },
  { key: "people", field: "mserp_numberofpeople", kind: "number", read: several },
  { key: "costCenter", field: "mserp_trycostcenter", kind: "code", read: text("code") }, // ✓ MCP
  { key: "amountMst", field: "mserp_amountmst", kind: "number", read: nonZero }, // ✓ MCP
  { key: "exchangeRate", field: "mserp_exchangerate", kind: "number", read: positive }, // ✓ MCP
  { key: "amountReporting", field: "mserp_amountreporting", kind: "number", read: nonZero }, // ✓
]

/** Varsayılan finansal boyutlar "IST|SATIS-KURUMSAL|||…": ikinci parça masraf merkezi. */
const dimensionCostCenter = (row, field) => {
  const part = String(row?.[field] ?? "")
    .split("|")[1]
    ?.trim()
  return part ? { value: part } : null
}

export const HEADER_EXTRAS = [
  { key: "reportDate", field: "mserp_transdate", kind: "date", read: date }, // ✓ MCP
  { key: "explanation", field: "mserp_explanation", kind: "text", read: text("text") },
  {
    key: "costCenter",
    field: "mserp_defaultdimensiondisplayvalue", // ✓ MCP
    kind: "code",
    read: dimensionCostCenter,
  },
  { key: "sourceCompany", field: "mserp_sourcecompanyid", kind: "company", read: text("company") },
  { key: "targetCompany", field: "mserp_targetcompanyid", kind: "company", read: text("company") },
]

const undocumented = (row, field) => {
  const v = toBool(row, field)
  if (v == null) return null
  const key = v ? "undocumented" : "documented"
  return { kind: "enum", value: key, i18n: `selfService.value.${key}` }
}

export const ADVANCE_EXTRAS = [
  { key: "paymentMode", field: "mserp_trypaymentmode", kind: "enum", read: PAYMENT },
  { key: "documented", field: "mserp_tryundocumented", kind: "enum", read: undocumented },
  { key: "targetCompany", field: "mserp_targetcompanyid", kind: "company", read: text("company") },
  // Mahsup edilmemiş kalan (F&O TrvCashAdvance.Balance); para birimi avansınki.
  { key: "balance", field: "mserp_balance", kind: "money", read: any },
]

const planned = (row, field) => (toBool(row, field) ? { value: true } : null)
const clock = (row, field) => {
  const v = timeOfDay(row?.[field])
  return v ? { value: v } : null
}

export const LEAVE_EXTRAS = [
  { key: "planned", field: "mserp_isplanned", kind: "bool", read: planned }, // ✓ MCP
  { key: "startTime", field: "mserp_starttime", kind: "time", read: clock }, // ✓ MCP
  { key: "endTime", field: "mserp_endtime", kind: "time", read: clock }, // ✓ MCP
]

/**
 * Satırda BULUNAN ve boş olmayan ek alanlar → `[{ key, kind, value, i18n?, currency? }]`.
 * Alan satırda hiç yoksa (sanal tabloda kolon yoksa) okunmaz; okuma hatası öbür alanları düşürmez.
 */
export function extrasOf(row, specs, { currency } = {}) {
  const out = []
  for (const spec of specs) {
    if (!row || !(spec.field in row)) continue
    let got
    try {
      got = spec.read(row, spec.field)
    } catch {
      got = null
    }
    if (!got || got.value == null || got.value === "") continue
    const item = { key: spec.key, kind: got.kind ?? spec.kind, value: got.value }
    if (got.i18n) item.i18n = got.i18n
    if (item.kind === "money") item.currency = currency ?? null
    out.push(item)
  }
  return out
}

/** `extra` listesinden tek alanın değeri. */
export const extraValue = (list, key) => list?.find((x) => x.key === key)?.value ?? null
