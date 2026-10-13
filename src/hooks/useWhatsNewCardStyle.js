import { useCallback, useSyncExternalStore } from "react"
import {
  DEFAULT_WHATS_NEW_CARD_STYLE,
  readWhatsNewCardStyle,
  readWhatsNewMinimized,
  subscribeWhatsNewCardStyle,
  subscribeWhatsNewMinimized,
} from "@/lib/whatsNewCardStyle"

/** Seçili kart görünümünün kimliği; depo değişince yeniden çizer. */
export function useWhatsNewCardStyle() {
  return useSyncExternalStore(
    subscribeWhatsNewCardStyle,
    readWhatsNewCardStyle,
    () => DEFAULT_WHATS_NEW_CARD_STYLE,
  )
}

/**
 * Kart bu YÜZEYDE küçültülmüş mü ("desktop" · "mobile"); depo değişince
 * yeniden çizer. İki yüzeyin iki ayrı anahtarı ve iki ayrı varsayılanı var
 * — gerekçe `whatsNewCardStyle.js`te.
 *
 * ⚠️ **SUNUCU DALI DA YÜZEYİN VARSAYILANINI DÖNER**, düz `false` değil:
 * telefonda `false` dönseydi ilk boyamada TAM kart çizilir ve bir kare
 * sonra miniye inerdi — sidebar'ın zıplamasının tam tanımı.
 */
export function useWhatsNewMinimized(surface = "desktop") {
  // `useSyncExternalStore` okuyucuların KİMLİĞİNİ bağımlılık sayıyor;
  // satır içi ok fonksiyonu her render'da yeniden abone olurdu.
  const get = useCallback(() => readWhatsNewMinimized(surface), [surface])
  return useSyncExternalStore(subscribeWhatsNewMinimized, get, get)
}
