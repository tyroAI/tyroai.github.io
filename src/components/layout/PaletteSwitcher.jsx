import { HugeiconsIcon } from "@hugeicons/react"
import ColorsIcon from "@hugeicons/core-free-icons/ColorsIcon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useLocale } from "@/hooks/useLocale"
import { PaletteOptions } from "./PaletteOptions"

export function PaletteSwitcher() {
  const { t } = useLocale()
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("palette.title", "Renk paleti")}
              className="size-9 rounded-xl [&_svg]:!size-[1.125rem]"
            >
              <HugeiconsIcon icon={ColorsIcon} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("palette.title", "Renk paleti")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56">
        <PaletteOptions />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
