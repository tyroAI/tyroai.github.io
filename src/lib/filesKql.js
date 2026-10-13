import { dateFloor } from "@/lib/filesDates"
import { activeTypes, KNOWN_EXTS, TYPE_FAMILIES } from "@/lib/filesTypes"

/** Kutudaki metin ve süzgeçler → güvenli KQL — `lib/filesQuery.js`in parçası. */

/** KQL'de işleç olan kelimeler — BÜYÜK harfle yazılınca işleç sayılıyor. */
const KQL_OPERATORS = /\b(AND|OR|NOT|NEAR|ONEAR|XRANK|WORDS)\b/g

/**
 * Önek kuralı (§7.2): 3+ harfli HER kelime `*` alır — Türkçe ek alıyor
 * ("satış" → "satışlar", "rapor" → "raporları") ve yalnız son kelimeye
 * yıldız koymak baştaki kelimelerin çekimli hâllerini kaçırıyordu.
 * ⚠️ Kiracı ölçümü P6 (5 çok kelimeli Türkçe sorgu) bekliyor: her kelimeye
 * yıldız son-kelimeye göre İSABET KAYBETTİRİRSE bu sabit `false` olur ve
 * davranış eskisine (yalnız son kelime) döner — tek satır.
 */
const PREFIX_EVERY_WORD = true

/**
 * Kutudaki metin → güvenli KQL sorgu metni. Boşsa `""`.
 *
 * - `"():*\\[]{}<>=` boşluğa döner (söz dizimi değil, metin aranıyor);
 * - kelime başındaki `+` / `-` düşer (KQL'de "zorunlu"/"hariç" işleci);
 * - işleç kelimeleri küçük harfe iner ("SATIŞ AND OPERASYON" iki kelime);
 * - 3+ harfli kelime `*` alır (bkz. `PREFIX_EVERY_WORD`): yazarken önek
 *   eşleşsin ("bütç" → "bütçe"), ek almış kelime de bulunsun.
 */
export function kqlSafe(text) {
  const words = String(text ?? "")
    .normalize("NFC")
    .replace(/["():*\\[\]{}<>=]/g, " ")
    .replace(KQL_OPERATORS, (w) => w.toLowerCase())
    .split(/\s+/)
    .map((w) => w.replace(/^[+-]+/, ""))
    .filter(Boolean)
  if (!words.length) return ""
  const last = words.length - 1
  return words
    .map((w, i) => ((PREFIX_EVERY_WORD || i === last) && [...w].length >= 3 ? `${w}*` : w))
    .join(" ")
}

/** Tırnaklı KQL değeri. KQL tırnağın içinde kaçış tanımıyor; tırnak düşer. */
export function kqlPhrase(value) {
  return `"${String(value ?? "").replace(/"/g, "")}"`
}

/**
 * Konumun adresi → `path:` kısıtı. SharePoint'in `Path` özelliği adresi
 * ÇÖZÜLMÜŞ hâliyle tutuyor ("Shared Documents", "%20" değil); bu yüzden
 * `decodeURI`. Çözülemeyen (bozuk %) adres olduğu gibi gider.
 */
export function pathKql(webUrl) {
  if (!webUrl) return ""
  let url = String(webUrl)
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
  try {
    url = decodeURI(url)
  } catch {
    /* olduğu gibi */
  }
  return `path:${kqlPhrase(url)}`
}

/**
 * Tür kısıtı (§5). Aileler arasında VEYA.
 *
 * - bilinen aileler → `(filetype:a OR filetype:b …)`;
 * - YALNIZ "Diğer" → bilinen HER uzantının dışlanması (`-filetype:x …`):
 *   "Diğer" = "hiçbir aileye girmeyen", sunucuya söylenebilen hâli bu;
 * - "Diğer" + bilinen aile → sunucu kısıtı YOK (`""`): KQL'de "şu aileler VEYA
 *   bunların hiçbiri değil" tek bir kısıtla yazılamıyor. Süzme istemcide
 *   (`typeFamily`) ve yalnız YÜKLENEN öğelerde — çağıran bunu
 *   `typesNeedClientFilter` ile bilir ve `notice.clientFiltered`ı çizer.
 */
export function typesKql(types) {
  const list = activeTypes(types)
  if (!list.length) return ""
  const known = list.filter((t) => t !== "other")
  if (list.includes("other"))
    return known.length ? "" : KNOWN_EXTS.map((e) => `-filetype:${e}`).join(" ")
  const exts = known.flatMap((t) => TYPE_FAMILIES.find((f) => f.id === t)?.exts ?? [])
  if (!exts.length) return ""
  return `(${exts.map((e) => `filetype:${e}`).join(" OR ")})`
}

/** Tür seçimi sunucuya söylenemiyor mu ("Diğer" + bilinen aile)? → süzme yalnız yüklenenlerde. */
export function typesNeedClientFilter(types) {
  const list = activeTypes(types)
  return list.includes("other") && list.some((t) => t !== "other")
}

/**
 * Tarih kısıtı. Değer yerel gece yarısının UTC anı: KQL tarih-saat değerini
 * UTC okuyor. İstemci yine yeniden sınıyor (`matchesDate`).
 */
export function dateKql(preset, now = Date.now()) {
  const floor = dateFloor(preset, now)
  if (floor == null) return ""
  const iso = new Date(floor).toISOString().replace(/\.\d{3}Z$/, "Z")
  return preset === "older" ? `LastModifiedTime<${iso}` : `LastModifiedTime>=${iso}`
}

/**
 * "Ben" = son değiştiren YA DA oluşturan benim — TEK bir adresle.
 *
 * ⚠️ Hangi adres (UPN mi posta mı) kiracının arama şemasına bağlı ve ÖLÇÜLMEDİ
 * (kiracıda 801 kişinin 237'sinde ikisi farklı). Bu yüzden kimlik
 * BASAMAKLI çözülüyor (`lib/filesIdentity.js`: upn → mail → OneDrive yolu);
 * burası yalnız verilen adresle kısıtı yazan eski yardımcı.
 */
export function personKql(person, upn) {
  if (!upn) return ""
  const who = kqlPhrase(upn)
  if (person === "me") return `(EditorOWSUSER:${who} OR AuthorOWSUSER:${who})`
  if (person === "others") return `-EditorOWSUSER:${who}`
  return ""
}
