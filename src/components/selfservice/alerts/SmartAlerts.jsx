import { useMemo, useRef } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import { useLocale } from "@/hooks/useLocale"
import { useMinuteNow } from "@/hooks/useMinuteNow"
import { alertFilters, alertKey, buildAlerts } from "@/lib/selfServiceAlerts"
import { cn } from "@/lib/utils"
import { leaveLine } from "../team/teamText"
import { ALERT_LOOK, ASKABLE, alertQuestion, alertSentence } from "./alertText"
import { useDismissedAlerts } from "./useDismissedAlerts"

/** Cümlenin altında gösterilen kayıt numarası sayısı; fazlası "+n" (listede süzer). */
const SHOWN = 2
const TONE = {
  warning: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  info: "bg-brand/10 text-brand-ink",
}
const LINK =
  "rounded font-medium tabular-nums text-foreground/80 underline decoration-foreground/25 underline-offset-2 transition hover:text-foreground hover:decoration-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:min-h-11"
const ACTION =
  "inline-flex items-center gap-0.5 rounded font-semibold text-brand-ink transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:min-h-11 [&_svg]:size-3.5 [&_svg]:rtl:rotate-180"

function AlertItem({ alert, single, onOpen, onShow, onAsk, onNew, onDismiss }) {
  const { t, locale } = useLocale()
  const look = ALERT_LOOK[alert.id]
  const sentence = alertSentence(alert, t, locale)
  const records = alert.records ?? []
  const shown = records.slice(0, SHOWN)
  // "+n" türe göre: düzeltme istenen masraf ve avans ayrı listelerde.
  const filters = alertFilters(alert, SHOWN)
  const named = filters.length > 1
  const arrow = <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" strokeWidth={2} />
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2.5 rounded-2xl border border-border/70 bg-card px-3 py-2.5",
        // Telefonda iki uyarı yan yana kayan şerit: ikincinin kenarı görünür.
        single ? "w-full col-span-full" : "w-[90%] shrink-0 snap-start @[40rem]/ss:w-auto",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("grid size-7 shrink-0 place-items-center rounded-lg", TONE[look.tone])}
      >
        <HugeiconsIcon icon={look.icon} className="size-4" strokeWidth={1.9} />
      </span>
      <p className="min-h-7 content-center text-[0.8125rem] font-semibold leading-snug text-foreground">
        {sentence}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("selfService.alert.dismiss", { text: sentence })}
        title={t("selfService.alert.dismissHint")}
        className="-me-1 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:-my-2 pointer-coarse:-me-2.5 pointer-coarse:size-11"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={2} />
      </button>
      {/* Telefonda bağlantılar kartın tam genişliğinde (ikonun altından); genişte cümlenin altında. */}
      <div className="col-span-3 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.75rem] text-muted-foreground @[40rem]/ss:col-span-1 @[40rem]/ss:col-start-2">
        {shown.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onOpen(r)}
            aria-label={t("selfService.alert.open", { label: r.number ?? r.id })}
            className={LINK}
          >
            {r.number ?? r.id}
          </button>
        ))}
        {filters.map((f) => {
          const tab = t(`selfService.tabShort.${f.tab}`)
          return (
            <button
              key={f.tab}
              type="button"
              onClick={() => onShow(f)}
              aria-label={t(named ? "selfService.alert.moreAriaOf" : "selfService.alert.moreAria", {
                n: f.n,
                tab,
              })}
              className={LINK}
            >
              {t(named ? "selfService.alert.moreOf" : "selfService.alert.more", { n: f.n, tab })}
            </button>
          )
        })}
        {alert.id === "nextLeave" && (
          <button type="button" onClick={() => onOpen(alert.record)} className={LINK}>
            {leaveLine(alert.record, t, locale)}
          </button>
        )}
        {ASKABLE.has(alert.id) && (
          <button
            type="button"
            onClick={() => onAsk(alertQuestion(alert, t))}
            aria-label={`${t(`selfService.alert.action.${alert.id}`)} — ${sentence}`}
            className={ACTION}
          >
            {t(`selfService.alert.action.${alert.id}`)}
            {arrow}
          </button>
        )}
        {alert.id === "yearEnd" && (
          <button
            type="button"
            onClick={() => onNew("leave")}
            aria-label={`${t("selfService.alert.action.yearEnd")} — ${sentence}`}
            className={ACTION}
          >
            {t("selfService.alert.action.yearEnd")}
            {arrow}
          </button>
        )}
      </div>
    </motion.li>
  )
}

/**
 * AKILLI UYARILAR — profil başlığının altında ince şerit: en fazla iki, öncelik sırasıyla
 * (`buildAlerts`: düzeltme istenen → gönderilmemiş masraf → kapatılmamış avans → sıradaki izin
 * → yıl sonu izni). Her uyarı oturum boyu kapatılabilir; kapatılınca sıradaki çıkar. Kayıt
 * numarası kaydı açar, "+n" listeyi süzer, eylem sohbete sorar ya da yeni talep başlatır.
 */
export function SmartAlerts({ data, onOpen, onShow, onAsk, onNew, className }) {
  const { t } = useLocale()
  const list = useRef(null)
  const [dismissed, dismiss] = useDismissedAlerts()
  // "Bugün" gün değişince kayar: sayfa gece açık kalsa da "yarın başlıyor" bayatlamasın.
  const now = useMinuteNow()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const today = useMemo(() => new Date(y, m, d), [y, m, d])
  const alerts = useMemo(
    () => buildAlerts(data, { dismissed, now: today }),
    [data, dismissed, today],
  )
  const close = (alert) => {
    // Kapat düğmesi kalkınca odak boşa düşmesin: liste duruyorsa odak listeye.
    if (alerts.length > 1) list.current?.focus({ preventScroll: true })
    dismiss(alertKey(alert))
  }
  return (
    <MotionConfig reducedMotion="user">
      <ul
        ref={list}
        tabIndex={-1}
        aria-label={t("selfService.alert.label")}
        className={cn(
          "flex snap-x snap-mandatory gap-2 overflow-x-auto outline-none [scrollbar-width:none] empty:hidden",
          "@[40rem]/ss:grid @[40rem]/ss:overflow-visible @[44rem]/ss:grid-cols-2",
          className,
        )}
      >
        <AnimatePresence initial={false}>
          {alerts.map((alert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              single={alerts.length === 1}
              onOpen={onOpen}
              onShow={onShow}
              onAsk={onAsk}
              onNew={onNew}
              onDismiss={() => close(alert)}
            />
          ))}
        </AnimatePresence>
      </ul>
    </MotionConfig>
  )
}
