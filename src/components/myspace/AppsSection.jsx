import { useState } from "react"
import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import FavouriteIcon from "@hugeicons/core-free-icons/FavouriteIcon"
import { LauncherCatalog } from "@/components/dashboard/LauncherCatalog"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/** Sayfanın alt bölümlerinin kaşı. */
function Eyebrow({ children, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
      {children}
    </span>
  )
}

/** Uygulamalar — Çözümler'in kataloğu; favori süzgeci ve Keşfet bağlantısıyla. */
export function AppsSection({ onOpenChat, feedOpen, className }) {
  const { t } = useLocale()
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  return (
    <section className={className}>
      <div data-tour="apps" className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>{t("myspace.apps.eyebrow")}</Eyebrow>
          <h2 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.02em]">
            {t("myspace.apps.title")}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={onlyFavorites}
            onClick={() => setOnlyFavorites((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[0.75rem] font-medium transition",
              onlyFavorites
                ? "border-brand/30 bg-brand/[0.08] text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
            )}
          >
            <HugeiconsIcon
              icon={FavouriteIcon}
              className={cn("size-3.5", onlyFavorites && "fill-current text-brand")}
              strokeWidth={2}
            />
            {t("myspace.apps.favorites")}
          </button>
          {feedOpen && (
            <Link
              to="/feed"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-[0.75rem] font-medium text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
            >
              {t("nav.feed")}
              <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" strokeWidth={2} />
            </Link>
          )}
        </div>
      </div>
      <LauncherCatalog onOpenChat={onOpenChat} onlyFavorites={onlyFavorites} id="myspace-apps" />
    </section>
  )
}
