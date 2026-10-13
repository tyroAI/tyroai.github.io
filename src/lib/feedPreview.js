/**
 * Kartın özeti: Graph `bodyPreview` (ilk ~255 karakter) bülten çöpünden ayıklanır —
 * "Tarayıcıda görüntüle", dış gönderen uyarıları, ayraç çizgileri, konunun tekrarı.
 * Anlamlı bir şey kalmazsa boş döner: kart yalnız başlığı gösterir.
 * ⚠️ `\b` Türkçe harflerde güvenilmez ("aç" gibi ASCII dışı harfle biten sözcükte sınır
 * oluşmaz); kalıpların sonu açık önden-bakışla (`END`). `i` bayrağı "İ"yi "i"ye eşlemez:
 * Türkçe i'ler sınıfla yazılır (`d[iİ]kkat`).
 */
const END = "(?=$|[\\s.!:,;|)\\]])"
const NOISE = [
  new RegExp(
    `(?:tarayıcı(?:nız)?da|web\\s+sürümünde)\\s+(?:görüntüle(?:yin)?|aç(?:ın)?)${END}`,
    "gi",
  ),
  new RegExp(`(?:bu\\s+)?e-?postayı\\s+görüntüleyemiyorsanız[^.]*\\.?`, "gi"),
  new RegExp(
    `view\\s+(?:this\\s+(?:e-?mail|message)\\s+)?(?:in|on)\\s+(?:your\\s+)?(?:web\\s+)?browser${END}`,
    "gi",
  ),
  /having\s+trouble\s+viewing\s+this\s+(?:e-?mail|message)\??/gi,
  /\[\s*(?:external|harici|dış(?:\s+kaynak)?)\s*\]/gi,
  /(?:caution|d[iİ]kkat|uyar[ıI])\s*:\s*(?:this\s+e-?mail\s+originated\s+from\s+outside|bu\s+e-?posta\s+kuruluşunuzun\s+dışından)[^.]*\.?/gi,
  /[_\-=*~•]{3,}/g,
  /\u00a0/g,
]
const LEADING = /^[\s:.,;\-–—|>•]+/
const MIN_LENGTH = 12

const fold = (s) => s.toLocaleLowerCase("tr-TR")

export function cleanPreview(raw, subject = "") {
  let text = String(raw ?? "")
  for (const re of NOISE) text = text.replace(re, " ")
  text = text.replace(/\s+/g, " ").replace(LEADING, "").trim()
  const subj = String(subject ?? "")
    .replace(/\s+/g, " ")
    .trim()
  if (subj && fold(text).startsWith(fold(subj))) {
    text = text.slice(subj.length).replace(LEADING, "").trim()
  }
  return text.length < MIN_LENGTH ? "" : text
}
