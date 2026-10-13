import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * Dosyalarım'ın durum yüzeyleri — Keşfet'in kendi reçeteleri (StateCard,
 * durum satırı, kesik çerçeveli boş kart, kehribar not), yeni bir dil DEĞİL;
 * kabuk panonunki (`.ms-surface`, 24px köşe), To-Do'nun durum kartlarının aynısı.
 *
 * ⚠️ "Soramadık ≠ dosya yok": izin/hata/oturum kartı ile BOŞ kart ayrı
 * bileşenler; birini ötekinin yerine koymak bu deponun kaçındığı hata sınıfı.
 *
 * ⚠️ **İKİ EYLEM TONU** (`actionTone`): `connect` (izin iste — dolu marka
 * düğmesi, çünkü çözüm kullanıcıda) ve `retry` (tekrar dene — çerçeveli,
 * çünkü sorun sunucuda). "Tekrar dene" bir izin penceresi AÇMAZ (D-1).
 */
const ACTION = {
  connect:
    "rounded-full bg-brand-fill-deep px-4 py-2 text-[0.8125rem] font-semibold text-brand-on-brand shadow-sm transition hover:brightness-110",
  retry:
    "rounded-full border border-border bg-card px-4 py-2 text-[0.8125rem] font-medium text-foreground/85 transition hover:bg-accent hover:text-foreground",
}

export function StateCard({
  icon = Alert02Icon,
  title,
  body,
  detail,
  action,
  onAction,
  actionTone = "retry",
  secondary,
}) {
  return (
    <div className="ms-surface rounded-[1.5rem] px-6 py-12 text-center" role="status">
      {icon && (
        <HugeiconsIcon
          icon={icon}
          className="mx-auto mb-3 size-8 text-muted-foreground/40"
          strokeWidth={1.5}
        />
      )}
      <p className="text-[0.9375rem] font-medium text-foreground/90">{title}</p>
      {body && (
        <p className="mx-auto mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
      {detail && (
        <p className="mx-auto mt-1.5 max-w-sm text-[0.6875rem] tabular-nums text-muted-foreground [overflow-wrap:anywhere]">
          {detail}
        </p>
      )}
      {(action || secondary) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <button
              type="button"
              onClick={onAction}
              className={cn(
                ACTION[actionTone] ?? ACTION.retry,
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-11",
              )}
            >
              {action}
            </button>
          )}
          {secondary}
        </div>
      )}
    </div>
  )
}

/** Durum satırının glif kutusu: `warn` bir sorun, `brand` gidilecek yer, `muted` bilgi. */
const GLYPH = {
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  brand: "bg-brand/[0.1] text-brand-ink",
  muted: "bg-muted text-muted-foreground",
}

/**
 * Listenin YERİNDE tek satır durum (açılışın boş · izin · hata · oturum hâli).
 * Kart değil, satır boyunda: listenin kabuğu, 44px glif, başlık + açıklama —
 * sebep ve çare ilk ekranda, pano sakin kalır. Eylem yazısıyla görünür
 * ("Bağlan", "Tekrar dene"), tonu `StateCard`ınki; `to` uygulama içi bir YER
 * açar (push), `onAction` düğmedir. Dar kapsayıcıda eylem metnin altına iner.
 */
export function StateRow({
  icon = Alert02Icon,
  tone = "muted",
  title,
  body,
  detail,
  action,
  actionIcon = ArrowRight01Icon,
  actionTone = "retry",
  onAction,
  to,
  busy = false,
}) {
  const pill = cn(
    ACTION[actionTone] ?? ACTION.retry,
    "inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-11",
  )
  const glyph = (
    <HugeiconsIcon
      icon={actionIcon}
      aria-hidden="true"
      className={cn("size-4 shrink-0", busy && "animate-spin motion-reduce:animate-none")}
      strokeWidth={2.2}
    />
  )
  return (
    <div role="status" className="ms-surface rounded-[1.5rem] p-1.5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 px-3 py-2.5 @[34rem]/files:grid-cols-[auto_minmax(0,1fr)_auto]">
        <span
          aria-hidden="true"
          className={cn("grid size-11 place-items-center rounded-xl", GLYPH[tone] ?? GLYPH.muted)}
        >
          <HugeiconsIcon icon={icon} className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-[0.875rem] font-semibold leading-snug text-foreground/90">{title}</p>
          {body && (
            <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted-foreground">{body}</p>
          )}
          {/* 11px ayrıntı soluk DEĞİL: `/70` axe'in 4,5:1 kontrastından düşüyordu. */}
          {detail && (
            <p className="mt-0.5 text-[0.6875rem] tabular-nums text-muted-foreground [overflow-wrap:anywhere]">
              {detail}
            </p>
          )}
        </div>
        {action && (
          <div className="col-start-2 @[34rem]/files:col-start-3 @[34rem]/files:row-start-1">
            {to ? (
              <Link to={to} className={pill}>
                {action}
                {glyph}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => !busy && onAction?.()}
                aria-busy={busy || undefined}
                className={pill}
              >
                {action}
                {glyph}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function EmptyCard({ title, body, children, className }) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
      role="status"
    >
      <p className="text-[0.9375rem] font-medium text-foreground/85">{title}</p>
      {body && (
        <p className="mx-auto mt-1.5 max-w-md text-[0.8125rem] leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
      {children && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>
      )}
    </div>
  )
}

/** Kısmi sonuç (kehribar) ya da kapsam notu (soluk) — listenin üstünde. */
export function Notice({ tone = "muted", children, action, onAction }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3.5 py-2.5 text-[0.75rem] leading-snug",
        tone === "warn"
          ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
          : "bg-muted/60 text-muted-foreground",
      )}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 font-semibold underline-offset-2 hover:underline [@media(pointer:coarse)]:min-h-9"
        >
          {action}
        </button>
      )}
    </div>
  )
}

