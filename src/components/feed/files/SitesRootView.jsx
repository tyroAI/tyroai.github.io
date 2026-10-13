import { useState } from "react"
import Globe02Icon from "@hugeicons/core-free-icons/Globe02Icon"
import { STATUS } from "@/lib/graph"
import { FILES_PAGE } from "@/lib/filesPolicy"
import { matchesText } from "@/lib/filesQuery"
import { EmptyCard, Notice, RowsSkeleton } from "./FilesStates"
import { StatusFor } from "./FilesStatus"
import { PlaceTile, TeamTile, TileGroup } from "./FilesViews"
import { SITES } from "./filesShared"

/** SharePoint kökü: kök site + takip ettiklerin + ekiplerin (`BrowseView`in bir hâli). */
export function SitesRootView({
  header,
  sitesList,
  tile,
  menuFor,
  hrefFor,
  onNavigate,
  connect,
  retry,
  pendingFolder,
  onOpenGroup,
  t,
  locale,
}) {
  const root = (sitesList.items ?? []).filter((s) => s.group === "root")
  const followed = (sitesList.items ?? []).filter((s) => s.group === "followed")
  const teams = (sitesList.items ?? []).filter((s) => s.group === "teams")
  const partial = sitesList.partial ?? []
  const host = (s) => s.subtitle?.replace(/^https?:\/\//, "") ?? ""
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {header}
      {sitesList.status === "loading" ? (
        <RowsSkeleton rows={4} />
      ) : sitesList.status !== STATUS.ready ? (
        <StatusFor
          t={t}
          status={sitesList.status}
          scopes={SITES}
          httpStatus={sitesList.httpStatus}
          code={sitesList.code}
          onConnect={connect}
          onRetry={retry}
        />
      ) : (
        <>
          {sitesList.sitesDenied ? (
            <Notice tone="warn" action={t("files.connect")} onAction={() => connect(SITES)}>
              {t("myfiles.state.sitesDeniedBody")}
            </Notice>
          ) : (
            <>
              {partial.includes("root") && (
                <Notice tone="warn">{t("myfiles.notice.rootPartial")}</Notice>
              )}
              {partial.includes("followed") && (
                <Notice tone="warn">{t("myfiles.notice.followedPartial")}</Notice>
              )}
            </>
          )}
          {partial.includes("teams") && (
            <Notice tone="warn">{t("myfiles.notice.teamsPartial")}</Notice>
          )}
          {root.length > 0 && (
            <TileGroup label={t("myfiles.group.rootSite")}>
              {root.map((s) => (
                <PlaceTile
                  key={s.id}
                  item={s}
                  href={hrefFor(s)}
                  onNavigate={onNavigate}
                  glyph={Globe02Icon}
                  meta={host(s)}
                  menu={menuFor(s)}
                  wide
                />
              ))}
            </TileGroup>
          )}
          {followed.length > 0 ? (
            <TileGroup label={t("myfiles.group.followedSites")} count={followed.length}>
              {followed.map((s) => tile(s, Globe02Icon, host(s)))}
            </TileGroup>
          ) : (
            !sitesList.sitesDenied && (
              <EmptyCard title={t("myfiles.state.noSites")} body={t("myfiles.state.noSitesBody")} />
            )
          )}
          {!partial.includes("teams") && (
            <TeamsGroup
              teams={teams}
              pendingFolder={pendingFolder}
              onOpenGroup={onOpenGroup}
              t={t}
              locale={locale}
            />
          )}
          <Notice>{t("myfiles.notice.sitesScope")}</Notice>
        </>
      )}
    </div>
  )
}

/**
 * Ekiplerin — üyesi olduğun Microsoft 365 grupları (§12.8). İlk 12, fazlası
 * "Tümünü göster (n)" arkasında; 12'den fazlaysa süzme kutusu (yüzlerce ekibi
 * olan biri listeyi kaydırarak taramasın). Kutucuk tıklanınca kitaplık çözülür.
 */
function TeamsGroup({ teams, pendingFolder, onOpenGroup, t, locale }) {
  const [all, setAll] = useState(false)
  const [filter, setFilter] = useState("")
  const visibleMax = FILES_PAGE.teamsVisible
  if (!teams.length) return <EmptyCard title={t("myfiles.state.noTeams")} />
  const needle = filter.trim()
  const pool = needle ? teams.filter((g) => matchesText(g, needle)) : teams
  const shown = all || needle ? pool : pool.slice(0, visibleMax)
  return (
    <section className="min-w-0">
      {/* Başlık kutucuk gruplarınınkiyle AYNI hizada (`TileGroup`). */}
      <h3
        lang={locale}
        className="flex items-center gap-2 px-3 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
      >
        <span>{t("myfiles.group.teams")}</span>
        <span className="font-medium tabular-nums opacity-70">{teams.length}</span>
      </h3>
      {teams.length > visibleMax && (
        <div className="pb-2.5">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("myfiles.teams.filter")}
            aria-label={t("myfiles.teams.filter")}
            className="ms-surface no-ios-zoom h-10 w-full rounded-full px-4 text-[0.8125rem] outline-none transition focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/20 [@media(pointer:coarse)]:h-11"
          />
        </div>
      )}
      <ul className="grid grid-cols-2 gap-2 @[34rem]/files:grid-cols-3 @[52rem]/files:grid-cols-4">
        {shown.map((g) => (
          <TeamTile
            key={g.id}
            item={g}
            pending={pendingFolder === g.id}
            onOpenGroup={onOpenGroup}
          />
        ))}
      </ul>
      {!all && !needle && pool.length > visibleMax && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-2.5 rounded-full px-3 py-2 text-[0.78125rem] font-medium text-brand-ink transition hover:bg-brand/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 [@media(pointer:coarse)]:min-h-11"
        >
          {t("myfiles.group.showAll", { count: pool.length })}
        </button>
      )}
    </section>
  )
}
