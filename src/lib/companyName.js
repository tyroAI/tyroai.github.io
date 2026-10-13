/**
 * Şirket adının yasal eklerini düzgün yazar (saf, yalnız gösterim). AD ve ERP kayıtları
 * "San.ve Tic. A.ş." gibi gelebiliyor: yalnız bilinen eklerin harfi ve boşluğu düzelir, adın
 * geri kalanına dokunulmaz. Tümü BÜYÜK harfli adda harfler korunur, yalnız boşluk düzelir.
 */

// Önünde harf ya da rakam olmasın ("Hasan." eşleşmesin). Geriye bakış yerine yakalanan önek:
// Safari 16.4'ten eski motorlar geriye bakışta modülü hiç yükleyemiyor.
const START = "(^|[^\\p{L}\\p{N}])"
// Türkçe İ/ı büyük-küçük harf eşleşmesine girmez; sınıfla yakalanır.
const I = "[iİıI]"

// Ek: desen (1. grup önek) ve parçaların düzgün yazımı; parçalar arası `join`.
const SUFFIXES = [
  {
    re: new RegExp(`${START}(san\\.)\\s*(?:(ve)\\s*)?(t${I}c\\.)`, "giu"),
    canon: ["San.", "ve", "Tic."],
  },
  {
    re: new RegExp(`${START}(t${I}c\\.)\\s*(?:(ve)\\s*)?(san\\.)`, "giu"),
    canon: ["Tic.", "ve", "San."],
  },
  { re: new RegExp(`${START}(ltd\\.)\\s*(şt${I}\\.)`, "giu"), canon: ["Ltd.", "Şti."] },
  {
    re: new RegExp(`(^|[^\\p{L}\\p{N}.])(a\\.)\\s*(ş)(\\.?)(?![\\p{L}\\p{N}])`, "giu"),
    canon: ["A.", "Ş", "."],
    join: "",
  },
]

const WORD = /[\p{L}\p{N}]/u

/** "Midea Ticaret San.ve Tic. A.ş." → "Midea Ticaret San. ve Tic. A.Ş." */
export function tidyCompanyName(value) {
  const s = String(value ?? "").trim()
  if (!s) return ""
  const upper = s === s.toLocaleUpperCase("tr")
  return SUFFIXES.reduce(
    (out, { re, canon, join = " " }) =>
      out.replace(re, (...args) => {
        const [match, lead, ...rest] = args
        const offset = rest.at(-2)
        const parts = rest
          .slice(0, -2)
          .map((p, i) => (p ? (upper ? p : canon[i]) : ""))
          .filter(Boolean)
        // Ekten hemen sonra harf geliyorsa ("Tic.A.Ş.") araya tek boşluk.
        const next = rest.at(-1)[offset + match.length]
        return lead + parts.join(join) + (next && WORD.test(next) ? " " : "")
      }),
    s,
  )
}
