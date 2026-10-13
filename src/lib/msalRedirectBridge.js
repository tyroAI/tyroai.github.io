/**
 * MSAL v5'in REDIRECT BRIDGE'i — bu uygulamada EKSİKTİ ve eksikliği sahada
 * görüldü: *"token süresi dolunca yeni bir pencerede sitenin kendisi yeniden
 * açılıyor."*
 *
 * ── NEDEN OLUYORDU ────────────────────────────────────────────────────────
 *
 * MSAL v5 popup ve gizli-iframe akışlarında cevabı **URL'den OKUMUYOR**.
 * Ölçüldü (`@azure/msal-browser@5.11.0` kaynağı):
 *
 *   PopupClient        → `waitForBridgeResponse(...)`
 *   SilentIframeClient → `waitForBridgeResponse(...)`
 *   waitForBridgeResponse → `new BroadcastChannel(libraryState.id)` dinler
 *
 * O mesajı yayınlayan TEK yer `@azure/msal-browser/redirect-bridge`
 * modülüdür ve onu REDIRECT URI'deki sayfanın çalıştırması gerekir. Bizim
 * redirect URI'miz uygulamanın kökü ve orada köprü HİÇ yoktu. Sonuç zinciri:
 *
 *   1. `acquireTokenPopup` pencereyi açar → Entra → cevapla kökümüze döner
 *   2. o pencerede KÖPRÜ YERİNE UYGULAMANIN KENDİSİ açılır
 *   3. kimse BroadcastChannel'a bir şey yazmaz → açan pencere
 *      `popupBridgeTimeout` boyunca bekler ve düşer
 *   4. pencere de kapanmaz — kullanıcının gördüğü "yeni pencerede site" budur
 *
 * Aynı boşluk gizli iframe'de de vardı: `acquireTokenSilent` yenileme
 * belirteciyle çözemediği bir kapsam için iframe'e düştüğünde cevap ASLA
 * geri gelmiyordu. `index.html` o çerçevede `window.stop()` çağırıyordu —
 * uygulamanın orada çizilmesini engelliyordu, ama köprüyü de imkânsız
 * kılıyordu. Yani semptomu susturuyor, sebebi kapatmıyordu.
 *
 * ── ÇÖZÜM ─────────────────────────────────────────────────────────────────
 *
 * Köprüyü kendimiz çalıştırıyoruz. `broadcastResponseToMainFrame()` cevabı
 * ayrıştırıp BroadcastChannel'a yazıyor ve pencereyi KAPATIYOR; açan pencere
 * belirtecini alıyor, kullanıcı hiçbir şey görmüyor.
 *
 * ⚠️ **MSAL'IN KENDİ MODÜLÜ ÇAĞRILIR, DURUM ÇÖZÜMÜ YENİDEN YAZILMAZ.**
 * `state` alanının kodlaması (base64 kütüphane durumu + `|` + kullanıcı
 * durumu) MSAL'ın protokol ayrıntısı; onu `index.html`e elle kopyalamak
 * ikinci bir doğruluk kaynağı açardı ve paket sürümüyle sessizce ayrışırdı.
 *
 * ── YALNIZ MSAL'IN AÇTIĞI PENCEREDE ÇALIŞIR ───────────────────────────────
 *
 * ⚠️ **YÖNLENDİRME (redirect) AKIŞINA DOKUNULMAZ.** Giriş bugün çalışıyor:
 * tam sayfa `loginRedirect` → kök → `handleRedirectPromise()`. Köprüyü ORADA
 * da çalıştırmak, çalışan tek akışı değiştirmek olurdu (köprü redirect
 * tipinde cevabı sessionStorage'a yazıp geri gezinir — MSAL'ın tasarımı, ama
 * bizim boot zincirimiz o yola göre yazılmadı). Kapı bu yüzden pencereyi
 * sorar, cevabın tipini değil.
 *
 * ⚠️ **POPUP'I `window.name` ELE VERİR.** MSAL pencereyi
 * `msal.<clientId>.<kapsamlar>.<authority>.<correlationId>` adıyla açıyor
 * (`PopupClient.generatePopupName`, ön ek sabiti `POPUP_NAME_PREFIX`). Yalnız
 * `window.opener`a bakmak YETMEZ ve TEHLİKELİ olurdu: başka bir siteden
 * `target="_blank"` ile açılan bir sekmede de `opener` dolu olur, o sekmede
 * kullanıcı giriş yaparsa adres yine `code=` taşır — ve uygulama açılmayı
 * reddederse kişi giremez hâle gelirdi. Ada bakmak o yanlış pozitifi
 * yapısal olarak imkânsız kılıyor.
 */

/** Adreste bir auth cevabı var mı? (`index.html`teki kalıbın aynısı.) */
const AUTH_RESPONSE = /[?#].*(code=|error=|state=)/

/** MSAL popup pencerelerinin `window.name` ön eki (POPUP_NAME_PREFIX). */
const POPUP_NAME_PREFIX = "msal."

/**
 * Bu pencere MSAL'a mı ait — yani gizli yenileme iframe'i ya da MSAL'ın
 * açtığı bir popup mu? Öyleyse uygulama BURADA AÇILMAZ; pencerenin tek işi
 * cevabı açan pencereye ulaştırmaktır.
 */
export function isMsalOwnedWindow() {
  if (typeof window === "undefined") return false
  // `index.html` aynı kararı bundle inmeden önce veriyor; oradaki bayrak
  // varsa ona güvenilir (bu, aynı kuralın iki kez yazılmaması için tek
  // yönlü bir devir — JS tarafı yine de kendi kontrolünü yapabilir).
  if (window.__MSAL_RENEWAL_FRAME__) return true
  if (!AUTH_RESPONSE.test(window.location.href)) return false
  const inIframe = Boolean(window.parent && window.parent !== window)
  const inMsalPopup = Boolean(
    window.opener &&
    window.opener !== window &&
    typeof window.name === "string" &&
    window.name.indexOf(POPUP_NAME_PREFIX) === 0,
  )
  return inIframe || inMsalPopup
}

/**
 * Cevabı açan pencereye yayınlar ve bu pencereyi kapatır.
 *
 * ⚠️ **HATA YUTULUR AMA PENCERE YİNE KAPANIR.** Köprü ayrıştıramazsa
 * (bozuk `state`, eksik `code`) yapacak bir şey yok; açan pencere zaten
 * zaman aşımına düşecek. Geride açık kalan pencere ise kullanıcının
 * şikayet ettiği şeyin ta kendisi — o yüzden son adım her hâlükârda
 * kapatmaktır. İframe'de `window.close()` etkisizdir ve MSAL çerçeveyi
 * kendisi söker.
 */
export async function runMsalRedirectBridge() {
  try {
    const { broadcastResponseToMainFrame } = await import("@azure/msal-browser/redirect-bridge")
    await broadcastResponseToMainFrame()
  } catch (err) {
    console.info("[msal] redirect bridge failed:", err?.errorCode || err?.message || err)
    try {
      window.close()
    } catch {
      // kapatılamıyorsa yapılacak bir şey yok
    }
  }
}
