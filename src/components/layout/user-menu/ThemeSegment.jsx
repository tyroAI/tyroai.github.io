import { HugeiconsIcon } from "@hugeicons/react"
import Moon02Icon from "@hugeicons/core-free-icons/Moon02Icon"
import Sun01Icon from "@hugeicons/core-free-icons/Sun01Icon"
import SunMoonIcon from "@hugeicons/core-free-icons/SunMoonIcon"
import { useId } from "react"
import { MotionConfig, motion } from "motion/react"
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/useLocale"
import { useTheme } from "@/hooks/useTheme"

const OPTIONS = [
  { value: "light", icon: Sun01Icon, label: "profile.prefs.light" },
  { value: "dark", icon: Moon02Icon, label: "profile.prefs.dark" },
]

/**
 * Kullanıcı menüsünün tema satırı: etiket + açık · koyu segmenti; seçili olanın
 * altında kayan bir zemin. Seçim menüyü kapatmaz (`onSelect` önlenir). Ok tuşları menünün
 * öteki satırları gibi gezinir, adlar `aria-label`'da.
 */
export function ThemeSegment() {
  const { t } = useLocale()
  const { preference, setTheme } = useTheme()
  const labelId = useId()
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="flex h-9 items-center gap-2.5 ps-2 pe-1 pointer-coarse:h-12"
    >
      <HugeiconsIcon
        icon={SunMoonIcon}
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.8}
      />
      <span id={labelId} className="flex-1 text-[0.8125rem]">
        {t("header.theme")}
      </span>
      <MotionConfig reducedMotion="user">
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={setTheme}
          className="relative isolate inline-grid h-[1.625rem] auto-cols-[1.75rem] grid-flow-col rounded-[7px] bg-foreground/[0.05] p-0.5 pointer-coarse:h-9 pointer-coarse:auto-cols-[2.5rem]"
        >
          {OPTIONS.map((o) => (
            <DropdownMenuRadioItem
              key={o.value}
              value={o.value}
              aria-label={t(o.label)}
              title={t(o.label)}
              onSelect={(e) => e.preventDefault()}
              className="grid min-h-0 place-items-center rounded-[5px] p-0 text-muted-foreground focus:bg-foreground/[0.06] data-[state=checked]:text-foreground [&>[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
            >
              {preference === o.value && (
                <motion.span
                  layoutId="user-menu-theme-thumb"
                  aria-hidden="true"
                  transition={{ type: "spring", stiffness: 520, damping: 38 }}
                  className="absolute inset-0 -z-10 rounded-[5px] bg-background shadow-[0_1px_1.5px_rgb(0_0_0/0.08),0_0_0_0.5px_rgb(0_0_0/0.06)] dark:bg-foreground/20 dark:shadow-none"
                />
              )}
              <HugeiconsIcon
                icon={o.icon}
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={1.9}
              />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </MotionConfig>
    </div>
  )
}
