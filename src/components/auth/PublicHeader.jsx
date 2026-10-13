import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { HeaderDivider, LoginLanguageMenu, LoginNavLinks, LoginThemeToggle } from "./LoginControls"

/**
 * Tanıtım sayfalarının (Hakkımızda · Ekibimiz) ortak başlığı: solda girişe dönüş,
 * sağda girişteki küme — iki sayfa arasında girişe dönmeden geçilir, bulunulan
 * sayfa işaretli. 360 px altında dönüş yalnız ok (adı ekran okuyucuda).
 */
export function PublicHeader({ isDark }) {
  const { t } = useLocale()
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-2 px-4 py-4 sm:px-6">
      <Link
        to="/login"
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:h-10 sm:px-3",
          isDark
            ? "text-white/75 hover:bg-white/[0.06] hover:text-white"
            : "text-[#1a1a1a]/75 hover:bg-black/[0.04] hover:text-[#1a1a1a]",
        )}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" strokeWidth={1.8} />
        <span className="max-[360px]:sr-only">{t("team.back")}</span>
      </Link>
      <div className="flex items-center gap-0.5 sm:gap-1">
        <LoginNavLinks isDark={isDark} />
        <HeaderDivider isDark={isDark} />
        <LoginThemeToggle isDark={isDark} />
        <LoginLanguageMenu isDark={isDark} />
      </div>
    </header>
  )
}
