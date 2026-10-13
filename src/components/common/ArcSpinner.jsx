import { motion } from "motion/react"
import { cn } from "@/lib/utils"

/**
 * Orb inene kadar dönen çember. `currentColor` çizer: hangi yüzeyin üstünde olduğunu
 * ve rengini çağıran söyler. Ayrı dosyada, çünkü kopyalar zamanla farklı hızda döner.
 */
export function ArcSpinner({ className }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className={cn("size-12", className)}
      fill="none"
      aria-hidden="true"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.18" />
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        // Çevrenin (2π·9 ≈ 56,5) ~%30'u çizili, gerisi açık.
        strokeDasharray="17 40"
      />
    </motion.svg>
  )
}
