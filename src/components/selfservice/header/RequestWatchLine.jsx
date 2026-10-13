import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { describe } from "../recordText"

const ACTION =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.75rem] font-semibold text-brand-ink transition hover:bg-brand/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60 pointer-coarse:h-11 pointer-coarse:px-4"

/** Yeni kaydın kısa adı: masraf ve avansta numara; izinde tür · tarih aralığı (kimliği okunmaz). */
function arrivalName(record, t, locale) {
  if (record.kind !== "leave" && record.number) return record.number
  const { title, sub } = describe(record, t, locale)
  return `${title} · ${sub}`
}

/**
 * Profil başlığının altındaki ince durum satırı — yeni talep sohbette başlatıldıktan sonra
 * (`useNewRecordWatch`): beklerken "Talebin TYRO'da… · Yenile", kayıt ERP'den gelince
 * "Yeni kayıt: HRMS-062415 · Aç" (ayrıntıyı açar). × satırı kapatır ve yoklamayı bitirir.
 * `failed`: son yoklama okunamadı — sayfa yerinde kalır, satır yalnız bunu söyler.
 */
export function RequestWatchLine({ arrived, busy, failed = false, onRefresh, onOpen, onDismiss }) {
  const { t, locale } = useLocale()
  return (
    <div className="mt-3 flex min-w-0 items-center gap-2 rounded-2xl border border-border/70 bg-card py-1 pe-1 ps-3 text-[0.8125rem] text-foreground/80">
      <HugeiconsIcon
        icon={arrived ? CheckmarkCircle02Icon : AiChat02Icon}
        aria-hidden="true"
        strokeWidth={1.9}
        className={cn(
          "size-4 shrink-0",
          arrived ? "text-emerald-600 dark:text-emerald-400" : "text-brand-ink",
        )}
      />
      {/* Sayfa hep LTR; Arapça cümlenin noktalaması kendi yönünde dizilsin (`dir="auto"`). */}
      <p role="status" dir="auto" className="min-w-0 flex-1 py-1 text-left leading-snug">
        {arrived ? (
          <>
            {t("selfService.watch.arrived")}{" "}
            <span className="font-semibold text-foreground [overflow-wrap:anywhere]">
              {arrivalName(arrived, t, locale)}
            </span>
          </>
        ) : (
          t(failed ? "selfService.watch.failed" : "selfService.watch.pending")
        )}
      </p>
      {arrived ? (
        <button type="button" onClick={() => onOpen(arrived)} className={ACTION}>
          {t("selfService.watch.open")}
        </button>
      ) : (
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          aria-busy={busy || undefined}
          className={ACTION}
        >
          <HugeiconsIcon
            icon={RefreshIcon}
            aria-hidden="true"
            className={cn("size-3.5", busy && "animate-spin motion-reduce:animate-none")}
          />
          {t("selfService.watch.refresh")}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("selfService.watch.dismiss")}
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:size-11"
      >
        <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  )
}
