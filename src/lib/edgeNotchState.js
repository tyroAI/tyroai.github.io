/**
 * Sağ kenar çentiği AÇIK mı — kullanıcı tutamaktan daraltabiliyor ve tarayıcı
 * bunu hatırlıyor.
 *
 * ⚠️ **İKİ KAPSAM, AYRI HAFIZA.** Anasayfa (`home`) kendi seçimini tutar ve
 * varsayılanı KAPALI: sayfa zaten posta, takvim ve işlerin özetini gösteriyor,
 * ray ilk bakışta tekrar olurdu. Öteki sayfalar (`pages`) ortak bir seçim tutar
 * ve varsayılanı AÇIK: yeni kullanıcı rayı görmeli ki daraltabileceğini bilsin.
 * Bir kapsamda açıp kapamak ötekini değiştirmez. `pages` eski anahtarı
 * kullanıyor — bugüne kadarki seçimler korunuyor.
 *
 * `orbStyle.js`in deseni: localStorage + aynı sekme için özel olay (`storage`
 * yalnız BAŞKA sekmeleri haberdar eder).
 */
const SCOPES = {
  home: { key: "tyro-edge-notch-home-v1", fallback: false },
  pages: { key: "tyro-edge-notch-v1", fallback: true },
}
const EVENT = "tyro:edge-notch"

/** Rotanın kapsamı: Anasayfa ayrı, gerisi ortak. */
export function edgeNotchScope(activeId) {
  // Pano Anasayfa'nın deneme kopyası: çentiğin açık/kapalı hâli onunla ortak.
  return activeId === "myspace" || activeId === "widgets" ? "home" : "pages"
}

export function edgeNotchFallback(scope = "pages") {
  return (SCOPES[scope] ?? SCOPES.pages).fallback
}

export function readEdgeNotchOpen(scope = "pages") {
  const { key, fallback } = SCOPES[scope] ?? SCOPES.pages
  if (typeof window === "undefined") return fallback
  try {
    const value = window.localStorage.getItem(key)
    return value == null ? fallback : value !== "closed"
  } catch {
    return fallback
  }
}

export function writeEdgeNotchOpen(open, scope = "pages") {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem((SCOPES[scope] ?? SCOPES.pages).key, open ? "open" : "closed")
  } catch {
    // Depo kapalı: seçim bu oturumda görünür, yenilemede varsayılana döner.
  }
  window.dispatchEvent(new Event(EVENT))
}

export function subscribeEdgeNotch(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}
