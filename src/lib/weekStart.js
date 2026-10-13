/**
 * Haftanın ilk günü — ve ondan türeyen "gelecek haftanın sonu".
 *
 * ⚠️ **KENDİ DOSYASINDA, `CalendarMonthGrid.jsx` İÇİNDE DEĞİL.** Tablo
 * orada doğdu ama ikinci bir okuyucu çıktı (`SpecialDaysPopover`in
 * "bu hafta ya da gelecek hafta" penceresi) ve bir sayfa/bileşen
 * dosyasından bileşen olmayan bir şey ihraç etmek React Refresh sınırını
 * bozuyor. Kopyalamak da olmazdı: iki yerde iki farklı hafta başlangıcı,
 * ızgaranın işaretlediği gün ile listenin "yaklaşan" dediği günün sessizce
 * ayrışması demekti.
 *
 * `Intl.Locale#getWeekInfo` bunu doğru cevaplardı ama tarayıcı desteği
 * evrensel değil; tablo bu yüzden AÇIK yazılı.
 */
export const FIRST_DAY = { en: 0, tr: 1, ru: 1, ar: 6 }

/** Dildeki haftanın ilk günü (0 = Pazar). Tanınmayan dil Pazartesi'ye düşer. */
export function firstDayOfWeek(locale) {
  return FIRST_DAY[locale] ?? 1
}

/**
 * `from` gününün İÇİNDE BULUNDUĞU haftanın ve ONDAN SONRAKİ haftanın son
 * günü — yani "bu hafta ya da gelecek hafta" penceresinin üst sınırı.
 *
 * ⚠️ Sabit "14 gün" DEĞİL ve fark gerçek: Cuma günü bakan biri için
 * gelecek hafta 9 gün sonra biter, 14 değil. Sabit pencere o kişiye iki
 * hafta ötesindeki bir tatili "gelecek hafta" diye gösterirdi.
 *
 * Saat DEĞİL GÜN aritmetiği: `setDate` yaz saati geçişlerinde de doğru
 * gün sayar, milisaniye toplamı saymaz.
 */
export function endOfNextWeek(from, locale) {
  const start = new Date(from)
  start.setHours(0, 0, 0, 0)
  const first = firstDayOfWeek(locale)
  // Haftanın başına kaç gün geri gidilecek (0-6).
  const back = (start.getDay() - first + 7) % 7
  const end = new Date(start)
  // Bu haftanın başı + 13 gün = gelecek haftanın son günü.
  end.setDate(start.getDate() - back + 13)
  end.setHours(23, 59, 59, 999)
  return end
}
