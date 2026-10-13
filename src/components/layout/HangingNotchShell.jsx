import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * Header çizgisinden sarkan çentiğin kabuğu — yan rayın silüeti (`EdgeNotch` › SILHOUETTE)
 * 90° çevrilmiş hâli: iki yandaki omuzlar çizgiden yatay teğetle çıkıp aynı iki kübikle gövdeye
 * iner, gövdenin altı düz. Kutu gövdedir; omuzlar kutunun iki yanına `shoulder` px taşar.
 * Üç tasarım aynı `--notch-*` tokenlarıyla: palet dolu yol, camlar `backdrop-filter`li katmanın
 * silüete kırpılması (yan raydaki gerekçe).
 */

// Yan rayın omuz eğrisi, omuz genişliği (116) ve gövde derinliği (90) birimine indirgenmiş.
const CURVE = [
  [0.362, 0],
  [0.422, 0.1],
  [0.5, 0.467],
  [0.578, 0.833],
  [0.69, 1],
  [1, 1],
]

function silhouette(total, height, shoulder, { close = true, digits = 2 } = {}) {
  const n = (v) => v.toFixed(digits)
  const p = (fx, fy) => `${n(fx * shoulder)} ${n(fy * height)}`
  const q = (fx, fy) => `${n(total - fx * shoulder)} ${n(fy * height)}`
  const [a, b, c, d, e, f] = CURVE
  const left = `M0 0 C${p(...a)} ${p(...b)} ${p(...c)} C${p(...d)} ${p(...e)} ${p(...f)}`
  const right = `L${q(...f)} C${q(...e)} ${q(...d)} ${q(...c)} C${q(...b)} ${q(...a)} ${total} 0`
  return `${left} ${right}${close ? " Z" : ""}`
}

export function HangingNotchShell({
  design,
  designAttr,
  cardVariant,
  width,
  height,
  shoulder,
  className,
  children,
}) {
  const uid = useId().replace(/:/g, "")
  const total = width + shoulder * 2
  const shape = silhouette(total, height, shoulder)
  const outline = silhouette(total, height, shoulder, { close: false })
  // `objectBoundingBox` birimi (0..1): cam katmanı kutusuyla birlikte gerilen kırpma.
  const unit = silhouette(1, 1, shoulder / total, { digits: 4 })
  const glass = design !== "palette"
  const layer = { left: -shoulder, width: total, top: 0, height }
  const view = `0 0 ${total} ${height}`
  return (
    <div
      className={cn("notch-skin relative isolate", className)}
      style={{ width, height }}
      data-design={designAttr}
      data-card={glass ? undefined : cardVariant}
    >
      {glass ? (
        <>
          <svg aria-hidden="true" className="absolute size-0">
            <defs>
              <clipPath id={`hang-${uid}`} clipPathUnits="objectBoundingBox">
                <path d={unit} />
              </clipPath>
            </defs>
          </svg>
          {/* gölge: silüetin bulanık, aşağı kaydırılmış kopyası (kırpılan katman gölge çizemez) */}
          <svg
            aria-hidden="true"
            viewBox={view}
            className="pointer-events-none absolute -z-10 translate-y-2 overflow-visible blur-[10px]"
            style={layer}
          >
            <path d={shape} className="fill-[var(--notch-glass-shadow)]" />
          </svg>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -z-10 bg-[var(--notch-glass-fill)] backdrop-blur-[22px] backdrop-saturate-[1.55]"
            style={{ ...layer, clipPath: `url(#hang-${uid})` }}
          />
          {design === "glassBrand" && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -z-10 bg-[linear-gradient(168deg,var(--notch-tint-1)_0%,var(--notch-tint-2)_52%,var(--notch-tint-3)_100%)]"
              style={{ ...layer, clipPath: `url(#hang-${uid})` }}
            />
          )}
          {/* kenar: header çizgisinin devamı — üst kenar çizilmez, çizgi zaten orada */}
          <svg
            aria-hidden="true"
            viewBox={view}
            className="pointer-events-none absolute -z-10 overflow-visible"
            style={layer}
          >
            <path
              d={outline}
              fill="none"
              className="stroke-border"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </>
      ) : (
        <svg
          aria-hidden="true"
          viewBox={view}
          className="pointer-events-none absolute -z-10 overflow-visible [filter:drop-shadow(0_10px_14px_rgb(20_25_31/0.18))]"
          style={layer}
        >
          <path d={shape} className="fill-[var(--notch-bg)]" />
        </svg>
      )}
      {children}
    </div>
  )
}
