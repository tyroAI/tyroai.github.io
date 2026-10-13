import { HugeiconsIcon } from "@hugeicons/react"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import Folder01Icon from "@hugeicons/core-free-icons/Folder01Icon"
import { STATUS } from "@/lib/graph"
import { ORG_CHART_ITEM } from "@/lib/corporateFiles"
import { recentTypeMix } from "@/lib/filesInsights"
import { groupByDay } from "@/lib/filesQuery"
import { pluralKey } from "@/lib/intl-cache"
import { FileGroup, FileRow, RowMenu } from "./FileRow"
import { EmptyCard, Notice, RowsSkeleton } from "./FilesStates"
import { StatusFor } from "./FilesStatus"
import { FolderChips, TypeChips } from "./FilesTiles"
import { CdnGrid, LoadMore, PlaceTile, ResultsHeader, SectionTitle, TileGroup } from "./FilesViews"
import { FILES, rowKey } from "./filesShared"

/** Arama/süzgeç görünümü: kurumsal eşleşmeler · klasörler · dosyalar (güne göre). */
export function SearchView(p) {
  const {
    t,
    locale,
    q,
    hasText,
    filters,
    sort,
    results,
    view,
    dimmed,
    folderView,
    fileHits,
    corporateMatches,
    staticItems,
    facet,
    loc,
    source,
    current,
    scopeReady,
    scopeFailure,
    firstDay,
    now,
    rowProps,
    placeOf,
    hrefFor,
    hrefs,
    openItem,
    connect,
    retry,
    widen,
    clearAll,
    setFilter,
    goToFolderOf,
    pendingFolder,
    titleRef,
    freshKeys,
    sortMenu,
    onNavigate,
  } = p
  const scoped = Boolean(loc) || source !== "all"
  const place = current?.name ?? (source !== "all" ? t(`myfiles.source.${source}`) : "")
  const scopeLine = scoped
    ? t("myfiles.results.inDeep", { place })
    : t("myfiles.results.everywhere")
  const title = hasText ? t("myfiles.results.title") : t("myfiles.results.filteredTitle")
  const orgHref = hasText && source === "corporate" && !loc ? hrefs.org : null

  // Yalnız kurumsal görsellerin olduğu konum: sunucuya hiç gidilmez.
  if (staticItems) {
    return (
      <div className="flex min-w-0 flex-col gap-5">
        <ResultsHeader
          title={title}
          summary={`${t(pluralKey("myfiles.results.count", locale, staticItems.length), { count: staticItems.length })} · ${scopeLine}`}
          onWiden={widen}
          titleRef={titleRef}
        />
        {staticItems.length ? (
          <CdnGrid items={staticItems} onOpen={(it) => openItem(it, staticItems)} />
        ) : (
          <NoMatch {...{ t, q, hasText, filters, clearAll, setFilter, widen, scoped, orgHref }} />
        )}
      </div>
    )
  }

  const loading = !scopeReady || (view.status === "loading" && !dimmed)
  const approx = view.status === STATUS.ready ? view.total : 0
  const summary = dimmed
    ? `${t("myfiles.results.searching")} · ${scopeLine}`
    : view.status === STATUS.ready
      ? `${t(pluralKey("myfiles.results.approx", locale, approx), { count: approx })} · ${scopeLine}`
      : scopeLine
  const corp = corporateMatches
  const corpRows = corp
    ? [...corp.folders, ...(corp.org ? [ORG_CHART_ITEM] : []), ...corp.images.slice(0, 6)]
    : []
  const folderRows = (folderView.items ?? []).filter((it) => it.kind === "folder")
  const fileGroups =
    sort === "modified"
      ? groupByDay(fileHits, now, firstDay).map((g) => ({
          ...g,
          label: t(`myfiles.bucket.${g.id}`),
        }))
      : [{ id: "all", label: t("myfiles.group.results"), items: fileHits }]
  const nothing =
    view.status === STATUS.ready && !fileHits.length && !folderRows.length && !corpRows.length
  // Sunucunun tür tahmini ("≈"): yalnız tür seçilmemişken ve en az iki tür varken anlamlı.
  const mix =
    view.status === STATUS.ready && view.typeCounts?.approx && !filters.types.length
      ? recentTypeMix(view.typeCounts)
      : []

  return (
    <div className="flex min-w-0 flex-col gap-5" aria-busy={loading || dimmed || undefined}>
      <ResultsHeader
        title={title}
        summary={summary}
        onWiden={scoped ? widen : null}
        titleRef={titleRef}
        sortMenu={sortMenu}
      />
      {/* OneDrive kimlik basamağında "Sen" yalnız OneDrive'ı kapsıyor — SÖYLENİR. */}
      {filters.person === "me" && (view.personUnavailable || view.mineRung === "onedrive") && (
        <Notice>{t("myfiles.notice.personOneDrive")}</Notice>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {view.status === STATUS.ready && !dimmed
          ? t(pluralKey("myfiles.results.announce", locale, fileHits.length), {
              count: fileHits.length,
            })
          : ""}
      </p>

      {(mix.length > 1 || facet.length > 1) && (
        <div className="flex min-w-0 flex-col gap-3">
          {mix.length > 1 && (
            <TypeChips
              lead={t("myfiles.mix.results")}
              mix={mix}
              approx
              onPick={(id) => setFilter({ types: [id] })}
              note={t("myfiles.filter.approx")}
            />
          )}
          {facet.length > 1 && (
            <div className="min-w-0">
              <SectionTitle>{t("myfiles.facet.folders")}</SectionTitle>
              <FolderChips
                folders={facet}
                pendingKey={pendingFolder}
                onPick={(f) => goToFolderOf(f.sample, { keepText: true, key: f.url })}
                labelFor={(f) => {
                  const root = placeOf(f.sample)?.label?.split(" › ")[0] ?? ""
                  return root === t("myfiles.loc.onedrive") ? "" : root
                }}
              />
            </div>
          )}
        </div>
      )}

      {corpRows.length > 0 && (
        <FileGroup label={t("myfiles.group.corporate")} count={corpRows.length}>
          {corpRows.map((it) => (
            <FileRow
              key={it.id}
              item={it.kind === "link" ? { ...it, name: t("docs.org.title") } : it}
              layout="flat"
              place={it.cdn ? placeOf(it) : null}
              href={it.kind === "folder" ? hrefFor(it) : null}
              onOpen={(x) => openItem(x, corp.images)}
              {...rowProps}
            />
          ))}
        </FileGroup>
      )}

      {folderRows.length > 0 && (
        <TileGroup
          label={t("myfiles.group.folders")}
          count={folderRows.length}
          className={
            dimmed
              ? "opacity-55 transition-opacity duration-150 motion-reduce:transition-none"
              : undefined
          }
        >
          {folderRows.map((it) => {
            const where = placeOf({ ...it, kind: "file", webUrl: `${it.webUrl}/x` })
            return (
              <PlaceTile
                key={it.id}
                item={it}
                href={hrefFor(it)}
                onNavigate={onNavigate}
                glyph={Folder01Icon}
                meta={where?.label ?? ""}
                menu={
                  <RowMenu
                    item={it}
                    layout="flat"
                    graphFile={false}
                    external={false}
                    navigable
                    onOpen={openItem}
                    onCopy={rowProps.onCopy}
                    onSearchIn={rowProps.onSearchIn}
                  />
                }
              />
            )
          })}
        </TileGroup>
      )}

      {loading ? (
        scopeFailure ? (
          <StatusFor
            t={t}
            status={scopeFailure.status}
            scopes={FILES}
            httpStatus={scopeFailure.httpStatus}
            code={scopeFailure.code}
            onConnect={connect}
            onRetry={retry}
          />
        ) : (
          <>
            <RowsSkeleton rows={6} />
            <p role="status" className="sr-only">
              {t("myfiles.loading")}
            </p>
          </>
        )
      ) : view.status !== STATUS.ready ? (
        <StatusFor
          t={t}
          status={view.status}
          scopes={FILES}
          httpStatus={view.httpStatus}
          code={view.code}
          onConnect={connect}
          onRetry={retry}
        />
      ) : nothing ? (
        <NoMatch {...{ t, q, hasText, filters, clearAll, setFilter, widen, scoped, orgHref }} />
      ) : (
        <div
          className={
            dimmed
              ? "flex flex-col gap-6 opacity-55 transition-opacity duration-150 motion-reduce:transition-none"
              : "flex flex-col gap-6"
          }
        >
          {fileGroups
            .filter((g) => g.items.length)
            .map((g) => (
              <FileGroup key={g.id} label={g.label} count={g.items.length}>
                {g.items.map((it) => (
                  <FileRow
                    key={it.id}
                    item={it}
                    layout="flat"
                    place={placeOf(it)}
                    onOpen={openItem}
                    fresh={freshKeys.has(rowKey(it))}
                    {...rowProps}
                  />
                ))}
              </FileGroup>
            ))}
          {view.items.length > 0 &&
            (view.clientFiltered || fileHits.length < view.items.length) && (
              <Notice>{t("myfiles.notice.clientFiltered")}</Notice>
            )}
          {view.clientSorted && view.moreAvailable && (
            <Notice>{t("myfiles.notice.sortedLoaded", { count: view.items.length })}</Notice>
          )}
          {!dimmed && (
            <LoadMore
              hasMore={results.moreAvailable && !results.capReached}
              loading={results.loadingMore}
              onMore={results.loadMore}
              capLine={
                results.capReached ? t("myfiles.results.cap", { count: results.items.length }) : ""
              }
              endLine={
                !results.moreAvailable && fileHits.length > 0 ? t("myfiles.results.end") : ""
              }
            />
          )}
          {hasText && (
            <p className="px-1 text-[0.6875rem] text-muted-foreground/80">
              {t("myfiles.notice.indexLag")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Sonuç yok: süzgeçleri tek tek kaldır · her yerde ara · hepsini temizle. */
function NoMatch({ t, q, hasText, filters, clearAll, setFilter, widen, scoped, orgHref }) {
  const removable = [
    filters.types.length && { key: "types", label: t("myfiles.filter.type"), clear: { types: [] } },
    filters.date && { key: "date", label: t("myfiles.filter.date"), clear: { date: "" } },
    filters.person && { key: "person", label: t("myfiles.filter.person"), clear: { person: "" } },
  ].filter(Boolean)
  const pill =
    "rounded-full border border-border bg-card px-3.5 py-1.5 text-[0.75rem] font-medium text-foreground/80 transition hover:bg-accent/60 [@media(pointer:coarse)]:min-h-11"
  return (
    <EmptyCard
      title={hasText ? t("myfiles.state.noMatchQuery", { query: q }) : t("myfiles.state.noMatch")}
      body={t("myfiles.state.noMatchBody")}
    >
      {removable.map((r) => (
        <button key={r.key} type="button" onClick={() => setFilter(r.clear)} className={pill}>
          {t("myfiles.filter.remove", { label: r.label })}
        </button>
      ))}
      {scoped && (
        <button
          type="button"
          onClick={widen}
          className="rounded-full border border-brand/25 bg-brand/[0.07] px-3.5 py-1.5 text-[0.75rem] font-medium text-foreground transition hover:bg-brand/[0.12] [@media(pointer:coarse)]:min-h-11"
        >
          {t("myfiles.results.everywhereAction")}
        </button>
      )}
      {/* Şirket araması boşken şemaya görünür bir kestirme (D-9; eskiden yalnız ekran okuyucudaydı). */}
      {orgHref && (
        <a
          href={orgHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${pill} inline-flex items-center gap-1`}
        >
          {t("docs.org.title")}
          <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" strokeWidth={2} />
        </a>
      )}
      {(hasText || removable.length > 1) && (
        <button
          type="button"
          onClick={clearAll}
          className="rounded-full px-3.5 py-1.5 text-[0.75rem] font-medium text-muted-foreground transition hover:bg-accent/60 [@media(pointer:coarse)]:min-h-11"
        >
          {t("myfiles.filter.clearAll")}
        </button>
      )}
    </EmptyCard>
  )
}
