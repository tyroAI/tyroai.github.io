import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// External-URL allowlist. Only http(s) and mailto are safe to render as a link
// or hand to window.open — `javascript:`, `data:`, `vbscript:`, and `file:` can
// execute script in this origin (e.g. when used as an anchor href). The launcher
// app URL field is admin-editable and replicated to all signed-in users via
// Dataverse, so the sanitizer protects against a malicious admin planting a
// stored-XSS payload.
const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"]

// Returns the input as a string if it parses to an allowlisted scheme; "#"
// otherwise. Empty / "#" inputs pass through as "#" so a missing URL renders
// as a no-op link instead of throwing.
//
// Intentionally parses WITHOUT a base — relative paths ("/foo"), fragment-only
// ("#section"), and bare hostnames ("www.example.com") all fail here. That's
// the right behavior for an "external link" admin field: silently rewriting
// "www.example.com" to "<spa-origin>/www.example.com" would produce a
// broken link with no error. Forcing an absolute URL surfaces the typo at
// save time via EntityForm's toast.
export function safeExternalUrl(raw) {
  const s = String(raw ?? "").trim()
  if (!s || s === "#") return "#"
  try {
    const u = new URL(s)
    if (ALLOWED_PROTOCOLS.includes(u.protocol)) return u.toString()
  } catch {
    /* malformed / not absolute — fall through */
  }
  return "#"
}

// True when `raw` is either intentionally blank or parses to an allowlisted
// absolute URL. False when `raw` is non-empty but uses a blocked scheme, is
// malformed, or is a relative URL — caller (form validation) should reject.
export function isAllowedUrl(raw) {
  const s = String(raw ?? "").trim()
  if (!s || s === "#") return true
  try {
    const u = new URL(s)
    return ALLOWED_PROTOCOLS.includes(u.protocol)
  } catch {
    return false
  }
}

/**
 * Türkçe katlama — aramanın ortak gerçeği.
 *
 * ASLA düz `toLowerCase()` kullanma: locale'siz küçültme İ'yi "i" + U+0307
 * yapar (uzunluk değişir, vurgu ofsetleri kayar) ve I→i dönüşümü Türkçe ı'yı
 * kaçırır. `toLocaleLowerCase("tr")` İ→i, I→ı verir; ERP verisi çoğunlukla
 * BÜYÜK geldiği için "ISTANBUL" tr-küçültmede "ıstanbul" olur ve "istanbul"
 * yazan kullanıcıyı kaçırırdı — ı→i katlaması ikisini birleştirir. Her iki
 * dönüşüm de 1:1 uzunluk korur; vurgu işaretleme buna güvenir.
 */
export function foldTr(s) {
  return String(s ?? "")
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
}

/**
 * Türkçe harf sırası. `sensitivity: "base"` — büyük/küçük ve aksan farkı
 * sıralamayı bölmesin ("Çelik" ile "çelik" yan yana dursun).
 *
 * Collator modül seviyesinde bir kez kurulur: `localeCompare`'i her
 * karşılaştırmada çağırmak, birkaç yüz satırlık bir listede ölçülebilir bir
 * maliyet — Intl her seferinde yeni bir collator kuruyor.
 */
const trCollator = new Intl.Collator("tr", { sensitivity: "base" })
export const trSort = trCollator.compare
