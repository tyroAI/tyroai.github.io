/**
 * Sağ alttaki bildirim yığınının ÖRTMEMESİ gereken alanlar: sağ panel (sohbet sütunu) ve
 * sohbet bestecisi. Kart besteciye binince "Gönder", bildirim kapanana dek (5–15 sn)
 * tıklanamıyordu. Alanlar kendini kaydeder (`useToastAvoid`); her bildirim çizilmeden hemen
 * önce `placeToastStack()` yığının yerini hesaplayıp iki kök değişkene yazar, kural
 * `src/styles/toasts.css`te.
 *
 * Ölçüm gösterim anında, sürekli izleme yok: besteci boş sohbette ortada, konuşma başlayınca
 * altta duruyor ve konum değişimi boyut değişimi gibi gözlenemiyor.
 */

// Sonner'ın ölçüleri: kenar payı 24 px, 600 px ve altında tam genişlik. Kart genişliği
// `TOAST_SURFACE`ten; yükseklik uzun bir kartın payı (çakışma sınaması için).
const EDGE = 24
const CARD_W = 470
const STACK_H = 200
const GAP = 12
const SCREEN_GUTTER = 16
const MOBILE_MAX = 600

const zones = new Map() // öğe → "right" | "bottom"

/** Alanı kaydeder; dönen işlev kaydı siler. */
export function registerToastAvoid(el, side) {
  zones.set(el, side)
  return () => zones.delete(el)
}

function onScreen(r, vw, vh) {
  return r.width > 0 && r.height > 0 && r.left < vw && r.right > 0 && r.top < vh && r.bottom > 0
}

/**
 * Saf geometri. `right`: yığının sağdan fazladan kayacağı piksel (sağ panelin soluna);
 * `bottom`: yığının alt kenarının görüntü alanının dibinden uzaklığı (bestecinin üstüne).
 *
 * @param {{ vw: number, vh: number, zones: { side: "right" | "bottom", rect: DOMRect }[] }} p
 */
export function stackInsets({ vw, vh, zones: list }) {
  const mobile = vw <= MOBILE_MAX
  const cardW = Math.min(CARD_W, vw - 2 * SCREEN_GUTTER)

  // Önce panel: yığın panelin soluna geçer — ama yalnız kart orada ekrana sığıyorsa.
  // Sığmıyorsa (dar tablet) kaydırma yok, aşağıdaki besteci kuralı devralır.
  let right = 0
  if (!mobile) {
    for (const { side, rect } of list) {
      if (side !== "right" || !onScreen(rect, vw, vh)) continue
      const shift = Math.round(vw - rect.left)
      if (vw - EDGE - shift - cardW >= SCREEN_GUTTER) right = Math.max(right, shift)
    }
  }

  // Sonra besteci: yığının sütunuyla kesişiyor ve dibe yakınsa yığın onun üstüne çıkar.
  const colRight = mobile ? vw : vw - EDGE - right
  const colLeft = mobile ? 0 : colRight - cardW
  let bottom = 0
  for (const { side, rect } of list) {
    if (side !== "bottom" || !onScreen(rect, vw, vh)) continue
    const hits = rect.right > colLeft && rect.left < colRight && rect.bottom > vh - EDGE - STACK_H
    if (hits) bottom = Math.max(bottom, Math.round(vh - rect.top + GAP))
  }
  return { right, bottom }
}

/** Kayıtlı alanları ölçer ve yığının yerini kök değişkenlere yazar. */
export function placeToastStack() {
  if (typeof window === "undefined") return
  const list = [...zones].map(([el, side]) => ({ side, rect: el.getBoundingClientRect() }))
  const { right, bottom } = stackInsets({
    vw: window.innerWidth,
    vh: window.innerHeight,
    zones: list,
  })
  const style = document.documentElement.style
  style.setProperty("--toast-avoid-right", `${right}px`)
  style.setProperty("--toast-avoid-bottom", `${bottom}px`)
}
