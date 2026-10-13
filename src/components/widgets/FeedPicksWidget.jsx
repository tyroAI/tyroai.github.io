import { Link } from "react-router-dom"
import AiArtIcon from "@hugeicons/core-free-icons/AiArtIcon"
import { useLocale } from "@/hooks/useLocale"
import { ago } from "./format"
import { WidgetEmpty } from "./WidgetEmpty"
import { FrameAction, WidgetFrame } from "./WidgetFrame"

/**
 * Keşfet'ten sana özel — son ziyaretinden beri gelen iş bildirimlerinin en
 * yenileri (sidebar rozetinin aynı sorgusu, `useFeedFresh`); satır Keşfet'te
 * o bildirimi açar.
 */
export function FeedPicksWidget({ ctx, className }) {
  const { feedFresh, pageAccess } = ctx
  const { t, locale } = useLocale()
  if (!pageAccess.feed) return null
  const items = feedFresh.items ?? []
  return (
    <WidgetFrame
      id="feed-picks"
      title={t("widgets.feed.title")}
      icon={AiArtIcon}
      className={className}
      action={<FrameAction to="/feed">{t("widgets.feed.all")}</FrameAction>}
    >
      {items.length ? (
        <>
          <p className="mt-1 text-[0.75rem] text-muted-foreground">
            {t("widgets.feed.count", { n: feedFresh.count ?? items.length })}
          </p>
          <ul className="mt-2">
            {items.map((x) => (
              <li key={x.id}>
                <Link
                  to={`/feed?post=${encodeURIComponent(x.id)}`}
                  className="-mx-2 block rounded-xl px-2 py-2 transition hover:bg-accent/60"
                >
                  <span className="block truncate text-[0.8125rem] font-medium">{x.subject}</span>
                  <span className="block truncate text-[0.6875rem] text-muted-foreground">
                    {[x.tag, x.author, ago(x.received ? new Date(x.received) : null, locale)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <WidgetEmpty icon={AiArtIcon}>{t("widgets.feed.none")}</WidgetEmpty>
      )}
    </WidgetFrame>
  )
}
