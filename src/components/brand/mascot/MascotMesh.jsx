import { useId } from "react"

/**
 * MESH IŞIĞI — kürenin arkasına yayılan yumuşak ışık, AYARLANABİLİR hâliyle.
 *
 * 2026-09-13, istek üzerine: *"orb maskot arkasında mesh ışığının yoğunluğunu
 * biraz daha artırıp biraz daha çevreye yay."*
 *
 * ⚠️ **BU KATMAN BİZİM, ÇÜNKÜ `mascot.mjs`E DOKUNULMAZ.** Çizici kaynaktan
 * BİREBİR kopya (sha256 eşleşiyor) ve öyle kalmalı; onun kendi mesh'i sabit
 * üç elips, iki ayarı yok. Çare kaynağın mesh'ini KAPATIP (`mesh: false`) aynı
 * geometriyi burada, iki çarpanla yeniden çizmek:
 *
 *   `intensity` — durak opaklıklarını çarpar (kaynağın değerleri = 1,0)
 *   `spread`    — elips yarıçaplarını çarpar (kaynağın değerleri = 1,0)
 *
 * Geometri ve renk durakları kaynağın KENDİ değerleri, satır satır kopya
 * (`mascot.mjs`in `meshDefs` + `mesh` blokları). Çarpanlar 1,0 verildiğinde
 * çıktı kaynağınkiyle aynı ışığı verir — yani "biraz daha" istendiğinde
 * uyarlanan eksen yine SAYILI: yoğunluk ve yayılım, başka hiçbir şey.
 *
 * ⚠️ **AYRI BİR `<svg>`, aynı `viewBox`.** Maskotun tuvali 440×470; mesh de
 * aynı kutuyu kullanıyor ve `position:absolute; inset:0` ile tam üstüne
 * oturuyor, yani iki katman piksel piksel hizalı. Yayılım 1,0'ın üstüne
 * çıkınca elipsler kutunun dışına taşıyor — `overflow:visible` bu yüzden
 * şart (maskotun kök SVG'sinde de aynısı var).
 *
 * ⚠️ **KENDİ `useId()`İ VAR.** Üç gradyan da `id` ile adlandırılıyor ve
 * `url(#…)` BELGEDEKİ İLK eşleşmeye çözülür; aynı sayfada iki maskot varsa
 * (stüdyoda beş tane) ikincisinin mesh'i birincisinin rengine düşerdi.
 *
 * ⚠️ **DEKORATİF.** `aria-hidden`: kaynakta da öyle (`data-mesh` grubu
 * `aria-hidden="true"` taşıyor) — bu bir ışık, bir bilgi değil.
 */

/** Kaynağın kendi durakları: [offset, opacity]. `offset` 0 ise yazılmaz. */
const STOPS = {
  a: [
    [null, 0.48],
    [0.4, 0.25],
    [0.76, 0.08],
    [1, 0],
  ],
  b: [
    [null, 0.5],
    [0.4, 0.3],
    [0.76, 0.12],
    [1, 0],
  ],
  c: [
    [null, 0.48],
    [0.45, 0.3],
    [0.8, 0.09],
    [1, 0],
  ],
}

/** Kaynağın kendi elipsleri: cx, cy, rx, ry ve hangi gradyanı taşıdıkları. */
const ELLIPSES = [
  { key: "a", cx: 207, cy: 203, rx: 207, ry: 201 },
  { key: "b", cx: 229, cy: 226, rx: 208, ry: 203 },
  { key: "c", cx: 221, cy: 227, rx: 216, ry: 167 },
]

export function MascotMesh({ colors, intensity = 1, spread = 1, className, style }) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const id = (key) => `tyromesh-${raw}-${key}`
  const [a, b, c] = colors
  const ink = { a, b, c }

  return (
    <svg
      viewBox="0 0 440 470"
      aria-hidden="true"
      className={className}
      style={{ display: "block", width: "100%", height: "auto", overflow: "visible", ...style }}
    >
      <defs>
        {Object.entries(STOPS).map(([key, stops]) => (
          <radialGradient key={key} id={id(key)}>
            {stops.map(([offset, opacity], i) => (
              <stop
                key={i}
                {...(offset === null ? {} : { offset })}
                stopColor={ink[key]}
                // Çarpan 1'i aşarsa durak geçersiz olurdu; kaynağın en
                // parlak durağı .5, yani 2,0'a kadar güvenle çarpılıyor.
                stopOpacity={Math.min(1, opacity * intensity)}
              />
            ))}
          </radialGradient>
        ))}
      </defs>
      {ELLIPSES.map((e) => (
        <ellipse
          key={e.key}
          cx={e.cx}
          cy={e.cy}
          rx={e.rx * spread}
          ry={e.ry * spread}
          fill={`url(#${id(e.key)})`}
        />
      ))}
    </svg>
  )
}
