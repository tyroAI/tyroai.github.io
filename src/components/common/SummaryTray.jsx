import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"

/**
 * ÖZET KARTININ BEYAZ TEPSİSİ — Sana özel panosunun tek kartı.
 *
 * Kartın İÇİNDE tek bir beyaz tepsi: üst katta bir sonraki iş (Sıradaki · çare), alt katta
 * üç sayı. Ayrı kutucuklar yerine tek kart: kart tek, gölge tek, kenar tek — sayılar aynı
 * yerde, liste ilk ekranda.
 *
 * ⚠️ **TEPSİ BEYAZ, GRADYAN DEĞİL**: sayılar ve küçük yazılar paletin açık
 * ucuna (Insta'nın sarısı) düşüyordu; düz `bg-card` 17 palette iki temada da
 * okunur — "Sıradaki" kartının eski kuralı tepsinin tamamına yayıldı.
 * ⚠️ **HÜCRE BİR KAPI** (süzgeç, yer ya da hiçbiri): `onClick` → düğme
 * (`aria-pressed` verilebilir), `to` → uygulama içi bağlantı, ikisi de yoksa
 * düz kutu ("soramadık" hâli). İç içe etkileşim YOK.
 * ⚠️ **AÇIKLAMA DAR TEPSİDE GİZLENİR, ADDA DURUR**: 24rem altında hücre ~100 px;
 * "En eskisi 6 ay önce" oraya sığmıyor. Tam cümle `ariaLabel`da.
 * ⚠️ **AD ÜSTTE, DEĞER ALT KENARDA** (`justify-between`): dar tepside iki
 * satıra kırılan bir ad ("Yüksek / önem") o hücrenin sayısını komşularından
 * aşağı itiyordu (390px'te görüldü); artık üç sayı aynı çizgide.
 * ⚠️ Hücreler arası ince çizgi `not-first:before`: hücre değil ÇİZGİ — dokunma
 * hedefini daraltmaz, basılan hücrenin zemini çizginin üstüne biner.
 */
const TRAY =
  "@container/tray relative min-w-0 rounded-[1.125rem] bg-muted/40 text-card-foreground ring-1 ring-foreground/[0.05] dark:bg-muted/25"
const CELL =
  "relative flex min-h-[3.75rem] min-w-0 flex-col justify-between gap-1.5 rounded-[1rem] px-3 py-2 text-left outline-none not-first:before:pointer-events-none not-first:before:absolute not-first:before:inset-y-3 not-first:before:left-0 not-first:before:w-px not-first:before:bg-foreground/[0.07] not-first:before:content-[''] @max-[24rem]/tray:min-h-11 @max-[24rem]/tray:flex-row @max-[24rem]/tray:items-center @max-[24rem]/tray:gap-1 @max-[24rem]/tray:px-1.5 [@media(pointer:coarse)]:min-h-12"
const ACTIVE =
  "group/stat transition hover:bg-foreground/[0.04] hover:before:opacity-0 focus-visible:ring-2 focus-visible:ring-brand/40 aria-pressed:bg-brand/[0.08] aria-pressed:before:opacity-0"
const LABEL_ROW =
  "flex min-w-0 items-center gap-1.5 text-[0.75rem] font-medium leading-tight text-muted-foreground @max-[24rem]/tray:flex-1 @max-[24rem]/tray:gap-1 @max-[24rem]/tray:text-[0.65625rem]"
const VALUE =
  "shrink-0 text-[1.375rem] font-semibold leading-none tracking-[-0.03em] tabular-nums @max-[24rem]/tray:text-[1.125rem]"

/**
 * @param {object} p
 * @param {import("react").ReactNode} [p.top]  bir sonraki iş ya da çare (genişte solda); yoksa yalnız sayılar
 * @param {string} p.label                     sayı grubunun adı (ekran okuyucu)
 */
