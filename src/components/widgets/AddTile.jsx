import { HugeiconsIcon } from "@hugeicons/react"
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

const FILL =
  "group/fill flex h-full w-full flex-col items-center justify-center gap-2 rounded-[1.75rem] border border-dashed border-border text-[0.8125rem] font-medium text-muted-foreground transition hover:border-brand/40 hover:bg-brand/[0.03] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/** Izgaradaki boşluk ya da boş pano: "Widget ekle" daveti — kataloğu açar (sayfada olmayan varsa). */
export function AddTile({ hidden, onOpen, className, style }) {
  const { t } = useLocale()
  if (!hidden.length) return null
  return (
    <button type="button" onClick={onOpen} className={cn(FILL, className)} style={style}>
      <span className="grid size-10 place-items-center rounded-full bg-muted/60 transition group-hover/fill:bg-brand/10 group-hover/fill:text-brand">
        <HugeiconsIcon icon={Add01Icon} className="size-5" strokeWidth={1.8} />
      </span>
      {t("widgets.add")}
    </button>
  )
}
