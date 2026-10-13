/**
 * Arama katlaması — Türkçe duyarsız eşleşme.
 *
 * Aranan şey bir ad listesi: klavyesinde Türkçe olmayan ya da acelesi olan
 * kullanıcı "gorunum" yazar ve "görünüm"ü bulamazsa arama işe yaramaz.
 * Aksanlar ve ı/ğ/ü/ş/ö/ç düşürülür.
 *
 * ⚠️ `toLocaleLowerCase("tr")` ŞART, düz `toLowerCase()` DEĞİL: Türkçede
 * "I" küçüğü "ı", "İ" küçüğü "i". Düz sürüm "İZİN"i "i̇zin" yapar ve
 * "izin" aramasıyla eşleşmez. Bu deponun bir kez ödediği ders (bkz.
 * CLAUDE.md › "Sayfa içi arama — ve neden toLowerCase() yetmiyordu").
 *
 * ⚠️ `entryText.js` (Yenilikler) ve güvenlik panelleri AYNI fonksiyonu
 * okur — iki ekranın araması aynı davranmalı.
 */
const FOLD = { ı: "i", ğ: "g", ü: "u", ş: "s", ö: "o", ç: "c", â: "a", î: "i", û: "u" }

export function fold(text) {
  return String(text ?? "")
    .toLocaleLowerCase("tr")
    .replace(/[ığüşöçâîû]/g, (ch) => FOLD[ch])
    .trim()
}
