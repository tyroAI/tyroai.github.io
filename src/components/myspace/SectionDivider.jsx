import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * Çalışma alanı ile Uygulamalar arasındaki ayraç: iki yana doğru sönen saç teli
 * + ortada paletin gradyanında küçük dört köşeli yıldız (sayfanın kıvılcım dili)
 * ve onun yumuşak hâlesi. Süs: `aria-hidden` — iki bölüm de kendi başlığını
 * taşıyor.
 * ⚠️ `stopColor` STİLDE, nitelikte DEĞİL: SVG sunum niteliği `var()` çözmüyor.
 */
export function SectionDivider({ className }) {
  const id = useId().replace(/:/g, "")
  return (
    <div aria-hidden="true" className={cn("flex items-center gap-3", className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-foreground/[0.07] to-foreground/[0.16]" />
      <span className="size-1 rounded-full bg-foreground/20" />
      <span className="relative grid size-7 place-items-center">
        <span className="absolute inset-0.5 rounded-full bg-brand/15 blur-md" />
        <svg viewBox="0 0 24 24" className="relative size-3.5">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: "var(--brand-from)" }} />
              <stop offset="0.5" style={{ stopColor: "var(--brand-via)" }} />
              <stop offset="1" style={{ stopColor: "var(--brand-to)" }} />
            </linearGradient>
          </defs>
          <path
            d="M12 1.5c.9 6.6 3.9 9.6 10.5 10.5-6.6.9-9.6 3.9-10.5 10.5C11.1 15.9 8.1 12.9 1.5 12 8.1 11.1 11.1 8.1 12 1.5Z"
            fill={`url(#${id})`}
          />
        </svg>
      </span>
      <span className="size-1 rounded-full bg-foreground/20" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-foreground/[0.07] to-foreground/[0.16]" />
    </div>
  )
}
