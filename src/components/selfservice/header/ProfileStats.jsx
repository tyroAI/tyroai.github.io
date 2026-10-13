import { HugeiconsIcon } from "@hugeicons/react"
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { PersonPopover } from "@/components/common/PersonPopover"
import { useLocale } from "@/hooks/useLocale"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { usePresence } from "@/hooks/usePresence"
import { cn } from "@/lib/utils"
import { day } from "../kinds"
import { tenureText } from "./profileText"

// Dar kapta küçük hap, genişte etiket üstte · değer altta (ERP başlığının sağ tarafı gibi).
const STAT =
  "flex min-w-0 shrink-0 items-center gap-1.5 rounded-full bg-foreground/[0.05] py-1 pe-2.5 ps-2 @[56rem]/ss:flex-col @[56rem]/ss:items-start @[56rem]/ss:gap-0.5 @[56rem]/ss:rounded-none @[56rem]/ss:bg-transparent @[56rem]/ss:p-0"
const LABEL =
  "sr-only text-[0.6875rem] font-medium text-muted-foreground @[56rem]/ss:not-sr-only @[56rem]/ss:whitespace-nowrap"

function Skeleton({ wide }) {
  return (
    <span
      aria-hidden="true"
      className={cn("ms-skeleton block h-7 rounded-full @[56rem]/ss:h-9", wide ? "w-36" : "w-20")}
    />
  )
}

function ManagerButton({ manager }) {
  const { t } = useLocale()
  const photo = usePeoplePhotos(manager.address ? [manager.address] : []).get(manager.address)
  const presence = usePresence(manager.address ? [manager.address] : []).get(manager.address)
  return (
    <PersonPopover
      person={{ name: manager.name, address: manager.address, title: manager.title }}
      align="end"
    >
      {(trigger) => (
        <button
          {...trigger}
          aria-label={t("selfService.profile.openCard", { name: manager.name })}
          className="flex min-w-0 items-center gap-1.5 rounded-full bg-foreground/[0.05] py-0.5 pe-2.5 ps-0.5 text-start transition hover:bg-foreground/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:min-h-11 @[56rem]/ss:-m-1 @[56rem]/ss:gap-2 @[56rem]/ss:bg-transparent @[56rem]/ss:p-1 @[56rem]/ss:hover:bg-foreground/[0.05]"
        >
          <PersonAvatar
            name={manager.name}
            photo={photo}
            presence={presence}
            className="size-6 @[56rem]/ss:size-7"
          />
          <span className="min-w-0">
            <span
              lang="tr"
              className="block truncate text-[0.8125rem] font-semibold text-foreground @[56rem]/ss:max-w-[13rem] @[56rem]/ss:text-[0.9375rem]"
            >
              {manager.name}
            </span>
            {manager.title && (
              <span
                lang="tr"
                // Düğmenin üstüne gelince zemin koyulaşır: soluk gri orada AA'nın altına iniyordu.
                className="hidden truncate text-[0.6875rem] text-foreground/70 @[56rem]/ss:block @[56rem]/ss:max-w-[13rem]"
              >
                {manager.title}
              </span>
            )}
          </span>
        </button>
      )}
    </PersonPopover>
  )
}

/**
 * Başlığın istatistikleri: hizmet süresi (Graph işe giriş; yoksa ERP istihdamı) ve bağlı olunan
 * kişi (Graph yöneticisi; basınca kişi kartı). Bilinmeyen gösterilmez; cevap beklenirken yer
 * tutulur.
 */
export function ProfileStats({ profile, self = true }) {
  const { t, locale } = useLocale()
  const pending = profile?.pending ?? {}
  const tenure = profile?.hireDate ? tenureText(profile.hireDate, t, locale) : null
  const manager = profile?.manager ?? null
  const showTenure = pending.hireDate || tenure
  const showManager = pending.manager || manager
  if (!showTenure && !showManager) return null
  const hired = profile?.hireDate
    ? [
        t("selfService.profile.hired", { date: day(profile.hireDate, locale) }),
        profile.sources?.hireDate === "erp" ? t("selfService.profile.fromErp") : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined

  return (
    <dl className="flex min-w-0 items-center gap-2 @[56rem]/ss:items-start @[56rem]/ss:gap-0 @[56rem]/ss:divide-x @[56rem]/ss:divide-border/70">
      {showTenure &&
        (pending.hireDate && !tenure ? (
          <Skeleton />
        ) : (
          <div className={cn(STAT, "@[56rem]/ss:pe-5")} title={hired}>
            <dt className={LABEL}>{t("selfService.profile.tenure")}</dt>
            <dd className="flex items-center gap-1.5 text-[0.8125rem] font-semibold tabular-nums text-foreground @[56rem]/ss:text-[1.125rem] @[56rem]/ss:tracking-[-0.01em]">
              <HugeiconsIcon
                icon={Clock01Icon}
                aria-hidden="true"
                className="size-3.5 text-muted-foreground @[56rem]/ss:hidden"
                strokeWidth={2}
              />
              {tenure}
            </dd>
            {hired && <dd className="sr-only">{hired}</dd>}
          </div>
        ))}
      {showManager &&
        (pending.manager && !manager ? (
          <Skeleton wide />
        ) : (
          <div className={cn(STAT, "bg-transparent p-0 @[56rem]/ss:ps-5")}>
            <dt className={LABEL}>
              {t(self ? "selfService.profile.manager" : "selfService.profile.managerOf")}
            </dt>
            <dd className="min-w-0">
              <ManagerButton manager={manager} />
            </dd>
          </div>
        ))}
    </dl>
  )
}
