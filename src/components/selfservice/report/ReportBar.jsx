import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Analytics01Icon from "@hugeicons/core-free-icons/Analytics01Icon"
import { BottomSheet } from "@/components/common/BottomSheet"
import { afterBackSettles } from "@/hooks/useBackToClose"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { GHOST } from "../chips"
import { ReportPanel } from "./ReportPanel"

/**
 * Dar kabın raporu: liste başlığında sessiz "Rapor" düğmesi → alttan çekmecede tam rapor.
 * Çekmecede satıra basmak süzgeci uygular ve çekmeceyi kapatır: liste hemen görünsün. Geri tuşu
 * çekmeceyi kapatır; süzgeç, çekmecenin geçmiş adımı geri alındıktan sonra adrese yazılır.
 */
export function ReportBar({ className, ...props }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const title = t("selfService.report.title")
  const period = props.year ?? t("selfService.tile.allYears")
  const pick = (fn) => (v) => {
    setOpen(false)
    afterBackSettles(() => fn?.(v))
  }
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${title} · ${period}`}
        onClick={() => setOpen(true)}
        className={cn(GHOST, "border border-border bg-card px-3", className)}
      >
        <HugeiconsIcon icon={Analytics01Icon} aria-hidden="true" strokeWidth={1.9} />
        {title}
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={`${title} · ${period}`}
        description={t("selfService.report.hint")}
        closeOnBack
      >
        <p className="-mt-1 mb-3 text-[0.75rem] text-muted-foreground">
          {t("selfService.report.hint")}
        </p>
        <ReportPanel
          {...props}
          onFacet={pick(props.onFacet)}
          onMonth={pick(props.onMonth)}
          onStatus={pick(props.onStatus)}
          onYear={pick(props.onYear)}
          className="pb-2"
        />
      </BottomSheet>
    </>
  )
}
