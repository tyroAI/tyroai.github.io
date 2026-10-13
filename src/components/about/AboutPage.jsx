import { useEffect } from "react"
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon"
import { PublicHeader } from "@/components/auth/PublicHeader"
import { PublicPageTitle } from "@/components/auth/PublicPageTitle"
import { LOGIN_GRADIENT } from "@/components/auth/loginGradient"
import { COMPANIES } from "@/data/companies"
import { useLocale } from "@/hooks/useLocale"
import { useTheme } from "@/hooks/useTheme"
import { cn } from "@/lib/utils"
import { AboutCompany } from "./AboutCompany"
import { AboutGlance } from "./AboutGlance"

/**
 * HAKKIMIZDA (`/about`) — demo: kurgusal şirket (Vega Global) ve TYRO ürünü.
 * Girişin sağ üstünde; oturum gerektirmez. Akış: başlık → bir bakışta yapı →
 * şirket → demo notu.
 */
export function AboutPage() {
  const { t, locale } = useLocale()
  const { theme } = useTheme()
  const isDark = theme === "dark"
  // Arapça paragraf Latin bir adla ("TYRO") başlayınca `auto` LTR seçip cümleyi
  // karıştırıyordu: Arapçada yön açıkça rtl.
  const textDir = locale === "ar" ? "rtl" : "auto"

  useEffect(() => {
    const before = document.title
    document.title = `${t("about.title")} · TYRO`
    return () => {
      document.title = before
    }
  }, [t])

  return (
    <div
      className={cn(
        "relative min-h-dvh overflow-x-hidden",
        isDark ? "bg-[#0b0b0f] text-white" : "bg-[#fafafa] text-[#1a1a1a]",
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-48 left-1/2 h-[32rem] w-[64rem] max-w-[200vw] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ backgroundImage: LOGIN_GRADIENT }}
      />
      <PublicHeader isDark={isDark} />
      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <PublicPageTitle
          icon={Building03Icon}
          title={t("about.title")}
          subtitle={t("about.lead")}
          isDark={isDark}
          dir={textDir}
        />

        <AboutGlance isDark={isDark} />

        <div className="mt-10 space-y-5 sm:mt-14 sm:space-y-6">
          {COMPANIES.map((c) => (
            <AboutCompany key={c.id} company={c} isDark={isDark} textDir={textDir} />
          ))}
        </div>

        <p
          dir={textDir}
          className={cn(
            "mt-10 text-center text-[0.75rem] sm:mt-14",
            isDark ? "text-white/45" : "text-[#1a1a1a]/45",
          )}
        >
          {t("about.demoNote")}
        </p>
      </main>
    </div>
  )
}
