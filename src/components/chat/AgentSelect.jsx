import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import Tick01Icon from "@hugeicons/core-free-icons/Tick01Icon"
import SquareLock01Icon from "@hugeicons/core-free-icons/SquareLock01Icon"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { IconOrLogo } from "@/components/common/IconOrLogo"
import { useLocale } from "@/hooks/useLocale"
import { useConfig } from "@/hooks/useConfig"
import { useAppLock } from "@/hooks/useAuthorizations"
import { AGENT_BRAND, agentDisplayName } from "@/lib/agentName"

// Kapalı pil asistanın TAM adını yazar ("tyroOffice"); açık menüde marka grubun
// başlığına çıkar ve satırlar onsuz okunur ("Office").
const BRAND_EYEBROW = "font-semibold tracking-[0.14em] text-muted-foreground"

export function AgentSelect({ value, onChange }) {
  const { t } = useLocale()
  const { agents, getAgent } = useConfig()
  // Asistan kilidi BURADA gerçek: asistanların dış adresi yok, tek kapı bu
  // ekran. Kartta kilitleyip burada bırakmak kilidi tek tıkla açardı.
  const lock = useAppLock()
  const current = getAgent(value)

  return (
    <DropdownMenu>
      {/* Nested Tooltip + DropdownMenu — both wrap the same Button via
          asChild. Radix's focus management hides the tooltip the moment
          the menu opens, so they don't double-render. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label={current?.name}
              className={
                // h-9 still matches the attach / mic buttons in the composer
                // bottom row, but the horizontal weight (padding, gap, font)
                // shrinks on mobile. On sm+ it relaxes back to a normal pill.
                // Long names truncate via max-w + truncate so the row never
                // overflows.
                //
                // Telefonda ad HİÇ çizilmez, pil yalnızca ikon: besteci alt
                // satırında ekle/mikrofon/gönder ile aynı yeri paylaşıyor ve
                // en uzun ad kısaltılsa bile o satırı sıkıyordu. Ad kayıp
                // değil — `aria-label` ve tooltip taşıyor, menü açıldığında
                // seçili satır da işaretli.
                [
                  "h-9 gap-1.5 rounded-full border-border/50 bg-background px-2.5 @max-3xl/chat:h-8",
                  "text-[0.75rem] font-medium transition-colors hover:bg-muted/40",
                  "sm:gap-2 sm:px-3 sm:text-[0.8125rem]",
                  "max-sm:gap-1 max-sm:px-2",
                ].join(" ")
              }
            >
              <span className="grid size-[0.875rem] shrink-0 place-items-center overflow-hidden rounded-sm sm:size-4">
                <IconOrLogo
                  iconName={current?.iconName}
                  logo={current?.logo}
                  className="size-[0.875rem] sm:size-4"
                />
              </span>
              <span className="hidden min-w-0 flex-col items-start text-left leading-none sm:flex">
                <span className="max-w-[11.25rem] truncate text-[0.75rem]">{current?.name}</span>
              </span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="size-3 shrink-0 text-muted-foreground/70 sm:size-3.5"
              />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {t("chat.tooltip.agent")}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-[min(280px,calc(100vw-2rem))] sm:w-56"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className={`pb-1 text-[0.65625rem] ${BRAND_EYEBROW}`}>
            {AGENT_BRAND}
          </DropdownMenuLabel>
          {agents.map((agent) => {
            const locked = lock.isLocked(agent.name)
            return (
              <DropdownMenuItem
                key={agent.id}
                disabled={locked}
                onClick={locked ? undefined : () => onChange?.(agent.id)}
                className="flex items-center gap-2"
              >
                <span className="grid size-4 shrink-0 place-items-center overflow-hidden rounded-sm text-brand-deep">
                  <IconOrLogo iconName={agent.iconName} logo={agent.logo} className="size-4" />
                </span>
                <span className="flex-1">{agentDisplayName(agent.name)}</span>
                {locked ? (
                  <HugeiconsIcon
                    icon={SquareLock01Icon}
                    className="size-3.5 text-muted-foreground"
                  />
                ) : value === agent.id ? (
                  <HugeiconsIcon icon={Tick01Icon} className="size-3.5 text-brand-via" />
                ) : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
