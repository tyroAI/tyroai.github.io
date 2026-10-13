import { HugeiconsIcon } from "@hugeicons/react"
import DashboardSquareEditIcon from "@hugeicons/core-free-icons/DashboardSquareEditIcon"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useLocale } from "@/hooks/useLocale"
import { setBoardEditing, useBoardEditing } from "@/lib/boardEdit"
import { cn } from "@/lib/utils"

/**
 * Header'da, dünya saatinin solunda — Pano'da ve (kitlesi içindeysen) Anasayfa'da:
 * widget düzenleme kipini açar/kapar (`lib/boardEdit`). `labelKey`: "Panoyu düzenle" ·
 * "Anasayfayı düzenle". Sayfada ayrı bir "Düzenle" satırı yok — tek
 * başına bir satır kaplıyordu; kipin düğmeleri düzenlerken sayfanın üstündeki
 * çubukta.
 */
export function BoardEditToggle({ labelKey = "header.editBoard" }) {
  const { t } = useLocale()
  const editing = useBoardEditing()
  const label = t(editing ? "header.editBoardDone" : labelKey)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setBoardEditing((v) => !v)}
          aria-label={label}
          data-board-edit-toggle=""
          className={cn(
            "size-9 rounded-xl [&_svg]:!size-5 relative pointer-coarse:after:absolute pointer-coarse:after:-inset-1",
            editing && "bg-brand/10 text-brand",
          )}
        >
          <HugeiconsIcon icon={DashboardSquareEditIcon} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
