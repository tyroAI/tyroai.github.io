import { useState } from "react"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import { useLocale } from "@/hooks/useLocale"
import { STATUS_TONE } from "@/lib/selfServiceStatus"
import { cn } from "@/lib/utils"
import { TONE_DOT, countText } from "../kinds"
import { otherMoney, rowLabel, rowValue, shownCurrency } from "./reportText"

const FIRST = 6
const GROW = { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
const TITLE =
  "px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground"

/**
 * Tek satır: çubuk satırın ARKASINDA (payı en büyük satıra göre), önde ad, kayıt/kalem sayısı
 * ve değer; ana para biriminde olmayan tutarlar alttaki ikinci satırda, tam. Ad kesilmez, dar
 * kolonda ikinci satıra kırılır. Seçili satır koyu çubuk + çerçeve ve "kaldır" işareti; toplam
 * dışı satırın çubuğu soluk gri.
 */
function Row({ row, kind, currency, lines, status, labelLang, on, onPick, index }) {
  const { t, locale } = useLocale()
  const label = rowLabel(row, t, { status })
  const value = rowValue(row, kind, currency, t, locale)
  const others = kind === "money" ? otherMoney(row, currency, locale) : ""
  // Ana para biriminde tutarı olmayan satırın çubuğu yok: boş çubuk "sıfır" gibi okunurdu.
  const comparable = kind !== "money" || shownCurrency(row, currency) === currency
  const count =
    kind === "count"
      ? ""
      : countText(
          t,
          locale,
          lines ? "selfService.expense.lines" : "selfService.list.count",
          row.count,
        )
  const aria = countText(
    t,
    locale,
    lines ? "selfService.report.rowLines" : "selfService.report.row",
    row.count,
    { label, value: others ? `${value} + ${others}` : value },
  )
  const body = (
    <>
      {comparable && (
        <motion.span
          aria-hidden="true"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ ...GROW, delay: Math.min(index, 8) * 0.03 }}
          style={{ width: `${Math.max(row.share * 100, row.value ? 2 : 0)}%`, originX: 0 }}
          className={cn(
            "absolute inset-y-0 start-0 -z-10 rounded-lg transition-[width] duration-500 motion-reduce:transition-none",
            row.excluded
              ? "bg-foreground/[0.07]"
              : on
                ? "bg-brand/[0.26] dark:bg-brand/[0.34]"
                : "bg-brand/[0.12] dark:bg-brand/[0.2]",
          )}
        />
      )}
      {status && (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            TONE_DOT[STATUS_TONE[row.key] ?? "neutral"],
          )}
        />
      )}
      <span
        lang={labelLang}
        className={cn(
          "min-w-0 flex-1 break-words text-[0.8125rem] font-medium leading-snug",
          row.excluded ? "text-foreground/70" : "text-foreground",
        )}
      >
        {label}
      </span>
      {count && (
        <span className="shrink-0 text-[0.6875rem] tabular-nums text-foreground/65">{count}</span>
      )}
      <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-foreground">
        {value}
      </span>
      {on && (
        <HugeiconsIcon
          icon={Cancel01Icon}
          aria-hidden="true"
          className="-me-0.5 size-3 shrink-0 text-brand-ink"
          strokeWidth={2.4}
        />
      )}
      {others && (
        <span
          className={cn(
            "-mt-1 basis-full text-end text-[0.6875rem] font-medium tabular-nums text-foreground/65",
            on && "pe-5",
          )}
        >
          + {others}
        </span>
      )}
    </>
  )
  const shell =
    "relative isolate flex min-h-8 w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 overflow-hidden rounded-lg px-2.5 py-1 text-start pointer-coarse:min-h-11"
  if (!onPick) return <div className={shell}>{body}</div>
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={row.excluded ? `${aria}, ${t("selfService.report.excluded")}` : aria}
      title={on ? t("selfService.report.unpick") : undefined}
      onClick={() => onPick(on ? null : row.key)}
      className={cn(
        shell,
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        on ? "ring-1 ring-inset ring-brand/40" : "hover:bg-accent/70",
      )}
    >
      {body}
    </button>
  )
}

/**
 * Kırılımın çubuk listesi (`selfServiceReport` › `breakdown` satırları). `onPick` varsa her
 * satır bir düğme: basmak listeyi o değerle süzer, yeniden basmak kaldırır (`aria-pressed`).
 * Çubuk süs (`aria-hidden`); okunur ad `aria-label`da ("Yıllık İzin: 12 gün, 3 kayıt").
 * Durum kırılımında toplam dışılar ayrı grupta, başlığıyla.
 *
 * @param {"days"|"money"|"count"} p.kind satır değerinin birimi
 * @param {boolean} [p.status] satırlar durum kategorisi (ad ve nokta rengi kategoriden)
 * @param {boolean} [p.lines] satırlar masraf KALEMİ sayar ("3 kalem"), kayıt değil
 * @param {string} [p.labelLang] adlar çevrilmeyen ERP metniyse dili ("tr": kategori, yer)
 */
export function BreakdownList({
  title,
  breakdown,
  kind,
  selected,
  onPick,
  status = false,
  lines = false,
  labelLang,
}) {
  const { t } = useLocale()
  const [all, setAll] = useState(false)
  const rows = (breakdown?.rows ?? []).filter((r) => r.count)
  if (!rows.length) return null
  // Durum en çok dokuz kategori: hepsi görünür. Ötekinde ilk altı + seçili satır (süzgecin
  // kaynağı gizlenmesin) + "Tümünü göster".
  const cut = !status && !all && rows.length > FIRST
  const shown = cut ? rows.filter((r, i) => i < FIRST || r.key === selected) : rows
  // "Belirtilmemiş" (boş anahtar) ve durumda "Diğer" listede süzülemez: düğme değil, düz satır.
  const pickable = (row) => row.key !== "" && !(status && row.key === "none")
  const counted = shown.filter((r) => !r.excluded)
  const excluded = shown.filter((r) => r.excluded)
  const list = (items, offset = 0) => (
    <ul className="space-y-1">
      {items.map((row, i) => (
        <li key={row.key}>
          <Row
            row={row}
            kind={kind}
            currency={breakdown.currency}
            lines={lines}
            status={status}
            labelLang={labelLang}
            on={selected != null && selected === row.key}
            onPick={pickable(row) ? onPick : undefined}
            index={offset + i}
          />
        </li>
      ))}
    </ul>
  )
  return (
    <section className="min-w-0">
      <h4 className={TITLE}>{title}</h4>
      {counted.length > 0 && <div className="mt-1.5">{list(counted)}</div>}
      {excluded.length > 0 && (
        <>
          <p className="mt-2.5 px-1 text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {t("selfService.report.excludedGroup")}
          </p>
          <div className="mt-1">{list(excluded, counted.length)}</div>
        </>
      )}
      {!status && rows.length > FIRST && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="mt-1 rounded-lg px-2 py-1 text-[0.75rem] font-semibold text-brand-ink transition hover:bg-brand/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:min-h-11"
        >
          {all
            ? t("selfService.detail.showLess")
            : t("selfService.detail.showAll", { n: rows.length })}
        </button>
      )}
    </section>
  )
}
