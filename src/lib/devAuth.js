// DEV-only kimlik kestirmesi: `?devauth=1` ile MSAL turu olmadan uygulamayı gez
// (`?devauth=0` kapatır; sekme kapanınca da düşer). MSAL client id koda gömülü
// olduğu için isMsalConfigured her zaman true — yani env ile mock moda geçmek
// mümkün değil, bu yüzden görsel/UX denemeleri için açık bir kapı gerekiyor.
// Kestirmede MSAL hesabı yoktur: useMe mock kullanıcıya, ConfigProvider
// seed/localStorage verisine düşer ve useIsUnderManager fail-closed davranır —
// kısıtlı agent KİLİTLİ görünür, ki test etmek istediğimiz hâl de bu.
// Açılıştaki sessiz SSO da kestirmeye bakar (`lib/silentSso.js`): MSAL'sız
// gezen sekme Entra'ya yönlendirilmez.
// import.meta.env.DEV false olduğunda tüm blok ölü koda dönüşür, prod
// bundle'ına girmez.
const DEV_AUTH_BYPASS_KEY = "tyro-dev-auth"

export function readDevAuthBypass() {
  if (!import.meta.env.DEV || typeof window === "undefined") return false
  const param = new URLSearchParams(window.location.search).get("devauth")
  if (param === "1") window.sessionStorage.setItem(DEV_AUTH_BYPASS_KEY, "1")
  if (param === "0") window.sessionStorage.removeItem(DEV_AUTH_BYPASS_KEY)
  return window.sessionStorage.getItem(DEV_AUTH_BYPASS_KEY) === "1"
}
