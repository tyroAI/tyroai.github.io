/**
 * Self Servis — sonraki yıllık izin hak edişi (saf, TAHMİN). ERP hak ediş tarihi ya da
 * tahakkuk alanı vermez (yalnız yıllık hak · kullanılan · kalan): tarih, profil başlığındaki
 * hizmet süresinin işe giriş (kıdem) gününün yıl dönümüdür. Gün sayısı, bu yılki hak ile
 * 4857 sayılı İş Kanunu md. 53'ün kıdeme göre yasal en azının büyüğü. Ayrıntı:
 * docs/features/self-servis.md › Sonraki hak ediş.
 */

const DAY = 86400000

/** Kıdem yılına göre yasal en az yıllık izin (gün): 1–5 yıl 14, 6–14 yıl 20, 15+ yıl 26. */
export function legalMinimum(years) {
  if (years >= 15) return 26
  if (years >= 6) return 20
  if (years >= 1) return 14
  return 0
}

/** `year` yılındaki yıl dönümü (yerel gün); 29 Şubat artık olmayan yılda 28 Şubat. */
function anniversaryIn(hire, year) {
  const last = new Date(year, hire.getMonth() + 1, 0).getDate()
  return new Date(year, hire.getMonth(), Math.min(hire.getDate(), last))
}

/**
 * Sonraki hak ediş: `{ date, from, daysLeft, years, days, estimated: true }` — `date` bugün ya
 * da sonraki ilk yıl dönümü (ilk hak 1. yılda), `from` dönemin başı (önceki yıl dönümü; ilk
 * yılda işe giriş), `daysLeft` takvim günü (0 = bugün), `years` o gün dolan kıdem yılı, `days`
 * = max(bu yılki hak, yasal en az). İşe giriş bilinmiyorsa null.
 */
export function nextAccrual(hireDate, now = new Date(), yearlyClaim = null) {
  if (!(hireDate instanceof Date) || Number.isNaN(hireDate.getTime())) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let year = Math.max(today.getFullYear(), hireDate.getFullYear() + 1)
  let date = anniversaryIn(hireDate, year)
  if (date < today) date = anniversaryIn(hireDate, ++year)
  const years = year - hireDate.getFullYear()
  return {
    date,
    from: anniversaryIn(hireDate, year - 1),
    // Yaz saati geçişinde gün 23/25 saat: yuvarlama takvim gününü verir.
    daysLeft: Math.round((date - today) / DAY),
    years,
    days: Math.max(Number(yearlyClaim) || 0, legalMinimum(years)),
    estimated: true,
  }
}

/**
 * Hak ediş döneminin ilerleyişi (`nextAccrual` sonucundan): `{ from, to, total, elapsed, share }`.
 * Geçen gün `daysLeft`ten türer: çubuk ile "66 gün sonra" hep aynı günü söyler. Hak ediş bugünse
 * dolu (share 1); işe giriş henüz gelmediyse boş.
 */
export function accrualProgress(accrual) {
  if (!(accrual?.from instanceof Date) || !(accrual?.date instanceof Date)) return null
  const total = Math.max(Math.round((accrual.date - accrual.from) / DAY), 1)
  const elapsed = Math.min(Math.max(total - accrual.daysLeft, 0), total)
  return { from: accrual.from, to: accrual.date, total, elapsed, share: elapsed / total }
}
