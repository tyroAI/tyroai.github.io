import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { PersonPopover } from "@/components/common/PersonPopover"
import { useLocale } from "@/hooks/useLocale"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { useWidgetData } from "@/hooks/useWidgetData"
import { fetchTeam } from "@/lib/widgetSources"
import { cn } from "@/lib/utils"
import { WidgetBody } from "./WidgetBody"
import { WidgetEmpty } from "./WidgetEmpty"
import { WidgetFrame } from "./WidgetFrame"
import { PageBody, Pager } from "./paging/Pager"
import { usePager } from "./paging/usePager"

const ORDER = { available: 0, busy: 1, away: 2, offline: 3 }

/**
 * Ekibim bugün — yöneticim, ekip arkadaşlarım ve bana bağlı olanlar: canlı
 * Teams durumu (nokta) ve otomatik yanıtı açık olanlar ("ofis dışında").
 * Kişiye basınca kişi kartı. Önce müsaitler, ofis dışındakiler en sonda.
 */
export function TeamTodayWidget({ className }) {
  const { t } = useLocale()
  const res = useWidgetData("team-today", fetchTeam, 5 * 60_000)
  const people = res.data ?? []
  // Durum `fetchTeam`den (tek istek). Ofis dışındakiler en sonda; gerisi
  // müsait → meşgul → uzakta → çevrimdışı → bilinmiyor. Sayfa başına 6 kişi
  // (2×3), fazlası sağa/sola sayfa; fotoğraf yalnız görünen sayfanınki.
  const rank = (p) => (p.away ? 9 : (ORDER[p.presence] ?? 5))
  const sorted = [...people].sort((a, b) => rank(a) - rank(b))
  const pager = usePager(sorted, 6)
  const photos = usePeoplePhotos(pager.items.map((p) => p.address))
  const available = people.filter((p) => !p.away && p.presence === "available").length
  const away = people.filter((p) => p.away).length

  return (
    <WidgetFrame
      id="team-today"
      title={t("widgets.team.title")}
      icon={UserGroupIcon}
      busy={res.status === "loading"}
      className={className}
      pager={<Pager pager={pager} label={t("widgets.team.title")} />}
      action={
        people.length > 6 ? (
          <span className="text-[0.71875rem] tabular-nums text-muted-foreground">
            {t("widgets.team.total", { n: people.length })}
          </span>
        ) : null
      }
    >
      <WidgetBody status={res.status} rows={3}>
        {people.length ? (
          <>
            <p className="mt-1 text-[0.75rem] text-muted-foreground">
              {t("widgets.team.summary", { available, away })}
            </p>
            <PageBody pager={pager} className="mt-2 grid grid-cols-2 gap-x-3">
              {pager.items.map((p) => {
                return (
                  <li key={p.id}>
                    <PersonPopover person={{ name: p.name, address: p.address }} side="top">
                      {(trigger) => (
                        <button
                          {...trigger}
                          type="button"
                          className="-mx-1.5 flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1 text-start transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                        >
                          <PersonAvatar
                            name={p.name}
                            photo={photos.get(p.address)}
                            presence={p.away ? undefined : (p.presence ?? undefined)}
                            className={cn("size-8 text-[0.625rem]", p.away && "opacity-60")}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.8125rem] font-medium">
                              {p.name}
                            </span>
                            <span
                              className={cn(
                                "block truncate text-[0.6875rem]",
                                p.away
                                  ? "text-amber-700 dark:text-amber-400"
                                  : "text-muted-foreground",
                              )}
                            >
                              {p.away ? t("widgets.team.away") : t(`widgets.team.role.${p.role}`)}
                            </span>
                          </span>
                        </button>
                      )}
                    </PersonPopover>
                  </li>
                )
              })}
            </PageBody>
          </>
        ) : (
          <WidgetEmpty icon={UserGroupIcon}>{t("widgets.team.empty")}</WidgetEmpty>
        )}
      </WidgetBody>
    </WidgetFrame>
  )
}
