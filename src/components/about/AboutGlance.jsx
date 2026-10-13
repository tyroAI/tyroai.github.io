import { Fragment } from "react"
import { motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { TyroLogo } from "@/components/brand/TyroLogo"
import { COMPANIES } from "@/data/companies"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { COMPANY_ICONS } from "./companyIcons"

/**
 * BİR BAKIŞTA — ana şirket → teknoloji iştiraki → AI ürünü. "Kim kimin nesi" sorusunu
 * tek satırda cevaplar; şirket düğümleri aşağıdaki bölümüne kaydırır (odak da
 * oraya geçer). Telefonda alt alta, oklar aşağı döner.
 */
export function AboutGlance({ isDark }) {
  const { t } = useLocale()
  const reduce = useReducedMotion()
  const nodes = [
    ...COMPANIES.map((c) => ({
      id: c.id,
      name: c.name,
      role: t(`about.role.${c.role}`),
      icon: COMPANY_ICONS[c.id],
    })),
    { id: "tyro", name: "TYRO", role: t("about.role.product") },
  ]
  return (
    <motion.nav
      aria-label={t("about.glance")}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="mt-10 sm:mt-12"
    >
      <ol className="flex flex-col gap-1.5 sm:flex-row sm:items-stretch sm:gap-0">
        {nodes.map((node, i) => (
          <Fragment key={node.id}>
            {i > 0 && (
              <li
                aria-hidden="true"
                className={cn(
                  "flex items-center justify-center sm:px-1.5",
                  isDark ? "text-white/30" : "text-[#1a1a1a]/30",
                )}
              >
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="size-4 rotate-90 sm:rotate-0"
                  strokeWidth={2}
                />
              </li>
            )}
            <li className="sm:flex-1">
              <GlanceNode node={node} isDark={isDark} reduce={reduce} />
            </li>
          </Fragment>
        ))}
      </ol>
    </motion.nav>
  )
}

function GlanceNode({ node, isDark, reduce }) {
  const isCompany = Boolean(node.icon)
  const body = (
    <>
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          isCompany &&
            "bg-gradient-to-br from-brand-from/15 via-brand-via/10 to-brand-to/15 text-brand",
        )}
      >
        {isCompany ? (
          <HugeiconsIcon icon={node.icon} className="size-5" strokeWidth={1.7} />
        ) : (
          <TyroLogo size={30} />
        )}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[0.6875rem] font-semibold uppercase leading-snug tracking-[0.1em]",
            isDark ? "text-white/50" : "text-[#1a1a1a]/50",
          )}
        >
          {node.role}
        </span>
        <span className="mt-0.5 block text-[0.9375rem] font-semibold leading-snug">
          {node.name}
        </span>
      </span>
    </>
  )
  const box = cn(
    "flex h-full items-center gap-3 rounded-2xl p-3.5 ring-1",
    isDark ? "bg-white/[0.035] ring-white/10" : "bg-white/80 shadow-sm ring-black/[0.06]",
  )
  if (!isCompany) return <div className={box}>{body}</div>
  return (
    <a
      href={`#${node.id}`}
      onClick={(e) => {
        const target = document.getElementById(node.id)
        if (!target) return
        e.preventDefault()
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
        target.focus({ preventScroll: true })
      }}
      className={cn(
        box,
        "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        isDark ? "hover:bg-white/[0.06]" : "hover:bg-white",
      )}
    >
      {body}
    </a>
  )
}
