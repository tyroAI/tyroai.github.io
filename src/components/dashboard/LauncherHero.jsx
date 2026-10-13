import { useEffect } from "react"
import { Link } from "react-router-dom"
import { motion, useMotionValue, useSpring, useTransform } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { InlineLoader } from "generative-loaders"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { useLocale } from "@/hooks/useLocale"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMe } from "@/hooks/useMe"
import { usePageAccess } from "@/hooks/usePageAccess"
import { greetingKey } from "@/lib/greeting"
import { useDailyBriefCta } from "@/hooks/useDailyBriefCta"
import { cn } from "@/lib/utils"
import { BrandOrb } from "@/components/brand/BrandOrb"

// Word-by-word reveal: smooth blur+rise stagger
const wordVariants = {
  hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

const lineVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } },
}

export function HeroSection({ onNewChat, briefAgent }) {
  const { t } = useLocale()
  const isMobile = useIsMobile()
  const me = useMe()
  const greetHour = new Date().getHours()
  // Gün özeti kararı Akışım'ın öneri çipiyle ORTAK — gerekçe kancada.
  const { label: ctaLabel, ask: ctaAsk } = useDailyBriefCta(briefAgent)
  const feedOpen = usePageAccess().feed
  const firstName = (me.name || "").split(" ")[0]
  const greetingText = t(greetingKey(greetHour))
  const greetingWords = greetingText.split(" ")

  // Mouse parallax — orb subtly follows cursor (desktop only)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springConfig = { stiffness: 70, damping: 18, mass: 0.6 }
  const orbX = useSpring(useTransform(mouseX, [-1, 1], [-12, 12]), springConfig)
  const orbY = useSpring(useTransform(mouseY, [-1, 1], [-10, 10]), springConfig)

  useEffect(() => {
    if (isMobile) return
    function handle(e) {
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      mouseX.set(x)
      mouseY.set(y)
    }
    window.addEventListener("mousemove", handle, { passive: true })
    return () => window.removeEventListener("mousemove", handle)
  }, [isMobile, mouseX, mouseY])

  return (
    <section className="relative">
      <div className="grid grid-cols-1 items-center gap-10 pt-10 pb-4 md:grid-cols-[1.4fr_1fr] md:gap-12 md:pt-14 md:pb-6">
        {/* LEFT — greeting + CTA */}
        <div className="space-y-5">
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={lineVariants}
            className="text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl md:text-[2.75rem]"
          >
            {greetingWords.map((word, i) => (
              <motion.span key={`g-${i}`} variants={wordVariants} className="inline-block">
                {word}
                {i < greetingWords.length - 1 && " "}
              </motion.span>
            ))}
            <motion.span variants={wordVariants} className="inline-block">
              ,&nbsp;
            </motion.span>
            <motion.span
              variants={wordVariants}
              className="inline-block bg-gradient-to-r from-brand-text-from via-brand-text-via to-brand-text-to bg-clip-text text-transparent"
            >
              {firstName}
            </motion.span>
            {/* ÜNLEM, nokta değil — Anasayfa'nın selamlamasıyla aynı. */}
            <motion.span variants={wordVariants} className="inline-block">
              !
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {t("dashboard.hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-3 pt-1"
          >
            <motion.button
              type="button"
              onClick={() => onNewChat(ctaAsk)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className={cn(
                "group inline-flex items-center gap-2 rounded-full",
                "bg-gradient-to-r from-brand-from via-brand-via to-brand-to",
                "px-5 py-2.5 text-sm font-semibold text-brand-on-brand shadow-sm",
                "transition-shadow duration-200 hover:shadow-lg hover:brightness-110",
              )}
            >
              {/* Renk VERİLMEDİ, bilerek: bu bileşen `currentColor` ile
                  çiziyor ve butonun kendisi `text-white` taşıyor, yani
                  yazıyla aynı mürekkebi kendiliğinden alıyor. Sabit bir renk
                  yazmak, yazı rengi değiştiği gün ikisini ayrıştırırdı.

                  Boyut 20, 24 değil: 24 butonu 40px'ten 44px'e çıkarıyor.
                  20'de buton kendi yüksekliğinde kalıyor ve glif 14px
                  yazının yanında orantılı duruyor. */}
              <InlineLoader variant="fold" size={20} speed={0.75} />
              {ctaLabel}
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                className="size-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </motion.button>
            {/* ⚠️ İKİNCİL EYLEM KEŞFET'E GİDER.
                Eskiden aynı sayfanın `#apps` çapasıydı — kullanıcıyı zaten
                baktığı ızgaraya indiriyordu, yani "gör" dediği şey ekranın
                altındaydı. Şimdi başka bir yere, şirketin akışına götürüyor.
                ⚠️ Kapı `usePageAccess().feed` (şalter + kitle): Keşfet'i
                açamayan kişide rota onu sessizce dashboard'a geri atardı —
                düğme o hâlde eski çapasına dönüyor. Bugün önizleme ekibi
                dışındaki herkes bu dalda. */}
            {feedOpen ? (
              <Link
                to="/feed"
                className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                {t("dashboard.hero.secondary")} →
              </Link>
            ) : (
              <a
                href="#apps"
                className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                {t("apps.title")} →
              </a>
            )}
          </motion.div>
        </div>

        {/* RIGHT — orb with parallax + entrance breath */}
        <div className="flex justify-center md:justify-end">
          <motion.div
            initial={{ opacity: 0, scale: 0.65, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{
              duration: 1.1,
              delay: 0.1,
              ease: [0.22, 1, 0.36, 1],
              scale: { type: "spring", stiffness: 110, damping: 16, mass: 0.9 },
            }}
            style={{ x: orbX, y: orbY }}
          >
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              onClick={() => onNewChat(ctaAsk)}
              role="button"
              tabIndex={0}
              /* Sabit Türkçe metin gitti: etiket dinamikleşince o ihlal
                 görünür bir hataya dönerdi (ekran okuyucu "Yeni sohbet
                 başlat" derken düğme "Sabah özeti hazırla" yazıyor). */
              aria-label={ctaLabel}
              className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-via/40"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <BrandOrb surface="dashboard" state="idle" size={isMobile ? 130 : 180} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
