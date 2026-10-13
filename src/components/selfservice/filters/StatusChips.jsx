import { useLocale } from "@/hooks/useLocale"
import { STATUS_TONE } from "@/lib/selfServiceStatus"
import { cn } from "@/lib/utils"
import { CHIP, CHIP_OFF, CHIP_ON } from "../chips"
import { TONE_DOT } from "../kinds"

/**
 * Durum süzgeci — KATEGORİYE göre: "Tümü" + bu sekmede ve dönemde BULUNAN kategoriler,
 * sayılarıyla, sabit sırada (`statusOptions`; sayı öteki süzgeçlere ve aramaya uyanlardan).
 * Kategori yoksa (izinde durum alanı yok) hiç çizilmez. Telefonda sonu görünen kayan şerit;
 * genişte ve fareli cihazda satıra sarar (son çipler kesilmesin, fareyle kaydırma gerekmesin).
 */
export function StatusChips({ options, total, value, onChange }) {
  const { t } = useLocale()
  if (!options.length) return null
  const current = value ?? "all"
  return (
    <div
      role="group"
      aria-label={t("selfService.statusFilter")}
      className="flex min-w-0 gap-1.5 overflow-x-auto [mask-image:linear-gradient(to_right,#000_calc(100%-1rem),transparent)] [scrollbar-width:none] pe-4 @[40rem]/ss:flex-wrap @[40rem]/ss:overflow-visible @[40rem]/ss:pe-0 @[40rem]/ss:[mask-image:none] pointer-fine:flex-wrap pointer-fine:overflow-visible pointer-fine:pe-0 pointer-fine:[mask-image:none]"
    >
      {[{ id: "all", count: total }, ...options].map((o) => {
        const on = current === o.id
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id === "all" ? null : o.id)}
            className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
          >
            {o.id !== "all" && (
              <span
                aria-hidden="true"
                className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[STATUS_TONE[o.id]])}
              />
            )}
            {t(`selfService.status.${o.id}`)}
            <span className="tabular-nums opacity-70">{o.count}</span>
          </button>
        )
      })}
    </div>
  )
}
