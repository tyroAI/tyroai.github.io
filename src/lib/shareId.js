/**
 * Adres → Graph paylaşım kimliği (`u!` + base64url, dolgu YOK).
 *
 * Microsoft'un belgesindeki referans adres için belgelenen kimliğin birebir
 * aynısını üretiyor (2026-09-23'te sınandı: dolgu, `+`, `/` ve UTF-8 adres).
 * Bileşen/kanca dosyasından değil buradan ihraç ediliyor: iki tüketicisi var
 * (Politika klasörünün yedek yolu ve eski paylaşım kancası).
 */
export function shareId(url) {
  const b64 = btoa(unescape(encodeURIComponent(url)))
  return `u!${b64.replace(/=+$/, "").replace(/\//g, "_").replace(/\+/g, "-")}`
}
