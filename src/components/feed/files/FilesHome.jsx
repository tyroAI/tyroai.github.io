import { useMemo } from "react"
import CloudIcon from "@hugeicons/core-free-icons/CloudIcon"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import SquareLock02Icon from "@hugeicons/core-free-icons/SquareLock02Icon"
import { useLocale } from "@/hooks/useLocale"
import { disambiguate, recentTypeMix } from "@/lib/filesInsights"
import { facetFolders, groupByDay } from "@/lib/filesQuery"
import { FILES_PAGE } from "@/lib/filesPolicy"
import { STATUS } from "@/lib/graph"
import { getNumberFormat, pluralKey } from "@/lib/intl-cache"
import { FileGroup, FileRow } from "./FileRow"
import { FolderChipsSkeleton, PillsSkeleton, RowsSkeleton, StateRow } from "./FilesStates"
import { FolderChips, TypeChips } from "./FilesTiles"
import { LoadMore } from "./FilesViews"

/**
 * DOSYALARIM'IN AÇILIŞI — pano, özet kartı YOK: arama satırının hemen altında
 * liste başlar.
 *
 *   KLASÖRLER   sık kullandığın klasörler — tek satır çip
 *   SON         "Son dosyaların": tür kapıları + gün grupları
 *
 * ⚠️ Liste boşsa, izin yoksa, okunamadıysa ya da oturum yoksa sebep ve çare
 * listenin YERİNDE tek satırda (`RecentStatus`): sessiz bir boşluk değil.
 * ⚠️ Arama satırı ve şerit bu bileşenin DIŞINDA (`FeedFiles`), her görünümde
 * aynı yerde: pano yalnız kutunun ALTINDAKİ tuval. Bölümler arası boşluk
 * kabın `gap`i — klasör satırı yokken liste yukarı kayar, boşluk kalmaz.
 * ⚠️ Odak sırası = DOM sırası = görsel sıra (CSS `order` yok).
 */
