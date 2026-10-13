import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon"
import Link01Icon from "@hugeicons/core-free-icons/Link01Icon"
import { useLocale } from "@/hooks/useLocale"
import { notify } from "@/lib/notify"
import { countsInTotals, statusKind } from "@/lib/selfServiceStatus"
import { cn } from "@/lib/utils"
import { describe, recordLink } from "../recordText"
import { StatusPill } from "../StatusPill"
import { tabOf } from "../kinds"
import { CopyNumber } from "./CopyNumber"
import { ExpenseLines } from "./ExpenseLines"
import { AdvanceFields, ExpenseFields, LeaveFields } from "./KindFields"

const ACTION =
  "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-[0.8125rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:h-11 [&_svg]:size-4"

/**
 * Kaydın ayrıntısı (bölme ve çekmecenin ortak gövdesi): başlık (tür, ad, kopyalanan numara,
 * durum, büyük tutar), toplam dışıysa nedeni, türüne göre alanlar, masrafta kalemler;
 * altta "TYRO'ya sor" ve "Bağlantıyı kopyala". `facet`: listenin tür süzgeci (uyan kalemler
 * vurgulu); `context`: izinde "Yıllık İzin · 2026: 12 gün" bağlam satırı.
 */
export function DetailBody({ record, facet, context, onAsk, onClose, showTitle = true }) {
  const { t, locale } = useLocale()
  const tab = tabOf(record.kind)
  const { title, value } = describe(record, t, locale)
  const kind = record.statusKind ?? statusKind(record.status)
  // İzin türünün kodu ("TR01") adın yanında küçük ve gri: ERP'de arayan kişi kodu da görsün.
  const code =
    record.kind === "leave" && record.typeCode && record.typeName !== record.typeCode
      ? record.typeCode
      : ""
  const excluded = !countsInTotals(kind)
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(recordLink(record))
      notify.success(t("selfService.copied"))
    } catch {
      notify.error(t("selfService.copyFailed"))
    }
  }
  return (
    <div className="flex flex-1 flex-col">
      {/* Kapat DOM'da önde: bölme açılınca odak oraya düşer (numaranın kopyalama düğmesine değil). */}
      <div className={cn("relative flex items-start gap-3", onClose && "pe-11")}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("selfService.close")}
            className="absolute end-0 top-0 grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:size-11"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
          </button>
        )}
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-ink">
          <HugeiconsIcon icon={tab.icon} className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.75rem] font-medium text-muted-foreground">
            {t(`selfService.tab.${record.kind}`)}
            {!showTitle && code && <span className="tabular-nums"> · {code}</span>}
          </p>
          {showTitle && (
            <p
              lang="tr"
              title={title}
              className="line-clamp-2 text-[1.0625rem] font-semibold leading-snug text-foreground"
            >
              {title}
              {code && (
                <span className="ms-1.5 align-middle text-[0.6875rem] font-medium tabular-nums text-muted-foreground">
                  {code}
                </span>
              )}
            </p>
          )}
          {record.number && (
            <CopyNumber value={record.number} className="-ms-1 mt-0.5 text-[0.8125rem]" />
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        {value && (
          <span className="text-[1.5rem] font-semibold tabular-nums tracking-[-0.02em]">
            {value}
          </span>
        )}
        <StatusPill status={record.status} />
      </div>
      {excluded && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted/70 px-3 py-2 text-[0.75rem] leading-snug text-foreground/80">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            aria-hidden="true"
            className="mt-px size-4 shrink-0 text-muted-foreground"
          />
          {t(`selfService.detail.excluded.${kind}`)}
        </p>
      )}
      {context && <p className="mt-3 text-[0.75rem] text-muted-foreground">{context}</p>}
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3.5">
        {record.kind === "leave" && <LeaveFields record={record} />}
        {record.kind === "expense" && <ExpenseFields record={record} />}
        {record.kind === "advance" && <AdvanceFields record={record} />}
      </dl>
      {record.kind === "expense" && <ExpenseLines record={record} facet={facet} />}
      <div className="mt-auto flex gap-2 pt-6">
        <button
          type="button"
          onClick={() => onAsk(record)}
          className={`${ACTION} bg-brand-fill-deep text-brand-on-brand hover:brightness-110`}
        >
          <HugeiconsIcon icon={AiChat02Icon} strokeWidth={1.9} />
          {t("selfService.askTyro")}
        </button>
        <button
          type="button"
          onClick={copyLink}
          className={`${ACTION} border border-border bg-card text-foreground hover:bg-accent`}
        >
          <HugeiconsIcon icon={Link01Icon} strokeWidth={1.9} />
          {t("selfService.copyLink")}
        </button>
      </div>
    </div>
  )
}
