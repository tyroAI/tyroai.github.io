import { HugeiconsIcon } from "@hugeicons/react"
import Award01Icon from "@hugeicons/core-free-icons/Award01Icon"
import BirthdayCakeIcon from "@hugeicons/core-free-icons/BirthdayCakeIcon"
import { useLocale } from "@/hooks/useLocale"

/*
 * Kutlama süsü — göğün İKİ YAN BANDINDA (sol %3–18 · sağ %82–97): başlık,
 * konum, derece ve durum ortada; süs hiçbir harfin arkasına düşmez. Parçalar
 * `aria-hidden`, renkleri paletin üç durağı + altın + beyaz.
 * Konfeti: [x %, gecikme s, süre s, en px, boy px, renk, açı°, sapma px, durgun y %]
 * (durgun y: hareketi azalt tercihinde parçanın sabit yeri).
 */
const PARTY_CONFETTI = [
  [4, 0.0, 8.2, 7, 3, "f", 20, 6, 22],
  [9, 3.1, 9.4, 5, 5, "g", 45, -5, 58],
  [14, 1.4, 7.6, 8, 3, "v", -30, 7, 36],
  [17, 5.6, 9.0, 4, 4, "w", 0, -4, 74],
  [6, 6.9, 8.6, 6, 3, "t", 60, 5, 46],
  [12, 2.2, 10.2, 5, 3, "g", -15, -6, 12],
  [84, 0.8, 8.8, 7, 3, "v", -20, -6, 30],
  [89, 4.2, 7.9, 5, 5, "f", 35, 5, 64],
  [94, 2.6, 9.6, 8, 3, "g", 70, -7, 18],
  [97, 6.1, 8.3, 4, 4, "w", 0, 4, 50],
  [87, 7.4, 9.9, 6, 3, "t", -45, 6, 80],
  [92, 1.9, 7.2, 5, 3, "f", 15, -5, 40],
]

/* Altın pırıltı (yıl dönümü): [x %, y %, boy px, gecikme s, süre s] */
const PARTY_SPARKS = [
  [6, 26, 10, 0.0, 3.6],
  [14, 50, 7, 1.3, 4.2],
  [9, 70, 8, 2.4, 3.9],
  [17, 14, 6, 3.1, 4.6],
  [86, 22, 9, 0.7, 4.0],
  [93, 44, 7, 2.0, 3.5],
  [88, 66, 10, 1.6, 4.4],
  [95, 12, 6, 3.4, 3.8],
]

const PARTY_COLOR = {
  f: "var(--brand-from)",
  v: "var(--brand-via)",
  t: "var(--brand-to)",
  g: "#ffd65b",
  w: "#ffffff",
}

export function CardParty({ celebration }) {
  const confetti = !!celebration?.birthday
  const sparks = !!celebration?.anniversary
  return (
    <div className="sky-weather__party" aria-hidden="true">
      {confetti &&
        PARTY_CONFETTI.map(([x, delay, dur, pw, ph, col, rot, sway, rest], i) => (
          <span
            key={`c${i}`}
            className="sky-weather__confetti"
            style={{
              left: `${x}%`,
              "--delay": `${-delay}s`,
              "--dur": `${dur}s`,
              "--rest": `${rest}%`,
            }}
          >
            <i
              style={{
                width: pw,
                height: ph,
                background: PARTY_COLOR[col],
                "--rot": `${rot}deg`,
                "--sway": `${sway}px`,
              }}
            />
          </span>
        ))}
      {sparks &&
        PARTY_SPARKS.map(([x, y, size, delay, dur], i) => (
          <i
            key={`s${i}`}
            className="sky-weather__spark"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              animationDelay: `${-delay}s`,
              animationDuration: `${dur}s`,
            }}
          />
        ))}
    </div>
  )
}

/** Konum satırının başındaki kutlama rozeti: pasta (doğum günü) · altın "15. yıl". */
export function CelebrationChips({ celebration }) {
  const { t } = useLocale()
  const years = celebration?.anniversary?.years ?? null
  return (
    <>
      {celebration?.birthday && (
        <span className="sky-weather__cel-chip" data-kind="cake" aria-hidden="true">
          <HugeiconsIcon icon={BirthdayCakeIcon} strokeWidth={2} />
        </span>
      )}
      {years != null && (
        <span className="sky-weather__cel-chip" data-kind="gold">
          <HugeiconsIcon icon={Award01Icon} strokeWidth={2} aria-hidden="true" />
          {t("feed.cel.years", { count: years })}
        </span>
      )}
    </>
  )
}
