/**
 * BRAVE ALGILAMA — sesli yazdırmanın çalışmadığı tek tarayıcı.
 *
 * ⚠️ **ÖZELLİK ALGILAMASI BURADA YALAN SÖYLÜYOR.** Brave Chromium tabanlı,
 * yani `window.webkitSpeechRecognition` VAR ve `isSupported` true dönüyor.
 * Ama Brave, Chromium'un konuşma tanıma isteklerini gönderdiği Google
 * servisinin anahtarını gizlilik gerekçesiyle çıkarıyor: tanıma başlıyor ve
 * her seferinde `network` hatasıyla düşüyor.
 *
 * Sahada bildirildi (2026-09-20): kullanıcı mikrofona basıyor ve "Ses tanıma
 * servisine ulaşılamadı. İnternet bağlantınızı kontrol edin." mesajını
 * alıyor — oysa bağlantısında hiçbir sorun yok. Yanlış yeri işaret eden bir
 * hata mesajı, hatanın kendisinden daha çok zaman kaybettirir.
 *
 * ⚠️ Algılama ASENKRON (`navigator.brave.isBrave()` bir söz döndürüyor), o
 * yüzden bir modül deposu: cevap gelene kadar `false` (yani mikrofon açık
 * görünür), cevap gelince aboneler uyarılıyor ve düğme "desteklenmiyor"
 * hâline geçiyor. Bir karelik bu gecikme zararsız — kullanıcı o arada
 * basarsa zaten `network` dalına düşüyor ve orada da Brave metnini alıyor.
 *
 * ⚠️ `User-Agent` SNIFF EDİLMİYOR: Brave kendini Chrome olarak tanıtıyor ve
 * UA üzerinden ayırt etmek yıllardır çalışmıyor. `navigator.brave` Brave'in
 * kendi resmî API'si.
 */

let isBrave = false
const listeners = new Set()

if (typeof navigator !== "undefined" && typeof navigator.brave?.isBrave === "function") {
  navigator.brave
    .isBrave()
    .then((v) => {
      isBrave = !!v
      for (const fn of listeners) {
        try {
          fn()
        } catch {
          /* bir dinleyicinin hatası ötekileri düşürmesin */
        }
      }
    })
    .catch(() => {
      // Cevap alınamadıysa Brave DEĞİL sayılır: yanlış pozitif, çalışan bir
      // mikrofonu sebepsiz kapatmak olurdu.
    })
}

export function getIsBrave() {
  return isBrave
}

export function subscribeBrave(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}
