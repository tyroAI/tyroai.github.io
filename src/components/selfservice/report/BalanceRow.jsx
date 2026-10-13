import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { countText } from "../kinds"

/**
 * Yıllık izin bakiyesi: hak · kullanılan · kalan ve ince bir doluluk çubuğu (dönemden bağımsız).
 * Özet kutusunun ayrıntısı (hak ediş altında ayrı kartta) ve Ekibim'in kişi bölmesi paylaşır.
 */
export function BalanceRow({ balance, className }) {
  const { t, locale } = useLocale()
  if (!balance) return null
  const share = balance.claim > 0 ? Math.min((balance.used ?? 0) / balance.claim, 1) : 0
  const cells = [
    ["claim", balance.claim],
    ["used", balance.used],
    ["remain", balance.remain],
  ]
  return (
    <section className={cn("min-w-0 rounded-xl bg-foreground/[0.03] px-3 py-2.5", className)}>
      <h4 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-foreground/65">
        {t("selfService.report.balance")}
      </h4>
      <dl className="mt-1.5 grid grid-cols-3 gap-2">
        {cells.map(([key, value]) => (
          <div key={key} className="min-w-0">
            <dt className="truncate text-[0.6875rem] text-foreground/65">
              {t(`selfService.report.${key}`)}
            </dt>
            <dd className="text-[0.9375rem] font-semibold tabular-nums text-foreground">
              {value == null ? "—" : countText(t, locale, "selfService.days", value)}
            </dd>
          </div>
        ))}
      </dl>
      <span
        aria-hidden="true"
        className="mt-2 block h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]"
      >
        <span
          className="block h-full rounded-full bg-brand/70"
          style={{ width: `${share * 100}%` }}
        />
      </span>
    </section>
  )
}
