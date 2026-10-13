import { HugeiconsIcon } from "@hugeicons/react"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon"
import CloudIcon from "@hugeicons/core-free-icons/CloudIcon"
import Folder01Icon from "@hugeicons/core-free-icons/Folder01Icon"
import FolderLibraryIcon from "@hugeicons/core-free-icons/FolderLibraryIcon"
import FolderOpenIcon from "@hugeicons/core-free-icons/FolderOpenIcon"
import Globe02Icon from "@hugeicons/core-free-icons/Globe02Icon"
import Image01Icon from "@hugeicons/core-free-icons/Image01Icon"
import JusticeScale01Icon from "@hugeicons/core-free-icons/JusticeScale01Icon"
import { STATUS } from "@/lib/graph"
import { CDN_FOLDERS, CDN_IMAGE_COUNT, POLICY_ITEMS } from "@/lib/corporateFiles"
import { placeFacts, quotaInfo } from "@/lib/filesInsights"
import { formatBytes, formatFileTime } from "@/lib/filesQuery"
import { getNumberFormat, pluralKey } from "@/lib/intl-cache"
import { FileGroup, FileRow, RowMenu } from "./FileRow"
import { EmptyCard, Notice, RowsSkeleton, StateCard } from "./FilesStates"
import { StatusFor } from "./FilesStatus"
import { CdnGrid, DoorCards, LoadMore, PlaceHeader, PlaceTile, TileGroup } from "./FilesViews"
import { SitesRootView } from "./SitesRootView"
import { FILES, SITES, rowKey } from "./filesShared"

/** Konumun glifi — "bulunduğun yer" kutusu (her görünümde bir tane). */
function placeGlyph(loc, source) {
  if (!loc)
    return source === "onedrive" ? CloudIcon : source === "corporate" ? Building03Icon : Globe02Icon
  switch (loc.kind) {
    case "onedrive":
      return CloudIcon
    case "sites":
    case "site":
      return Globe02Icon
    case "drive":
      return FolderLibraryIcon
    case "corporate":
      return Building03Icon
    case "policyRoot":
    case "policy":
      return JusticeScale01Icon
    case "cdnRoot":
    case "cdnFolder":
      return Image01Icon
    default:
      return FolderOpenIcon
  }
}

