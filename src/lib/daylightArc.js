/**
 * GÜN YAYI — kesik çizgili tepe, Astra'nın hava kartından (2026-10-02). Saf
 * geometri: bileşen dosyası yalnız bileşen ihraç etsin (React Refresh).
 *
 * İki eğri, AYNI biçim (`M52 250 C158 220 132 100 240 100 …`, 480×300):
 *   - `CARD_ARC` — Akışım'ın hava kartı, Astra'nın kendi koordinatları; SVG
 *     kartın tamamına gerilir (`viewBox 0 0 480 300`, `preserveAspectRatio=none`).
 *   - `ARC_D` / `arcPoint` / `arcPathTo` — pencerenin kahramanı, aynı tepe 0..100
 *     kutusuna taşınmış (yay orada bir ızgara öğesinin kutusunu doldurur).
 * Çizgi `vector-effect: non-scaling-stroke` ile her genişlikte aynı kalınlıkta.
 * Güneş SVG'nin içinde DEĞİL, yüzdeyle konumlanan bir HTML noktası — gerilen
 * SVG'nin içinde daire elipse dönerdi.
 *
 * İlerleme ↔ konum Astra'nın kuralıyla: ilk yarı sol kübik, ikinci yarı sağ
 * kübik, her birinde Bézier parametresi. Gidilen yol (`pathTo`) aynı
 * parametreyle de Casteljau bölmesinden — nokta ile çizginin ucu birebir aynı.
 */
const fmt = (n) => Math.round(n * 100) / 100
const cubic = (p) =>
  `C${p[1].map(fmt).join(" ")} ${p[2].map(fmt).join(" ")} ${p[3].map(fmt).join(" ")}`
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

/** Kübiği `t`de böler, SOL parçanın dört noktasını döndürür (de Casteljau). */
function splitLeft(p, t) {
  const a = lerp(p[0], p[1], t)
  const b = lerp(p[1], p[2], t)
  const c = lerp(p[2], p[3], t)
  const d = lerp(a, b, t)
  const e = lerp(b, c, t)
  return [p[0], a, d, lerp(d, e, t)]
}

const clamp01 = (p) => (Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0)

/** Kübiğin `t`deki x'i. */
const xAt = (p, t) => {
  const u = 1 - t
  return (
    u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0]
  )
}

function makeArc(LEFT, RIGHT) {
  const half = (p) => (p <= 0.5 ? [LEFT, p * 2] : [RIGHT, (p - 0.5) * 2])
  const x0 = LEFT[0][0]
  const x1 = RIGHT[3][0]
  return {
    d: `M${LEFT[0].join(" ")}${cubic(LEFT)}${cubic(RIGHT)}`,
    /**
     * ZAMAN → EĞRİ PARAMETRESİ (2026-10-04, istek: *"güneşin çizgi üzerindeki
     * hareketi gerçekçi olsun"*). Gökte güneş yatayda zamanla DÜZGÜN ilerler;
     * Bézier parametresi ise uçlarda hızlı, tepede yavaş yürüyordu (sabah
     * saatinde güneş olması gerekenden ~12 birim ileride). Burada x geçen
     * sürenin oranıyla doğrusal, y eğrinin o x'teki yüksekliği — öğle (evrenin
     * ortası) tepede. İki kübiğin x'i tekdüze artıyor, ikiye bölmeyle çözülür.
     * Dönen değer `point`/`pathTo`ya verilir; nokta ile çizginin ucu aynı kalır.
     */
    param(time) {
      const x = x0 + clamp01(time) * (x1 - x0)
      const mid = LEFT[3][0]
      const [curve, base] = x <= mid ? [LEFT, 0] : [RIGHT, 0.5]
      let a = 0
      let b = 1
      for (let i = 0; i < 24; i++) {
        const m = (a + b) / 2
        if (xAt(curve, m) < x) a = m
        else b = m
      }
      return base + ((a + b) / 2) * 0.5
    },
    /** Yay üzerindeki nokta, eğrinin kendi kutusunda: `{ x, y }`. */
    point(progress) {
      const [curve, t] = half(clamp01(progress))
      const [x, y] = splitLeft(curve, t)[3]
      return { x, y }
    },
    /** Doğuştan `progress`e kadar gidilen yol (SVG `d`). */
    pathTo(progress) {
      const p = clamp01(progress)
      if (p <= 0.5) return `M${LEFT[0].join(" ")}${cubic(splitLeft(LEFT, p * 2))}`
      return `M${LEFT[0].join(" ")}${cubic(LEFT)}${cubic(splitLeft(RIGHT, (p - 0.5) * 2))}`
    },
  }
}

const DIALOG_ARC = makeArc(
  [
    [2, 96],
    [28.9, 78],
    [22.2, 6],
    [50, 6],
  ],
  [
    [50, 6],
    [77.8, 6],
    [71.1, 78],
    [98, 96],
  ],
)

export const ARC_D = DIALOG_ARC.d
export const arcPoint = DIALOG_ARC.point
export const arcPathTo = DIALOG_ARC.pathTo

/** Kartın yayı — Astra'nın birebir koordinatları, kutu 480×300 (`CARD_ARC.box`). */
export const CARD_ARC = {
  ...makeArc(
    [
      [52, 250],
      [158, 220],
      [132, 100],
      [240, 100],
    ],
    [
      [240, 100],
      [348, 100],
      [322, 220],
      [428, 250],
    ],
  ),
  box: { w: 480, h: 300 },
}
