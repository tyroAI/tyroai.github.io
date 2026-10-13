// Demo sohbet motorunun küçük yardımcıları: dil, para/tarih biçimi, gecikme.

/** Arayüz dili (`<html lang>`, LocaleProvider yazar) — tr dışı her dil İngilizceye düşer. */
export function uiLang() {
  if (typeof document === "undefined") return "tr"
  return (document.documentElement.lang || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"
}

const TR_CHARS = /[çğıöşüÇĞİÖŞÜ]/
const TR_WORDS =
  /\b(ve|bir|bu|bana|benim|için|ile|mı|mi|mu|mü|nedir|nasıl|göster|hazırla|özetle|yaz|ne|kaç|hangi|var|yok|lütfen|ekibim|bugün|yarın|izin|masraf|teklif|müşteri|toplantı|taslak|tahmin|hedef|olarak|şu|daha)\b/i
const EN_WORDS =
  /\b(the|and|my|me|for|with|what|how|show|prepare|summari[sz]e|draft|write|please|team|today|tomorrow|leave|expense|quote|customer|meeting|forecast|target|which|who|is|are|can|give|list|deal|deals)\b/i

/**
 * Mesajın dili: Türkçe harf ya da sık Türkçe kelime → tr; İngilizce kelime → en;
 * karar verilemezse arayüz dili. Asistan kullanıcının yazdığı dilde cevap verir.
 */
export function detectLang(text) {
  const s = String(text ?? "")
  if (!s.trim()) return uiLang()
  if (TR_CHARS.test(s)) return "tr"
  const tr = TR_WORDS.test(s)
  const en = EN_WORDS.test(s)
  if (en && !tr) return "en"
  if (tr && !en) return "tr"
  return uiLang()
}

/** Seçici: `pick(L, "tr metni", "en text")`. */
export const pick = (L, tr, en) => (L === "tr" ? tr : en)

const locOf = (L) => (L === "tr" ? "tr-TR" : "en-US")

/** Tablo hücresi için tam tutar: `₺9.850.000` / `₺9,850,000` (grafik bunu ayrıştırır). */
export function money(L, n) {
  return `₺${Math.round(n).toLocaleString(locOf(L))}`
}

/** Düzyazı için kısa tutar: `₺9,85 Mn` / `₺9.85M`. */
export function moneyShort(L, n) {
  const abs = Math.abs(n)
  if (abs >= 1e6) {
    const v = (n / 1e6).toLocaleString(locOf(L), { maximumFractionDigits: 2 })
    return L === "tr" ? `₺${v} Mn` : `₺${v}M`
  }
  if (abs >= 1e3) {
    const v = (n / 1e3).toLocaleString(locOf(L), { maximumFractionDigits: 0 })
    return L === "tr" ? `₺${v} B` : `₺${v}K`
  }
  return money(L, n)
}

/** Yüzde: `%27` / `27%`. */
export function pct(L, n, digits = 0) {
  const v = Number(n).toLocaleString(locOf(L), { maximumFractionDigits: digits })
  return L === "tr" ? `%${v}` : `${v}%`
}

export function fmtDate(L, d, opts = { day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat(locOf(L), opts).format(d)
}

export function fmtDay(L, d) {
  return fmtDate(L, d, { weekday: "long", day: "numeric", month: "long" })
}

export function fmtTime(L, d) {
  return new Intl.DateTimeFormat(locOf(L), { hour: "2-digit", minute: "2-digit" }).format(d)
}

/** Bugünden `days` gün sonrası (yerel gece yarısı). */
export function dayFrom(days, base = new Date()) {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d
}

/** İçinde bulunulan çeyrek: etiket, başı, sonu ve geçen oran. */
export function quarterInfo(now = new Date()) {
  const q = Math.floor(now.getMonth() / 3)
  const start = new Date(now.getFullYear(), q * 3, 1)
  const end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59)
  const elapsed = Math.min(1, Math.max(0, (now - start) / (end - start)))
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86_400_000))
  return { label: `Q${q + 1} ${now.getFullYear()}`, q: q + 1, start, end, elapsed, daysLeft }
}

/** Ay kısaltması (`Eki`, `Oct`) — grafik zaman ekseni bu biçimi tanıyor. */
export function monthShort(L, monthOffset, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const s = new Intl.DateTimeFormat(locOf(L), { month: "short" }).format(d)
  return s.replace(".", "")
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** `[min, max)` arası tam sayı. */
export const between = (min, max) => Math.round(min + Math.random() * (max - min))

/** Türkçe-duyarsız arama anahtarı: küçük harf, aksansız, ı→i. */
export function fold(s) {
  return String(s ?? "")
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

/** Metin bu kalıplardan birini içeriyor mu (katlanmış metin üzerinde). */
export function has(foldedText, ...patterns) {
  return patterns.some((p) => p.test(foldedText))
}
