import { facetOptions, validStatus } from "@/lib/selfServiceFilters"
import { foldText } from "@/lib/selfServiceStatus"

/**
 * Self Servis — adresteki seçimler (saf). Sohbetten gelen bağlantı ve geri tuşu aynı görünümü
 * açsın diye her seçim adreste:
 *
 *   view   me (varsayılan) · team            görünüm (Bilgilerim · Ekibim)
 *   tab    leave (varsayılan) · expense · advance
 *   year   2026 · all                        dönem; yoksa bu yıl (kayıt yoksa en yeni yıl)
 *   status pending · draft · …              durum kategorisi
 *   f      TR01 · "y.içi konaklama" · fair   sekmeye göre tür: izin türü · masraf kategorisi · avans türü
 *   m      2026-03                           ay
 *   ref    HRMS-062202 · kayıt kimliği       açık kaydın ayrıntısı
 *
 * Sıfırlama: sekme değişince `status`, `f`, `m` (ve `ref`); dönem değişince `m`. Geçersiz
 * değer (bu sekmede ve dönemde bulunmayan durum ya da tür, dönem dışı ay) "Tümü" sayılır.
 */

export const TAB_IDS = ["leave", "expense", "advance"]
export const VIEW_IDS = ["me", "team"]
export const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/

const tabOrDefault = (v) => (TAB_IDS.includes(v) ? v : TAB_IDS[0])

/** Yıl seçicisinin varsayılanı: bu yılın kaydı varsa bu yıl, yoksa en yeni yıl. */
export function defaultYear(years, thisYear) {
  return years?.includes(thisYear) ? thisYear : (years?.[0] ?? thisYear)
}

/**
 * Adres → ham seçimler `{ view, tab, ref, year, status, facet, month }`. `year`: sayı ya da
 * null (Tümü). Durum, tür ve ay burada yalnız biçimce okunur; kayıtlara göre geçerlilik
 * `validFilters`ta.
 */
export function readParams(params, { years = [], thisYear = new Date().getFullYear() } = {}) {
  const get = (k) => params.get(k) || null
  const y = get("year")
  const year =
    y === "all" ? null : y && /^\d{4}$/.test(y) ? Number(y) : defaultYear(years, thisYear)
  const m = get("m")
  return {
    view: get("view") === "team" ? "team" : "me",
    tab: tabOrDefault(get("tab")),
    ref: get("ref"),
    year,
    status: get("status"),
    facet: get("f"),
    month: m && MONTH_RE.test(m) ? m : null,
  }
}

/** Seçim adlarının adresteki karşılığı. */
const KEY = { facet: "f", month: "m" }

/**
 * Değişiklik → yeni `URLSearchParams` (sıfırlama kurallarıyla). `patch` seçim adlarıyla:
 * `{ tab, year, status, facet, month, ref, view }`; `null`/"" siler, `year: null` = Tümü.
 */
export function nextParams(prev, patch) {
  const next = new URLSearchParams(prev)
  const has = (k) => Object.prototype.hasOwnProperty.call(patch, k)
  if (has("tab") && tabOrDefault(patch.tab) !== tabOrDefault(prev.get("tab"))) {
    for (const k of ["status", "f", "m", "ref"]) next.delete(k)
  }
  if (has("year")) {
    const want = patch.year == null ? "all" : String(patch.year)
    if (want !== (prev.get("year") ?? "")) next.delete("m")
  }
  for (const [name, value] of Object.entries(patch)) {
    const key = KEY[name] ?? name
    const v = name === "year" ? (value == null ? "all" : value) : value
    if (v == null || v === "" || (name === "status" && v === "all")) next.delete(key)
    else next.set(key, String(v))
  }
  if (next.get("view") === "me") next.delete("view")
  return next
}

const same = (a, b) => foldText(a) === foldText(b)

/**
 * Kayıtlara göre geçerli süzgeçler: `records` sekmenin SEÇİLİ DÖNEMDEKİ kayıtları. Bulunmayan
 * durum ya da tür ve dönem dışındaki ay `null` (Tümü). Tür, seçenek anahtarına çevrilir
 * (adreste ad ya da farklı yazım gelebilir).
 */
export function validFilters({ status, facet, month } = {}, records = [], year = null) {
  const option = facet
    ? facetOptions(records).find((o) => same(o.key, facet) || same(o.label, facet))
    : null
  const inPeriod = month && (year == null || month.startsWith(`${year}-`))
  return {
    status: validStatus(status, records),
    facet: option?.key ?? null,
    month: inPeriod ? month : null,
  }
}
