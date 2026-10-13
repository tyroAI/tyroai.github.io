import { ALERT_LEAD_MS } from "@/lib/meetingAlert"
import { cn } from "@/lib/utils"

/**
 * Kalan sürenin halkası: 15 dk'dan sıfıra boşalır. Sakinken paletin
 * gradyanı, son dakikada sıcak turuncu, başlayınca dolu. `children` ortada.
 */
export function CountdownRing({ msLeft, phase, size = 168, stroke = 8, children, className }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const left = phase === "started" ? 1 : Math.min(1, Math.max(0, msLeft / ALERT_LEAD_MS))
  const id = `ring-${size}`
  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brand-from)" />
            <stop offset="55%" stopColor="var(--brand-via)" />
            <stop offset="100%" stopColor="var(--brand-to)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-foreground/[0.07]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={phase === "final" ? "#f97316" : `url(#${id})`}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - left)}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease" }}
        />
      </svg>
      <div className="relative grid place-items-center text-center">{children}</div>
    </div>
  )
}
