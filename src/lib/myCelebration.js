/**
 * ═══════════════════════════════════════════════════════════════════════
 *  SENİN GÜNÜN — giren kişinin kendi doğum günü ve iş yıl dönümü (2026-10-02)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İstek: *"sisteme giren kişinin doğum günü ve iş yıl dönümü olduğunda o gün
 * Akışım ekranında ne yapabiliriz"* → *"önerdiğin ilk turu güzel şekilde yap;
 * yardım kartında orb maskotu doğum günü ya da iş yıl dönümü kutlama kıyafeti
 * ve şapkası giysin"*.
 *
 * ⚠️ **YENİ İSTEK YOK, YENİ KAPSAM YOK.** Kaynak İK kütüğü (`celebrations.js`)
 * ve kabuk onu açılışta zaten çekiyor (`DashboardLayout` › `primeCelebrations`).
 * Kişi kendi gününde o listede ZATEN var; bu dosya yalnız onu tanıyor.
 *
 * ⚠️ **EŞLEŞME İKİ ADRESLE.** Kütük kişiyi POSTA adresiyle tutuyor
 * (`mserp_mail`), oturum ise GİRİŞ adresini (UPN) biliyor ve 801 kullanıcının
 * 237'sinde ikisi farklı (ölçüldü, 2026-09-17). Yalnız UPN'le eşlemek o
 * kişilerin gününü sessizce kaçırırdı; dizindeki posta adresi de kümeye girer
 * (`useMyIdentity`).
 *
 * ⚠️ **"ÇALIŞMAZSA YOK".** Kütüğü okuma izni olmayan, yurt dışında çalışan ya
 * da kaydı bulunmayan kişi sıradan bir gün görür; hata, şerit, boşluk yok.
 * Doğum YILI hiçbir yerde yok — veri katmanı onu zaten taşımıyor.
 */

/** Adresleri küçük harfe indirip kümeye koyar (boşları atar). */
export function identitySet(...addresses) {
  const set = new Set()
  for (const a of addresses) {
    const v = String(a ?? "")
      .trim()
      .toLowerCase()
    if (v) set.add(v)
  }
  return set
}

export function isMine(ids, address) {
  if (!ids?.size || !address) return false
  return ids.has(String(address).trim().toLowerCase())
}

/**
 * Bugün bu kişinin günü mü? `cel` = `useCelebrations()`un hazır cevabı
 * (`narrowToToday`dan geçmiş — `inDays` ve `years` BUGÜNE göre).
 * @returns {null | {birthday: boolean, anniversary: null | {years: number, startYear: number}}}
 */
export function myCelebrationFrom(cel, ids) {
  if (!cel || cel.status !== "ready" || !ids?.size) return null
  const mine = (p) => p.inDays === 0 && isMine(ids, p.mail)
  const birthday = (cel.birthdays ?? []).some(mine)
  const a = (cel.anniversaries ?? []).find(mine)
  // ⚠️ Yalnız DOLAN yılı olan yıl dönümü (`years >= 1`); bugün başlayan
  // ayrı listede (`joiners`) ve "1. yılın kutlu olsun" demek yanlış olurdu.
  const anniversary = a && a.years >= 1 ? { years: a.years, startYear: a.startYear } : null
  return birthday || anniversary ? { birthday, anniversary } : null
}

/**
 * ÖNİZLEME (`?celebrate=birthday|anniversary|both` — kapısı çağıranda: DEV ya
 * da yönetici grubu). Tasarımı kişinin kendi gününü beklemeden görmek için;
 * yıl dönümü 5 yıl sayılır.
 */
export function previewCelebration(value, now = new Date()) {
  const v = String(value ?? "").toLowerCase()
  if (v !== "birthday" && v !== "anniversary" && v !== "both") return null
  const year = new Date(now).getFullYear()
  return {
    birthday: v !== "anniversary",
    anniversary: v === "birthday" ? null : { years: 5, startYear: year - 5 },
  }
}

/**
 * Yardım kartının kutlama SAHNESİ (`myspace/CelebrationOrb.jsx`): doğum
 * gününde pasta + balonlar, yıl dönümünde altın rakam balonu + madalya, ikisi
 * aynı gündeyse pasta + rakam balonu. Kimlik sabit kalsın diye çağıran bunu
 * `useMemo` ile tutar.
 * @returns {null | {scene: "birthday"|"anniversary"|"both", years: number|null}}
 */
export function sceneFor(cel) {
  if (!cel) return null
  const years = cel.anniversary?.years ?? null
  return { scene: cel.birthday ? (years ? "both" : "birthday") : "anniversary", years }
}
