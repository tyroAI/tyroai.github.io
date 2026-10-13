import { useId, useMemo, useState } from "react"
import { SkelLine } from "@/components/common/bento"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLocale } from "@/hooks/useLocale"
import { PERIODS, periodProgress } from "@/lib/todoInsights"
import { cn } from "@/lib/utils"
import { firstDayOfWeek } from "@/lib/weekStart"

const C = 2 * Math.PI * 48
/**
 * Halkanın kutusu: tablette ve çekmecede 4rem, genişte 5rem. Genişte altındaki pay, kutunun
 * üst dolgusunu dengeler — halka sütunun tam ortasında kalır.
 */
const RING_BOX = "size-16 shrink-0 @[64rem]/todo:mb-1 @[64rem]/todo:size-[4.75rem]"
/**
 * Halka + açıklama kutusu (düğme ya da iskelet, ikisi aynı sınıf). Genişte üç sıralı sütunun
 * alt iki sırasına `subgrid` ile oturur; üst sıra (seçici) ile alt sıra (açıklama) eşit `1fr`.
 */
const BODY =
  "rounded-2xl outline-none @[64rem]/todo:row-span-2 @[64rem]/todo:grid @[64rem]/todo:grid-rows-subgrid @[64rem]/todo:justify-items-center @[64rem]/todo:gap-y-1.5 @[64rem]/todo:m-0 @[64rem]/todo:p-1"

function Ring({ pct }) {
  // Halka iki yerde çizilebilir (kart + çekmece): gradyan kimliği örneğe özel.
  const id = useId()
  return (
    <span className={cn(RING_BOX, "relative grid place-items-center")}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--brand-from)" }} />
            <stop offset="55%" style={{ stopColor: "var(--brand-via)" }} />
            <stop offset="100%" style={{ stopColor: "var(--brand-to)" }} />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r="48"
          fill="none"
          strokeWidth="11"
          className="stroke-foreground/[0.07]"
        />
        {/* %0'da yay çizilmez: sıfır boylu yuvarlak uç saat 12'de bir nokta bırakıyordu. */}
        {pct > 0 && (
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            strokeWidth="11"
            strokeLinecap="round"
            stroke={`url(#${id})`}
            strokeDasharray={`${(pct / 100) * C} ${C}`}
            className="transition-[stroke-dasharray] duration-700 motion-reduce:transition-none"
          />
        )}
      </svg>
      <span className="text-[1rem] font-semibold tabular-nums leading-none @[64rem]/todo:text-[1.25rem]">
        {pct}
        <small className="text-[0.625rem] font-medium text-muted-foreground">%</small>
      </span>
    </span>
  )
}

/**
 * İlerleme: dönem seçilebilir (Bugün · Bu hafta · Bu ay · Bu yıl; sayfa her açılışta bugünle
 * başlar). Halka ve açıklama listeyi açar (bugün → Bugün, geniş dönem → Planlanan); seçici ayrı
 * düğme, iç içe etkileşim yok. Halka her düzende SONDA:
 * - tablette ve çekmecede yan yana: solda seçici + açıklama, sağda halka;
 * - genişte (kap ≥ 64rem) üst üste: seçici, halka (dikeyde ortada), açıklama.
 * Açıklama iki yerde yazılı ve biri gizli: DOM sırası her düzende görünen sırayla aynı.
 */
export function TodoProgress({ tasks, today, openTotal, state, onView, className }) {
  const { t, locale } = useLocale()
  const [period, setPeriod] = useState("today")
  const { done, total } = useMemo(
    () => periodProgress(tasks, today, period, firstDayOfWeek(locale)),
    [tasks, today, period, locale],
  )
  const pct = total ? Math.round((done / total) * 100) : 0

  const caption = (center) =>
    state.loading ? (
      <span aria-hidden="true" className={cn("flex flex-col", center && "items-center")}>
        <SkelLine text="text-[0.8125rem] leading-snug" width="w-24" />
        <SkelLine text="mt-0.5 text-[0.75rem] leading-snug" width="w-20" />
      </span>
    ) : state.unavailable ? (
      // İkinci satırın yeri tutulur: yükleme ile "okunamadı" arasında kart boy değiştirmesin.
      <>
        <span className="block text-[0.8125rem] leading-snug text-muted-foreground">
          {t("todo.kpi.unavailable")}
        </span>
        <span aria-hidden="true" className="invisible mt-0.5 block text-[0.75rem] leading-snug">
          &nbsp;
        </span>
      </>
    ) : (
      <>
        <span className="block text-[0.8125rem] font-semibold leading-snug">
          {total ? t("todo.kpi.todayDone", { done, total }) : t(`todo.kpi.periodEmpty.${period}`)}
        </span>
        <span className="mt-0.5 block text-[0.75rem] leading-snug text-muted-foreground">
          {t("todo.status.openTotal", { n: openTotal })}
        </span>
      </>
    )
  const wideCaption = (
    <span className="hidden text-center @[64rem]/todo:block @[64rem]/todo:self-start">
      {caption(true)}
    </span>
  )

  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 @[64rem]/todo:grid-cols-1 @[64rem]/todo:grid-rows-[1fr_auto_1fr] @[64rem]/todo:justify-items-center @[64rem]/todo:gap-y-1.5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col items-start gap-1.5 @[64rem]/todo:items-center @[64rem]/todo:self-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger
            aria-label={t("todo.kpi.periodAria")}
            className="relative -ms-1 gap-1 rounded-full border-border/70 bg-background/60 px-2.5 text-[0.8125rem] font-medium text-foreground/80 shadow-none transition hover:border-foreground/25 hover:text-foreground data-[state=open]:border-foreground/30 data-[state=open]:text-foreground data-[size=default]:h-7 dark:bg-background/40 pointer-coarse:after:absolute pointer-coarse:after:-inset-2 @[64rem]/todo:ms-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="start"
            sideOffset={6}
            // Escape rıhtıma kaçmaz (sohbet rıhtımı pencerede Escape dinliyor).
            onEscapeKeyDown={(e) => e.stopPropagation()}
            className="min-w-[9rem] rounded-xl p-1"
          >
            {PERIODS.map((p) => (
              <SelectItem key={p} value={p} className="min-h-8 rounded-lg pr-8 text-[0.78125rem]">
                {t(`todo.kpi.period.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="min-w-0 @[64rem]/todo:hidden">{caption(false)}</span>
      </div>

      {state.live ? (
        <button
          type="button"
          onClick={() => onView(period === "today" ? "today" : "planned")}
          aria-label={`${t(`todo.kpi.period.${period}`)} · ${t("todo.kpi.todayAria", { pct })}`}
          className={cn(
            "-m-1 p-1 transition-colors hover:bg-foreground/[0.04] focus-visible:ring-2 focus-visible:ring-brand/40",
            BODY,
          )}
        >
          <Ring pct={pct} />
          {wideCaption}
        </button>
      ) : (
        <div aria-hidden={state.loading || undefined} className={BODY}>
          {state.loading ? (
            <span className={cn(RING_BOX, "ms-skeleton block rounded-full")} />
          ) : (
            <span
              className={cn(
                RING_BOX,
                "grid place-items-center rounded-full border-[0.45rem] border-foreground/[0.07] text-[1.125rem] font-semibold text-muted-foreground",
              )}
            >
              —
            </span>
          )}
          {wideCaption}
        </div>
      )}
    </div>
  )
}
