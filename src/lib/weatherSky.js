/**
 * HAVA DURUMUNUN RENKLERİ — sıcaklık ölçeği ve kartın gökleri.
 * Saf modül (bileşen dosyası yalnız bileşen ihraç etsin — React Refresh).
 *
 * Bunlar PALET DEĞİL, ANLAMSAL renkler (durum renkleri gibi palet sisteminin
 * DIŞINDA). Göklerin kendisi CSS değişkeni: `myspace/skyCard.css`
 * (`:is(.sky-weather, .wxd-sky)`), burada yalnız türün ADI.
 * ⚠️ Eski pencerenin gök tablosu (`SKY` · `skyBackground` · `spillRgb`)
 * 2026-10-03'te pencere kartın diline geçince silindi — tek tüketicisi oydu.
 */

/**
 * SICAKLIK ÖLÇEĞİ — soğuktan sıcağa, °C'ye bağlı (hava haritalarının dili):
 * çivit → mavi → gök → camgöbeği → yeşil → sarı → turuncu → kırmızı → bordo.
 * Ölçek MUTLAK: 22° her gün aynı sarıdır, satırın ne kadar "sıcak"
 * göründüğü haftanın ortalamasına göre değişmez.
 */
export const TEMP_STOPS = [
  [-20, "#5E4FD8"],
  [-10, "#3D63E0"],
  [0, "#2E8FEA"],
  [6, "#1FB6D6"],
  [12, "#2DC59A"],
  [17, "#8CCF4D"],
  [21, "#F2CD3C"],
  [26, "#F7A13A"],
  [31, "#F06A35"],
  [36, "#DD3B3B"],
  [42, "#B0244E"],
]

const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

/** °C → `rgb(…)`; ölçeğin dışı uçta kenetlenir. sRGB'de doğrusal karışım. */
export function tempColor(t) {
  const first = TEMP_STOPS[0]
  const last = TEMP_STOPS[TEMP_STOPS.length - 1]
  if (!(t > first[0])) return first[1]
  if (t >= last[0]) return last[1]
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    const [t1, h1] = TEMP_STOPS[i]
    if (t <= t1) {
      const [t0, h0] = TEMP_STOPS[i - 1]
      const p = (t - t0) / (t1 - t0)
      const a = toRgb(h0)
      const b = toRgb(h1)
      return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * p)).join(" ")})`
    }
  }
  return last[1]
}

/**
 * Ortak ölçeğin [lo, hi] aralığı için iz gradyanı. Her gün satırı bu TEK
 * gradyanın kendi dilimini gösterir (`clip-path: inset(...)`), yani 14°'nin
 * rengi her satırda aynı yerde ve aynı renkte.
 */
export function tempTrack(lo, hi) {
  const span = Math.max(1, hi - lo)
  const pct = (t) => `${(((t - lo) / span) * 100).toFixed(2)}%`
  const stops = [`${tempColor(lo)} 0%`]
  for (const [t, h] of TEMP_STOPS) if (t > lo && t < hi) stops.push(`${h} ${pct(t)}`)
  stops.push(`${tempColor(hi)} 100%`)
  return `linear-gradient(90deg, ${stops.join(", ")})`
}

/**
 * AKIŞIM'IN HAVA KARTI (Astra'nın "Sky / Karşılama" kartı, 2026-10-03) — 11 türü
 * kartın altı türüne indirir (`data-weather`; renkler `myspace/skyCard.css`te,
 * kaynağın birebir aynısı). Gece/gündüz ayrıca `data-time` ile.
 * ⚠️ Kapalı gök (`cloudy`) Astra'da yok: kartın `cloudy` göğünü alır ama çizimde
 * güneş ÇİZİLMEZ (`cardSunlit`) — kapalı bir günde güneş göstermek yalan olurdu.
 */
export function cardSkyOf(kind) {
  if (kind === "clear") return "sunny"
  if (kind === "partly" || kind === "cloudy") return "cloudy"
  if (kind === "fog") return "fog"
  if (kind === "snow") return "snow"
  if (kind === "thunder") return "storm"
  return "rain"
}

/** Çizimde güneş (gündüz) var mı — açık ve parçalı bulutlu gökte. */
export const cardSunlit = (kind) => kind === "clear" || kind === "partly"
