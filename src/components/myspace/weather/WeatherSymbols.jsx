import { useId } from "react"
import { cardSkyOf, cardSunlit } from "@/lib/weatherSky"

const CARD_DROPS = Array.from({ length: 9 }, (_, i) => i)

/**
 * Yayın üzerindeki işaret — kaynağın çizimi: gece ay, gündüz açık/parçalı gökte
 * güneş; bulutlu türlerde katmanlı SVG bulut, yağmur/kar izleri, fırtınada
 * şimşek, siste üç bant. ⚠️ Kapalı gökte (`cloudy`) güneş yok (`cardSunlit`).
 */
export function CardSymbol({ kind, night, style }) {
  const id = useId().replace(/:/g, "")
  const weather = cardSkyOf(kind)
  const cloud =
    weather === "cloudy" || weather === "rain" || weather === "snow" || weather === "storm"
  return (
    <div className="sky-weather__symbol" data-weather={weather} style={style} aria-hidden="true">
      {night ? (
        <div className="sky-weather__moon" />
      ) : cardSunlit(kind) ? (
        <div className="sky-weather__sun" />
      ) : null}
      {cloud && (
        <svg className="sky-weather__cloud" viewBox="0 0 120 80" overflow="visible">
          <defs>
            <linearGradient id={`${id}-cloud`} x1="0" y1="0" x2="0.2" y2="1">
              <stop offset="0" stopColor="var(--cloud-light)" />
              <stop offset="0.5" stopColor="var(--cloud-mid)" />
              <stop offset="1" stopColor="var(--cloud-shadow)" />
            </linearGradient>
            <radialGradient id={`${id}-light`} cx="35%" cy="20%" r="80%">
              <stop offset="0" stopColor="var(--cloud-light)" stopOpacity=".95" />
              <stop offset="1" stopColor="var(--cloud-mid)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path
            d="M24 69C5 69 1 47 15 39C14 23 33 15 44 22C51 1 85 4 90 29C114 24 129 56 108 67C93 74 46 73 24 69Z"
            fill={`url(#${id}-cloud)`}
          />
          <ellipse cx="65" cy="32" rx="26" ry="25" fill={`url(#${id}-light)`} />
          <ellipse cx="32" cy="43" rx="21" ry="20" fill={`url(#${id}-light)`} />
          <ellipse cx="96" cy="49" rx="22" ry="20" fill={`url(#${id}-light)`} />
        </svg>
      )}
      {(weather === "rain" || weather === "storm" || weather === "snow") && (
        <div
          className={`sky-weather__precipitation sky-weather__precipitation--${weather === "snow" ? "snow" : "rain"}`}
        >
          {CARD_DROPS.map((i) => (
            <i
              key={i}
              style={{
                left: `${10 + i * 10}%`,
                animationDelay: `${i * -0.37}s`,
                animationDuration: `${weather === "snow" ? 2.8 + (i % 3) * 0.6 : 0.9 + (i % 3) * 0.18}s`,
              }}
            />
          ))}
        </div>
      )}
      {weather === "storm" && <div className="sky-weather__lightning" />}
      {weather === "fog" && (
        <div className="sky-weather__fog">
          <i />
          <i />
          <i />
        </div>
      )}
    </div>
  )
}

/**
 * Kartın simgesi küçük boyda — saatlik şerit ve gün satırları. 36 px'lik çizim
 * OLDUĞU GİBİ ölçeklenir (`--k`); hareketi yok (`weatherDialog.css`). Renkleri
 * en yakın `.wxd-sky` atasından: her hücre kendi türünü ve gece/gündüzünü taşır.
 */
export function MiniSymbol({ kind, night = false, size = 30 }) {
  return (
    <span
      aria-hidden="true"
      className="wxd-mini"
      style={{ width: size, "--s": `${size}px`, "--k": size / 36 }}
    >
      <CardSymbol kind={kind} night={night} />
    </span>
  )
}

/** Yağış damlası (saatlik şerit · gün satırları) — `currentColor`. */
export function RainDrop({ className, ...rest }) {
  return (
    <svg viewBox="0 0 10 13" aria-hidden="true" focusable="false" className={className} {...rest}>
      <path
        d="M5 .6C5.9 3.2 9.2 5.9 9.2 8.6a4.2 4.2 0 0 1-8.4 0C.8 5.9 4.1 3.2 5 .6Z"
        fill="currentColor"
      />
    </svg>
  )
}
