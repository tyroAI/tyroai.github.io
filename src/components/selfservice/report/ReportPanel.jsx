import { MotionConfig } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import Analytics01Icon from "@hugeicons/core-free-icons/Analytics01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { BreakdownList } from "./BreakdownList"
import { PeriodBars } from "./PeriodBars"

/** Dönemde kayıt yoksa: kısa cümle ve (başka yıllarda kayıt varsa) "Tüm yıllara bak". */
function ReportEmpty({ year, total, onYear }) {
  const { t } = useLocale()
  return (
    <div className="col-span-full flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center">
      <HugeiconsIcon
        icon={Analytics01Icon}
        aria-hidden="true"
        className="size-5 text-muted-foreground"
        strokeWidth={1.8}
      />
      <p className="text-[0.8125rem] text-muted-foreground">{t("selfService.report.empty")}</p>
      {year != null && total > 0 && onYear && (
        <button
          type="button"
          onClick={() => onYear(null)}
          className="rounded-full bg-brand/[0.09] px-3 py-1.5 text-[0.75rem] font-semibold text-brand-ink transition hover:bg-brand/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:min-h-11"
        >
          {t("selfService.report.showAll")}
        </button>
      )}
    </div>
  )
}

/** Bölüm okunamadıysa: "kayıt yok" değil, okunamadı. */
function ReportFailed() {
  const { t } = useLocale()
  return (
    <p className="col-span-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[0.8125rem] text-amber-800 dark:text-amber-300">
      {t("selfService.sectionFailed")}
    </p>
  )
}

/**
 * Raporun içeriği — seçili DÖNEMİN dökümü (listenin süzgeçlerinden bağımsız; toplam kuralıyla,
 * yalnız "Duruma göre" hepsini gösterir). İzin bakiyesi ve hak ediş burada değil, özet
 * kutusunda (aynı sayılar iki yerde durmasın). Satıra basmak listeyi süzer: tür/kategori `f`,
 * ay `m`, durum `status`; yılda basmak dönemi değiştirir. Veri `reportFor(tab, data, year)`;
 * `total` sekmenin bütün yıllardaki kayıt sayısı (boş dönemde "Tüm yıllara bak" için);
 * `failed`: sekmenin bölümü okunamadı (boş rapor yerine bunu söyler).
 * Çubuklar ölçülü büyür; hareketi azalt tercihinde hareket yok.
 */
export function ReportPanel({
  tab,
  report,
  year,
  total = 0,
  failed = false,
  filters,
  onFacet,
  onMonth,
  onStatus,
  onYear,
  className,
}) {
  const { t } = useLocale()
  if (!report) return null
  const periodTitle = t(year == null ? "selfService.report.byYear" : "selfService.report.byMonth")
  const money = tab !== "leave"
  const primary =
    tab === "leave" ? report.byType : tab === "expense" ? report.byCategory : report.byPurpose
  const hasData = (primary?.rows ?? []).some((r) => r.count) || (report.byStatus?.rows ?? []).length
  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("flex min-w-0 flex-col gap-4", className)}>
        {failed ? (
          <ReportFailed />
        ) : !hasData ? (
          <ReportEmpty year={year} total={total} onYear={onYear} />
        ) : (
          <>
            <BreakdownList
              title={t(`selfService.report.primary.${tab}`)}
              breakdown={primary}
              kind={money ? "money" : "days"}
              lines={tab === "expense"}
              labelLang={tab === "expense" ? "tr" : undefined}
              selected={filters.facet}
              onPick={onFacet}
            />
            <PeriodBars
              title={periodTitle}
              breakdown={report.byPeriod}
              kind={money ? "money" : "days"}
              year={year}
              month={filters.month}
              onMonth={onMonth}
              onYear={onYear}
            />
            {money && (
              <BreakdownList
                title={t("selfService.report.byStatus")}
                breakdown={report.byStatus}
                kind="money"
                status
                selected={filters.status}
                onPick={onStatus}
              />
            )}
            {tab === "expense" && report.byCompany.rows.length > 1 && (
              <BreakdownList
                title={t("selfService.report.byCompany")}
                breakdown={report.byCompany}
                kind="money"
                lines
              />
            )}
            {tab === "advance" && report.byLocation.rows.some((r) => r.key) && (
              <BreakdownList
                title={t("selfService.report.byLocation")}
                breakdown={report.byLocation}
                kind="money"
                labelLang="tr"
              />
            )}
          </>
        )}
      </div>
    </MotionConfig>
  )
}
