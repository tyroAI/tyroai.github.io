import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

// Seçeneğin küçük örneği: menüde adın yanında görünümün kendisi.
const SWATCH = {
  standard: "bg-card ring-1 ring-border",
  glass:
    "ring-1 ring-white/80 shadow-inner bg-[linear-gradient(140deg,rgb(255_255_255/0.85),rgb(255_255_255/0.3)),linear-gradient(135deg,var(--brand-from),var(--brand-to))]",
  palette: "bg-gradient-to-br from-brand-from via-brand-via to-brand-to",
  plain:
    "bg-card ring-1 ring-border [background-image:radial-gradient(circle_at_68%_32%,var(--brand-via)_0_24%,transparent_27%)]",
}

/**
 * Araç şeridindeki "Görünüm" düğmesi — radyo seçenekli menü (standart · cam …).
 * Tetikleyici şeridin ok tuşu gezinmesine katılır: ref, `tabIndex`, `data-ctl`
 * ve odak şeritten gelir (`button`).
 */
export function LookMenu({ ref, name, looks, look, onLook, className, children, ...button }) {
  const { t } = useLocale()
  const label = t("widgets.ctl.look", { name })
  return (
    // Kilitlemeyen menü: açıkken sayfanın geri kalanı gizlenmez (şeritteki komşu düğmeler).
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          title={label}
          className={className}
          {...button}
        >
          {children}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-44">
        <DropdownMenuLabel>{t("widgets.look.title")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={look} onValueChange={onLook}>
          {looks.map((value) => (
            <DropdownMenuRadioItem key={value} value={value} className="pointer-coarse:min-h-11">
              <span
                aria-hidden="true"
                className={cn("size-4 shrink-0 rounded-[5px]", SWATCH[value])}
              />
              {t(`widgets.look.${value}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
