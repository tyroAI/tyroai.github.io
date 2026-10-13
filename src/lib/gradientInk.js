/**
 * MARKA GRADYANININ ÜSTÜNDEKİ MÜREKKEP — beyaz mı koyu mu (2026-09-30).
 *
 * `--brand-on-brand` bütün paletlerde BEYAZ ve bu, koyu dolgulu düğmelerde
 * doğru (`bg-brand-fill-deep`). Ama To-Do'nun karşılama kartı paletin TAM
 * gradyanını taşıyor ve açık paletlerde (ocean-breeze ve kardeşleri) beyaz
 * metin açık camgöbeğinin üstünde ~2:1'de kalıyordu (ölçüldü, görsel inceleme
 * turu). `--brand-on-brand`ı değiştirmek o düğmelerin hepsini bozardı; karar
 * bu yüzden YALNIZ gradyan yüzeyi için ve ölçülerek veriliyor.
 *
 * ⚠️ **ÖLÇÜLEN, METNİN ALTINDAKİ İKİ DURAK** (`--brand-from`, `--brand-via`).
 * Kartın gradyanı sol üstten sağ alta akıyor; metin sol üstte (`from` → `via`)
 * duruyor, sağ alt köşe (`to`) çoğu zaman boş. Üç durağın en kötüsüne bakmak
 * varsayılan Insta paletini bile koyuya çevirirdi — sarı köşesi yüzünden.
 * ⚠️ Renkler PİKSEL okunarak çözülüyor (`lib/voiceBeam.js`in dersi):
 * `getComputedStyle` `oklch(...)`u olduğu gibi döndürüyor, 1×1 tuvale boyamak
 * her biçimi (hex · rgb · oklch · color-mix) aynı `rgb`ye indiriyor.
 */

function channel(c) {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

export function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Kök elemandaki marka tokenlarını `[r, g, b]` olarak okur; okuyamazsa `null`. */
export function readBrandStops(tokens = ["--brand-from", "--brand-via"]) {
  if (typeof document === "undefined") return null
  try {
    const root = getComputedStyle(document.documentElement)
    const canvas = document.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    const out = []
    for (const token of tokens) {
      const raw = root.getPropertyValue(token).trim()
      if (!raw) return null
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = "#000"
      ctx.fillStyle = raw
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      out.push([r, g, b])
    }
    return out
  } catch {
    return null
  }
}

/** Koyu mürekkep: neredeyse siyah bir lacivert — iki temada da aynı (gradyan temayla değişmiyor). */
export const DARK_INK = [15, 26, 42]

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t))
}

/**
 * `"light"` (beyaz mürekkep) ya da `"dark"`: metin bölgesinden alınan üç
 * örnekte (`from` · ikisinin ortası · `via`) EN KÖTÜ kontrastı daha yüksek
 * olan mürekkep. Eşitlikte beyaz (bugünkü davranış).
 *
 * ⚠️ "Beyazın en kötüsü eşiğin altındaysa koyu" kuralı ÖLÇÜLDÜ ve YANLIŞTI:
 * pastel-lavender · green-garden · arctic-mint'te `from` koyu, `via` açık;
 * kural onları koyuya çeviriyordu ama koyu mürekkep o paletlerin koyu
 * başlangıcında 2–2,4:1'e düşüyor — başlık tam orada. Soru "beyaz yetiyor mu"
 * değil, "hangisi bu bölgede daha az kötü".
 * Okunamazsa `"light"`: yanlış bir "koyu" kararı koyu paletlerde siyah üstüne
 * siyah yazdırırdı.
 */
export function gradientInk(stops = readBrandStops()) {
  if (!stops || stops.length < 2) return "light"
  const [from, via] = stops
  const samples = [from, mix(from, via, 0.5), via]
  const white = [255, 255, 255]
  const worstWhite = Math.min(...samples.map((s) => contrast(white, s)))
  const worstDark = Math.min(...samples.map((s) => contrast(DARK_INK, s)))
  return worstDark > worstWhite ? "dark" : "light"
}

/**
 * Karşılama kartlarının mürekkebi (`--hero-ink`), `gradientInk()`in kararına
 * göre — To-Do, Keşfet › Dosyalarım ve Sana özel aynı iki tonu okuyor. Bir
 * bileşen dosyasından sabit ihraç etmek React Refresh sınırını bozduğu için
 * burada.
 */
export const HERO_INK = Object.freeze({ light: "#ffffff", dark: "rgb(15 26 42)" })
