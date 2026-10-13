import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
import UserIcon from "@hugeicons/core-free-icons/UserIcon"
import { SegmentedControl } from "@/components/common/SegmentedControl"
import { useLocale } from "@/hooks/useLocale"

/**
 * "Bilgilerim | Ekibim (n)" — ERP self servisinin iki sekmesi, dönem seçimiyle aynı bölmeli
 * seçim (vurgu kayar, oklarla gezilir). Yalnız ekibi olan kişide çizilir (yönetici, aynı
 * yöneticiye bağlılar ya da bana bağlılar; çağıran karar verir); seçim adreste (`view=team`).
 * `countPending`: sayı henüz kesin değil — yerinde iskelet (zıplama yok).
 */
export function ViewSwitch({ value, onChange, teamCount, countPending = false }) {
  const { t } = useLocale()
  const count =
    teamCount != null ? (
      <span className="rounded-full bg-foreground/[0.07] px-1.5 text-[0.6875rem] tabular-nums">
        {teamCount}
      </span>
    ) : (
      countPending && <span aria-hidden="true" className="ms-skeleton block h-4 w-5 rounded-full" />
    )
  const options = [
    { value: "me", icon: UserIcon, label: t("selfService.view.me") },
    { value: "team", icon: UserGroupIcon, label: t("selfService.view.team"), accessory: count },
  ]
  return (
    <SegmentedControl
      label={t("selfService.view.label")}
      options={options}
      value={value}
      onChange={onChange}
      iconFrom="@[30rem]/ss:block"
    />
  )
}