/**
 * Satır iskeleti — GERÇEK satırın biçiminde (44px rozet + iki satır), yüklenince
 * liste zıplamasın. Satır kutuları gerçek yazı sınıflarıyla ayrılıyor
 * (görünmez boşluk + ortada çubuk), çıplak `h-3` çubuk değil.
 * Genişlikler sabit bir dizi: rastgelelik her çizimde başka bir iskelet demekti.
 * `withLocation` eski çağrılar için kabul ediliyor: konum artık meta satırında.
 */
const NAME_W = [
  "w-[62%]",
  "w-[48%]",
  "w-[70%]",
  "w-[54%]",
  "w-[66%]",
  "w-[44%]",
  "w-[58%]",
  "w-[50%]",
]
function GhostLine({ text, width }) {
  return (
    <span aria-hidden="true" className={cn("relative block", text, width)}>
      <span className="invisible">&nbsp;</span>
      <span className="ms-skeleton absolute inset-x-0 top-1/2 block h-3 -translate-y-1/2 rounded-full" />
    </span>
  )
}
export function RowsSkeleton({ rows = 6 }) {
  return (
    <ul aria-hidden="true" className="ms-surface rounded-[1.5rem] p-1.5">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-start gap-3 rounded-[1.125rem] px-3 py-2.5">
          <span className="ms-skeleton size-11 shrink-0 rounded-xl" />
          <span className="min-w-0 flex-1">
            <GhostLine text="text-[0.875rem] leading-snug" width={NAME_W[i % NAME_W.length]} />
            <span className="mt-0.5 block">
              <GhostLine text="text-[0.75rem] leading-4" width="w-[44%]" />
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function PillsSkeleton({ count = 4, className }) {
  return (
    <div aria-hidden="true" className={cn("flex flex-wrap gap-1.5", className)}>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            "ms-skeleton block h-8 rounded-full",
            ["w-28", "w-24", "w-32", "w-20"][i % 4],
          )}
        />
      ))}
    </div>
  )
}

/** Sık klasörlerin çip satırı yüklenirken — gerçek çiplerin boyunda (dokunmatikte 44px). */
export function FolderChipsSkeleton({ lead }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-1.5 overflow-hidden">
      {lead && (
        <span className="mr-1 shrink-0 text-[0.8125rem] font-medium text-muted-foreground">
          {lead}
        </span>
      )}
      {["w-28", "w-24", "w-32", "w-20"].map((w) => (
        <span
          key={w}
          className={cn(
            "ms-skeleton block h-8 shrink-0 rounded-full [@media(pointer:coarse)]:h-11",
            w,
          )}
        />
      ))}
    </div>
  )
}

/**
 * Parça inene kadar (`Suspense`) çizilen pano — `FeedPage` onu dışarıda,
 * `FeedFiles`in kapsayıcısı DOĞMADAN çiziyor; bu yüzden kendi
 * `@container/files`ını taşıyor. Arama satırı + şerit aynı yerde, altında
 * açılışta `FilesHome`in yükleme hâli (klasör çipleri + son dosyalar), başka
 * görünümde satırlar — parça inince pano zıplamasın.
 */
export function FilesSkeleton({ home = true }) {
  const { t } = useLocale()
  return (
    <div className="@container/files flex min-w-0 flex-col gap-5">
      <p role="status" className="sr-only">
        {t("myfiles.loading")}
      </p>
      <div aria-hidden="true" className="flex min-w-0 flex-col gap-2.5">
        <div className="flex items-center gap-2 py-1.5">
          <span className="ms-skeleton block h-12 min-w-0 flex-1 rounded-full" />
          <span className="ms-skeleton block size-12 shrink-0 rounded-full @[34rem]/files:hidden" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="ms-skeleton block h-9 w-full rounded-full pointer-coarse:h-12 @[34rem]/files:w-80" />
          <PillsSkeleton count={3} className="hidden @[34rem]/files:flex" />
        </div>
      </div>
      {home ? (
        <div aria-hidden="true" className="flex min-w-0 flex-col gap-8">
          <FolderChipsSkeleton lead={t("myfiles.home.folders")} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[1.25rem] font-semibold tracking-[-0.02em] @[34rem]/files:text-[1.375rem]">
                {t("myfiles.recent.title")}
              </p>
              <p className="text-[0.8125rem] text-muted-foreground">
                {t("myfiles.recent.subtitle")}
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-5">
              <PillsSkeleton count={4} />
              <RowsSkeleton rows={6} />
            </div>
          </div>
        </div>
      ) : (
        <RowsSkeleton rows={6} />
      )}
    </div>
  )
}
