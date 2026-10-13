import { Children, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

// Telefonda (tek sütun) bölüm başına önce bu kadar kart; kalanı "+n tane daha" ile açılır.
const NARROW_LIMIT = 3

/** Marka bölüm başlığında DEĞİL kartta: asistan ve çözüm kartları adın üstünde "TYRO" taşır. */
export function LauncherSection({ title, subtitle, children, first = false }) {
  const { t } = useLocale()
  const [expanded, setExpanded] = useState(false)
  const hidden = Math.max(0, Children.count(children) - NARROW_LIMIT)
  return (
    <section className={cn("@container/launcher space-y-4", !first && "pt-2")}>
      <div className="px-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {/* Kart YATAY (ikon · metin · ok) ve ~260 px altında metne yer kalmıyor:
          kolon sayısı pencereden değil bölümün KENDİ genişliğinden — sohbet
          paneli açılınca alan daralır, pencere aynı kalır. */}
      <div
        className={cn(
          "grid grid-cols-1 gap-3 @[34rem]/launcher:grid-cols-2 @[52rem]/launcher:grid-cols-3 @[70rem]/launcher:grid-cols-4",
          // Dar bölümde (telefon) ilk kartlar; geniş ızgarada hepsi her zaman görünür.
          hidden > 0 && !expanded && "@max-[34rem]/launcher:[&>:nth-child(n+4)]:hidden",
        )}
      >
        {children}
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mx-auto flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[0.8125rem] font-medium text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 @[34rem]/launcher:hidden"
        >
          {expanded ? t("nav.showLess") : t("nav.showMore", { count: hidden })}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className={cn("size-4 transition-transform", expanded && "rotate-180")}
            strokeWidth={2}
          />
        </button>
      )}
    </section>
  )
}
