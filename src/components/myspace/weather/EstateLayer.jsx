import { HugeiconsIcon } from "@hugeicons/react"
import ViewIcon from "@hugeicons/core-free-icons/ViewIcon"
import ViewOffSlashIcon from "@hugeicons/core-free-icons/ViewOffSlashIcon"
import { estateImage } from "./estateImages"
import { useLocale } from "@/hooks/useLocale"
import "./estate.css"
import "./estateEffects.css"

// Sabit dağılım: yeniden çizimde tanelerin konumu ve ritmi sıçramasın.
const SNOWFLAKES = Array.from({ length: 24 }, (_, i) => ({
  x: (i * 41 + 7) % 100,
  size: 1.5 + ((i * 7) % 5) * 0.45,
  duration: 9 + ((i * 13) % 9),
  delay: -((i * 17) % 19),
  sway: 6 + ((i * 11) % 15),
  rest: (i * 29 + 11) % 100,
}))

/** Fotoğrafın hava ve ışığı hazır sahneden gelir; ön yüzdeki simgelere dokunmaz. */
export function EstateLayer({ weather, kind, night }) {
  return (
    <div className="sky-estate" aria-hidden="true">
      <div className="sky-estate__scene">
        <img
          className="sky-estate__photo"
          src={estateImage(kind === "partly" && !night ? "sunny" : weather, night)}
          alt=""
          decoding="async"
          draggable={false}
        />
      </div>
      <div className="sky-estate__tone" />
      {(weather === "rain" || weather === "storm") && <div className="sky-estate__rain" />}
      {weather === "snow" && (
        <div className="sky-estate__snow">
          {SNOWFLAKES.map((flake, i) => (
            <span
              key={i}
              style={{
                "--x": `${flake.x}%`,
                "--size": `${flake.size}px`,
                "--duration": `${flake.duration}s`,
                "--delay": `${flake.delay}s`,
                "--sway": `${flake.sway}px`,
                "--rest": `${flake.rest}%`,
              }}
            >
              <i />
            </span>
          ))}
        </div>
      )}
      {weather === "fog" && (
        <div className="sky-estate__mist">
          <i />
          <i />
          <i />
        </div>
      )}
      {weather === "storm" && <div className="sky-estate__lightning" />}
      <div className="sky-estate__scrim" />
    </div>
  )
}

/** Sağ üstteki göz: köşkü gizler/geri getirir (simge şu anki hâli gösterir). */
export function EstateToggle({ on, onToggle }) {
  const { t } = useLocale()
  const label = t(on ? "myspace.weather.estateHide" : "myspace.weather.estateShow")
  return (
    <button
      type="button"
      className="sky-estate-toggle"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onToggle}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <HugeiconsIcon icon={on ? ViewIcon : ViewOffSlashIcon} strokeWidth={1.8} aria-hidden="true" />
    </button>
  )
}
