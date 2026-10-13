import { motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import QuoteUpIcon from "@hugeicons/core-free-icons/QuoteUpIcon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { COMPANY_ICONS } from "./companyIcons"

/**
 * Şirket bölümü. Solda KİM: rol, ad, tanıtım, resmî sayfa. Sağda KANIT: rakamlar
 * (ana şirket) ya da odak alanları (iştirak) ve şirketin KENDİ cümlesi (vizyon ·
 * yaklaşım, resmî sitedeki hâliyle). Telefonda alt alta.
 */
export function AboutCompany({ company, isDark, textDir }) {
  const { t } = useLocale()
  const reduce = useReducedMotion()
  const { id, name, role, url, facts, focus } = company
  const sub = isDark ? "text-white/65" : "text-[#1a1a1a]/65"
  const faint = isDark ? "text-white/50" : "text-[#1a1a1a]/50"
  const tile = isDark ? "bg-white/[0.04] ring-white/10" : "bg-[#fafafa] ring-black/[0.06]"
  return (
    <motion.section
      id={id}
      tabIndex={-1}
      aria-labelledby={`about-${id}`}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "scroll-mt-6 rounded-[1.75rem] p-6 outline-none ring-1 sm:p-8",
        isDark ? "bg-white/[0.035] ring-white/10" : "bg-white/85 shadow-sm ring-black/[0.06]",
      )}
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div className="flex flex-col">
          <p className="flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-brand">
            <HugeiconsIcon icon={COMPANY_ICONS[id]} className="size-4" strokeWidth={1.8} />
            {t(`about.role.${role}`)}
          </p>
          <h2
            id={`about-${id}`}
            className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[2rem]"
          >
            {name}
          </h2>
          <p dir={textDir} className={cn("mt-4 text-[0.9375rem] leading-relaxed", sub)}>
            {t(`about.${id}.desc`)}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("about.websiteAria", { name })}
            className={cn(
              "mt-5 inline-flex items-center gap-1 self-start text-[0.8125rem] font-semibold transition-colors focus-visible:underline focus-visible:outline-none lg:mt-auto lg:pt-6",
              isDark ? "text-white/80 hover:text-white" : "text-[#1a1a1a]/80 hover:text-[#1a1a1a]",
            )}
          >
            {t("about.website")}
            <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" strokeWidth={2} />
          </a>
        </div>
        <div className="flex flex-col gap-3">
          {facts && (
            <dl className="grid grid-cols-2 gap-3">
              {facts.map((f) => (
                <div
                  key={f.id}
                  className={cn("flex flex-col-reverse rounded-2xl p-4 ring-1", tile)}
                >
                  <dt className={cn("mt-1.5 text-[0.8125rem] leading-snug", sub)}>
                    {t(`about.fact.${f.id}`)}
                  </dt>
                  <dd className="bg-gradient-to-r from-brand-from via-brand-via to-brand-to bg-clip-text text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-transparent">
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {focus && (
            <div className={cn("rounded-2xl p-4 ring-1", tile)}>
              <p
                className={cn("text-[0.6875rem] font-semibold uppercase tracking-[0.12em]", faint)}
              >
                {t("about.focusTitle")}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {focus.map((f) => (
                  <li
                    key={f}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[0.8125rem] font-medium ring-1",
                      isDark ? "bg-white/[0.06] ring-white/10" : "bg-white ring-black/[0.07]",
                    )}
                  >
                    {t(`about.focus.${f}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <figure className={cn("rounded-2xl p-5 ring-1", tile)}>
            <HugeiconsIcon
              icon={QuoteUpIcon}
              aria-hidden="true"
              className="size-5 text-brand"
              strokeWidth={1.8}
            />
            <blockquote dir={textDir} className="mt-2 text-[1rem] font-medium leading-snug">
              {t(`about.${id}.quote`)}
            </blockquote>
            <figcaption
              className={cn(
                "mt-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em]",
                faint,
              )}
            >
              {t(`about.${id}.quoteLabel`)}
            </figcaption>
          </figure>
        </div>
      </div>
    </motion.section>
  )
}
