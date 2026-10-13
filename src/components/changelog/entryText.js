import { entriesSince, hasEntry, KIND_ORDER, latestEntryId, visibleEntries } from "@/data/changelog"
import { isReturningBrowser, readSeenId, writeSeenId } from "@/lib/changelogSeen"

/* Kayıt içeriği TR + EN yazılır; RU/AR bilinçli olarak İngilizceye düşer —
   bir içerik arşivini makineyle çevirmek, okuyanın güvenini metnin
   kendisinden önce kaybettirir (bkz. changelog.js başlığı). */
export function pick(field, locale) {
  if (!field) return ""
  return field[locale] ?? field.en ?? ""
}

/** Tarih uygulamanın her yerindeki biçimde: `dd.MM.yyyy`. */
export function formatEntryDate(iso) {
  const [y, m, d] = String(iso).split("-")
  return y && m && d ? `${d}.${m}.${y}` : iso
}

/* Arama katlaması `lib/fold.js`e taşındı: güvenlik panelleri de aynı
   fonksiyonu okuyor ve iki ekranın araması aynı davranmalı. */
export { fold } from "@/lib/fold"

export {
  entriesSince,
  hasEntry,
  KIND_ORDER,
  latestEntryId,
  visibleEntries,
  isReturningBrowser,
  readSeenId,
  writeSeenId,
}
