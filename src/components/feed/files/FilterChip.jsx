import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { stopEscape } from "./menuEscape"

/**
 * Süzgeç hapı. ⚠️ **DÜĞME GİBİ GÖRÜNÜR**: beyaz zeminde soluk kenarlıklı ve
 * gri yazılı hap sayfanın parçası gibi okunuyordu, tıklanacağı belli
 * olmuyordu. Boşken okunur mürekkep, belirgin kenarlık ve hafif gölge; değer
 * seçilince marka tonunda dolar ve yanında × belirir.
 */
function ChipShell({ active, children }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-stretch overflow-hidden rounded-full border text-[0.8125rem] shadow-xs transition",
        active
          ? "border-brand/40 bg-brand/[0.12] font-semibold text-foreground"
          : "border-foreground/15 bg-card text-foreground hover:border-foreground/30 hover:bg-accent/50",
      )}
    >
      {children}
    </span>
  )
}

/** Tetik + (etkinse) ×. `children` menünün içeriği. */
export function FilterChip({ icon, label, value, onClear, children, menuClassName }) {
  const { t } = useLocale()
  const active = Boolean(value)
  return (
    <ChipShell active={active}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={active ? t("myfiles.filter.value", { label, value }) : label}
            className="inline-flex min-w-0 items-center gap-1.5 py-1.5 pl-3 pr-2.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-10"
          >
            <HugeiconsIcon
              icon={icon}
              className={cn("size-3.5 shrink-0", active ? "text-brand" : "text-foreground/60")}
              strokeWidth={1.9}
            />
            <span className="truncate">{active ? value : label}</span>
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className="size-3 shrink-0 opacity-70"
              strokeWidth={2}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={cn("w-60 p-1.5", menuClassName)}
          onEscapeKeyDown={stopEscape}
        >
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
      {active && (
        <button
          type="button"
          onClick={onClear}
          aria-label={t("myfiles.filter.remove", { label })}
          className="grid w-8 place-items-center border-l border-brand/25 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 [@media(pointer:coarse)]:w-10"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3" strokeWidth={2.2} />
        </button>
      )}
    </ChipShell>
  )
}
