import { COMPANIES } from "@/data/hrValues"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { day, money } from "../kinds"
import { extraText } from "./extraText"

// Kartın üst satırında zaten görünen alan.
const INLINE = new Set(["vendor"])

/**
 * Masraf kalemi kartı: kategori ve tutar (işlem para birimi), tarih · firma, açıklama; altında
 * satırda BULUNAN ek alanlar tek akışta ("Fiş no. TK2351009 · Masraf yeri Yurtdışı · Kur 41,2"):
 * fiş no., masraf yeri, kişi sayısı, masraf merkezi, yabancı para biriminde şirket para birimi
 * karşılığı ve kur, raporlama tutarı, yansıtma şirketi. Raporun kendisiyle aynı olan şirket ve
 * masraf merkezi her kalemde tekrarlanmaz (`report`). `match`: kategori süzgecine uyan kalem.
 */
export function LineCard({ line, report = {}, match = false }) {
  const { t, locale } = useLocale()
  const extra = line.extra ?? []
  const vendor = extra.find((x) => x.key === "vendor")?.value
  const facts = extra
    .filter((x) => !INLINE.has(x.key))
    .filter((x) => !(x.key === "costCenter" && x.value === report.costCenter))
    .map((x) => ({
      key: x.key,
      label: t(`selfService.field.${x.key}`),
      value: extraText(x, t, locale),
    }))
  if (line.company && line.company !== report.company) {
    facts.push({
      key: "company",
      label: t("selfService.field.company"),
      value: line.company,
      title: COMPANIES[String(line.company).toUpperCase()],
    })
  }
  const sub = [day(line.date, locale), vendor].filter((x) => x && x !== "—").join(" · ")
  return (
    <li
      className={cn(
        "rounded-xl border px-3 py-2.5",
        match ? "border-brand/40 bg-brand/[0.05]" : "border-border/70 bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p lang="tr" className="text-[0.8125rem] font-semibold leading-snug text-foreground">
            {line.categoryName || line.category || t("selfService.expense.untitled")}
            {match && <span className="sr-only"> · {t("selfService.detail.lineMatch")}</span>}
          </p>
          {sub && <p className="text-[0.75rem] text-muted-foreground">{sub}</p>}
        </div>
        <p className="shrink-0 text-[0.875rem] font-semibold tabular-nums">
          {money(line.amount, line.currency, locale)}
        </p>
      </div>
      {line.explanation && (
        <p lang="tr" className="mt-1 break-words text-[0.75rem] leading-snug text-foreground/80">
          {line.explanation}
        </p>
      )}
      {facts.length > 0 && (
        <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.6875rem] leading-5">
          {facts.map((f) => (
            <div key={f.key} className="flex min-w-0 max-w-full gap-1" title={f.title}>
              <dt className="shrink-0 text-muted-foreground">{f.label}</dt>
              <dd className="min-w-0 truncate font-medium tabular-nums text-foreground/85">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}
