/**
 * Saate göre selamlama anahtarı — dashboard'un hero'su ve mySpace AYNI
 * cümleyi kurar.
 *
 * ⚠️ **AYRI DOSYADA, BİLEŞEN DOSYASINDA DEĞİL.** Önce `AppLauncher.jsx`in
 * içindeydi; mySpace de kullanınca oradan ihraç etmek gerekti ve bir bileşen
 * dosyasından sabit/işlev ihraç etmek React Refresh sınırını bozuyor (bu
 * depoda `KIND_STYLE` ile bir kez ölçüldü).
 */
export function greetingKey(hour) {
  if (hour >= 5 && hour < 12) return "chat.greeting.morning"
  if (hour >= 12 && hour < 18) return "chat.greeting.afternoon"
  if (hour >= 18 && hour < 22) return "chat.greeting.evening"
  return "chat.greeting.night"
}
