import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/useLocale"
import { usePalette } from "@/hooks/usePalette"

/** Paletin renk örneği: düz palette tek nokta, degradede üst üste noktalar. */
export function PaletteSwatch({ colors, solid = false }) {
  if (solid) {
    return (
      <span
        style={{ backgroundColor: colors[0] }}
        className="size-3.5 shrink-0 rounded-full ring-1 ring-background"
      />
    )
  }
  return (
    <span className="inline-flex h-4 shrink-0 items-center -space-x-1.5">
      {colors.map((c, i) => (
        <span
          key={i}
          style={{ backgroundColor: c }}
          className="size-3.5 rounded-full ring-1 ring-background"
        />
      ))}
    </span>
  )
}

const GROUP_LABEL = "text-[0.625rem] font-medium uppercase tracking-[0.14em] text-muted-foreground"

/** Palet seçenekleri (düz · degrade) — header seçicisi ve kullanıcı menüsü aynı listeyi çizer. */
export function PaletteOptions() {
  const { t, locale } = useLocale()
  const { palette, setPalette, palettes } = usePalette()
  const solid = palettes.filter((p) => p.group === "solid")
  const gradient = palettes.filter((p) => p.group !== "solid")
  return (
    <DropdownMenuRadioGroup value={palette} onValueChange={setPalette}>
      <DropdownMenuLabel lang={locale} className={GROUP_LABEL}>
        {t("palette.group.solid")}
      </DropdownMenuLabel>
      {solid.map((p) => (
        <DropdownMenuRadioItem key={p.id} value={p.id} className="gap-2 pointer-coarse:min-h-11">
          <span className="flex-1">{t(p.labelKey, p.id)}</span>
          <PaletteSwatch colors={p.swatch} solid />
        </DropdownMenuRadioItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuLabel lang={locale} className={GROUP_LABEL}>
        {t("palette.group.gradient")}
      </DropdownMenuLabel>
      {gradient.map((p) => (
        <DropdownMenuRadioItem key={p.id} value={p.id} className="gap-2 pointer-coarse:min-h-11">
          <span className="flex-1">{t(p.labelKey, p.id)}</span>
          <PaletteSwatch colors={p.swatch} />
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}
