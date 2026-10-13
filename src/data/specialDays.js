/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ÖZEL GÜNLER — Türkiye'nin resmî tatilleri
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Tarih hapının açtığı panelin (`SpecialDaysPopover`) tek veri kaynağı.
 *
 * ── ⚠️ İKİ AYRI CİNS, İKİ AYRI GÜVEN DERECESİ ─────────────────────────
 *
 * **SABİT tatiller** Miladî takvimde her yıl aynı gündedir; fonksiyonla
 * HER YIL için üretilirler, tablo tutmaya gerek yok.
 *
 * **DİNÎ bayramlar** Hicrî takvime bağlıdır, yani her yıl ~11 gün geriye
 * kayar ve Türkiye'de tarihi Diyanet'in takvimi belirler. Hesapla
 * türetilemezler: Hicrî↔Miladî dönüşümün birkaç günlük oynaması var ve
 * resmî tatil, hesabın değil AÇIKLAMANIN tarihidir.
 *
 * ⚠️ **BU YÜZDEN DİNÎ BAYRAMLAR ELLE YAZILI BİR TABLODA** ve tabloda
 * OLMAYAN bir yıl için HİÇBİR ŞEY gösterilmez — uydurulmuş bir tarih,
 * eksik bir listeden çok daha pahalıdır (deponun "soramadık ≠ veri yok"
 * kuralının buradaki karşılığı). Takvim yeni yıla girdiğinde bu tabloya
 * bir satır eklenir.
 *
 * ⚠️ **AŞAĞIDAKİ DİNÎ TARİHLER DOĞRULANMALIDIR.** Diyanet'in yayımladığı
 * takvimden teyit edilmeden kesin sayılmamalıdır; yanlışsa düzeltme tek
 * satırdır. Sabit tatillerde böyle bir belirsizlik YOKTUR.
 *
 * ── ARİFE GÜNLERİ ─────────────────────────────────────────────────────
 * Bayram arifeleri yarım gün tatildir (13.00'ten sonra). Listeye AYRI bir
 * satır olarak GİRMEZLER: panel "hangi günler tatil" sorusunu cevaplıyor,
 * bordro değil. Aynı sebeple 28 Ekim de ayrı yazılmaz.
 */

/** Sabit tatiller — (ay, gün) 1 tabanlı; her yıl aynı. */
const FIXED = [
  { id: "newYear", month: 1, day: 1 },
  { id: "sovereignty", month: 4, day: 23 },
  { id: "labour", month: 5, day: 1 },
  { id: "youth", month: 5, day: 19 },
  { id: "democracy", month: 7, day: 15 },
  { id: "victory", month: 8, day: 30 },
  { id: "republic", month: 10, day: 29 },
]

/**
 * Dinî bayramlar — yıl → bayramın İLK günü ve kaç gün sürdüğü.
 * Ramazan 3, Kurban 4 gün.
 *
 * ⚠️ Teyit edilmeden kesin sayılmamalı (bkz. dosya başı).
 */
const RELIGIOUS = {
  2025: [
    { id: "ramadan", start: "2025-03-30", days: 3 },
    { id: "sacrifice", start: "2025-06-06", days: 4 },
  ],
  2026: [
    { id: "ramadan", start: "2026-03-20", days: 3 },
    { id: "sacrifice", start: "2026-05-27", days: 4 },
  ],
  2027: [
    { id: "ramadan", start: "2027-03-09", days: 3 },
    { id: "sacrifice", start: "2027-05-16", days: 4 },
  ],
}

const pad = (n) => String(n).padStart(2, "0")
/** Yerel takvim gününden ISO — `toISOString()` UTC'ye çevirip TR'de günü
 *  BİR GERİ kaydırıyor (1 Ocak 00:00 yerel = 31 Aralık 21:00 UTC). */
export const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number)
  return isoOf(new Date(y, m - 1, d + n))
}

/**
 * Bir yılın özel günleri, tarihe göre sıralı.
 *
 * Çok günlü bayramlar TEK kayıt döner (`from`/`to`): üç satır basmak
 * listeyi aynı bayramla doldururdu. `dates` o bayramın bütün günlerini
 * taşır — takvim ızgarasının işaretlemesi onu okur.
 *
 * @returns {Array<{id:string, from:string, to:string, dates:string[], religious:boolean}>}
 */
export function specialDaysOfYear(year) {
  const out = FIXED.map((f) => {
    const iso = `${year}-${pad(f.month)}-${pad(f.day)}`
    return { id: f.id, from: iso, to: iso, dates: [iso], religious: false }
  })
  for (const r of RELIGIOUS[year] ?? []) {
    const dates = Array.from({ length: r.days }, (_, i) => addDays(r.start, i))
    out.push({ id: r.id, from: dates[0], to: dates[dates.length - 1], dates, religious: true })
  }
  return out.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
}

/** Dinî bayramları elimizde olan yıllar — panel "bu yıl için veri yok"
 *  diyebilsin diye dışarı açık. */
export function hasReligiousData(year) {
  return Boolean(RELIGIOUS[year])
}

/** Bir tarihten itibaren SIRADAKİ özel günler; yıl sınırını aşar. */
export function upcomingSpecialDays(fromIso, limit = 24) {
  const year = Number(fromIso.slice(0, 4))
  const pool = [...specialDaysOfYear(year), ...specialDaysOfYear(year + 1)]
  return pool.filter((s) => s.to >= fromIso).slice(0, limit)
}
