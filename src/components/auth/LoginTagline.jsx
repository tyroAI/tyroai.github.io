import { motion } from "motion/react"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { LOGIN_GRADIENT } from "./loginGradient"

/**
 * Kürenin altındaki "TYRO AI" ve slogan — düz metin, yumuşak bir girişle belirir ("AI"
 * logonun pembe → morunda). Slogan tek paragraf, iki satır: ana cümle dengeli kırılır,
 * "anında eriş." her ekranda kendi satırında; `dir="auto"`: Arapçada nokta başa kaçmasın.
 */
export function LoginTagline({ isDark }) {
  const { t } = useLocale()
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
      className="flex max-w-3xl flex-col items-center gap-2 text-center"
    >
      <span className="inline-flex items-baseline text-lg font-bold tracking-tight sm:text-2xl">
        <span className={cn(isDark ? "text-white" : "text-[#1a1a1a]")}>TYRO</span>
        <span
          className="ml-1.5 bg-clip-text text-transparent"
          style={{ backgroundImage: LOGIN_GRADIENT }}
        >
          AI
        </span>
      </span>
      <p
        dir="auto"
        className={cn(
          "text-sm leading-relaxed sm:text-xl",
          isDark ? "text-[#D7E2EA]/85" : "text-[#1a1a1a]/75",
        )}
      >
        <span className="block text-balance">{t("login.motto")}</span>
        <span className="block">{t("login.mottoEnd")}</span>
      </p>
    </motion.div>
  )
}
