/**
 * Açılır kartın yönü: tetiğin ekrandaki yerine göre kartın EN ÇOK
 * görüneceği ve en ferah duracağı taraf. Radix yalnız "sığmazsa tersine
 * çevir" yapıyor; sağ alttaki bir karttan açılan kişi kartı bu yüzden üste
 * çevrilip header'ın altına, sağ üst köşeye sıkışıyordu — solda bütün ekran
 * boşken.
 *
 * `preferred`: tek yön ya da sıralı tercih listesi (ör. ipucu ["top",
 * "bottom"] — metne dikey bağlı okunsun). Listedeki yönlerden kartı TAM
 * gösteren ilki seçilir; hiçbiri göstermiyorsa dört yönden kartın görünen payı
 * en büyük olan, eşitlikte boşluğu en geniş olan.
 */
const GAP = 12
const SIDES = ["right", "left", "bottom", "top"]

export function roomiestSide(rect, size, preferred = "bottom", view) {
  const vw = view?.width ?? window.innerWidth
  const vh = view?.height ?? window.innerHeight
  const room = {
    top: rect.top - GAP,
    bottom: vh - rect.bottom - GAP,
    left: rect.left - GAP,
    right: vw - rect.right - GAP,
  }
  const clamp = (n) => Math.max(0, Math.min(1, n))
  const shown = (side) =>
    side === "left" || side === "right"
      ? clamp(room[side] / size.width) * clamp((vh - 2 * GAP) / size.height)
      : clamp(room[side] / size.height) * clamp((vw - 2 * GAP) / size.width)
  const wants = Array.isArray(preferred) ? preferred : [preferred]
  const fits = wants.find((s) => shown(s) >= 0.999)
  if (fits) return fits
  return SIDES.reduce((best, s) => {
    const d = shown(s) - shown(best)
    return d > 0.001 || (Math.abs(d) <= 0.001 && room[s] > room[best]) ? s : best
  }, wants[0])
}

/** Yana açılan kart tetiğin hizasında ortalanır (Radix ekrana sığdırır). */
export const alignFor = (side, align = "start") =>
  side === "left" || side === "right" ? "center" : align
