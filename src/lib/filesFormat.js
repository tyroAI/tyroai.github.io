import { fold } from "@/lib/fold"
import { dayBucket } from "@/lib/filesDates"
import { bcp47, getDateTimeFormat } from "@/lib/intl-cache"

/** Satırın biçimi: boyut, zaman, ad vurgusu, dışarıda açılan türler — `lib/filesQuery.js`in parçası. */

const UNITS = ["B", "KB", "MB", "GB", "TB"]
const numberFormats = new Map()
function numberFormat(locale, digits) {
  const key = `${locale}|${digits}`
  if (!numberFormats.has(key))
    numberFormats.set(key, new Intl.NumberFormat(bcp47(locale), { maximumFractionDigits: digits }))
  return numberFormats.get(key)
}

/**
 * Bayt → "1,2 MB" (dile göre ondalık ayıracı). `fileMeta.formatSize` "1.2 MB"
 * yazıyordu — Türkçede virgül.
 */
export function formatBytes(bytes, locale) {
  if (bytes == null || Number.isNaN(Number(bytes))) return ""
  let n = Number(bytes)
  let i = 0
  while (n >= 1024 && i < UNITS.length - 1) {
    n /= 1024
    i += 1
  }
  return `${numberFormat(locale, i === 0 || n >= 10 ? 0 : 1).format(n)} ${UNITS[i]}`
}

const relFormats = new Map()
function relFormat(locale) {
  if (!relFormats.has(locale))
    relFormats.set(locale, new Intl.RelativeTimeFormat(bcp47(locale), { numeric: "auto" }))
  return relFormats.get(locale)
}

/**
 * Satırın "ne zaman"ı: yedi günün içinde göreli ("2 saat önce", "dün"),
 * ötesinde tarih ("12 Eyl"); geçmiş yıllarda YIL da ("12 Eyl 2024"). `now`
 * çağırandan (sayfanın dakika tiki) — render saf kalsın.
 */
export function formatFileTime(iso, now, locale) {
  const t = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(t)) return ""
  const diff = now - t
  const rtf = relFormat(locale)
  if (diff >= -60e3 && diff < 60 * 60e3)
    return rtf.format(-Math.max(0, Math.round(diff / 60e3)), "minute")
  if (diff >= 0 && diff < 24 * 60 * 60e3 && dayBucket(iso, now) === "today")
    return rtf.format(-Math.round(diff / (60 * 60e3)), "hour")
  if (diff >= 0 && diff < 7 * 24 * 60 * 60e3) {
    const days = Math.round((startOfDay(now) - startOfDay(t)) / (24 * 60 * 60e3))
    return rtf.format(-days, "day")
  }
  const sameYear = new Date(t).getFullYear() === new Date(now).getFullYear()
  return getDateTimeFormat(locale, sameYear ? OPTS_DAY : OPTS_DAY_YEAR).format(new Date(t))
}
const OPTS_DAY = { day: "numeric", month: "short" }
const OPTS_DAY_YEAR = { day: "numeric", month: "short", year: "numeric" }
function startOfDay(t) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Addaki eşleşme aralıkları `[[başlangıç, bitiş], …]` — metin katlanarak
 * aranıyor (ı/İ, aksanlar). `fold` karakter sayısını çoğunlukla korur;
 * korumadığı nadir adda vurgu hiç çizilmez (yanlış harfi boyamaktansa).
 */
export function highlightRanges(name, text) {
  const words = fold(text)
    .split(/\s+/)
    .filter((w) => w.length >= 2)
  if (!words.length) return []
  const folded = fold(name)
  if (folded.length !== String(name).length) return []
  const ranges = []
  for (const w of words) {
    let from = 0
    let i
    while ((i = folded.indexOf(w, from)) >= 0) {
      ranges.push([i, i + w.length])
      from = i + w.length
    }
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const r of ranges) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([...r])
  }
  return merged
}

/**
 * Önizleme penceresi işe yaramayan türler (sayfa, kısayol, OneNote…): doğrudan yeni sekme.
 * ⚠️ HTML burada DEĞİL: yeni sekmedeki SharePoint onu İNDİRİYORDU; pencere onu
 * kendisi çiziyor (`lib/htmlPreview.js`, docs/features/header-panelleri.md).
 */
const EXTERNAL_EXTS = new Set(["aspx", "url", "one", "onetoc2", "lnk", "exe", "msi"])

/**
 * Satır önizleme yerine yeni sekmede mi açılmalı? Yalnız bağlantılar ve
 * önizlemesi anlamsız türler (sayfa, kısayol, OneNote…).
 *
 * ⚠️ ADRESİ (sürücü+öğe) OLMAYAN DOSYA DA PENCEREYİ AÇAR: çıplak `webUrl` Office
 * belgesini İNDİRİYORDU. Pencere önizleme oluşturamasa da "TYRO ile özetle ·
 * İndir · Word'de aç" eylemlerini sunuyor.
 */
export function opensExternally(item) {
  return item.kind === "link" || (item.kind === "file" && !item.cdn && EXTERNAL_EXTS.has(item.ext))
}
