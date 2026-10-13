import { getDateTimeFormat } from "@/lib/intl-cache"

const OPEN_EVERYWHERE = () => true
const TIME = { hour: "2-digit", minute: "2-digit" }
const DAY_TIME = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }

/**
 * Yeni sürümün kayıtlarından çalışan sürümün bilmedikleri (en yeni önce). Kişinin açamadığı
 * sayfayı anlatan ya da oraya götüren kayıt gösterilmez (Yenilikler'in rota kapısıyla aynı).
 */
export function freshNotes(notes, seen, canOpen = OPEN_EVERYWHERE) {
  if (!Array.isArray(notes)) return []
  const known = new Set(Array.isArray(seen) ? seen : [])
  return notes.filter(
    (n) =>
      n?.id &&
      n.title &&
      !known.has(n.id) &&
      (!n.route || canOpen(n.route)) &&
      (!n.to || canOpen(n.to)),
  )
}

/** Derleme zamanı kartta: bugünse yalnız saat, değilse gün + saat. Geçersizse boş. */
export function builtLabel(iso, now, locale) {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ""
  const today = new Date(now).toDateString() === at.toDateString()
  return getDateTimeFormat(locale, today ? TIME : DAY_TIME).format(at)
}
