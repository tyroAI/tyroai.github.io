import { useId } from "react"
import MascotOrb from "@/components/brand/mascot/MascotOrb"
import { mascotColorsForPalette } from "@/components/brand/mascot/mascotPalette"
import { usePalette } from "@/hooks/usePalette"
import { cn } from "@/lib/utils"
import "./CelebrationOrb.css"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  KUTLAMA SAHNESİ — "Sana nasıl yardımcı olabilirim?" kartının o günkü küresi
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İstek (ilk turun ardından): *"kart rezalet olmuş, dümdüz, kalitesiz, çok
 * uydurma duruyor"*. İlk tur kürenin üstüne bir külah ve papyon yapıştırmıştı
 * — bir çıkartma. Burası bir SAHNE: To-Do'nun panolu ve Sana özel'in zarflı
 * küresinin kardeşi (`ChecklistOrb` · `MailOrb`), maskot iki eliyle bir şey
 * tutuyor ve çevresinde ne kutlandığını söyleyen nesneler var.
 *
 * | gün | maskot | elinde | kartın köşelerinde (`CelebrationDecor`) |
 * |---|---|---|---|
 * | doğum günü | külah | mumları yanan pasta | iki parlak balon + konfeti |
 * | iş yıl dönümü | silindir şapka | yılı yazan ahşap-altın PLAKET | yıldız balon + altın balon + ışıltı |
 * | ikisi | külah | pasta | balon + altın rakam balonu + konfeti |
 *
 * ⚠️ **SAHNE İKİ PARÇA.** Maskot ve elindeki (`CelebrationOrb`) maskotun
 * 440×470'lik tuvalinde — koordinatlar gözlerle (y ≈ 220–264) ve küreyle
 * (merkez 220,221 · r 171) birebir hizalı; ön SVG (eller, pasta, alevler)
 * maskotun ÜSTÜNDE. Balonlar ise KARTIN köşelerinde (`CelebrationDecor`,
 * kartın kendi ölçüsüyle — `cqi`): ilk denemede tuvaldeydiler ve geniş kartta
 * maskota yapışık kalıp kartın yarısını boş bırakıyorlardı (1920'de ölçüldü).
 * Taşan parça (şapka) `overflow: visible`; yer açmak çağıranın işi.
 * ⚠️ **MUMLARIN ALEVİ GÖZLERİN ALTINDA BİTER** (uç y ≈ 284, gözlerin altı 264):
 * pasta yukarıda dursa alevler gözlerin önüne düşerdi.
 * ⚠️ **RENKLER**: balonlar, kremanın şeridi, eller paletten (maskotun üç rengi,
 * `mascotColorsForPalette`); pasta, alev, altın NESNENİN KENDİ rengi.
 * ⚠️ **YAŞ YOK.** Pastada rakam mumu yok; rakam balonu yalnız İŞ yılı.
 * ⚠️ Hareket yalnız `prefers-reduced-motion: no-preference` (CSS).
 */
const ORB_RATIO = 342 / 440

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
function mix(a, b, t) {
  const A = hex(a)
  const B = hex(b)
  return `#${A.map((v, i) =>
    Math.round(v * (1 - t) + B[i] * t)
      .toString(16)
      .padStart(2, "0"),
  ).join("")}`
}

/** Pastanın ön kenarında kremanın damlaları: [x, uzunluk]. */
const DRIPS = [
  [114, 16],
  [130, 26],
  [146, 13],
  [162, 22],
  [178, 30],
  [194, 15],
  [210, 24],
  [226, 32],
  [242, 15],
  [258, 24],
  [274, 13],
  [290, 22],
  [306, 28],
  [322, 15],
]
/** Kremanın üstündeki şeker: [x, y, açı, renk anahtarı]. */
const SPRINKLES = [
  [150, 300, 30, "a"],
  [170, 312, -40, "w"],
  [192, 296, 70, "c"],
  [248, 312, 20, "g"],
  [268, 298, -60, "a"],
  [290, 308, 45, "w"],
  [206, 314, -15, "g"],
  [236, 292, 80, "c"],
  [140, 310, -20, "g"],
  [300, 300, 10, "c"],
  [178, 290, 15, "g"],
  [262, 316, -30, "c"],
]
/* Pasta: üst yüzeyin merkezi y=302, yarıçaplar 112 × 20; gövde y=402'ye iner.
   Mumların alevi y ≈ 254'te biter — sevinçli gözlerin (`happy`, y 218–247)
   hemen altında. */
const CAKE = { cy: 302, rx: 112, ry: 20, bottom: 402 }
const CANDLES = [182, 220, 258]
const CAKE_BODY = `M108 ${CAKE.cy}V${CAKE.bottom - 14}Q220 ${CAKE.bottom + 14} 332 ${CAKE.bottom - 14}V${CAKE.cy}Z`

function rimY(x) {
  const u = (x - 220) / CAKE.rx
  return CAKE.cy + CAKE.ry * Math.sqrt(Math.max(0, 1 - u * u))
}

function Balloon({ id, cx, cy, rx, ry, rot, color, delay }) {
  return (
    <g className="celo-float" style={{ animationDelay: `${delay}s` }}>
      <g transform={`rotate(${rot} ${cx} ${cy})`}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id})`} />
        <path
          d={`M${cx - 6} ${cy + ry - 2}L${cx + 6} ${cy + ry - 2}L${cx + 4} ${cy + ry + 8}L${cx - 4} ${cy + ry + 8}Z`}
          fill={mix(color, "#000000", 0.25)}
        />
        <ellipse
          cx={cx - rx * 0.36}
          cy={cy - ry * 0.4}
          rx={rx * 0.2}
          ry={ry * 0.3}
          transform={`rotate(-22 ${cx - rx * 0.36} ${cy - ry * 0.4})`}
          fill="#ffffff"
          opacity=".6"
        />
        <ellipse
          cx={cx - rx * 0.08}
          cy={cy - ry * 0.74}
          rx={rx * 0.07}
          ry={ry * 0.05}
          fill="#ffffff"
          opacity=".85"
        />
      </g>
    </g>
  )
}

function NumberBalloon({ uid, years, x, y, delay }) {
  const digits = String(years)
  const big = digits.length > 1
  const size = big ? 104 : 150
  return (
    <g className="celo-float" style={{ animationDelay: `${delay}s` }}>
      <g transform={`rotate(9 ${x} ${y})`}>
        <text
          x={x}
          y={y + size * 0.36}
          textAnchor="middle"
          fontSize={size}
          fontWeight="900"
          fontFamily="Inter Variable, Inter, system-ui, sans-serif"
          letterSpacing="-6"
          fill={`url(#${uid}-foil)`}
          stroke="#9a6a08"
          strokeWidth="5"
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          {digits}
        </text>
        <text
          x={x - 4}
          y={y + size * 0.36 - 4}
          textAnchor="middle"
          fontSize={size}
          fontWeight="900"
          fontFamily="Inter Variable, Inter, system-ui, sans-serif"
          letterSpacing="-6"
          fill="none"
          stroke="#fff8dc"
          strokeOpacity=".55"
          strokeWidth="2"
        >
          {digits}
        </text>
      </g>
    </g>
  )
}

