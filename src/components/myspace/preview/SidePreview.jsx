import { useState } from "react"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { roomiestSide } from "@/lib/placement"
import { cn } from "@/lib/utils"
import { PreviewContent } from "./PreviewContent"
import { PREVIEW_KIND, previewLabel } from "./previewKinds"

/**
 * Özetin ipucundaki bir satırın önizlemesi (toplantı · posta · Keşfet
 * bildirimi · görev): masaüstünde satıra basınca kart İPUCUNUN YANINDA açılır
 * — sağda; sığmazsa solda, o da olmazsa en geniş boşlukta (`lib/placement`),
 * o satırın hizasında. İç içe açılır kutu güvenli: kart React ağacında ipucunun
 * içinde, ona geçen imleç ya da tıklama ipucunu kapatmaz. Telefonda yanda yer
 * yok: çağıran satırın düğmesine kendi `onClick`ini verir (pencere açar).
 *
 * `children(wrap)`: satırı (çapa) çizer; `wrap(button)` düğmeyi tetik yapar.
 * Kartın kenarı ipucunun kenarından 16 px içeride: 28 px ile 12 px dışarıda.
 */
export function SidePreview({ kind, item, open, onOpenChange, mobile, children }) {
  const conf = PREVIEW_KIND[kind]
  const [placed, setPlaced] = useState("right")
  const side = placed === "left" || placed === "right"
  const wrap = (button) =>
    mobile ? (
      button
    ) : (
      <PopoverTrigger
        asChild
        onClick={(e) => {
          const row = e.currentTarget.closest("li") ?? e.currentTarget
          setPlaced(roomiestSide(row.getBoundingClientRect(), conf.size, ["right", "left"]))
        }}
      >
        {button}
      </PopoverTrigger>
    )
  return (
    <Popover open={!mobile && open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{children(wrap)}</PopoverAnchor>
      {!mobile && (
        <PopoverContent
          side={placed}
          align={side ? "start" : "center"}
          sideOffset={side ? 28 : 8}
          collisionPadding={12}
          aria-label={previewLabel(kind, item)}
          // Fareyle açılınca odak satırda kalır; klavyeyle açılınca karta geçer.
          onOpenAutoFocus={(e) => {
            if (!document.activeElement?.matches?.(":focus-visible")) e.preventDefault()
          }}
          className={cn(
            "max-h-[var(--radix-popover-content-available-height)] gap-0 overscroll-contain rounded-xl p-0 shadow-lg [scrollbar-gutter:auto]!",
            conf.className,
          )}
        >
          <PreviewContent kind={kind} item={item} onDone={() => onOpenChange(false)} />
        </PopoverContent>
      )}
    </Popover>
  )
}
