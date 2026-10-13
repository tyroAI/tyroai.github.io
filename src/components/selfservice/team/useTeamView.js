import { useMemo } from "react"
import { useLocale } from "@/hooks/useLocale"
import { useMinuteNow } from "@/hooks/useMinuteNow"
import { teamOverview } from "@/lib/selfServiceTeam"
import { soonList, withOccasions } from "@/lib/teamOccasions"

/**
 * Ekibim'in türetilmiş verisi (`teamOverview`, bellekte): satırlar (her birinde sıradaki doğum
 * günü ve iş yıl dönümü, `occasions`), özet, haftaya hizalı çizelge, telefonun "Yaklaşanlar"
 * listesi (`soon`: izinler + 6 hafta içindeki günler). `dates`: ekibin İK tarihleri
 * (`useTeamDates`). Yalnız gün değişince yeniden hesaplanır (sayfa gece açık kalsa da "bugün" kayar).
 */
export function useTeamView(team, dates) {
  const { t } = useLocale()
  const now = useMinuteNow()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const today = useMemo(() => new Date(y, m, d), [y, m, d])
  return useMemo(() => {
    const overview = teamOverview(team.people, team.leave, { now: today, t })
    const rows = withOccasions(overview.rows, dates, today)
    const byKey = new Map(rows.map((r) => [r.key, r]))
    return {
      ...overview,
      rows,
      groups: overview.groups.map((g) => ({ ...g, rows: g.rows.map((r) => byKey.get(r.key)) })),
      soon: soonList(overview.upcoming, rows),
      today,
    }
  }, [team.people, team.leave, today, t, dates])
}
