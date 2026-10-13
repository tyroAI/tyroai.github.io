import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * ERP izin bilgisinin notu `{ text, warn?, action? }`; hazır ve eksiksizse ya da yüklenirken null.
 */
function erpNote({ status, reason, failed = [] }, t, { retry, connect }) {
  if (status === "denied" && reason === "consent")
    return { text: t("selfService.team.erp.consent"), action: connect }
  if (status === "denied" || status === "empty") return { text: t("selfService.team.erp.denied") }
  if (status === "error")
    return { text: t("selfService.team.erp.error"), warn: true, action: retry }
  if (status === "ready" && failed.length)
    return { text: t("selfService.team.erp.partial"), warn: true, action: retry }
  return null
}

function Note({ text, warn, action, busy }) {
  return (
    <p
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border px-4 py-2.5 text-[0.8125rem]",
        warn
          ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
          : "border-border bg-muted/50 text-foreground/80",
      )}
    >
      <HugeiconsIcon
        icon={warn ? Alert02Icon : InformationCircleIcon}
        aria-hidden="true"
        className="size-4 shrink-0"
        strokeWidth={1.9}
      />
      <span className="min-w-0 flex-1">{text}</span>
      {action && (
        <button
          type="button"
          onClick={action.run}
          aria-busy={busy || undefined}
          className="inline-flex h-8 shrink-0 items-center rounded-full border border-current/25 px-3 text-[0.75rem] font-semibold transition hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:h-11"
        >
          {action.label}
        </button>
      )}
    </p>
  )
}

/**
 * Ekibim'in kibar notları. Ekip listesinin bir parçası Graph'tan okunamadıysa (`missing`):
 * liste eksik, "Tekrar dene". ERP izin bilgisi: rol göstermedi (401/403 ya da boş cevap) bilgi;
 * belirteç alınamadı "Bağlan"; hata ya da düşen bölüm "Tekrar dene" — ekip listesi Graph'tan
 * yine görünür. İkisi birden varsa iki not, tek "Tekrar dene" (`onRetry` ikisini de yeniden
 * sorar). Sorun yoksa ya da yüklenirken çizilmez.
 */
export function TeamNotice({ leave, missing = false, busy, onRetry, onConnect, className }) {
  const { t } = useLocale()
  const retry = { label: t("selfService.state.retry"), run: onRetry }
  const connect = { label: t("selfService.state.connect"), run: onConnect }
  const erp = erpNote(leave, t, { retry, connect })
  const notes = [
    missing && { id: "team", text: t("selfService.team.partial"), warn: true, action: retry },
    erp && { id: "erp", ...erp, action: missing && erp.action === retry ? null : erp.action },
  ].filter(Boolean)
  if (!notes.length) return null
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {notes.map(({ id, ...note }) => (
        <Note key={id} {...note} busy={busy} />
      ))}
    </div>
  )
}
