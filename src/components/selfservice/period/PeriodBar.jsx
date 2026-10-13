import { useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Download04Icon from "@hugeicons/core-free-icons/Download04Icon"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import { SegmentedControl } from "@/components/common/SegmentedControl"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { GHOST, ICON } from "../chips"
import { updatedText } from "./updatedText"

/**
 * DÖNEM ÇUBUĞU — sayfanın seçili dönemi (yıllar + Tümü, bölmeli seçim: vurgu kayar, oklarla
 * gezilir), son okuma saati, Yenile ve Dışa aktar (süzülmüş listenin CSV'si). Özet kartının
 * başlık şeridi: özet kutuları, sekme sayıları, rapor ve liste bu dönemi izler. Eylemler
 * çerçevesiz: şerit sessiz kalır. Yıl çok olursa seçim kendi içinde kayar, eylemler sabit.
 */
export function PeriodBar({
  years,
  year,
  onYear,
  updatedAt,
  onRefresh,
  busy,
  onExport,
  exportCount,
  className,
}) {
  const { t, locale } = useLocale()
  const updated = updatedText(updatedAt, locale)
  const all = t("selfService.allYears")
  const options = useMemo(
    () => [...years, null].map((y) => ({ value: y, label: y ?? all })),
    [years, all],
  )
  const exportLabel = t("selfService.export.aria", { n: exportCount ?? 0 })
  return (
    <div className={cn("flex min-w-0 items-center gap-1 @[24rem]/ss:gap-1.5", className)}>
      <SegmentedControl
        label={t("selfService.period")}
        options={options}
        value={year}
        onChange={onYear}
        // Telefonda dört seçenek ve iki eylem tek satıra sığsın (360 px'te de).
        itemClassName="px-1.75 @[22rem]/ss:px-2 @[24rem]/ss:px-2.5 @[30rem]/ss:px-3"
      />
      <span className="flex-1" />
      {updated && (
        <span className="hidden shrink-0 whitespace-nowrap pe-1 text-[0.6875rem] tabular-nums text-muted-foreground @[56rem]/ss:inline">
          {t("selfService.updated", { time: updated })}
        </span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        aria-label={t("selfService.refresh")}
        title={updated ? t("selfService.updated", { time: updated }) : undefined}
        aria-busy={busy || undefined}
        className={cn(GHOST, ICON)}
      >
        <HugeiconsIcon
          icon={RefreshIcon}
          className={cn(busy && "animate-spin motion-reduce:animate-none")}
          strokeWidth={1.9}
        />
      </button>
      <button
        type="button"
        onClick={onExport}
        disabled={!exportCount}
        aria-label={exportLabel}
        title={exportLabel}
        // Dar kapta yalnız ikon (kare), genişte ikon + etiket.
        className={cn(GHOST, ICON, "@[40rem]/ss:px-2.5")}
      >
        <HugeiconsIcon icon={Download04Icon} strokeWidth={1.9} />
        <span className="hidden @[40rem]/ss:inline">{t("selfService.export.label")}</span>
      </button>
    </div>
  )
}
