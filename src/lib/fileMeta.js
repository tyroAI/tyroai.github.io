import { getDateTimeFormat, getNumberFormat } from "@/lib/intl-cache"

/**
 * Dosya türü renkleri.
 *
 * Office'in kendi renkleri (Word lacivert, Excel yeşil, PowerPoint kiremit,
 * PDF kırmızı) — kullanıcı bu renkleri zaten Finder'da ve Office'te görüyor,
 * uydurma bir palet öğrenmesi gerekmiyor. Rozet DOLU boyanır ve yazı beyaz
 * kalır: düşük alfalı bir zemin + renkli yazı, koyu temada okunmuyordu ve
 * her renk için ayrı bir koyu varyant tanımlamak gerekirdi. Dolu rozet iki
 * temada da aynı ve kontrastı sabittir.
 */
export const FILE_TONE = {
  doc: "#2B579A",
  docx: "#2B579A",
  rtf: "#2B579A",
  odt: "#2B579A",
  xls: "#217346",
  xlsx: "#217346",
  xlsm: "#217346",
  csv: "#217346",
  ppt: "#B7472A",
  pptx: "#B7472A",
  pdf: "#C4314B",
  png: "#7C4DFF",
  jpg: "#7C4DFF",
  jpeg: "#7C4DFF",
  gif: "#7C4DFF",
  svg: "#7C4DFF",
  heic: "#7C4DFF",
  webp: "#7C4DFF",
  zip: "#B26A00",
  rar: "#B26A00",
  "7z": "#B26A00",
  msg: "#0F6CBD",
  eml: "#0F6CBD",
  txt: "#5B6B7B",
  md: "#5B6B7B",
  json: "#5B6B7B",
  xml: "#5B6B7B",
}
/** Tanınmayan uzantı: nötr kalır, uydurma renk atanmaz. */
export const NEUTRAL_TONE = "#8A94A6"

/**
 * Bayt → okunur. Boyut ikincil bilgi, bu yüzden tek ondalık yeter.
 * `locale` verilirse ondalık ayıracı dilin ("1,7 MB"); verilmezse eski davranış.
 */
export function formatSize(bytes, locale) {
  if (bytes == null) return ""
  const u = ["B", "KB", "MB", "GB"]
  let n = bytes
  let i = 0
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024
    i++
  }
  const digits = i === 0 ? 0 : n < 10 ? 1 : 0
  const shown = locale
    ? getNumberFormat(locale, {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(n)
    : i === 0
      ? n
      : n.toFixed(digits)
  return `${shown} ${u[i]}`
}

const OPTS_DATE = { day: "numeric", month: "short" }

/**
 * Önizleme yüzeylerinin alt satırı: kim · ne zaman · ne kadar. Listedeki
 * satırla aynı sıra — aynı dosyanın iki yerde farklı okunması, kullanıcıya
 * iki farklı dosyaya baktığını düşündürüyor.
 */
export function fileMeta(item, locale) {
  return [
    item.modifiedBy,
    item.modified ? getDateTimeFormat(locale, OPTS_DATE).format(new Date(item.modified)) : "",
    formatSize(item.size),
  ]
    .filter(Boolean)
    .join(" · ")
}