function StarBalloon({ uid, x, y, r, delay }) {
  const pts = []
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.48 : r
    pts.push(`${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`)
  }
  return (
    <g className="celo-float" style={{ animationDelay: `${delay}s` }}>
      <g transform={`rotate(-12 ${x} ${y})`}>
        <polygon
          points={pts.join(" ")}
          fill={`url(#${uid}-foil)`}
          stroke="#9a6a08"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <polygon
          points={pts.join(" ")}
          fill="none"
          stroke="#fff8dc"
          strokeOpacity=".5"
          strokeWidth="1.5"
          strokeLinejoin="round"
          transform={`translate(-2 -2)`}
        />
      </g>
    </g>
  )
}

function Grip({ x, y, rot, c }) {
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <ellipse cx={x + 2} cy={y + 4} rx="21" ry="28" fill="#000000" opacity=".18" />
      <ellipse
        cx={x}
        cy={y}
        rx="21"
        ry="28"
        fill={`url(#${c})`}
        stroke="#ffffff"
        strokeOpacity=".45"
        strokeWidth="2"
      />
      <ellipse cx={x - 6} cy={y - 10} rx="6" ry="9" fill="#ffffff" opacity=".35" />
    </g>
  )
}

function Sparkle({ x, y, r, delay, color = "#fff4c2" }) {
  return (
    <path
      className="celo-twinkle"
      style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}
      d={`M${x} ${y - r * 2}Q${x} ${y} ${x + r * 2} ${y}Q${x} ${y} ${x} ${y + r * 2}Q${x} ${y} ${x - r * 2} ${y}Q${x} ${y} ${x} ${y - r * 2}Z`}
      fill={color}
    />
  )
}

