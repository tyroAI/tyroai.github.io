import { FILE_TONE, NEUTRAL_TONE } from "@/lib/fileMeta"

/** Dosyalarım'ın tür aileleri (süzgeç, sunucu kısıtı, sayılar) — `lib/filesQuery.js`in parçası. */

/**
 * Süzgecin "Tür" seçenekleri. Uzantı → aile; rengi rozetinkiyle AYNI
 * kaynaktan (`FILE_TONE`), yani çipin noktası satırdaki rozetin rengi.
 */
export const TYPE_FAMILIES = [
  { id: "word", exts: ["docx", "doc", "docm", "dotx", "dot", "rtf", "odt"] },
  { id: "excel", exts: ["xlsx", "xls", "xlsm", "xlsb", "csv", "ods"] },
  { id: "powerpoint", exts: ["pptx", "ppt", "pptm", "ppsx", "pps", "odp"] },
  { id: "pdf", exts: ["pdf"] },
  { id: "image", exts: ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp", "heic", "tif", "tiff"] },
  { id: "video", exts: ["mp4", "mov", "m4v", "avi", "wmv", "mkv", "webm"] },
  { id: "archive", exts: ["zip", "rar", "7z", "tar", "gz"] },
  { id: "mail", exts: ["msg", "eml"] },
].map((f) => ({ ...f, tone: FILE_TONE[f.exts[0]] ?? NEUTRAL_TONE }))

const FAMILY_OF_EXT = new Map(TYPE_FAMILIES.flatMap((f) => f.exts.map((e) => [e, f.id])))
export const KNOWN_FAMILIES = new Set([...TYPE_FAMILIES.map((f) => f.id), "other"])
/** Ailesi bilinen her uzantı — "Diğer"in sunucu kısıtı bunların HEPSİNİ dışlıyor. */
export const KNOWN_EXTS = TYPE_FAMILIES.flatMap((f) => f.exts)

/** Satırın ailesi: klasör/site/kitaplık `"folder"`, tanınmayan uzantı `"other"`. */
export function typeFamily(item) {
  if (item.kind !== "file") return "folder"
  return FAMILY_OF_EXT.get(item.ext) ?? "other"
}

/** Uzantı → aile (`"other"` tanınmayan için). Toplama kovalarının anahtarları uzantı. */
export function familyOfExt(ext) {
  const e = String(ext ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\./, "")
  return FAMILY_OF_EXT.get(e) ?? "other"
}

/** Geçerli, tekilleştirilmiş tür seçimi (adresten ya da çağırandan). */
export function activeTypes(types) {
  return [...new Set((types ?? []).filter((t) => KNOWN_FAMILIES.has(t)))]
}
