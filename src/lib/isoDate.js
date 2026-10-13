/**
 * `1993-04-12T00:00:00Z` → `{ y, m, d }` (tarih yoksa `null`).
 *
 * `new Date()` kullanılmaz: dizeyi UTC okuyup yerel alana çevirir ve eksi saat farkı olan bir
 * makinede günü bir geri kaydırır — doğum günü bir gün erken görünürdü. Takvim günü metinden
 * okunur. Tebrikler (`lib/celebrations.js`) ve Ekibim'in doğum günleri (`lib/teamOccasions.js`)
 * aynı İK görünümünü bununla okur: iki ekran aynı günü gösterir.
 */
export function parseIsoDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ""))
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null
}
