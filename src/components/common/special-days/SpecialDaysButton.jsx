import { HugeiconsIcon } from "@hugeicons/react"
import BellRingIcon from "@hugeicons/core-free-icons/BellRingIcon"
import CalendarFavorite01Icon from "@hugeicons/core-free-icons/CalendarFavorite01Icon"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useLocale } from "@/hooks/useLocale"

/**
 * Özel günler bildirimi — header'da tek başına ikon düğmesi (saat dünya saatinin yanında).
 * Rozet varken çan, yokken işaretli takvim; rozetin rengi paletten (`--badge`). Popover
 * tetiği olarak çağrılır: gelen öznitelikler ve `ref` düğmeye geçer.
 */
export function SpecialDaysButton({ badge = 0, ref, ...props }) {
  const { t } = useLocale()
  const label = badge > 0 ? `${t("special.title")} · ${t("special.badge")}` : t("special.title")
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          ref={ref}
          {...props}
          aria-label={label}
          className="relative grid size-9 shrink-0 place-items-center rounded-xl text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [&_svg]:size-5 pointer-coarse:after:absolute pointer-coarse:after:-inset-1"
        >
          <HugeiconsIcon
            icon={badge > 0 ? BellRingIcon : CalendarFavorite01Icon}
            strokeWidth={1.8}
          />
          {badge > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-0.5 top-0.5 grid h-[0.9375rem] min-w-[0.9375rem] place-items-center rounded-full bg-badge px-1 text-[0.5625rem] font-bold leading-none text-badge-foreground ring-2 ring-background"
            >
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
