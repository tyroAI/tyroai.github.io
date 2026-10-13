import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * Kayıt numarası — basınca panoya kopyalanır, kısa onay (tik + ekran okuyucuya duyuru). ERP'de
 * aramak ya da İK'ya iletmek için numara elle seçilmesin.
 */
export function CopyNumber({ value, className }) {
  const { t } = useLocale()
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [copied])
  if (!value) return null
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      // Pano kapalı (izin yok): numara seçilebilir metin olarak duruyor.
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={t("selfService.detail.copyNumber", { number: value })}
        title={t("selfService.detail.copyNumber", { number: value })}
        className={cn(
          "group/copy inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 font-semibold tabular-nums text-foreground transition hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:min-h-11",
          className,
        )}
      >
        <span className="truncate">{value}</span>
        <HugeiconsIcon
          icon={copied ? Tick02Icon : Copy01Icon}
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0 transition",
            copied
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground opacity-60 group-hover/copy:opacity-100",
          )}
          strokeWidth={2}
        />
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? t("selfService.detail.numberCopied") : ""}
      </span>
    </>
  )
}
