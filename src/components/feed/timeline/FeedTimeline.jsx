import { Fragment, useState } from "react"
import AiArtIcon from "@hugeicons/core-free-icons/AiArtIcon"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocale } from "@/hooks/useLocale"
import { readFeedSeen, seenDividerIndex } from "@/lib/feedSeen"
import { STATUS } from "@/lib/graph"
import { FeedPostCard } from "../FeedPostCard"
import { FeedStateCard } from "./FeedStateCard"
import { useAutoLoad } from "./useAutoLoad"

/** Satırla aynı ölçüde iskelet: avatar · iki satır · özet — yükleme bitince zıplama olmaz. */
function TimelineSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="ms-surface divide-y divide-border/60 overflow-hidden rounded-[1.5rem]"
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3.5">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Akış zaman çizgisi (Keşfet › Akış): durumlar, Twitter tarzı satırlar (tek yüzey, ince
 * ayraç), "Buradan sonrasını görmüştün" ayracı ve sonsuz akış (gözcü + yedek düğme).
 */
export function FeedTimeline({
  status,
  posts,
  total,
  hold,
  importantLoading,
  photoFor,
  now,
  scrollerRef,
  onOpen,
  hasMore,
  loadingMore,
  loadError,
  loadMore,
  pages,
  maxPages,
  onConnect,
  onRefresh,
}) {
  const { t } = useLocale()
  // Damga açılışta ileri çekilir: ayraç için ilk çizimdeki değer tutulur.
  const [seenAtOpen] = useState(readFeedSeen)
  const ready = status === STATUS.ready
  const sentinel = useAutoLoad({
    enabled: ready && hasMore && !hold && !loadingMore && !loadError,
    onLoad: loadMore,
    root: scrollerRef,
  })
  const divider = seenDividerIndex(posts, seenAtOpen)

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {status === "loading" || loadingMore
          ? t("feed.loadingMore")
          : ready
            ? t("feed.countAnnounce", { count: posts.length })
            : ""}
      </p>
      {(status === "loading" || hold) && <TimelineSkeleton />}

      {status === STATUS.denied && (
        <FeedStateCard
          icon={Alert02Icon}
          title={t("feed.denied")}
          body={t("feed.deniedBody")}
          action={t("feed.connect")}
          onAction={onConnect}
        />
      )}
      {status === STATUS.error && (
        <FeedStateCard
          icon={Alert02Icon}
          title={t("feed.error")}
          body={t("feed.errorBody")}
          action={t("feed.retry")}
          onAction={onRefresh}
        />
      )}
      {status === STATUS.unauthenticated && (
        <FeedStateCard
          icon={Alert02Icon}
          title={t("feed.signedOut")}
          body={t("feed.signedOutBody")}
        />
      )}
      {ready && !total && !importantLoading && (
        <FeedStateCard icon={AiArtIcon} title={t("feed.empty")} body={t("feed.emptyBody")} />
      )}
      {ready && !hold && Boolean(total) && !posts.length && (
        // Arama yalnız YÜKLENMİŞ gönderilerde: bunu söylemek zorunda, yoksa "böyle bir
        // duyuru yok" demiş olurdu.
        <FeedStateCard
          icon={Search01Icon}
          title={t("feed.searchEmpty")}
          body={t("feed.searchScope", { count: total })}
        />
      )}

      {!hold && posts.length > 0 && (
        <div className="ms-surface divide-y divide-border/60 overflow-hidden rounded-[1.5rem]">
          {posts.map((post, i) => (
            <Fragment key={post.id}>
              {i === divider && (
                <div className="flex items-center gap-3 border-b-0 px-4 py-2 text-[0.6875rem] font-medium text-brand-ink">
                  <span aria-hidden="true" className="h-px flex-1 bg-brand/30" />
                  {t("feed.seenUpTo")}
                  <span aria-hidden="true" className="h-px flex-1 bg-brand/30" />
                </div>
              )}
              <FeedPostCard
                post={post}
                photo={photoFor(post.address)}
                now={now}
                scrollRoot={scrollerRef}
                onOpen={onOpen}
              />
            </Fragment>
          ))}
        </div>
      )}

      <div ref={sentinel} aria-hidden="true" className="h-px" />
      {ready && hasMore && !hold && (
        // `disabled` değil `aria-busy`: disabled düğme odağı kaybettirir (klavyeyle sayfalayan
        // kişi listenin başına dönerdi). Tekrar tıklama `loadMore` içinde engelli.
        <button
          type="button"
          onClick={loadMore}
          aria-busy={loadingMore}
          className="mx-auto w-fit rounded-lg border border-border bg-card px-4 py-2 text-[0.78125rem] font-medium text-foreground transition hover:bg-accent/60 aria-busy:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:min-h-11"
        >
          {loadingMore ? t("feed.loadingMore") : t("feed.more")}
        </button>
      )}
      {loadError && (
        <p className="py-1 text-center text-[0.75rem] text-muted-foreground">
          {loadError === STATUS.denied ? t("feed.deniedBody") : t("feed.errorBody")}
        </p>
      )}
      {ready && !hold && !hasMore && pages >= maxPages && (
        <p className="py-2 text-center text-[0.75rem] text-muted-foreground">
          {t("feed.capReached")}
        </p>
      )}
      {ready && !hold && !hasMore && pages > 0 && pages < maxPages && posts.length > 0 && (
        <p className="py-2 text-center text-[0.75rem] text-muted-foreground">{t("feed.end")}</p>
      )}
    </>
  )
}
