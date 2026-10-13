/**
 * Asistan adının iki okuması: menüde gösterilen kısa ad ve karşılaştırma anahtarı.
 *
 * Katalogda asistan adı markayla yazılır ("tyraOffice"). Seçici kapalıyken bu tam
 * ad görünür; açık menüde marka ("TYRA") bir kez, grubun başlığı olarak durur ve
 * satırlar onsuz okunur ("Office") — her satırda tekrar etmek adı kalabalıklaştırıyordu.
 * Eski kayıtlar (yetki satırları, talepler, koddaki adla yönlendirmeler) "TYRO Office"
 * ya da "Office" yazabiliyor; hepsi aynı asistandır ve karşılaştırma bunu bilmek zorunda.
 */

/** Asistan grubunun başlığı. Marka wordmark'ı — çevrilmez. */
export const AGENT_BRAND = "TYRO"

// Marka öneki: boşluklu ("TYRO Office") ya da bitişik ("tyraOffice"). Bitişikte
// önekten sonra BÜYÜK harf ya da rakam aranır; "Tyrone" gibi bir ad kırpılmaz.
const DISPLAY_PREFIX = /^\s*[Tt][Yy][Rr][OoAa](?:\s+(?=\S)|(?=[A-Z0-9]))/

// Anahtarda her bitişik yazım önektir: iki taraf aynı kuralla kırpıldığı için
// "tyroSign" ile "tyroSign" yine eşleşir.
const KEY_PREFIX = /^ty(?:ro|ra)(?=.)/

/** Açık menüdeki kısa ad: marka öneki olmadan ("tyraOffice" → "Office"). */
export function agentDisplayName(name) {
  return String(name ?? "").replace(DISPLAY_PREFIX, "")
}

/**
 * Adla eşleştirme anahtarı: küçük harf, boşluksuz, marka öneki olmadan.
 * "tyraOffice", "TYRO Office", "tyro office" ve "Office" aynı anahtarı verir.
 */
export function catalogNameKey(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(KEY_PREFIX, "")
}

/** İki katalog adı aynı kaydı mı gösteriyor. Boş ad hiçbir şeyle eşleşmez. */
export function sameCatalogName(a, b) {
  const ka = catalogNameKey(a)
  return ka !== "" && ka === catalogNameKey(b)
}