/** Gezinme görünümü: bulunulan yerin başlığı + içi (kökler, kurumsal, klasör listesi). */
export function BrowseView(p) {
  const {
    t,
    locale,
    now,
    loc,
    source,
    current,
    crumbs,
    upHref,
    meta,
    listing,
    sitesList,
    policy,
    policyFolder,
    cdnFolder,
    hrefs,
    hrefFor,
    rowProps,
    openItem,
    connect,
    retry,
    titleRef,
    myRoot,
    spRoot,
    myDrive,
    pendingFolder,
    freshKeys,
    sortMenu,
    onNavigate,
  } = p
  const num = getNumberFormat(locale)
  const count = (base, n, opts = {}) =>
    t(opts.atLeast ? `${base}.other` : pluralKey(base, locale, n), {
      n: opts.atLeast ? t("myfiles.count.atLeast", { n: num.format(n) }) : num.format(n),
      count: n,
    })
  const glyph = placeGlyph(loc, source)
  const onedriveRoot = loc?.kind === "onedrive" || (!loc && source === "onedrive")
  const sharepointRoot = loc?.kind === "sites" || (!loc && source === "sharepoint")
  const corporateRoot = loc?.kind === "corporate" || (!loc && source === "corporate")
  const title =
    current?.name ||
    (onedriveRoot
      ? t("myfiles.loc.onedrive")
      : sharepointRoot
        ? t("myfiles.source.sharepoint")
        : corporateRoot
          ? t("myfiles.source.corporate")
          : "…")

  // Özet satırı — yalnız SAYILABİLENDEN (yüklenen satırlardan); "+" alt sınır.
  let facts = null
  let factsLoading = false
  const listed =
    !sharepointRoot &&
    !corporateRoot &&
    !["policyRoot", "cdnRoot", "cdnFolder"].includes(loc?.kind) &&
    !(loc?.kind === "policy" && policyFolder.status !== STATUS.ready)
  if (listed) {
    if (listing.status === "loading") factsLoading = true
    else if (listing.status === STATUS.ready && listing.items.length) {
      if (loc?.kind === "site") facts = count("myfiles.place.libraries", listing.items.length)
      else {
        const f = placeFacts(listing.items, listing.hasMore)
        facts = [
          f.folders ? count("myfiles.place.folders", f.folders, { atLeast: f.more }) : "",
          f.files ? count("myfiles.place.files", f.files, { atLeast: f.more }) : "",
          f.latest
            ? t("myfiles.place.changed", {
                when: formatFileTime(new Date(f.latest).toISOString(), now, locale),
              })
            : "",
        ]
          .filter(Boolean)
          .join(" · ")
      }
    }
  } else if (sharepointRoot) {
    if (sitesList.status === "loading") factsLoading = true
    else if (sitesList.status === STATUS.ready) {
      const items = sitesList.items ?? []
      const followed = items.filter((s) => s.group === "followed").length
      const teams = items.filter((s) => s.group === "teams").length
      facts =
        [
          followed ? count("myfiles.card.sites", followed) : "",
          teams ? count("myfiles.place.teams", teams) : "",
        ]
          .filter(Boolean)
          .join(" · ") || null
    }
  } else if (loc?.kind === "policyRoot") facts = count("myfiles.row.companies", POLICY_ITEMS.length)
  else if (loc?.kind === "cdnRoot")
    facts = `${count("myfiles.place.folders", CDN_FOLDERS.length)} · ${count("myfiles.row.images", CDN_IMAGE_COUNT)}`
  else if (loc?.kind === "cdnFolder" && cdnFolder)
    facts = count("myfiles.row.images", cdnFolder.items.length)

  // OneDrive kökünde kota ölçeri (D-8).
  let quota = null
  if (onedriveRoot && myDrive.status === STATUS.ready) {
    const q = quotaInfo(myDrive.quota)
    if (q) {
      const pct = getNumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: q.pct < 0.1 ? 1 : 0,
      }).format(q.pct)
      quota = {
        ...q,
        text: t("myfiles.card.quotaAria", {
          used: formatBytes(q.used, locale),
          total: formatBytes(q.total, locale),
          pct,
        }),
      }
    }
  }

  const openUrl = onedriveRoot
    ? myRoot
    : sharepointRoot
      ? spRoot
      : loc?.kind === "policy"
        ? policyFolder.webUrl || policy?.fallbackUrl
        : corporateRoot || ["policyRoot", "cdnRoot", "cdnFolder"].includes(loc?.kind)
          ? null
          : meta?.webUrl
  const header = (
    <PlaceHeader
      title={title}
      titleLang={current?.lang}
      crumbs={crumbs.slice(0, -1)}
      upHref={upHref}
      glyph={glyph}
      facts={facts}
      factsLoading={factsLoading}
      quota={quota}
      sortMenu={sortMenu}
      openUrl={openUrl}
      openLabel={
        source === "onedrive" ? t("myfiles.openOneDrive") : t("myfiles.row.openInSharePoint")
      }
      titleRef={titleRef}
    />
  )
  const menuFor = (item) => (
    <RowMenu
      item={item}
      layout="browse"
      graphFile={false}
      external={false}
      navigable
      onOpen={openItem}
      onCopy={rowProps.onCopy}
      onReveal={rowProps.onReveal}
      onSearchIn={rowProps.onSearchIn}
    />
  )
  const tile = (item, glyphFor, meta2, lang) => (
    <PlaceTile
      key={item.id}
      item={item}
      href={hrefFor(item)}
      onNavigate={onNavigate}
      glyph={glyphFor}
      meta={meta2}
      lang={lang}
      menu={menuFor(item)}
    />
  )

  // Şirket kökü (şeritten ya da `c`)
  if (corporateRoot) {
    return (
      <div className="flex min-w-0 flex-col gap-5">
        {header}
        <DoorCards
          hrefs={hrefs}
          counts={{ policies: POLICY_ITEMS.length, images: CDN_IMAGE_COUNT }}
        />
      </div>
    )
  }
  if (loc?.kind === "policyRoot") {
    return (
      <div className="flex min-w-0 flex-col gap-5">
        {header}
        <TileGroup label={t("myfiles.group.companies")} count={POLICY_ITEMS.length}>
          {POLICY_ITEMS.map((it) => tile(it, Building03Icon, null, "tr"))}
        </TileGroup>
      </div>
    )
  }
  if (loc?.kind === "cdnRoot") {
    return (
      <div className="flex min-w-0 flex-col gap-5">
        {header}
        <TileGroup label={t("myfiles.group.folders")} count={CDN_FOLDERS.length}>
          {CDN_FOLDERS.map((f) =>
            tile(f, Image01Icon, count("myfiles.row.images", f.childCount), "tr"),
          )}
        </TileGroup>
      </div>
    )
  }
  if (loc?.kind === "cdnFolder") {
    return (
      <div className="flex min-w-0 flex-col gap-5">
        {header}
        {cdnFolder ? (
          <CdnGrid items={cdnFolder.items} onOpen={(it) => openItem(it, cdnFolder.items)} />
        ) : (
          <StateCard title={t("myfiles.state.notFound")} />
        )}
      </div>
    )
  }
  if (loc?.kind === "policy" && policyFolder.status !== STATUS.ready) {
    return (
      <div className="flex min-w-0 flex-col gap-5">
        {header}
        {policyFolder.status === "loading" ? (
          <RowsSkeleton rows={4} />
        ) : (
          <StateCard
            title={t("docs.policy.unreadable")}
            action={t("files.retry")}
            onAction={retry}
            secondary={
              <a
                href={policy?.fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-[0.8125rem] font-medium text-foreground/85 hover:bg-accent [@media(pointer:coarse)]:min-h-11"
              >
                {t("docs.policy.openInSharePoint")}
                <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" strokeWidth={2} />
              </a>
            }
          />
        )}
      </div>
    )
  }

  // SharePoint kökü: kök site + takip ettiklerin + ekiplerin
  if (sharepointRoot) {
    return (
      <SitesRootView
        {...{
          header,
          sitesList,
          tile,
          menuFor,
          hrefFor,
          onNavigate,
          connect,
          retry,
          pendingFolder,
        }}
        {...{ t, locale }}
        onOpenGroup={rowProps.onOpenGroup}
      />
    )
  }

  // Klasör / kitaplık / site / OneDrive kökü / politika klasörü
  const scopes = loc?.kind === "site" ? SITES : FILES
  const folders = (listing.items ?? []).filter((it) => it.kind !== "file")
  const files = (listing.items ?? []).filter((it) => it.kind === "file")
  const folderMeta = (it) =>
    [
      it.kind === "folder" && it.childCount != null
        ? t(pluralKey("myfiles.items", locale, it.childCount), { count: it.childCount })
        : "",
      it.kind === "drive" ? it.subtitle : "",
      it.modified ? formatFileTime(it.modified, now, locale) : "",
    ]
      .filter(Boolean)
      .join(" · ")
  return (
    <div
      className="flex min-w-0 flex-col gap-5"
      aria-busy={listing.status === "loading" || undefined}
    >
      {header}
      {listing.status === "loading" || listing.status === "idle" ? (
        <>
          <RowsSkeleton rows={6} />
          <p role="status" className="sr-only">
            {t("myfiles.loading")}
          </p>
        </>
      ) : listing.status !== STATUS.ready ? (
        <StatusFor
          t={t}
          status={listing.status}
          scopes={scopes}
          httpStatus={listing.httpStatus}
          code={listing.code}
          onConnect={connect}
          onRetry={retry}
        />
      ) : listing.items.length === 0 ? (
        <EmptyCard
          title={onedriveRoot ? t("myfiles.state.emptyOneDrive") : t("myfiles.state.emptyFolder")}
        >
          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-[0.8125rem] font-medium text-foreground/85 hover:bg-accent [@media(pointer:coarse)]:min-h-11"
            >
              {source === "onedrive"
                ? t("myfiles.openOneDrive")
                : t("myfiles.row.openInSharePoint")}
              <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" strokeWidth={2} />
            </a>
          )}
        </EmptyCard>
      ) : (
        <div className="flex flex-col gap-6">
          {listing.clientSorted && listing.hasMore && (
            <Notice>{t("myfiles.notice.sortedLoaded", { count: listing.items.length })}</Notice>
          )}
          {folders.length > 0 && (
            <TileGroup
              label={
                loc?.kind === "site" ? t("myfiles.group.libraries") : t("myfiles.group.folders")
              }
              count={folders.length}
            >
              {folders.map((it) =>
                tile(it, it.kind === "drive" ? FolderLibraryIcon : Folder01Icon, folderMeta(it)),
              )}
            </TileGroup>
          )}
          {files.length > 0 && (
            <FileGroup label={t("myfiles.group.files")} count={files.length}>
              {files.map((it) => (
                <FileRow
                  key={it.id}
                  item={it}
                  onOpen={openItem}
                  fresh={freshKeys.has(rowKey(it))}
                  {...rowProps}
                />
              ))}
            </FileGroup>
          )}
          <LoadMore
            hasMore={listing.hasMore}
            loading={listing.loadingMore}
            onMore={listing.loadMore}
          />
        </div>
      )}
    </div>
  )
}
