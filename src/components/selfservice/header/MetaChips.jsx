import { HugeiconsIcon } from "@hugeicons/react"
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import UserAccountIcon from "@hugeicons/core-free-icons/UserAccountIcon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

const ICONS = {
  department: UserGroupIcon,
  company: Building03Icon,
  office: Location01Icon,
  employeeType: UserAccountIcon,
}

// Çip kalıbı; iskelet de aynı boyda yer tutar (yüklenince kayma olmasın).
const CHIP = "flex h-6 min-w-0 max-w-full items-center rounded-full"

/**
 * Başlığın etiketli bilgi çipleri (`metaOf().chips`: şirket, departman, ofis, çalışan tipi): ikon
 * + değer. Etiket ekran okuyucuya `dt`'de, fareyle ipucunda; uzun değer çipin içinde kesilir,
 * tamamı ipucunda. Şirket adı düzeltildiyse ipucu kayıttaki yazımı da gösterir.
 */
export function MetaChips({ chips, className }) {
  const { t } = useLocale()
  if (!chips.length) return null
  return (
    <dl className={cn("flex min-w-0 flex-wrap gap-1.5", className)}>
      {chips.map(({ key, value, raw }) => {
        const label = t(`selfService.profile.${key}`)
        const tip = raw
          ? `${label}: ${value}\n${t("selfService.profile.recorded", { value: raw })}`
          : `${label}: ${value}`
        return (
          <div
            key={key}
            title={tip}
            className={cn(
              CHIP,
              // Soluk gri yazı bu zeminde AA'nın altında kalıyor: yazı koyu, ikon soluk.
              "gap-1 bg-foreground/[0.045] pe-2 ps-1.5 text-[0.75rem] text-foreground/75 @[40rem]/ss:max-w-[24rem]",
            )}
          >
            <dt className="shrink-0">
              <HugeiconsIcon
                icon={ICONS[key]}
                aria-hidden="true"
                className="size-3.5 text-muted-foreground"
                strokeWidth={1.8}
              />
              <span className="sr-only">{label}</span>
            </dt>
            <dd lang="tr" className="min-w-0 truncate">
              {value}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** Yüklenirken çiplerin yeri: dar kapta, şirket adlı gerçek satır gibi iki sıraya kırılır. */
export function MetaChipsSkeleton({ className }) {
  return (
    <div aria-hidden="true" className={cn("flex min-w-0 flex-wrap gap-1.5", className)}>
      {["w-52", "w-32", "w-20"].map((w) => (
        <span key={w} className={cn(CHIP, "ms-skeleton", w)} />
      ))}
    </div>
  )
}
