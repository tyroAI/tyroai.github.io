const LETTER = /\p{L}/u
const LOWER = /\p{Ll}/u

/**
 * Kişi adını ekranda bağırmayan hâline getirir: "AYŞE NUR KAYA" → "Ayşe Nur Kaya".
 * Yalnız TÜMÜ BÜYÜK kelimeler düzeltilir ("Can DEMİR" → "Can Demir"); karışık yazılmış kelime
 * ("McDonald", "Akın") olduğu gibi kalır. Küçültme Türkçe kuralıyla (I → ı, İ → i), ekranın
 * diliyle değil: bunlar Türkçe adlar. Tire ve kesme işaretinden sonraki harf de büyür.
 */
export function tidyPersonName(raw) {
  return String(raw ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      !LETTER.test(word) || LOWER.test(word)
        ? word
        : word
            .toLocaleLowerCase("tr")
            .replace(/(^|[-'’])(\p{L})/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase("tr")),
    )
    .join(" ")
}
