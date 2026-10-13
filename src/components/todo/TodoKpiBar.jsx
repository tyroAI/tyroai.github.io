import { useId, useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon"
import StarIcon from "@hugeicons/core-free-icons/StarIcon"
import { useLocale } from "@/hooks/useLocale"
import { periodProgress } from "@/lib/todoInsights"
import { cn } from "@/lib/utils"
import { firstDayOfWeek } from "@/lib/weekStart"
import { STATUS_TONES } from "./statusTones"

const C = 2 * Math.PI * 15.5

/** Küçük halka, yüzde ortasında — kartın büyük halkasının telefondaki hâli. */
function MiniRing({ pct, live }) {
  // Kimlik örneğe özel: gizli (display:none) bir kopyadaki gradyana başvuru çizilmiyor.
  const id = useId()
  return (
    <span className="relative grid size-10 shrink-0 place-items-center">
      <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--brand-from)" }} />
            <stop offset="55%" style={{ stopColor: "var(--brand-via)" }} />
            <stop offset="100%" style={{ stopColor: "var(--brand-to)" }} />
          </linearGradient>
        </defs>
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          strokeWidth="4"
          className="stroke-foreground/[0.08]"
        />
        {pct > 0 && (
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            stroke={`url(#${id})`}
            strokeDasharray={`${(pct / 100) * C} ${C}`}
          />
        )}
      </svg>
      <span className="text-[0.6875rem] font-semibold leading-none tabular-nums">
        {live ? pct : "—"}
        {live && <small className="text-[0.5rem] font-medium text-muted-foreground">%</small>}
      </span>
    </span>
  )
}

/**
 * Durumun tek satırlık özeti: dört sayı (gecikmiş · önemli · planlanan · son 7 günde biten) ve
 * sonda bugünün yüzdesi. Telefonda (ve yatay telefonda) kartın tepsisinin yerini tutar, dokununca
 * alttan çekmece açılır. Yüzeyi tepsiyle aynı düz kart: gradyanın üstünde küçük yazı yok.
 * Sayıların rengi ikonda, rakam ön plan renginde: küçük yazıda AA. Dar çubukta (360 px telefon)
 * ok gizlenir; sayılar sığmazsa halkanın altına girmez, kırpılır.
 */
export function TodoKpiBar({ tasks, summary, planned, today, state, onOpen, className }) {
  const { t, locale } = useLocale()
  const { done, total } = useMemo(
    () => periodProgress(tasks, today, "today", firstDayOfWeek(locale)),
    [tasks, today, locale],
  )
  const pct = total ? Math.round((done / total) * 100) : 0
  const live = state.live
  const items = [
    { key: "overdue", icon: Alert02Icon, n: summary.overdue.length },
    { key: "important", icon: StarIcon, n: summary.important.length, filled: true },
    { key: "planned", icon: Calendar03Icon, n: planned.length },
    { key: "done", icon: CheckmarkCircle02Icon, n: summary.last7Total },
  ]
  const label = live
    ? t("todo.kpiBar.aria", {
        done,
        total,
        overdue: items[0].n,
        important: items[1].n,
        planned: items[2].n,
        doneWeek: items[3].n,
      })
    : t("todo.status.aria")

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      aria-haspopup="dialog"
      className={cn(
        "@container/bar flex min-h-14 w-full min-w-0 items-center gap-2 rounded-[1.125rem] bg-card px-3 py-2 text-start text-card-foreground shadow-[0_10px_26px_-16px_rgb(0_0_0/0.5)] ring-1 ring-black/[0.05] outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/40 dark:ring-white/10",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-0.5 overflow-hidden">
        {items.map((it) => {
          const on = live && it.n > 0
          return (
            <span
              key={it.key}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-1 text-[0.8125rem] font-semibold tabular-nums",
                on ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full",
                  on ? STATUS_TONES[it.key].chip : "bg-foreground/[0.05] text-foreground/45",
                )}
              >
                <HugeiconsIcon
                  icon={it.icon}
                  className={cn("size-3", on && it.filled && "fill-current")}
                  strokeWidth={2}
                />
              </span>
              {live ? it.n : "—"}
            </span>
          )
        })}
      </span>
      <span className="ms-auto">
        {state.loading ? (
          <span aria-hidden="true" className="ms-skeleton block size-10 rounded-full" />
        ) : (
          <MiniRing pct={live ? pct : 0} live={live} />
        )}
      </span>
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground @max-[17rem]/bar:hidden"
        strokeWidth={2}
      />
    </button>
  )
}
