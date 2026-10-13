/**
 * Takvim çekme aralığının TEK formülü.
 *
 * Neden ayrı dosya: `useCalendarEvents`'in önbellek anahtarı tam ISO
 * aralığını içeriyor (`${homeAccountId}::${startISO}::${endISO}::${adresler}`).
 * İki tüketici aralığı bir milisaniye farklı hesaplarsa aynı veri ikinci kez
 * çekilir — header paneli açıkken sohbetteki referans seçici yeniden ağa
 * çıkardı. Formül burada yaşar, iki taraf da buradan çağırır.
 */

/** Ajanda ızgaranın altında kaç günü listeler. */
export const AGENDA_DAYS = 14

export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * Görünen ay + seçili gün + bugünü kapsayan aralık.
 *
 * Izgara ile ajanda AYRI pencereler: kullanıcı Haziran'a geri sayfaladığında
 * ızgara Haziran'ı ister ama ajanda hâlâ bugünden başlar. İkisinin birleşimi
 * alınmazsa geri sayfalayan kullanıcıda ajanda boşalıyor ve header rozeti
 * sıfırlanıyordu (bileşen her rotada mount, yani sıfır kalıyordu).
 */
export function calendarRange({ visibleMonth, selectedDay, today }) {
  const base = startOfDay(today ?? new Date())
  const month = visibleMonth ?? new Date(base.getFullYear(), base.getMonth(), 1)
  const gridStart = new Date(month.getFullYear(), month.getMonth(), 1)
  gridStart.setDate(gridStart.getDate() - 7)
  const gridEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  gridEnd.setDate(gridEnd.getDate() + Math.max(14, AGENDA_DAYS))
  const agendaStart = startOfDay(selectedDay ?? base)
  const agendaEnd = new Date(agendaStart)
  agendaEnd.setDate(agendaEnd.getDate() + AGENDA_DAYS)
  // ⚠️ En az İKİ HAFTA GERİ (2026-10-02): Akışım'ın toplantı ritmi "geçen
  // hafta"yı bu aralıktan okuyor ve ayın ilk günlerinde geçen haftanın başı
  // `ayın 1'i − 7`nin de gerisine düşüyordu — seçenek o günlerde hiç
  // sunulmuyordu (sahada: *"hafta seçimi kalkmış"*). Bugünden 14 gün geri her
  // dilin hafta başında geçen haftayı kapsıyor; formül TEK, anahtar yine ortak.
  const back = new Date(base)
  back.setDate(back.getDate() - 14)
  const start = new Date(
    Math.min(gridStart.getTime(), base.getTime(), agendaStart.getTime(), back.getTime()),
  )
  const end = new Date(Math.max(gridEnd.getTime(), agendaEnd.getTime()))
  return { rangeStart: startOfDay(start), rangeEnd: end }
}

/**
 * Panelin HİÇ açılmamış hâlindeki aralık — referans seçicinin kullandığı.
 *
 * Takvim paneli varsayılan durumdayken (bu ay, gün seçilmemiş) anahtar birebir
 * tutar ve seçici ağa hiç çıkmaz. Kullanıcı paneli açıp aya geri sayfaladıysa
 * anahtarlar ayrışır ve seçici kendi aralığını bir kez çeker; yanlış veri
 * göstermektense fazladan bir istek yapmak doğru olanı.
 */
export function defaultCalendarRange(now = new Date()) {
  const today = startOfDay(now)
  return calendarRange({
    visibleMonth: new Date(today.getFullYear(), today.getMonth(), 1),
    selectedDay: null,
    today,
  })
}
