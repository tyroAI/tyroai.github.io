import { useLocale } from "@/hooks/useLocale"
import { statusText, statusTone } from "@/lib/selfServiceStatus"
import { cn } from "@/lib/utils"
import { TONE_CLASS, TONE_DOT } from "./kinds"

/**
 * Kaydın durumu, tonuyla: TYRO'nın dört dildeki kategori adı ("Onayda", "Gönderilmedi"); ERP'nin
 * kendi etiketi ipucunda. Renk tek başına anlam taşımaz: ad yazılı.
 */
export function StatusPill({ status, className }) {
  const { t } = useLocale()
  if (!status) return null
  const tone = statusTone(status)
  const text = statusText(status, t)
  return (
    <span
      title={text === status ? undefined : status}
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold leading-5",
        TONE_CLASS[tone],
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />
      <span className="truncate">{text}</span>
    </span>
  )
}
