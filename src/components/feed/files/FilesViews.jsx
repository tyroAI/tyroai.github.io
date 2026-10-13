import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import Folder01Icon from "@hugeicons/core-free-icons/Folder01Icon"
import Image01Icon from "@hugeicons/core-free-icons/Image01Icon"
import JusticeScale01Icon from "@hugeicons/core-free-icons/JusticeScale01Icon"
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon"
import Loading03Icon from "@hugeicons/core-free-icons/Loading03Icon"
import Structure01Icon from "@hugeicons/core-free-icons/Structure01Icon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
import { SkelLine } from "@/components/common/bento"
import { useLocale } from "@/hooks/useLocale"
import { pluralKey } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"

/**
 * Dosyalarım'ın sunum parçaları — veri ve karar `FeedFiles.jsx`te.
 *
 * ⚠️ Kurumsal adlar kaynağın yazımıyla (`lang="tr"`), kişinin dosya adları
 * `lang`sız: Türkçe olduğunu bilmiyoruz.
 *
 * ⚠️ **İKİNCİ TUR (2026-10-01, pano):** gezinilecek yerler (klasör, kitaplık,
 * site, ekip, şirket, görsel klasörü) artık SATIR değil KUTUCUK
 * (`TileGroup` + `PlaceTile`): açılacak şeyler (dosyalar) satır, gidilecek
 * yerler kutucuk — iki tür bir bakışta ayrışıyor. Konum başlığı
 * (`PlaceHeader`) HER yerde çiziliyor, şeritten gelinen SharePoint ve Şirket
 * köklerinde de (D-14: eskiden orada başlık yoktu).
 */

