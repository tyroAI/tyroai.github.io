import { useRef } from "react"
import { motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import { InlineAction } from "@/components/ui/inline-action"
import { useLocale } from "@/hooks/useLocale"
import { sourceForTag } from "@/lib/feedPolicy"
import { STATUS } from "@/lib/graph"
import { cn } from "@/lib/utils"
import { FEED_SECTIONS, FEED_VIEWS } from "./feedSections"
import { FeedTag } from "./FeedTag"
import { useStickyHeader } from "./timeline/useStickyHeader"

/**
 * Keşfet başlığı: bölüm sekmeleri, arama + yenile, dar ekranda görünüm şeridi ve seçili
 * kanal çipi. Popüler'de yapışkan; telefonda aşağı kaydırınca gizlenir, yukarıda geri
 * gelir. Öteki bölümlerde sabit: Dosyalarım'ın kendi yapışkan arama çubuğu var.
 * Ayrıntı ve kararların geçmişi: `docs/features/kesfet-bolumler.md`.
 */
export function FeedHeader({
  scrollerRef,
  section,
  onSection,
  view,
  onView,
  tag,
  onClearTag,
  showRail,
  important,
  query,
  onQuery,
  busyRefresh,
  onRefresh,
}) {
  const { t, locale } = useLocale()
  const ref = useRef(null)
  const sticky = section === "agenda"
  const hidden = useStickyHeader(scrollerRef, ref, sticky)

  return (
    <header
      ref={ref}
      className={cn(
        "notch-gutter shrink-0",
        // `-top-5`: yapışma kaydırıcının iç payından (`pt-5`) ölçülür; başlık en üste otursun.
        sticky &&
          "sticky -top-5 z-20 pb-2 transition-transform duration-300 ease-out focus-within:translate-y-0 motion-reduce:transition-none",
        // Tam genişlikte buzlu zemin: içerik hizası (ve çentik oluğu) bozulmasın diye kutu değil, katman genişler.
        sticky &&
          "before:absolute before:inset-y-0 before:-inset-x-4 before:-z-10 before:bg-background/95 before:backdrop-blur sm:before:-inset-x-6",
        hidden && "-translate-y-full @[64rem]/feed:translate-y-0",
      )}
    >
      <h1 className="sr-only">{t("feed.title")}</h1>
      {/* Çizgi satırın kendisinde; sekmeler `-mb-px` ile üstüne oturur. `items-end`: arama
          hapı sekmelerden yüksek, ikisi tabandan hizalanır. */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-border">
        <div
          role="tablist"
          aria-label={t("feed.section.aria")}
          className="-mb-px flex min-w-0 items-stretch gap-0.5 @[34rem]/feed:gap-2"
        >
          {FEED_SECTIONS.map((sec) => {
            const on = section === sec.id
            return (
              <button
                key={sec.id}
                type="button"
                role="tab"
                id={`feed-sec-${sec.id}`}
                aria-selected={on}
                aria-controls={`feed-panel-${sec.id}`}
                onClick={() => onSection(sec.id)}
                lang={locale}
                className={cn(
                  "relative -mb-px flex min-w-0 items-center gap-1.5 px-2 pb-2.5 pt-1 text-[0.9375rem] font-semibold tracking-[-0.01em] transition @[34rem]/feed:px-3",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-11",
                  on ? "text-brand" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <HugeiconsIcon
                  icon={sec.icon}
                  className="size-4 shrink-0 @max-[22rem]/feed:hidden"
                  strokeWidth={1.9}
                />
                <span className="truncate">{t(sec.labelKey)}</span>
                {sec.id === "important" &&
                  important.status === STATUS.ready &&
                  important.items.length > 0 && (
                    <span className="rounded-full bg-brand/[0.1] px-1.5 text-[0.6875rem] font-semibold tabular-nums text-brand-ink">
                      {important.items.length}
                      {Object.values(important.capped ?? {}).some(Boolean) ? "+" : ""}
                    </span>
                  )}
                {on && (
                  <motion.span
                    layoutId="feed-section-line"
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-[3px] rounded-full bg-brand @[34rem]/feed:inset-x-3"
                  />
                )}
              </button>
            )
          })}
        </div>
        {/* Arama ve yenile yalnız akışı süzer/tazeler: Dosyalarım'da yok, dar ekranda
            Tebrikler/Trendler açıkken gizli. Geniş ekranda blok rayın genişliğinde. */}
        <div
          className={cn(
            "mb-2 flex w-full items-center gap-2 @[34rem]/feed:w-[20rem]",
            showRail && "@[64rem]/feed:w-[17rem]",
            section === "agenda" && view !== "agenda" && "@max-[64rem]/feed:hidden",
            section === "docs" && "hidden",
          )}
        >
          <label className="relative flex min-w-0 flex-1 items-center">
            <HugeiconsIcon
              icon={Search01Icon}
              className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
              strokeWidth={1.8}
            />
            <span className="sr-only">{t("feed.searchAria")}</span>
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={t("feed.searchPlaceholder")}
              className="no-ios-zoom h-9 w-full min-w-0 rounded-full border border-border bg-muted/40 pl-9 pr-3 text-[0.8125rem] outline-none transition placeholder:text-muted-foreground/70 focus-visible:border-brand/40 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-brand/25 [@media(pointer:coarse)]:h-11"
            />
          </label>
          <InlineAction
            icon={RefreshIcon}
            label={t("feed.refresh")}
            busyLabel={t("feed.refreshing")}
            doneLabel={t("feed.refreshDone")}
            busy={busyRefresh}
            onAction={onRefresh}
          />
        </div>
      </div>

      {/* Görünüm şeridi: gömülü iz + yüzen etkin düğme (bölüm sekmelerinden ayrı giysi).
          Uzun etiket kırpılmaz, iki satıra sarar. */}
      <div
        role="group"
        aria-label={t("feed.view.aria")}
        className={cn(
          "mt-3 flex items-stretch gap-0.5 rounded-full border border-border bg-muted/50 p-0.5 @[64rem]/feed:hidden",
          section !== "agenda" && "hidden",
        )}
      >
        {FEED_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onView(v.id)}
            aria-pressed={view === v.id}
            lang={locale}
            className={cn(
              "min-w-0 flex-1 line-clamp-2 rounded-full px-2.5 py-1.5 text-center text-[0.75rem] font-medium leading-tight [overflow-wrap:anywhere] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-9",
              view === v.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(v.labelKey)}
          </button>
        ))}
      </div>

      {/* Dar ekranda seçili kanal tek çiple yazılır: yatay kaydırma yok, süzgeç sessiz kalmaz. */}
      {tag && section === "agenda" && (
        <div className="mt-3 flex items-center gap-2 @[64rem]/feed:hidden">
          <FeedTag
            tag={tag}
            accent={sourceForTag(tag)?.accent}
            className="px-3 py-1 text-[0.75rem]"
          />
          <button
            type="button"
            onClick={onClearTag}
            className="rounded-full border border-border bg-card px-3 py-1 text-[0.75rem] font-medium text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-9"
          >
            {t("feed.clearFilter")}
          </button>
        </div>
      )}
    </header>
  )
}
