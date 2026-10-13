import { HugeiconsIcon } from "@hugeicons/react"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import { useLocale } from "@/hooks/useLocale"
import { STATUS } from "@/lib/graph"

/**
 * Takvim okunamadığında (izin değil, hata) elle "Tekrar dene". Takvim zaten
 * kendiliğinden yeniden deniyor (`useCalendarEvents`); bu, beklemek istemeyene.
 */
export function CalendarRetry({ cal, className = "mt-2" }) {
  const { t } = useLocale()
  if (cal.status !== STATUS.error) return null
  return (
    <button
      type="button"
      onClick={cal.refresh}
      className={`${className} inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-10`}
    >
      <HugeiconsIcon icon={RefreshIcon} className="size-3.5" strokeWidth={2} aria-hidden="true" />
      {t("calendar.retry")}
    </button>
  )
}
