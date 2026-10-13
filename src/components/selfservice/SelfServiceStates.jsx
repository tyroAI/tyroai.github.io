import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import CloudIcon from "@hugeicons/core-free-icons/CloudIcon"
import UserAccountIcon from "@hugeicons/core-free-icons/UserAccountIcon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * "Bilgilerim"in iskeleti — özet kartı (dönem çubuğuyla), sekmeler, araç çubuğu ve satırlar
 * gerçek yerlerinde (yükleme ile sonuç arasında sayfa zıplamasın).
 */
export function BoardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="ms-surface mt-4 rounded-[1.25rem] p-1.5 @[40rem]/ss:mt-5">
        <div className="flex gap-1.5 pb-1">
          <span className="ms-skeleton block h-9 w-52 rounded-full pointer-coarse:h-12" />
          <span className="ms-skeleton ms-auto block h-8 w-8 rounded-full @[40rem]/ss:w-28" />
        </div>
        <div className="ms-skeleton h-[3.75rem] rounded-2xl @[44rem]/ss:h-[6rem]" />
      </div>
      <div className="ms-skeleton mt-5 h-11 rounded-2xl @[40rem]/ss:mt-6" />
      <div className="mt-3 grid gap-4 @[52rem]/ss:grid-cols-[minmax(0,1fr)_17.5rem] @[52rem]/ss:gap-5 @[64rem]/ss:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <div className="flex gap-2">
            <span className="ms-skeleton block h-9 flex-1 rounded-full" />
            <span className="ms-skeleton block h-9 w-20 rounded-full @[30rem]/ss:w-32" />
          </div>
          <span className="ms-skeleton mt-5 block h-3 w-28 rounded" />
          <div className="mt-2 space-y-px overflow-hidden rounded-2xl">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="ms-skeleton block h-16" />
            ))}
          </div>
        </div>
        <span className="ms-skeleton hidden h-80 rounded-2xl @[52rem]/ss:block" />
      </div>
    </div>
  )
}

const KINDS = {
  denied: { icon: CloudIcon, tone: "brand" },
  notFound: { icon: UserAccountIcon, tone: "brand" },
  error: { icon: Alert02Icon, tone: "warn" },
  signedOut: { icon: UserAccountIcon, tone: "brand" },
}

/**
 * Kayıtlar okunamadığında sebep ve çare — tek kart: izin yoksa "Bağlan" (tıklamaya bağlı onay),
 * hata ise "Tekrar dene"; ERP'de çalışan kaydı yoksa ne yapılacağı söylenir.
 */
export function SelfServiceState({ status, detail, onConnect, onRetry, busy }) {
  const { t } = useLocale()
  const kind = KINDS[status] ?? KINDS.error
  const action =
    status === "denied"
      ? { label: t("selfService.state.connect"), run: onConnect }
      : status === "error"
        ? { label: t("selfService.state.retry"), run: onRetry }
        : null
  return (
    <div className="mt-6 flex flex-col items-center rounded-[1.5rem] border border-border/70 bg-card px-6 py-10 text-center @[40rem]/ss:mt-8">
      <span
        className={cn(
          "grid size-12 place-items-center rounded-2xl",
          kind.tone === "warn"
            ? "bg-amber-500/12 text-amber-700 dark:text-amber-400"
            : "bg-brand/10 text-brand-ink",
        )}
      >
        <HugeiconsIcon icon={kind.icon} className="size-6" strokeWidth={1.8} />
      </span>
      <p className="mt-4 text-[0.9375rem] font-semibold text-foreground">
        {t(`selfService.state.${status}.title`)}
      </p>
      <p className="mt-1 max-w-md text-[0.8125rem] leading-relaxed text-muted-foreground">
        {t(`selfService.state.${status}.body`)}
      </p>
      {detail && status === "error" && (
        <p className="mt-1 text-[0.6875rem] tabular-nums text-muted-foreground">{detail}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.run}
          aria-busy={busy || undefined}
          className="mt-5 inline-flex h-10 items-center rounded-full bg-brand-fill-deep px-5 text-[0.8125rem] font-semibold text-brand-on-brand transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:h-11"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
