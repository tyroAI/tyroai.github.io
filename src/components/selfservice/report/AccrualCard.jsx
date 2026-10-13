import { motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon"
import { useLocale } from "@/hooks/useLocale"
import { getNumberFormat, pluralKey } from "@/lib/intl-cache"
import { accrualProgress } from "@/lib/selfServiceAccrual"
import { cn } from "@/lib/utils"
import { day, number } from "../kinds"

const CAPS = "text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-foreground/65"
const SMALL = "text-[0.6875rem] leading-snug text-foreground/65"
const PERCENT = { style: "percent", maximumFractionDigits: 0 }

/** Büyük sayı + küçük birim; birim dilin çoğul kuralıyla ("1 day" · "26 days"). */
function Amount({ n, plus = false, accent = false }) {
  const { t, locale } = useLocale()
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
      <span
        className={cn(
          "text-[1.25rem] font-semibold leading-tight tabular-nums",
          accent ? "text-brand-ink" : "text-foreground",
        )}
      >
        {plus && "+"}
        {number(n, locale)}
      </span>
      <span className="text-[0.75rem] font-medium text-foreground/65">
        {t(pluralKey("selfService.accrual.unit", locale, n))}
      </span>
    </span>
  )
}

/** Dönem çubuğu: önceki yıl dönümünden sonraki hak edişe; uçlarda tarihler. */
function PeriodBar({ progress }) {
  const { t, locale } = useLocale()
  const reduce = useReducedMotion()
  // Aşağı yuvarlanır: %100 yalnız hak ediş günü (1 gün kala %99).
  const pct = Math.floor(progress.share * 100)
  return (
    <div className="mt-3">
      <div
        role="progressbar"
        aria-label={t("selfService.accrual.period")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={getNumberFormat(locale, PERCENT).format(pct / 100)}
        className="relative h-1.5 rounded-full bg-foreground/[0.07]"
      >
        <motion.span
          className="absolute inset-y-0 start-0 rounded-full bg-brand/70"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            aria-hidden="true"
            className="absolute top-1/2 -end-1 size-2.5 -translate-y-1/2 rounded-full bg-brand ring-2 ring-popover"
          />
        </motion.span>
      </div>
      <div className={cn(SMALL, "mt-1.5 flex justify-between gap-2 tabular-nums")}>
        <span>{day(progress.from, locale)}</span>
        <span>{day(progress.to, locale)}</span>
      </div>
    </div>
  )
}

/**
 * Sonraki hak ediş kartı (`nextAccrual`): kaç gün sonra · yeni hak · hak edişteki bakiye (kalan
 * + yeni hak; `remain` bilinmiyorsa yok), dönem çubuğu ve tahmin açıklaması. Tahmin olduğu
 * için açıklama kartta hep açık (hover kartında odak içeriğe gitmez). Özet kutusunun ayrıntısı
 * (masaüstünde hover kartı, telefonda çekmece) gösterir.
 */
export function AccrualCard({ accrual, remain = null, className }) {
  const { t, locale } = useLocale()
  if (!accrual) return null
  const progress = accrualProgress(accrual)
  const date = day(accrual.date, locale)
  const stats = [
    accrual.daysLeft === 0
      ? {
          key: "when",
          value: (
            <span className="text-[1.0625rem] font-semibold leading-tight text-foreground">
              {t("selfService.accrual.today")}
            </span>
          ),
          label: date,
        }
      : {
          key: "when",
          value: <Amount n={accrual.daysLeft} />,
          label: t("selfService.accrual.after"),
          sub: date,
        },
    {
      key: "new",
      value: <Amount n={accrual.days} plus accent />,
      label: t("selfService.accrual.new"),
    },
    remain != null && {
      key: "then",
      value: <Amount n={Number(remain) + accrual.days} />,
      label: t("selfService.accrual.then"),
    },
  ].filter(Boolean)
  const hint = t("selfService.accrual.hint")
  return (
    <section className={cn("min-w-0 rounded-xl bg-foreground/[0.03] px-3 py-2.5", className)}>
      <div className="flex items-center gap-2">
        <h4 className={cn(CAPS, "min-w-0 truncate")}>{t("selfService.accrual.title")}</h4>
        <span className="shrink-0 rounded-full bg-foreground/[0.06] px-1.5 py-px text-[0.625rem] font-medium text-foreground/75">
          {t("selfService.accrual.estimated")}
        </span>
      </div>
      <div className={cn("mt-2 grid gap-2", stats.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {stats.map((s) => (
          <div key={s.key} className="min-w-0">
            {s.value}
            <p className={cn(SMALL, "mt-0.5")}>{s.label}</p>
            {s.sub && <p className={cn(SMALL, "font-medium text-foreground/80")}>{s.sub}</p>}
          </div>
        ))}
      </div>
      <PeriodBar progress={progress} />
      <p
        className={cn(
          SMALL,
          "mt-2.5 flex items-start gap-1.5 border-t border-foreground/[0.06] pt-2",
        )}
      >
        <HugeiconsIcon
          icon={InformationCircleIcon}
          aria-hidden="true"
          className="mt-px size-3.5 shrink-0"
          strokeWidth={1.9}
        />
        <span className="min-w-0">{hint}</span>
      </p>
    </section>
  )
}