/**
 * Kartın KUTLAMA KATMANI — balonlar köşelerde, konfeti ve ışıltı kartın alt
 * yarısında (başlığın satırına hiçbir parça çıkmaz: balonların tepesi kartın
 * alt %58'inde kalır). Maskotun ARKASINDA (`-z-[5]`), gradyanın ÖNÜNDE.
 */
export function CelebrationDecor({ scene, years = null }) {
  const { palette } = usePalette()
  const [, b, c] = mascotColorsForPalette(palette)
  const uid = `celd${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const g = (k) => `${uid}-${k}`
  const cake = scene !== "anniversary"
  // Rakam balonu yalnız İKİSİ AYNI GÜNDE: yıl dönümünde yıl zaten plakette
  // yazıyor, köşede bir daha yazmak aynı rakamı iki kez söylemek olurdu.
  const number = scene === "both" && Number.isFinite(years) && years >= 1 && years <= 99
  const grad = (id, col) => (
    <radialGradient id={id} cx="35%" cy="30%" r="78%">
      <stop offset="0" stopColor={mix(col, "#ffffff", 0.5)} />
      <stop offset=".55" stopColor={col} />
      <stop offset="1" stopColor={mix(col, "#000000", 0.32)} />
    </radialGradient>
  )
  const foil = (
    <linearGradient id={g("foil")} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#fff3c0" />
      <stop offset=".3" stopColor="#f6c54a" />
      <stop offset=".55" stopColor="#fff0b0" />
      <stop offset=".78" stopColor="#d99b1c" />
      <stop offset="1" stopColor="#b47a0c" />
    </linearGradient>
  )
  // Her balon kendi küçük SVG'sinde; ip kartın alt kenarına iner.
  const balloonSvg = (id, col, rot, delay) => (
    <svg viewBox="0 0 100 220" className="celd-svg">
      <defs>{grad(g(id), col)}</defs>
      <g className="celo-float" style={{ animationDelay: `${delay}s` }}>
        <path d="M50 118C40 150 62 172 50 220" className="celo-string" />
        <Balloon id={g(id)} cx={50} cy={60} rx={42} ry={52} rot={rot} color={col} delay={0} />
      </g>
    </svg>
  )
  return (
    <div className="celd" aria-hidden="true">
      {/* sol köşe: balon (doğum günü) ya da yıldız balon (yıl dönümü) */}
      <div className="celd-item celd-left">
        {cake ? (
          balloonSvg("l", b, -10, 0.3)
        ) : (
          <svg viewBox="0 0 100 220" className="celd-svg">
            <defs>{foil}</defs>
            <g className="celo-float" style={{ animationDelay: ".3s" }}>
              <path d="M52 104C42 146 64 172 52 220" className="celo-string" />
              <StarBalloon uid={uid} x={50} y={58} r={44} delay={0} />
            </g>
          </svg>
        )}
      </div>
      {/* sağ köşe: altın rakam balonu (iş yılı) ya da ikinci balon */}
      <div className={cn("celd-item celd-right", number && "celd-number")}>
        {number ? (
          <svg viewBox="0 0 120 230" className="celd-svg">
            <defs>{foil}</defs>
            <g className="celo-float" style={{ animationDelay: "1.2s" }}>
              <path d="M60 128C50 160 72 184 60 230" className="celo-string" />
              <NumberBalloon uid={uid} years={years} x={60} y={64} delay={0} />
            </g>
          </svg>
        ) : (
          balloonSvg("r", cake ? c : "#f6c54a", 10, 1.2)
        )}
      </div>
      {/* konfeti ve ışıltı — kartın alt yarısında */}
      <div className="celd-fx">
        {[
          [8, 62, 7, 3, cake ? b : "#f6c54a", 30, 7.2, 0.2],
          [18, 48, 5, 5, "#ffffff", 0, 8.4, 3.1],
          [30, 70, 8, 3, cake ? c : "#ffe08a", -40, 7.8, 1.4],
          [70, 54, 6, 3, "#f6c54a", 55, 8.8, 5.6],
          [82, 66, 5, 5, cake ? b : "#ffffff", 0, 7.4, 2.6],
          [92, 46, 8, 3, cake ? c : "#f6c54a", -20, 9.2, 0.9],
          [56, 44, 5, 3, "#ffffff", 70, 8.0, 4.4],
        ].map(([x, y, w, h, col, r, d, delay], i) => (
          <i
            key={i}
            className="celd-bit"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: w,
              height: h,
              background: col,
              "--r": `${r}deg`,
              animationDuration: `${d}s`,
              animationDelay: `${-delay}s`,
            }}
          />
        ))}
        {[
          [14, 52, 0],
          [86, 58, 1.3],
          [64, 46, 2.2],
        ].map(([x, y, d], i) => (
          <i
            key={`s${i}`}
            className="celd-star"
            style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * @param {{size: number, scene: "birthday"|"anniversary"|"both", years?: number|null,
 *   state?: string, expression?: string}} p
 */
export default function CelebrationOrb({ size, scene, years = null, state = "idle", expression }) {
  const { palette } = usePalette()
  const [a, b, c] = mascotColorsForPalette(palette)
  const uid = `celo${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const g = (k) => `${uid}-${k}`
  const cake = scene !== "anniversary"
  const width = Math.round(size / ORB_RATIO)
  const height = Math.round((width * 470) / 440)
  // Yıl dönümünde madalya YOK: maskot yılı yazan bir PLAKET tutuyor (istek:
  // *"madalyon yerine plaket olsun elinde"*).
  const costume = cake
    ? { hat: "party", outfit: null, years }
    : { hat: "tophat", outfit: null, years }
  const plaqueYears =
    Number.isFinite(years) && years >= 1 && years <= 99 ? String(Math.round(years)) : null

  const frosting = mix(b, "#ffffff", 0.38)
  const frostingDeep = mix(b, "#ffffff", 0.12)
  const sprinkle = { a, c, w: "#ffffff", g: "#f6c54a" }

  const defs = (
    <defs>
      {[
        ["bl", b],
        ["br", c],
      ].map(([k, col]) => (
        <radialGradient key={k} id={g(k)} cx="35%" cy="30%" r="78%">
          <stop offset="0" stopColor={mix(col, "#ffffff", 0.5)} />
          <stop offset=".55" stopColor={col} />
          <stop offset="1" stopColor={mix(col, "#000000", 0.32)} />
        </radialGradient>
      ))}
      <linearGradient id={g("foil")} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff3c0" />
        <stop offset=".3" stopColor="#f6c54a" />
        <stop offset=".55" stopColor="#fff0b0" />
        <stop offset=".78" stopColor="#d99b1c" />
        <stop offset="1" stopColor="#b47a0c" />
      </linearGradient>
      <radialGradient id={g("grip")} cx="30%" cy="25%" r="80%">
        <stop offset="0" stopColor={mix(c, "#ffffff", 0.75)} />
        <stop offset=".45" stopColor={mix(b, "#14222e", 0.25)} />
        <stop offset="1" stopColor={mix(a, "#0b1520", 0.55)} />
      </radialGradient>
      <linearGradient id={g("cake")} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#f3e2c8" />
        <stop offset=".35" stopColor="#fffaf1" />
        <stop offset="1" stopColor="#e7cfae" />
      </linearGradient>
      <linearGradient id={g("candle")} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#e9e4f2" />
      </linearGradient>
      <radialGradient id={g("flame")} cx="50%" cy="70%" r="65%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset=".35" stopColor="#fff1a8" />
        <stop offset=".75" stopColor="#ffb330" />
        <stop offset="1" stopColor="#ff7a1a" />
      </radialGradient>
      <radialGradient id={g("warm")}>
        <stop offset="0" stopColor="#ffd27a" stopOpacity=".55" />
        <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id={g("wood")} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8a5a33" />
        <stop offset=".5" stopColor="#5e3a1e" />
        <stop offset="1" stopColor="#3e2412" />
      </linearGradient>
      <linearGradient id={g("plate")} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff3c0" />
        <stop offset=".4" stopColor="#f6c54a" />
        <stop offset=".7" stopColor="#ffe08a" />
        <stop offset="1" stopColor="#c48d16" />
      </linearGradient>
      <clipPath id={g("cakeClip")}>
        <path d={CAKE_BODY} />
      </clipPath>
    </defs>
  )

  return (
    <div className="celo" aria-hidden="true" style={{ width, height }}>
      {/* ── MASKOT ── */}
      <div className="celo-mascot">
        <MascotOrb
          paletteId={palette}
          size={size}
          state={state}
          expression={expression}
          mesh
          glow={0.5}
          gloss={0.85}
          followPointer="page"
          costume={costume}
        />
      </div>

      {/* ── ÖN: eller, pasta, alevler, ışıltılar ── */}
      <svg className="celo-layer celo-front" viewBox="0 0 440 470">
        {defs}
        {cake ? (
          <>
            {/* mumların ışığı yüze vurur */}
            <ellipse
              className="celo-warm"
              cx="220"
              cy="262"
              rx="136"
              ry="62"
              fill={`url(#${g("warm")})`}
            />
            <Grip x={100} y={338} rot={-16} c={g("grip")} />
            <Grip x={340} y={338} rot={16} c={g("grip")} />
            <ellipse cx="220" cy="410" rx="134" ry="17" fill="#ffffff" opacity=".92" />
            <path d={CAKE_BODY} fill={`url(#${g("cake")})`} stroke="#d9bf9a" strokeWidth="2" />
            <g clipPath={`url(#${g("cakeClip")})`}>
              <path d="M108 350Q220 378 332 350V368Q220 396 108 368Z" fill={frostingDeep} />
              <path
                d="M108 356Q220 384 332 356"
                fill="none"
                stroke="#ffffff"
                strokeOpacity=".6"
                strokeWidth="2.4"
                strokeDasharray="1 10"
                strokeLinecap="round"
              />
              <rect x="108" y="280" width="40" height="140" fill="#ffffff" opacity=".18" />
              <rect x="296" y="280" width="36" height="140" fill="#000000" opacity=".06" />
            </g>
            {DRIPS.map(([x, len], i) => (
              <rect
                key={i}
                x={x - 7}
                y={rimY(x) - 7}
                width="14"
                height={len + 7}
                rx="7"
                fill={frosting}
              />
            ))}
            <ellipse cx="220" cy={CAKE.cy} rx={CAKE.rx + 1} ry={CAKE.ry + 1} fill={frosting} />
            <ellipse cx="212" cy={CAKE.cy - 3} rx="88" ry="13" fill="#ffffff" opacity=".35" />
            {SPRINKLES.map(([x, y, r, k], i) => (
              <rect
                key={i}
                x={x - 4}
                y={y - 1.5}
                width="8"
                height="3"
                rx="1.5"
                fill={sprinkle[k]}
                transform={`rotate(${r} ${x} ${y})`}
              />
            ))}
            {CANDLES.map((x, i) => {
              const base = i === 1 ? CAKE.cy + 6 : CAKE.cy
              return (
                <g key={x}>
                  <rect
                    x={x - 5.5}
                    y={base - 24}
                    width="11"
                    height="24"
                    rx="3"
                    fill={`url(#${g("candle")})`}
                    stroke="#d8d1e6"
                    strokeWidth="1"
                  />
                  <path
                    d={`M${x - 5} ${base - 17}L${x + 5} ${base - 22}M${x - 5} ${base - 7}L${x + 5} ${base - 12}`}
                    stroke={i === 1 ? c : b}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M${x} ${base - 24}V${base - 28}`}
                    stroke="#3a2a1a"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <g
                    className="celo-flame"
                    style={{
                      animationDelay: `${i * 0.23}s`,
                      transformOrigin: `${x}px ${base - 28}px`,
                    }}
                  >
                    <circle cx={x} cy={base - 37} r="12" fill="#ffd27a" opacity=".38" />
                    <path
                      d={`M${x} ${base - 48}Q${x + 6.5} ${base - 38} ${x} ${base - 28}Q${x - 6.5} ${base - 38} ${x} ${base - 48}Z`}
                      fill={`url(#${g("flame")})`}
                    />
                  </g>
                </g>
              )
            })}
          </>
        ) : (
          <>
            {/* PLAKET — ahşap zemin, altın çerçeve, altın plakada yıl ve iki defne
                dalı. Gözlerin (kısık: y 218–247) altından başlar. */}
            <ellipse cx="220" cy="376" rx="96" ry="10" fill="#000000" opacity=".22" />
            <rect
              x="126"
              y="254"
              width="188"
              height="116"
              rx="14"
              fill={`url(#${g("wood")})`}
              stroke="#2a170a"
              strokeOpacity=".6"
              strokeWidth="2"
            />
            <rect
              x="134"
              y="262"
              width="172"
              height="100"
              rx="10"
              fill="none"
              stroke="#e9b949"
              strokeWidth="3"
            />
            <rect
              x="148"
              y="273"
              width="144"
              height="78"
              rx="7"
              fill={`url(#${g("plate")})`}
              stroke="#9a6a08"
              strokeWidth="1.5"
            />
            <path
              d="M156 279H284"
              stroke="#ffffff"
              strokeOpacity=".55"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {[-1, 1].map((side) =>
              [0, 1, 2, 3].map((i) => {
                const x = 220 + side * (40 + i * 2)
                const y = 334 - i * 12
                return (
                  <ellipse
                    key={`${side}${i}`}
                    cx={x}
                    cy={y}
                    rx="4"
                    ry="8.5"
                    transform={`rotate(${side * (24 + i * 10)} ${x} ${y})`}
                    fill="#8a5d0a"
                    opacity=".85"
                  />
                )
              }),
            )}
            <text
              x="220"
              y={plaqueYears && plaqueYears.length > 1 ? 333 : 337}
              textAnchor="middle"
              fontSize={plaqueYears && plaqueYears.length > 1 ? 42 : 52}
              fontWeight="800"
              fontFamily="Inter Variable, Inter, system-ui, sans-serif"
              letterSpacing="-1.5"
              fill="#5a3a00"
            >
              {plaqueYears ?? "★"}
            </text>
            {[
              [141, 268],
              [299, 268],
              [141, 356],
              [299, 356],
            ].map(([x, y]) => (
              <circle
                key={`${x}${y}`}
                cx={x}
                cy={y}
                r="2.6"
                fill="#f6d27a"
                stroke="#7a5208"
                strokeWidth=".8"
              />
            ))}
            <path
              d="M138 268Q146 259 164 259"
              fill="none"
              stroke="#ffffff"
              strokeOpacity=".22"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <Grip x={118} y={320} rot={-10} c={g("grip")} />
            <Grip x={322} y={320} rot={10} c={g("grip")} />
          </>
        )}
        <Sparkle x={30} y={236} r={5} delay={0} />
        <Sparkle x={412} y={244} r={4.5} delay={1.1} color="#ffffff" />
        <Sparkle x={150} y={28} r={4} delay={2.0} color="#ffffff" />
        <Sparkle x={300} y={-4} r={3.5} delay={0.6} />
      </svg>
    </div>
  )
}
