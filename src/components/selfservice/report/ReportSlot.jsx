import { HugeiconsIcon } from "@hugeicons/react"
import Analytics01Icon from "@hugeicons/core-free-icons/Analytics01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { ReportBar } from "./ReportBar"
import { ReportPanel } from "./ReportPanel"

/**
 * RAPOR YUVASI — tek içerik (`ReportPanel`), kabın genişliğine göre iki giysi (görünürlük
 * CSS'te; çağıran her giysiyi kendi yerine koyar):
 *
 * | `variant` | yer | davranış |
 * |---|---|---|
 * | `panel`  | geniş kap (≥ 52rem): sağ kolon | yapışkan kart, hep açık |
 * | `button` | dar kap (< 52rem): liste başlığının sağı | "Rapor" düğmesi → alttan çekmecede tam rapor (`ReportBar`) |
 *
 * Dar kapta rapor listenin üstüne serilmez: liste ilk ekranda kalsın (aşamalı açılma).
 * Sözleşme (props): `tab`, `report` (`reportFor(tab, data, year)`), `year`, `total` (sekmenin
 * bütün yıllardaki kayıt sayısı), `failed` (bölüm okunamadı), `filters` (`{ status, facet,
 * month }` — geçerli süzgeçler), `onFacet(key|null)`, `onMonth("YYYY-MM"|null)`,
 * `onStatus(kategori|null)`, `onYear(yıl|null)`.
 */
export function ReportSlot({ variant, className, ...props }) {
  const { t } = useLocale()
  const title = t("selfService.report.title")
  const period = props.year ?? t("selfService.tile.allYears")

  if (variant === "button") return <ReportBar className={className} {...props} />

  return (
    <section
      className={cn("ms-surface rounded-2xl p-3.5", className)}
      aria-label={`${title} · ${period}`}
    >
      <h3 className="flex items-center gap-1.5 px-1 text-[0.875rem] font-semibold">
        <HugeiconsIcon
          icon={Analytics01Icon}
          aria-hidden="true"
          className="size-4 text-brand-ink"
          strokeWidth={1.9}
        />
        {title}
        <span className="font-normal text-muted-foreground">· {period}</span>
      </h3>
      <p className="mb-3 mt-0.5 px-1 text-[0.6875rem] text-muted-foreground">
        {t("selfService.report.hint")}
      </p>
      <ReportPanel {...props} />
    </section>
  )
}
