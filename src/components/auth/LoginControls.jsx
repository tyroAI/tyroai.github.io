import { NavLink, useLocation } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon"
import Moon02Icon from "@hugeicons/core-free-icons/Moon02Icon"
import Sun03Icon from "@hugeicons/core-free-icons/Sun03Icon"
import VolumeHighIcon from "@hugeicons/core-free-icons/VolumeHighIcon"
import VolumeMute02Icon from "@hugeicons/core-free-icons/VolumeMute02Icon"
import Globe02Icon from "@hugeicons/core-free-icons/Globe02Icon"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useLocale } from "@/hooks/useLocale"
import { useTheme } from "@/hooks/useTheme"
import { ABOUT_PATH, publicPagePath } from "@/lib/publicPages"
import { LOCALES } from "@/providers/LocaleProvider"
import { cn } from "@/lib/utils"

// Giriş ve tanıtım sayfalarının başlığındaki her denetimin ortak yüzü: çerçevesiz,
// aynı üstüne gelme zemini ve klavye halkası. Hedef telefonda 36, geniş ekranda
// 40 px — iki bağlantı + üç ayar dar telefonda ancak böyle sığıyor.
function controlTone(isDark) {
  return cn(
    "rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
    isDark
      ? "text-white/70 hover:bg-white/[0.06] hover:text-white"
      : "text-[#1a1a1a]/70 hover:bg-black/[0.04] hover:text-[#1a1a1a]",
  )
}

function IconButton({ label, icon, isDark, onClick }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={cn("grid size-9 place-items-center sm:size-10", controlTone(isDark))}
        >
          <HugeiconsIcon icon={icon} className="size-[1.125rem]" strokeWidth={1.6} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function LoginMuteToggle({ muted, isDark, onToggle }) {
  const { t } = useLocale()
  return (
    <IconButton
      label={muted ? t("login.audio.unmute") : t("login.audio.mute")}
      icon={muted ? VolumeMute02Icon : VolumeHighIcon}
      isDark={isDark}
      onClick={onToggle}
    />
  )
}

export function LoginThemeToggle({ isDark }) {
  const { toggle } = useTheme()
  const { t } = useLocale()
  return (
    <IconButton
      label={isDark ? t("header.toggleLight") : t("header.toggleDark")}
      icon={isDark ? Sun03Icon : Moon02Icon}
      isDark={isDark}
      onClick={toggle}
    />
  )
}

/**
 * Dil: ŞU ANKİ dili gösterir (🌐 TR ▾), açılınca dört dil KENDİ adıyla. Hedef
 * dili yazan iki konumlu düğmede "EN"in şu anki mi gidilecek mi olduğu belli
 * değildi ve Rusça, Arapça girişten seçilemiyordu. Bayrak yok: dil ülke değil.
 */
export function LoginLanguageMenu({ isDark }) {
  const { locale, setLocale, t } = useLocale()
  const label = t("header.language")
  const code = locale.toUpperCase()
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${label}: ${code}`}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 px-2 text-[0.75rem] font-semibold tracking-[0.12em] sm:h-10 sm:px-2.5",
                controlTone(isDark),
              )}
            >
              <HugeiconsIcon icon={Globe02Icon} className="size-4" strokeWidth={1.7} />
              {code}
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="-ml-0.5 hidden size-3.5 opacity-60 sm:block"
                strokeWidth={2}
              />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" sideOffset={6} className="w-48 p-1.5">
        <DropdownMenuRadioGroup value={locale} onValueChange={setLocale}>
          {LOCALES.map((id) => (
            <DropdownMenuRadioItem key={id} value={id} className="min-h-9 gap-3 text-[0.8125rem]">
              <span lang={id} className="flex-1">
                {t(`locale.${id}`)}
              </span>
              <span
                aria-hidden="true"
                className="text-[0.6875rem] font-semibold tracking-[0.12em] text-muted-foreground"
              >
                {id.toUpperCase()}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const NAV = [
  { to: ABOUT_PATH, icon: Building03Icon, label: "about.nav" },
]

/**
 * Gidilecek yerler: Hakkımızda · Ekibimiz. Ayar değil SAYFA — o yüzden kümenin
 * başında ve geniş ekranda METİNLİ. 768 px altında iki ad birden sığmıyor
 * (Türkçesi uzun): yalnız ikon, adı `aria-label`da ve ipucunda. Bulunulan sayfa
 * `aria-current` ile işaretli ve zemini dolu.
 */
export function LoginNavLinks({ isDark }) {
  const { t } = useLocale()
  // Etkin sayfa elle: ipucunun `asChild`i (Radix Slot) NavLink'in fonksiyon
  // `className`ini birleştiremiyor, sınıflar düşüyordu. `aria-current`ı NavLink yazar.
  const { pathname } = useLocation()
  return NAV.map(({ to, icon, label }) => (
    <Tooltip key={to}>
      <TooltipTrigger asChild>
        <NavLink
          to={to}
          aria-label={t(label)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 px-2 text-[0.8125rem] font-medium sm:h-10 md:px-3",
            controlTone(isDark),
            publicPagePath(pathname) === to &&
              (isDark ? "bg-white/[0.08] text-white" : "bg-black/[0.05] text-[#1a1a1a]"),
          )}
        >
          <HugeiconsIcon
            icon={icon}
            // Yerleşik eşleşme (shadcn · Primer · Linear): 13 px yazının yanında 16 px
            // ikon, ikisi aynı eksende ortalı, ikona özel piksel kaydırma yok. 18 px
            // ikon yazıya göre büyük kalıyor, altı ağır çizimler aşağıda görünüyordu.
            className="size-4 shrink-0"
            strokeWidth={1.7}
          />
          <span className="hidden md:inline">{t(label)}</span>
        </NavLink>
      </TooltipTrigger>
      <TooltipContent className="md:hidden">{t(label)}</TooltipContent>
    </Tooltip>
  ))
}

/** Gezinme ile ayarları ayıran ince çizgi. */
export function HeaderDivider({ isDark }) {
  return (
    <span
      aria-hidden="true"
      className={cn("mx-0.5 h-5 w-px shrink-0 sm:mx-2", isDark ? "bg-white/15" : "bg-black/10")}
    />
  )
}

/**
 * Giriş başlığının sağ kümesi, İKİ GRUP: gidilecek yerler (Hakkımızda · Ekibimiz) |
 * bu ekranın ayarları (ses · tema · dil). Dil en sağda: Türkçe bilmeyen onu köşede
 * arar, ve metinli tetik satırı iki uçtan dengeliyor.
 */
export function LoginHeaderControls({ muted, isDark, onToggleMute }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
      <LoginNavLinks isDark={isDark} />
      <HeaderDivider isDark={isDark} />
      <LoginMuteToggle muted={muted} isDark={isDark} onToggle={onToggleMute} />
      <LoginThemeToggle isDark={isDark} />
      <LoginLanguageMenu isDark={isDark} />
    </div>
  )
}
