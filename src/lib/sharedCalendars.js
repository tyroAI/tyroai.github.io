/**
 * Takvimi bizimle paylaşan kişiler — bu tarayıcıda tutulan liste.
 *
 * Graph, "kim sana takvimini paylaştı" diye SORULABİLECEK bir uç sunmuyor:
 * paylaşım Exchange tarafında yapılıyor ve okunabilir tek şey, adını bildiğin
 * bir kişinin takviminin sana AÇIK OLUP OLMADIĞI (`/users/{upn}/calendarView`
 * ya veriyi ya da 403'ü döner). Bu yüzden liste kullanıcının kendi seçimidir,
 * tıpkı Outlook'ta "Takvim Ekle → Kişiden" akışının bıraktığı liste gibi.
 *
 * Yalnızca AD ve ADRES saklanır — etkinlik başlığı, katılımcı, hiçbir içerik
 * diske yazılmaz (takvim önbelleği de bilinçli olarak bellekte).
 */
const KEY = "tyro-shared-calendars"

/** @returns {{address: string, name: string}[]} */
export function readSharedCalendars() {
  try {
    const raw = window.localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    // Kayıt bozulsa bile panel açılmalı: şekli tutmayan girdi sessizce düşer.
    return list
      .filter((p) => p && typeof p.address === "string" && p.address.includes("@"))
      .map((p) => ({
        address: p.address,
        name: typeof p.name === "string" && p.name ? p.name : p.address,
      }))
  } catch {
    return []
  }
}

export function writeSharedCalendars(list) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Depolama kapalıysa seçim yalnızca bu oturum sürer — panel çalışmaya
    // devam eder, kaybolan tek şey hatırlanması.
  }
}