export function FilesHome(p) {
  const { recent, now, nonce, firstDay, hrefs, onDoor, connectFiles, retry } = p
  const { rowProps, placeOf, openItem, goToFolderOf, pendingFolder, fresh, ownDriveId } = p
  const { t, locale } = useLocale()
  const num = getNumberFormat(locale)
  const ready = recent.status === STATUS.ready
  const loading = recent.status === "loading" || recent.status === "idle"
  const listed = ready && recent.items.length > 0
  const folders = useMemo(
    () => (ready ? disambiguate(facetFolders(recent.items, FILES_PAGE.homeFolders)) : []),
    [ready, recent.items],
  )
  const groups = useMemo(
    () => groupByDay(recent.items ?? [], now, firstDay),
    [recent.items, now, firstDay],
  )
  const mix = ready ? recentTypeMix(recent.typeCounts) : []
  const loaded = (recent.items ?? []).length
  const subtitle = recent.oneDrive
    ? t("myfiles.recent.oneDriveHint")
    : ready && recent.total >= loaded && recent.total > 0
      ? t(pluralKey("myfiles.recent.subtitleTotal", locale, recent.total), {
          n: num.format(recent.total),
        })
      : t("myfiles.recent.subtitle")

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {/* Klasörler TEK SATIR çip: gidilecek yer kalıyor, yer kaplamıyor. Dar ekranda satır kayar, sarmaz. */}
      {(loading || folders.length > 1) && (
        <section aria-labelledby="files-folders-title" className="min-w-0">
          <h2 id="files-folders-title" className="sr-only">
            {t("myfiles.home.folders")}
          </h2>
          {loading ? (
            <FolderChipsSkeleton lead={t("myfiles.home.folders")} />
          ) : (
            <FolderChips
              lead={t("myfiles.home.folders")}
              folders={folders}
              pendingKey={pendingFolder}
              onPick={(f) => goToFolderOf(f.sample, { key: f.url })}
              nameFor={(f) => (f.parentName ? `${f.parentName} › ${f.name}` : f.name)}
              labelFor={(f) => {
                const root = placeOf(f.sample)?.label?.split(" › ")[0] ?? ""
                return root === t("myfiles.loc.onedrive") ? "" : root
              }}
              ariaFor={(f) => {
                const name = f.parentName ? `${f.parentName} › ${f.name}` : f.name
                return t(pluralKey("myfiles.folder.aria", locale, f.count), {
                  name,
                  n: num.format(f.count),
                })
              }}
              scroll
            />
          )}
        </section>
      )}

      <section
        aria-labelledby="files-recent-title"
        aria-busy={loading || undefined}
        className="min-w-0 scroll-mt-20"
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2
            id="files-recent-title"
            className="text-[1.25rem] font-semibold tracking-[-0.02em] @[34rem]/files:text-[1.375rem]"
          >
            {recent.oneDrive ? t("myfiles.recent.oneDriveTitle") : t("myfiles.recent.title")}
          </h2>
          {(loading || listed) && (
            <p className="text-[0.8125rem] text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {loading ? (
          <div className="mt-3 flex flex-col gap-5">
            <PillsSkeleton count={4} />
            <RowsSkeleton rows={6} />
            <p role="status" className="sr-only">
              {t("myfiles.loading")}
            </p>
          </div>
        ) : listed ? (
          <>
            {mix.length > 0 && (
              <div className="mt-3">
                <TypeChips
                  lead={t(pluralKey("myfiles.mix.recent", locale, loaded), {
                    n: num.format(loaded),
                  })}
                  mix={mix}
                  onPick={(id) => onDoor({ types: [id], person: "me" })}
                />
              </div>
            )}
            <div className="mt-5 flex flex-col gap-6">
              {groups.map((g) => (
                <FileGroup key={g.id} label={t(`myfiles.bucket.${g.id}`)} count={g.items.length}>
                  {g.items.map((it) => (
                    <FileRow
                      key={it.id}
                      item={it}
                      layout="flat"
                      place={placeOf(it)}
                      onOpen={openItem}
                      hideSelf
                      fresh={fresh.has(`${it.driveId}::${it.itemId ?? it.id}`)}
                      ownDriveId={ownDriveId}
                      {...rowProps}
                    />
                  ))}
                </FileGroup>
              ))}
              <LoadMore
                hasMore={recent.moreAvailable && !recent.capReached}
                loading={recent.loadingMore}
                onMore={recent.loadMore}
                capLine={
                  recent.capReached ? t("myfiles.results.cap", { count: recent.items.length }) : ""
                }
              />
              <p className="px-1 text-[0.6875rem] text-muted-foreground/80">
                {t("myfiles.notice.indexLag")}
              </p>
            </div>
          </>
        ) : (
          <div className="mt-3">
            <RecentStatus
              recent={recent}
              // Sonuç hangi yenilemeden (`nonce`): eskisiyse yeni deneme yolda — düğme döner.
              retrying={recent.nonce !== nonce}
              oneDriveHref={hrefs.onedrive}
              onConnect={connectFiles}
              onRetry={retry}
            />
          </div>
        )}
      </section>
    </div>
  )
}

/**
 * Listenin çizilemediği hâl, listenin yerinde. "Soramadık ≠ dosya yok": boş
 * liste OneDrive'a yol gösterir; izin yoksa "Bağlan", okuma düştüyse "Tekrar
 * dene" — izin penceresi açmaz (D-1); oturum yoksa basılacak bir şey yok.
 */
function RecentStatus({ recent, retrying, oneDriveHref, onConnect, onRetry }) {
  const { t } = useLocale()
  const { status, httpStatus, code } = recent
  if (status === STATUS.ready)
    return (
      <StateRow
        icon={CloudIcon}
        tone="brand"
        title={t("myfiles.recent.empty")}
        body={t("myfiles.recent.emptyBody")}
        action={t("myfiles.loc.onedrive")}
        to={oneDriveHref}
      />
    )
  if (status === STATUS.denied)
    return (
      <StateRow
        icon={SquareLock02Icon}
        tone="warn"
        title={t("files.permissionTitle")}
        body={t("files.permissionBody")}
        action={t("files.connect")}
        actionTone="connect"
        onAction={onConnect}
      />
    )
  if (status === STATUS.error) {
    const detail = [httpStatus && `HTTP ${httpStatus}`, code].filter(Boolean).join(" · ")
    // 429'da tekrar denemeler de tıkandı: sorun bizde değil, "yoğun, biraz sonra".
    const throttled = httpStatus === 429
    return (
      <StateRow
        tone="warn"
        title={throttled ? t("myfiles.state.throttled") : t("myfiles.state.error")}
        body={throttled ? null : t("files.errorBody")}
        detail={detail ? t("myfiles.state.detail", { detail }) : null}
        action={t("files.retry")}
        actionIcon={RefreshIcon}
        onAction={onRetry}
        busy={retrying}
      />
    )
  }
  if (status === STATUS.unauthenticated) return <StateRow title={t("files.signedOut")} />
  return null
}
