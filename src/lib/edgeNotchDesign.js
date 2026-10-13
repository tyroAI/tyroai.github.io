/**
 * Sağ kenar çentiğinin KABUĞU — üç tasarım, kişisel bir tercih (istek
 * üzerine, 2026-09-20: "üç tasarım olacak, profil tercihlerden seçilecek").
 *
 *   palette    · Yenilikler kartının seçili zeminiyle aynı koyu kabuk
 *                (paletin tonunda)
 *   glassLight · varsayılan — açık, buzlu "liquid glass": arkadaki sayfa
 *                bulanık geçer, kenarda ince ışık çizgisi, yüzeyde ağır ağır
 *                kayan parıltı
 *   glassBrand · aynı cam, paletin üç durağıyla boyanmış
 *
 * ⚠️ ÜÇÜ DE AYNI ŞEYİ GÖSTERİR: aynı üç düğme, aynı sayılar, aynı halka
 * kuralı, aynı paneller. Değişen yalnız kabuk — bir tasarımın "daha az"
 * göstermesi bir tercih değil bir kusur olurdu (`whatsNewCardStyle.js`in
 * aynı kuralı).
 *
 * ⚠️ KİMLİKLER DEPOLAMA DEĞERİDİR — yayından sonra değiştirilmez;
 * değiştirmek herkesi varsayılana düşürür. Görünen adlar sözlükte
 * (`profile.prefs.notchDesign.<id>`), DOM özniteliği `EDGE_NOTCH_DESIGN_ATTR`.
 *
 * `edgeNotchState.js` ile aynı desen: localStorage + aynı sekme için özel
 * olay. Varsayılan depoya YAZILMAZ — "seçmedim" ile "seçtim" ayrımı kalsın.
 */
const KEY = "tyro-edge-notch-design-v1"
const EVENT = "tyro:edge-notch-design"

export const EDGE_NOTCH_DESIGNS = ["palette", "glassLight", "glassBrand"]
/**
 * ⚠️ VARSAYILAN KULLANICININ SEÇİMİDİR, benim tahminim değil: `palette`
 * (ilk sürüm, 2026-09-20) → `glassBrand` (aynı gün, istek: "palet cam
 * varsayılan olsun") → `glassLight` (2026-09-29, istek: "çentik açık cam
 * varsayılan olsun"). Yalnız hiç seçim yapmamış tarayıcıyı etkiler — bu
 * modül varsayılanı depoya YAZMIYOR, yani elle "palet cam" seçmiş olan
 * kişinin seçimi yerinde kalır. Açık camda kabuk paletten boyanmadığı için
 * paleti taşıyan şey artık aç/kapa çizgisi (`EdgeNotch`).
 */
export const DEFAULT_EDGE_NOTCH_DESIGN = "glassLight"

/** Depo kimliği → `data-design` değeri (CSS seçicileri bunu okur). */
export const EDGE_NOTCH_DESIGN_ATTR = {
  palette: "palette",
  glassLight: "glass-light",
  glassBrand: "glass-brand",
}

const VALID = new Set(EDGE_NOTCH_DESIGNS)

export function readEdgeNotchDesign() {
  if (typeof window === "undefined") return DEFAULT_EDGE_NOTCH_DESIGN
  try {
    const v = window.localStorage.getItem(KEY)
    return VALID.has(v) ? v : DEFAULT_EDGE_NOTCH_DESIGN
  } catch {
    return DEFAULT_EDGE_NOTCH_DESIGN
  }
}

export function writeEdgeNotchDesign(id) {
  if (typeof window === "undefined" || !VALID.has(id)) return
  try {
    window.localStorage.setItem(KEY, id)
  } catch {
    // Depo kapalı: seçim bu oturumda görünür, yenilemede varsayılana döner.
  }
  window.dispatchEvent(new Event(EVENT))
}

export function subscribeEdgeNotchDesign(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}