export function SectionTitle({ children, count, hint, action }) {
  const { locale } = useLocale()
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-1 pb-2">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h3
          lang={locale}
          className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
        >
          {children}
          {count != null && (
            <span className="ml-2 font-medium tabular-nums opacity-70">{count}</span>
          )}
        </h3>
        {hint && <p className="text-[0.75rem] text-muted-foreground/80">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

/** Konum yolu (kırıntılar + üst klasör). Mantık `FeedFiles`te; burada yalnız çizim. */
function Crumbs({ crumbs, upHref }) {
  const { t } = useLocale()
  if (!upHref && !crumbs.length) return null
  return (
    <nav
      aria-label={t("myfiles.loc.aria")}
      className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[0.75rem] text-muted-foreground"
    >
      {upHref && (
        <Link
          to={upHref}
          aria-label={t("myfiles.loc.up")}
          title={t("myfiles.loc.up")}
          className="-ml-1 mr-0.5 grid size-7 shrink-0 place-items-center rounded-full transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:size-10"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" strokeWidth={2.2} />
        </Link>
      )}
      {crumbs.map((c, i) => (
        <span key={`${c.href ?? "x"}-${i}`} className="inline-flex min-w-0 items-center gap-1">
          {i > 0 && (
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className="size-3 shrink-0 opacity-50"
              strokeWidth={2}
              aria-hidden="true"
            />
          )}
          {c.href ? (
            <Link
              to={c.href}
              lang={c.lang}
              className="max-w-[14rem] truncate rounded px-0.5 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-9 [@media(pointer:coarse)]:leading-9"
            >
              {c.label}
            </Link>
          ) : (
            <span lang={c.lang} className="max-w-[14rem] truncate px-0.5">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

/**
 * KONUM BAŞLIĞI — kırıntılar · "bulunduğun yer" kutusu (48px glif) · ad ·
 * özet satırı ("7 klasör · 6 dosya · son değişiklik 2 saat önce") · OneDrive
 * kökünde kota ölçeri · sıralama · "…'da aç".
 * Başlık `tabIndex={-1}`: bir yere girilince odak buraya iner ve ekran okuyucu
 * nereye gelindiğini duyar.
 */
export function PlaceHeader({
  title,
  titleLang,
  crumbs = [],
  upHref,
  glyph = Folder01Icon,
  facts,
  factsLoading,
  quota,
  sortMenu,
  openUrl,
  openLabel,
  titleRef,
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Crumbs crumbs={crumbs} upHref={upHref} />
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 @[34rem]/files:grid-cols-[auto_minmax(0,1fr)_auto]">
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/[0.08] text-brand-ink"
        >
          <HugeiconsIcon icon={glyph} className="size-6" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 self-center">
          <h2
            ref={titleRef}
            tabIndex={-1}
            lang={titleLang}
            className="text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] outline-none [overflow-wrap:anywhere]"
          >
            {title}
          </h2>
          {factsLoading ? (
            <SkelLine text="mt-0.5 text-[0.8125rem] leading-snug" width="w-48" />
          ) : facts ? (
            <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted-foreground">{facts}</p>
          ) : null}
          {quota && (
            <div className="mt-2 max-w-xs">
              <span
                aria-hidden="true"
                className="block h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]"
              >
                {quota.used > 0 && (
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      quota.tone === "full"
                        ? "bg-rose-500"
                        : quota.tone === "nearing"
                          ? "bg-amber-500"
                          : "bg-gradient-to-r from-brand-from via-brand-via to-brand-to",
                    )}
                    style={{ width: `${Math.max(quota.pct * 100, 3)}%` }}
                  />
                )}
              </span>
              <p className="mt-1 text-[0.75rem] tabular-nums text-muted-foreground">{quota.text}</p>
            </div>
          )}
        </div>
        {(sortMenu || openUrl) && (
          <div className="col-start-2 flex flex-wrap items-center gap-2 @[34rem]/files:col-start-3 @[34rem]/files:row-start-1 @[34rem]/files:self-center">
            {sortMenu}
            {openUrl && (
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 text-[0.75rem] font-medium text-muted-foreground transition hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:h-10"
              >
                <span className="hidden @[30rem]/files:inline">{openLabel}</span>
                <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" strokeWidth={2} />
                <span className="sr-only @[30rem]/files:hidden">{openLabel}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Arama başlığı: ne arandı, nerede, kaç sonuç + "tüm dosyalarında ara" + sıralama. */
export function ResultsHeader({ title, summary, onWiden, titleRef, sortMenu }) {
  const { t } = useLocale()
  return (
    <div className="flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2
          ref={titleRef}
          tabIndex={-1}
          className="text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] outline-none"
        >
          {title}
        </h2>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-foreground">
          {summary && <span>{summary}</span>}
          {onWiden && (
            <button
              type="button"
              onClick={onWiden}
              className="font-semibold text-brand-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-9"
            >
              {t("myfiles.results.everywhereAction")}
            </button>
          )}
        </p>
      </div>
      {sortMenu}
    </div>
  )
}

/* ─────────── Kutucuklar: gidilecek yerler ─────────── */

/** Kutucuk grubu — FileGroup'un başlığı, satır kabuğu yerine ızgara. */
export function TileGroup({ label, count, children, className }) {
  const { locale } = useLocale()
  return (
    <section className={cn("min-w-0", className)}>
      {label && (
        <h3
          lang={locale}
          className="flex items-center gap-2 px-3 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
        >
          <span>{label}</span>
          {count != null && <span className="font-medium tabular-nums opacity-70">{count}</span>}
        </h3>
      )}
      <ul className="grid grid-cols-2 gap-2 @[34rem]/files:grid-cols-3 @[52rem]/files:grid-cols-4">
        {children}
      </ul>
    </section>
  )
}

const TILE =
  "ms-surface flex h-full min-h-[4.5rem] w-full min-w-0 items-start gap-3 rounded-2xl p-3.5 text-left outline-none transition group-hover/tile:shadow-md focus-visible:ring-2 focus-visible:ring-brand/40"
const TILE_CHIP =
  "grid size-10 shrink-0 place-items-center rounded-xl bg-foreground/[0.05] text-foreground/65 transition group-hover/tile:bg-brand/[0.08] group-hover/tile:text-brand-ink"

/**
 * Gidilecek bir yer: klasör, kitaplık, site, şirket, görsel klasörü. Kutucuk
 * bir `<Link>` (gezinme geçmişe yazılır, orta tuş yeni sekme); ⋯ KARDEŞ
 * (iç içe düğme yok — satırın kuralı), sağ üstte.
 * ⚠️ Kaldırma `li`de: kutucuk ve ⋯ BİRLİKTE kalksın, ⋯ yerinde kalıp
 * kutucuktan ayrışmasın.
 */
export function PlaceTile({
  item,
  href,
  onNavigate,
  glyph = Folder01Icon,
  meta,
  lang,
  menu,
  wide = false,
}) {
  return (
    <li
      className={cn(
        "group/tile relative min-w-0 transition motion-safe:hover:-translate-y-0.5",
        wide && "col-span-full",
      )}
    >
      <Link to={href} onClick={() => onNavigate?.(item)} className={cn(TILE, menu && "pr-11")}>
        <span className={TILE_CHIP}>
          <HugeiconsIcon icon={glyph} className="size-5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1 pt-0.5">
          <span
            lang={lang}
            className="line-clamp-2 text-[0.875rem] font-medium leading-snug text-foreground [overflow-wrap:anywhere]"
          >
            {item.name}
          </span>
          {meta && (
            <span className="mt-0.5 block truncate text-[0.75rem] text-muted-foreground">
              {meta}
            </span>
          )}
        </span>
      </Link>
      {menu && <div className="absolute right-1.5 top-1.5 z-10">{menu}</div>}
    </li>
  )
}

/** Ekip: adresi yok (kitaplık tıklayınca çözülür) → düğme; ⋯ yok, çözülürken döner. */
export function TeamTile({ item, pending, onOpenGroup }) {
  return (
    <li className="group/tile relative min-w-0 transition motion-safe:hover:-translate-y-0.5">
      <button
        type="button"
        onClick={() => !pending && onOpenGroup?.(item)}
        aria-busy={pending || undefined}
        className={cn(TILE, pending && "cursor-progress")}
      >
        <span className={TILE_CHIP}>
          <HugeiconsIcon
            icon={pending ? Loading03Icon : UserGroupIcon}
            className={cn("size-5", pending && "animate-spin motion-reduce:animate-none")}
            strokeWidth={1.8}
          />
        </span>
        <span className="min-w-0 flex-1 pt-0.5">
          <span className="line-clamp-2 text-[0.875rem] font-medium leading-snug text-foreground [overflow-wrap:anywhere]">
            {item.name}
          </span>
          {item.subtitle && (
            <span className="mt-0.5 block truncate text-[0.75rem] text-muted-foreground">
              {item.subtitle}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

/** Şirket kökü: üç koleksiyon kartı. Adlar sözlükten (çevriliyor) — `lang` yok. */
export function DoorCards({ hrefs, counts }) {
  const { t, locale } = useLocale()
  const cards = [
    {
      href: hrefs.policy,
      icon: JusticeScale01Icon,
      title: t("docs.policy.title"),
      desc: t("docs.policy.subtitle"),
      meta: t(pluralKey("myfiles.row.companies", locale, counts.policies), {
        count: counts.policies,
      }),
    },
    {
      href: hrefs.cdn,
      icon: Image01Icon,
      title: t("docs.corporate.title"),
      desc: t("docs.corporate.subtitle"),
      meta: t(pluralKey("myfiles.row.images", locale, counts.images), { count: counts.images }),
    },
    {
      external: hrefs.org,
      icon: Structure01Icon,
      title: t("docs.org.title"),
      desc: t("docs.org.subtitle"),
      meta: t("myfiles.row.opensExternal"),
    },
  ]
  return (
    <ul className="grid gap-3 @[42rem]/files:grid-cols-3">
      {cards.map((c) => {
        const inner = (
          <>
            <span className={TILE_CHIP}>
              <HugeiconsIcon icon={c.icon} className="size-5" strokeWidth={1.8} />
            </span>
            <span className="mt-2 flex items-center gap-1 text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em]">
              <span className="line-clamp-2">{c.title}</span>
              <HugeiconsIcon
                icon={c.external ? LinkSquare02Icon : ArrowRight01Icon}
                className="size-3.5 shrink-0 text-muted-foreground/60"
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>
            <span className="line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground">
              {c.desc}
            </span>
            <span className="mt-auto pt-3 text-[0.9375rem] font-medium tabular-nums text-foreground/80">
              {c.meta}
            </span>
          </>
        )
        const cls =
          "ms-surface flex h-full min-h-[11rem] min-w-0 flex-col gap-1 rounded-[1.75rem] p-5 outline-none transition group-hover/tile:shadow-md focus-visible:ring-2 focus-visible:ring-brand/40"
        return (
          <li
            key={c.title}
            className="group/tile min-w-0 transition motion-safe:hover:-translate-y-0.5"
          >
            {c.external ? (
              <a href={c.external} target="_blank" rel="noopener noreferrer" className={cls}>
                {inner}
              </a>
            ) : (
              <Link to={c.href} className={cls}>
                {inner}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Kurumsal görsel klasörü: 4:3 kutucuklar, tıklayınca ışık kutusu. */
export function CdnGrid({ items, onOpen }) {
  return (
    <ul className="grid grid-cols-2 gap-2 @[30rem]/files:grid-cols-3 @[48rem]/files:grid-cols-4">
      {items.map((it) => (
        <li key={it.id} className="min-w-0">
          <button
            type="button"
            onClick={() => onOpen(it)}
            aria-haspopup="dialog"
            className="ms-surface group/tile block w-full overflow-hidden rounded-2xl text-left transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <span className="block aspect-[4/3] w-full overflow-hidden bg-muted">
              <img
                src={it.thumbUrl}
                alt={it.name}
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition duration-300 group-hover/tile:scale-[1.03] motion-reduce:transition-none"
              />
            </span>
            <span
              lang="tr"
              className="block line-clamp-2 px-2.5 py-2 text-[0.6875rem] leading-snug text-muted-foreground"
            >
              {it.name}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function LoadMore({ hasMore, loading, onMore, capLine, endLine }) {
  const { t } = useLocale()
  if (hasMore) {
    return (
      <button
        type="button"
        onClick={onMore}
        aria-busy={loading || undefined}
        className="mx-auto mt-1 w-fit rounded-full border border-border bg-card px-4 py-2 text-[0.78125rem] font-medium text-foreground transition hover:bg-accent/60 aria-busy:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-11"
      >
        {loading ? t("files.loadingMore") : t("files.loadMore")}
      </button>
    )
  }
  const line = capLine || endLine
  return line ? (
    <p className="px-1 pt-1 text-center text-[0.75rem] text-muted-foreground">{line}</p>
  ) : null
}