export function SummaryTray({ top, label, children, className }) {
  return (
    <div className={cn(TRAY, className)}>
      {/* Genişte "Sıradaki" ile sayılar tek satırda: kart kısa kalır, liste ilk ekrana girer. */}
      <div className="@[44rem]/tray:flex @[44rem]/tray:items-stretch">
        {top && <div className="p-1.5 @[44rem]/tray:min-w-0 @[44rem]/tray:flex-1">{top}</div>}
        <div
          role="group"
          aria-label={label}
          className={cn(
            "grid grid-cols-3 p-1.5",
            top &&
              "border-t border-foreground/[0.07] @[44rem]/tray:w-[27rem] @[44rem]/tray:shrink-0 @[44rem]/tray:border-t-0 @[44rem]/tray:border-l",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Tepsinin bir sayısı: üstte glif + ad, altta değer + kısa açıklama.
 */
export function TrayStat({
  id,
  to,
  onClick,
  pressed,
  ariaLabel,
  controls,
  icon,
  tone,
  label,
  value,
  caption,
  warn = false,
  unknown = false,
  className,
}) {
  const body = (
    <>
      <span className={LABEL_ROW}>
        {icon && (
          <HugeiconsIcon
            icon={icon}
            className={cn(
              "size-3.5 shrink-0 @max-[24rem]/tray:hidden",
              tone ?? "text-muted-foreground/60",
            )}
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
        {/* Dar tepside 11px ve iki satıra kadar: 12px'te "Sabitlenmiş" ~110 px'lik
            hücrede "Sabitlenmi / ş" diye kırılıyordu (390px'te görüldü); genişte tek satır. */}
        <span className="min-w-0 hyphens-auto [overflow-wrap:anywhere] line-clamp-2 @[24rem]/tray:truncate">
          {label}
        </span>
      </span>
      <span className="flex min-w-0 items-baseline gap-2">
        <span className={cn(VALUE, unknown && "text-muted-foreground/50")}>{value}</span>
        {caption && (
          <span
            className={cn(
              "min-w-0 truncate text-[0.75rem] leading-tight text-muted-foreground @max-[24rem]/tray:hidden",
              warn && "font-medium text-amber-700 dark:text-amber-400",
            )}
          >
            {caption}
          </span>
        )}
      </span>
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        id={id}
        onClick={onClick}
        aria-pressed={pressed}
        aria-controls={controls}
        aria-label={ariaLabel}
        className={cn(CELL, ACTIVE, className)}
      >
        {body}
      </button>
    )
  }
  if (to) {
    return (
      <Link to={to} id={id} aria-label={ariaLabel} className={cn(CELL, ACTIVE, className)}>
        {body}
      </Link>
    )
  }
  return (
    <div
      id={id}
      aria-label={ariaLabel}
      role={ariaLabel ? "group" : undefined}
      className={cn(CELL, className)}
    >
      {body}
    </div>
  )
}

/** Yüklenirken aynı hücre: ad GERÇEK (yer tutsun), değer ve açıklama ışıklı hayalet. */
export function TrayStatSkeleton({ icon, label }) {
  return (
    <div aria-hidden="true" className={CELL}>
      <span className={LABEL_ROW}>
        {icon && (
          <HugeiconsIcon
            icon={icon}
            className="size-3.5 shrink-0 text-muted-foreground/45 @max-[24rem]/tray:hidden"
            strokeWidth={2}
          />
        )}
        <span className="min-w-0 hyphens-auto [overflow-wrap:anywhere] line-clamp-2 @[24rem]/tray:truncate">
          {label}
        </span>
      </span>
      <span className="flex min-w-0 items-baseline gap-2">
        <span className={cn(VALUE, "relative")}>
          <span className="invisible">0</span>
          <span className="ms-skeleton absolute inset-y-0 left-0 block w-8 rounded-lg" />
        </span>
        <span className="relative min-w-0 flex-1 text-[0.75rem] leading-tight @max-[24rem]/tray:hidden">
          <span className="invisible">&nbsp;</span>
          <span className="ms-skeleton absolute inset-x-0 top-1/2 block h-2.5 max-w-24 -translate-y-1/2 rounded-full" />
        </span>
      </span>
    </div>
  )
}
