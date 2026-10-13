/**
 * SATIR DURUM KANALI — sol kenardaki 3px'lik şerit.
 *
 * ⚠️ **ÇEVRESEL GÖRÜŞ ROZET OKUMAZ, ÇİZGİ OKUR.** Kaydırırken gözün
 * yakaladığı şey renk lekesidir; bir rozetin metnini okumak için durmak
 * gerekir. Şerit "burada bir şey var" diyor, rozet ne olduğunu söylüyor —
 * ikisi birbirinin yerine geçmiyor, birlikte çalışıyor.
 *
 * Tek satırda TEK durum, öncelik sırasıyla: sen > bozuk > yok. İki şeridi
 * üst üste bindirmek ikisini de okunmaz yapardı.
 *
 * ⚠️ Kendi dosyasında, `primitives.jsx`in içinde DEĞİL: bir bileşen
 * dosyasından sabit ihraç etmek fast refresh'i bozuyor (bu deponun
 * `KindBadge`de de yazılı dersi).
 */
export const RAIL = {
  self: "before:bg-brand-via",
  broken: "before:bg-amber-500",
  pending: "before:bg-amber-500",
  done: "before:bg-emerald-500",
  none: "before:bg-transparent",
}

export const railBase =
  "relative before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-r-full before:content-['']"
