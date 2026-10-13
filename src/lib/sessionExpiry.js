import { InteractionRequiredAuthError } from "@azure/msal-browser"

/**
 * "Oturum öldü mü?" — ve öldüyse temiz bir giriş ekranı.
 *
 * Sessiz SSO sayesinde kullanıcı ertesi gün login görmeden içeri giriyor.
 * Ama MSAL'in önbelleğinde HESAP durması, o hesabın YENİLEME BELİRTECİNİN
 * hâlâ geçerli olduğu anlamına gelmez. Belirteç ölmüşse uygulama açılıyor,
 * görünüşte giriş yapılmış oluyor, sonra parça parça çöküyor:
 *
 *   • `useIsUnderManager` hiçbir kapsam için belirteç alamıyor → BT
 *     kilitli görünüyor,
 *   • `copilot.js` sessiz alım başarısız olunca `acquireTokenPopup`a düşüyor
 *     → mesaj gönderilemiyor ve ekranın ortasında bir popup beliriyor.
 *
 * Kullanıcı bunu "token süresi doldu, çıkış yapıp gireyim" diye okumaz;
 * uygulamanın bozulduğunu düşünür. Bu modül kararı ÖNCEDEN verir: belirteç
 * ölmüşse yerel oturum silinir ve normal giriş akışına düşülür.
 *
 * Üç şeyi ayırmak zorunda:
 *
 *  • **Ölmüş oturum** — etkileşim gerektiren hata. Tek eylem gerektiren durum.
 *  • **Onaysız kapsam** — `GroupMember.Read.All` gibi admin onayı bekleyen
 *    kapsamlar da InteractionRequired atar. Bunlar için ÇIKIŞ YAPILMAZ:
 *    tasarımı gereği kapalı düşerler (admin sekmeleri gizli, kısıtlı asistan
 *    kilitli) ve oturum gayet sağlamdır. Bu yüzden sonda YALNIZCA girişin
 *    kendi kapsamı kullanılır, hook'ların istediği kapsamlar değil.
 *  • **Ağ yok** — çevrimdışı bir tarayıcıda her alım başarısız olur. Onu
 *    süre dolması sanıp kullanıcıyı atmak, uçaktaki birini uygulamadan eder.
 */

// MSAL sınıfı her zaman gelmiyor (bazı yollar düz `AuthError` atıyor), o
// yüzden kod listesi de kontrol edilir.
const INTERACTION_CODES = new Set([
  "interaction_required",
  "login_required",
  "consent_required",
  "invalid_grant",
  "no_tokens_found",
])

export function isInteractionRequired(err) {
  if (!err) return false
  if (err instanceof InteractionRequiredAuthError) return true
  return INTERACTION_CODES.has(err.errorCode)
}

// Girişin kendi kapsamı — `loginRequest`'i OLDUĞU GİBİ geçirmiyoruz: içinde
// `prompt: "select_account"` ve `extraScopesToConsent` var, ikisi de sessiz
// alımın işi değil.
const PROBE_SCOPES = ["User.Read"]

/**
 * Yenileme belirteci hâlâ yaşıyor mu?
 *
 * `forceRefresh` ŞART: onsuz MSAL önbellekteki erişim belirtecini döner ve
 * ölü bir yenileme belirteci bir saat daha fark edilmez — kullanıcı tam da o
 * saat içinde sohbete girip popup'ı yerdi.
 *
 * Şüphede kalırsa YAŞIYOR der. Yanlış "öldü" kararı kullanıcıyı işinin
 * ortasında dışarı atar; yanlış "yaşıyor" kararı ise bugünkü davranıştır.
 */
/**
 * SÜRE SINIRI BURADA DEĞİL, ÇAĞIRANDA.
 *
 * Bir süre bu fonksiyonun içinde 1,5 saniyelik bir yarış vardı; sebebi iyiydi
 * (açılışta bu soru ilk boyamayı bekletiyor ve cevapsız kalırsa kullanıcı
 * süresiz beyaz ekrana bakıyor), ama yeri yanlıştı: aynı fonksiyonu
 * `copilot.js` de ÇALIŞMA ANINDA, mesaj gönderilmeden hemen önce çağırıyor.
 * Orada bekletilen bir ilk boyama yok; orada doğru cevabı beklemek daha iyi,
 * çünkü "yavaş ama ölü" bir oturumu aceleyle YAŞIYOR saymak tam da bu
 * kontrolün önlemek için var olduğu popup'ı geri getirir.
 *
 * Açılış tarafı sınırı kendi çağrısında koyar — bkz. `src/main.jsx`.
 */
export async function isSessionAlive(instance) {
  const account = instance.getActiveAccount() ?? instance.getAllAccounts()[0]
  if (!account) return true // doğrulanacak oturum yok
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true

  try {
    await instance.acquireTokenSilent({
      scopes: PROBE_SCOPES,
      account,
      forceRefresh: true,
    })
    return true
  } catch (err) {
    if (!isInteractionRequired(err)) {
      // Ağ hatası, sunucu hatası, bilinmeyen — dokunma.
      console.info(
        "[session] belirteç tazelenemedi ama süre dolması değil:",
        err?.errorCode || err?.message || err,
      )
      return true
    }
    console.info("[session] yenileme belirteci ölü:", err?.errorCode || err?.message)
    return false
  }
}

/**
 * Yerel oturumu siler. YÖNLENDİRMEZ — çağıran ne yapacağına kendi karar verir.
 *
 * `logoutRedirect` DEĞİL, çünkü o Entra oturumunu da kapatır: tarayıcıdaki
 * Entra oturumu çoğu zaman bizim yenileme belirtecimizden uzun yaşar, ve onu
 * ayakta bırakırsak sessiz SSO kullanıcıyı hiçbir şey yazdırmadan geri
 * alabilir. Ayrıca `markSignedOut()` ÇAĞRILMAZ — o işaret "kullanıcı bilerek
 * çıktı" demektir ve sessiz SSO'yu bastırır; süre dolması bilinçli bir çıkış
 * değildir.
 */
export async function clearLocalSession(instance) {
  try {
    await instance.clearCache()
  } catch (err) {
    console.warn("[session] önbellek temizlenemedi:", err?.message || err)
  }
}
