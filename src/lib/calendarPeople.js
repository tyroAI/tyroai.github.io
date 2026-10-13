/**
 * Bir toplantının katılımcıları, tekrarsız.
 *
 * Graph bazı kiracılarda düzenleyiciyi katılımcı listesinde bir kez daha
 * yazıyor; aynı kişi iki avatar olarak çizilmesin. Anahtar adres, adresi
 * olmayan (oda, dış davetli) için ad.
 *
 * ⚠️ Ayrı dosyada, çünkü iki yüzey okuyor — header/çentik takvim satırı
 * (`CalendarEventRow`) ve Akışım'ın toplantı kartı — ve bir bileşen
 * dosyasından işlev ihraç etmek React Refresh sınırını bozuyor.
 */
export function uniqueAttendees(event) {
  const seen = new Set()
  const out = []
  for (const a of event?.attendees ?? []) {
    const key = (a.address || a.name || "").toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(a)
  }
  return out
}
