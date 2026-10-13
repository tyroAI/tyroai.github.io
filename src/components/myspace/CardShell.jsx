import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"

/**
 * Anasayfa kartlarının ortak kabuğu. Izgara bir referans panodan; her kartın
 * oradaki karşılığı ve ölçülerin gerekçesi `docs/features/anasayfa-kartlar.md`de.
 *
 * ⚠️ **HİÇBİR KART ÖRNEK VERİ TAŞIMAZ.** Veri gelmezse kart kendi boş/izin
 * hâlini çizer — "soramadık ≠ veri yok".
 * ⚠️ **RENKLİ KART TEK** (küre kartı): iki boyalı kart, hangisinin eylem
 * olduğunu söylemez.
 * ⚠️ **İLERLEME BİR KEZ ÇİZİLİR**: odak kartının başlığındaki "1/5".
 * ⚠️ Ölçüler referanstan: köşe 28px, iç dolgu 20px, başlık 13px ve SESSİZ
 * mürekkepte. Kartı belli eden `.ms-surface`: saç teli kenarlık + iki katmanlı
 * gölge (`src/styles/myspace-surfaces.css`).
 */
export function Card({ children, className, as: Tag = "section", ...rest }) {
  return (
    <Tag
      {...rest}
      className={cn("ms-surface relative flex min-w-0 flex-col rounded-[1.75rem] p-5", className)}
    >
      {children}
    </Tag>
  )
}

export function CardTitle({ children, icon, leadingIcon, action }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-2">
      <h3 className="flex min-w-0 items-center gap-2 text-[0.8125rem] font-medium text-muted-foreground">
        {/* Başlığın solundaki ikon — pano kartlarıyla aynı (`WidgetFrame`, ör. Günün brifingi). */}
        {leadingIcon && (
          <HugeiconsIcon
            icon={leadingIcon}
            className="size-4 shrink-0 text-muted-foreground/60"
            strokeWidth={1.8}
          />
        )}
        {children}
      </h3>
      {action ??
        (icon && (
          <HugeiconsIcon
            icon={icon}
            className="size-4 shrink-0 text-muted-foreground/50"
            strokeWidth={1.8}
          />
        ))}
    </div>
  )
}
