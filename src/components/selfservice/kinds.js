import Beach02Icon from "@hugeicons/core-free-icons/Beach02Icon"
import CalendarAdd01Icon from "@hugeicons/core-free-icons/CalendarAdd01Icon"
import Invoice03Icon from "@hugeicons/core-free-icons/Invoice03Icon"
import MoneyReceive01Icon from "@hugeicons/core-free-icons/MoneyReceive01Icon"
import { getDateTimeFormat, getNumberFormat, pluralKey } from "@/lib/intl-cache"

/** Sekmeler ve kayıt türleri — sıra ekrandaki sıra. Yeni talep formunun şablonu `lib/requestForm.js`te. */
export const TABS = [
  { id: "leave", data: "leaves", icon: Beach02Icon, cta: CalendarAdd01Icon },
  { id: "expense", data: "expenses", icon: Invoice03Icon, cta: Invoice03Icon },
  { id: "advance", data: "advances", icon: MoneyReceive01Icon, cta: MoneyReceive01Icon },
]
export const tabOf = (id) => TABS.find((t) => t.id === id) ?? TABS[0]

/** Durum tonu → sınıflar. Anlamsal renkler (yeşil/kehribar/kırmızı) sayfadaki durum dilinde. */
export const TONE_CLASS = {
  success: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  danger: "bg-destructive/12 text-red-700 dark:text-red-300",
  neutral: "bg-muted text-foreground/70",
}
export const TONE_DOT = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground/50",
}

export function money(amount, currency, locale) {
  if (amount == null) return "—"
  try {
    return getNumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // ERP'nin para birimi kodu ISO değilse (ör. "TL"): sayı + kod.
    return `${getNumberFormat(locale, { maximumFractionDigits: 2 }).format(amount)} ${currency}`
  }
}

/** Özet kutusunun tutar biçimi: kuruşsuz, milyondan sonra kısaltılmış — dar kutuya sığsın. */
export function moneyShortOptions(amount, currency) {
  const opts = { style: "currency", currency, maximumFractionDigits: 0 }
  if (Math.abs(amount) >= 1e6)
    Object.assign(opts, { notation: "compact", maximumFractionDigits: 1 })
  return opts
}

/** Özet kutusunun tutarı (`moneyShortOptions`). */
export function moneyShort(amount, currency, locale) {
  if (amount == null) return "—"
  try {
    return getNumberFormat(locale, moneyShortOptions(amount, currency)).format(amount)
  } catch {
    return `${getNumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)} ${currency}`
  }
}

/** `{ TRY: 1200, USD: 50 }` → büyükten küçüğe `[[cur, amount]]`; TRY önce. */
export function totalsList(totals) {
  return Object.entries(totals ?? {}).sort(([a, x], [b, y]) =>
    a === "TRY" ? -1 : b === "TRY" ? 1 : y - x,
  )
}

const DAY = { day: "numeric", month: "short", year: "numeric" }
const DAY_NO_YEAR = { day: "numeric", month: "short" }
export const MONTH = { month: "long", year: "numeric" }

export function day(date, locale, withYear = true) {
  return date ? getDateTimeFormat(locale, withYear ? DAY : DAY_NO_YEAR).format(date) : "—"
}

/** "12–16 Eki 2026" gibi aralık; tek günse tek tarih. */
export function range(start, end, locale) {
  if (!start) return "—"
  if (!end || end.getTime() === start.getTime()) return day(start, locale)
  const fmt = getDateTimeFormat(locale, DAY)
  return typeof fmt.formatRange === "function"
    ? fmt.formatRange(start, end)
    : `${day(start, locale)} – ${day(end, locale)}`
}

export function number(value, locale) {
  return value == null ? "—" : getNumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

/**
 * Sayıya göre çoğul biçimli metin ("1 day" · "2 days"; Arapçada altı biçim): `base.one`,
 * `base.other`… (`Intl.PluralRules`); `{n}` yerel rakamla.
 */
export const countText = (t, locale, base, count, vars) =>
  t(pluralKey(base, locale, count), { ...vars, n: number(count, locale) })
