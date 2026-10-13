import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"

/**
 * Boş durum — eşit boylu satırlarda boş bir kart "eksik" görünmesin: sessiz
 * ikon ve cümle, kalan alanın ortasında; gerekirse tek düğme (`action`: izin
 * ver, tekrar dene). Bütün widget'lar bunu kullanır.
 */
export function WidgetEmpty({ icon, children, hint, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center",
        className,
      )}
    >
      {icon && (
        <span className="grid size-10 place-items-center rounded-full bg-muted/60 text-muted-foreground/60">
          <HugeiconsIcon icon={icon} className="size-5" strokeWidth={1.6} />
        </span>
      )}
      <p className="max-w-[16rem] text-[0.8125rem] leading-snug text-muted-foreground">
        {children}
      </p>
      {hint && (
        <p className="max-w-[16rem] text-[0.71875rem] leading-snug text-muted-foreground/75">
          {hint}
        </p>
      )}
      {action}
    </div>
  )
}
