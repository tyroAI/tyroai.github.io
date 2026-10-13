/**
 * Self Servis — kapatılan akıllı uyarıların deposu (sessionStorage, HESAP BAŞINA). Depoda yalnız
 * `alertKey` özetleri durur. Çıkışta hepsi silinir (`clearDismissedAlerts`, msal.js LOGOUT
 * zinciri): aynı sekmede giren bir sonraki kişi öncekinin kapattıklarını devralmasın.
 */
const PREFIX = "tyro-ss-alerts-dismissed"

/** Hesabın depo anahtarı. */
export const dismissedKey = (accountId) => `${PREFIX}:${accountId || "anon"}`

const storage = () => {
  try {
    return window.sessionStorage ?? null
  } catch {
    return null
  }
}

export function readDismissed(key) {
  try {
    const list = JSON.parse(storage()?.getItem(key) ?? "[]")
    return Array.isArray(list) ? list.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

export function writeDismissed(key, list) {
  try {
    storage()?.setItem(key, JSON.stringify(list))
  } catch {
    /* depolama kapalı: kapatma yalnız bu görünümde yaşar */
  }
}

/** Bütün hesapların kayıtları (ve eski, hesapsız anahtar) silinir. */
export function clearDismissedAlerts() {
  try {
    const store = storage()
    if (!store) return
    for (let i = store.length - 1; i >= 0; i -= 1) {
      const key = store.key(i)
      if (key?.startsWith(PREFIX)) store.removeItem(key)
    }
  } catch {
    /* depolama kapalı */
  }
}
