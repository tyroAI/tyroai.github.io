import { useMemo, useRef } from "react"
import { motion, useReducedMotion } from "motion/react"
import { useLocale } from "@/hooks/useLocale"
import { useScrollFade } from "@/hooks/useScrollFade"
import { csvFileName, csvFor } from "@/lib/selfServiceCsv"
import { lineInFacet } from "@/lib/selfServiceFilters"
import { askFacts } from "./ask/askQuestions"
import { AskSheet } from "./ask/AskSheet"
import { AskTyro } from "./ask/AskTyro"
import { BoardToolbar } from "./board/BoardToolbar"
import { ListHead } from "./board/ListHead"
import { RecordList } from "./board/RecordList"
import { RecordTabs } from "./board/RecordTabs"
import { tabOf } from "./kinds"
import { downloadText } from "./period/download"
import { PeriodBar } from "./period/PeriodBar"
import { ReportSlot } from "./report/ReportSlot"
import { SummaryTiles } from "./SummaryTiles"

/** Gövdenin iki kolonu: geniş kapta (≥ 52rem) liste + sağ kolon (rapor, soru). */
const PANEL =
  "mt-3 grid gap-4 @[52rem]/ss:grid-cols-[minmax(0,1fr)_17.5rem] @[52rem]/ss:items-start @[52rem]/ss:gap-5 @[64rem]/ss:grid-cols-[minmax(0,1fr)_20rem]"
// Sağ kolon yapışkan; ekrandan uzunsa kendi içinde kayar (alt bölümler liste bitene dek
// kesik kalmasın), devamı olan kenar solar. Yan dolgu kartların gölgesine yer açar.
const ASIDE =
  "sticky top-4 -mx-2 hidden max-h-[calc(100dvh-6.5rem)] min-w-0 space-y-3 overflow-y-auto px-2 pb-3 [mask-image:linear-gradient(to_bottom,transparent,#000_var(--fade-start,0px),#000_calc(100%-var(--fade-end,0px)),transparent)] [scrollbar-width:thin] @[52rem]/ss:block"

/**
 * "BİLGİLERİM" — özet kartı (başında dönem çubuğu) → sekmeler → gövde. Gövde geniş kapta (≥ 52rem)
 * iki kolon: solda araç çubuğu + liste başlığı + aylık gruplar, sağda yapışkan kolonda
 * "TYRO'ya sor" ve rapor. Dar kapta (tablet, telefon, rıhtım açık masaüstü) ikisi listenin
 * üstüne serilmez: liste başlığında "Rapor" ve "Sor" düğmeleri, alttan çekmece — liste ilk
 * ekranda kalır. Sekme değişince gövde yumuşakça belirir.
 * Seçimler adreste (`update` → `nextParams`), türetilmiş veri `useRecordsView`te.
 * `onAsk(soru, bağlam?)`: İK asistanına sorar (sohbet rıhtımı); `onNew(tür)`: yeni talep formu
 * (boş listenin eylemi); `accrual`: sonraki izin hak edişi tahmini (`nextAccrual`; işe giriş
 * bilinmiyorsa null) — özet kutusu gösterir.
 */
export function MyRecords({
  data,
  sel,
  view,
  years,
  update,
  query,
  onQuery,
  updatedAt,
  onRefresh,
  busy,
  onOpen,
  openId,
  newKeys,
  onAsk,
  onNew,
  accrual,
}) {
  const { t } = useLocale()
  const reduce = useReducedMotion()
  const aside = useRef(null)
  useScrollFade(aside, "y", 28)
  const { tab, year } = sel
  // Hazır soruların kayda bağlı olanı (yaklaşan izin, düzeltme istenen kayıt).
  const facts = useMemo(() => askFacts(data), [data])
  // Hesaba katılmayan tutarsız izinler: seçili dönemdekiler liste özetinin köşesinde.
  const suspect =
    tab === "leave"
      ? (data?.suspect?.leaves ?? []).filter(
          (l) => typeof year !== "number" || l.start?.getFullYear() === year,
        )
      : []
  const exportCsv = () => {
    // Masrafta kategori süzgeci açıksa dosyaya yalnız uyan kalemler girer (ekrandaki özetle aynı).
    const facet = tab === "expense" ? view.filters.facet : null
    const rows = facet
      ? view.shown.map((r) => ({ ...r, lines: r.lines.filter((l) => lineInFacet(l, facet)) }))
      : view.shown
    downloadText(csvFor(tab, rows, t), csvFileName(tab, year, t))
  }
  const clear = () => {
    onQuery("")
    update({ status: null, facet: null, month: null })
  }
  const total = data?.[tabOf(tab).data]?.length ?? 0
  const reportProps = {
    tab,
    report: view.report,
    year,
    total,
    failed: view.failed,
    filters: view.filters,
    onFacet: (facet) => update({ facet }),
    onMonth: (month) => update({ month }),
    onStatus: (status) => update({ status }),
    onYear: (y) => update({ year: y }),
  }
  const filtered = Boolean(query || view.filters.status || view.filters.facet || view.filters.month)

  return (
    <>
      <SummaryTiles
        data={data}
        summary={view.summary}
        year={year}
        accrual={accrual}
        className="mt-4 @[40rem]/ss:mt-5"
        header={
          <PeriodBar
            years={years}
            year={year}
            onYear={(y) => update({ year: y })}
            updatedAt={updatedAt}
            onRefresh={onRefresh}
            busy={busy}
            onExport={exportCsv}
            exportCount={view.shown.length}
            className="pb-1"
          />
        }
      />
      <section aria-labelledby="ss-records" className="mt-5 min-w-0 @[40rem]/ss:mt-6">
        <h2 id="ss-records" className="sr-only">
          {t("selfService.records")}
        </h2>
        <RecordTabs data={data} tab={tab} year={year} onTab={(id) => update({ tab: id })} />
        <div id="ss-panel" role="tabpanel" aria-labelledby={`ss-tab-${tab}`} className={PANEL}>
          <motion.div
            key={tab}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="min-w-0"
          >
            <BoardToolbar
              tab={tab}
              query={query}
              onQuery={onQuery}
              view={view}
              onFacet={(facet) => update({ facet })}
              onMonth={(month) => update({ month })}
              onStatus={(status) => update({ status })}
              onClear={clear}
            />
            <ListHead
              tab={tab}
              view={view}
              failed={view.failed}
              suspect={suspect}
              actions={
                <>
                  <ReportSlot variant="button" {...reportProps} />
                  <AskSheet tab={tab} facts={facts} onAsk={onAsk} />
                </>
              }
            />
            <RecordList
              tab={tab}
              view={view}
              failed={view.failed}
              filtered={filtered}
              onOpen={onOpen}
              openId={openId}
              newKeys={newKeys}
              onNew={onNew}
              onClear={clear}
              onAllYears={year != null && total > 0 ? () => update({ year: null }) : null}
            />
          </motion.div>
          <aside ref={aside} aria-label={t("selfService.aside")} className={ASIDE}>
            <AskTyro tab={tab} facts={facts} onAsk={onAsk} variant="card" />
            <ReportSlot variant="panel" {...reportProps} />
          </aside>
        </div>
      </section>
    </>
  )
}
