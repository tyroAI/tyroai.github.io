import { tidyPersonName } from "@/lib/personName"

/**
 * İK duyurusunun konusundan KİŞİ ADLARINI ayıklar — ya hepsini, ya hiçbirini.
 *
 * Bu depo uzun süre konu satırından ad çıkarmayı REDDETTİ ve gerekçesi
 * hâlâ geçerli: yanlış ayıklanan bir parça tam da bir insanın adında
 * görünür. Değişen şey, kalıbın ÖLÇÜLMÜŞ olması (gerçek kutuda):
 *
 *   "İYİ Kİ ARAMIZA KATILDINIZ - WE ARE SO GLAD YOU'VE JOINED US //
 *    AİDA BEKTAYEVA // SENA AKDAŞ // ÇAĞDAŞ GÖKGÖL // İREM SU ÖZAY"
 *
 * İlk `//`den sonrası adlar, aralarında yine `//`. Kalıp bu kadar net
 * olunca ayıklamak tahmin değil okuma oluyor.
 *
 * ⚠️ **HEPSİ YA DA HİÇBİRİ.** Parçalardan BİRİ ada benzemiyorsa fonksiyon
 * BOŞ döner ve panel eski hâline — duyurunun konusuna — düşer. Yarısı ad
 * yarısı çöp bir liste, hiç ad göstermemekten kötüdür.
 *
 * ⚠️ **2-3 KELİME ŞARTI ve bu bir ölçüm.** Doğum günü duyurusunun kuyruğu
 * "EYLÜL AYI DOĞUM GÜNLERİ" (4 kelime) ve ad DEĞİL; üst sınır onu eliyor,
 * eleyince de kalıp bozulduğu için o kayıt bütünüyle konu satırına düşüyor.
 * Alt sınır 2, çünkü tek kelimelik bir kuyruk ("DUYURU") ad sanılırdı.
 */
const NAME_PART = /^[\p{L}][\p{L}\-'’.]*$/u

export function namesFromSubject(subject) {
  const parts = String(subject ?? "").split(/\s*\/\/\s*/)
  if (parts.length < 2) return []
  const names = []
  for (const raw of parts.slice(1)) {
    const value = raw.replace(/[.,;:]+$/, "").trim()
    if (!value) continue
    const words = value.split(/\s+/)
    if (words.length < 2 || words.length > 3) return []
    if (!words.every((w) => w.length >= 2 && NAME_PART.test(w))) return []
    names.push(value)
  }
  return names
}

/**
 * Kişi panellerinin satırları: duyurulardan ÇIKARILABİLEN adlar, yoksa
 * duyurunun kendi konusu.
 *
 * Dönen satır her iki hâlde de aynı şekli taşıyor (`{ key, postId, label,
 * received, isPerson }`), yani panel tek bir döngüyle çiziliyor ve
 * "ad mı konu mu" ayrımı YALNIZ görünümde kalıyor (avatar mı, metin mi).
 */
export function peopleRows(posts, limit) {
  const rows = []
  for (const post of posts) {
    const names = namesFromSubject(post.subject)
    if (names.length) {
      for (const name of names) {
        rows.push({
          key: `${post.id}:${name}`,
          postId: post.id,
          // İK duyurularında ad çoğu zaman BÜYÜK harfle yazılıyor.
          label: tidyPersonName(name),
          received: post.received,
          isPerson: true,
        })
        if (rows.length >= limit) return rows
      }
    } else {
      rows.push({
        key: post.id,
        postId: post.id,
        label: post.subject,
        received: post.received,
        isPerson: false,
      })
      if (rows.length >= limit) return rows
    }
  }
  return rows
}
