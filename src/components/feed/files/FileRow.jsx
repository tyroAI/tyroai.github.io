import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import Loading03Icon from "@hugeicons/core-free-icons/Loading03Icon"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import FolderOpenIcon from "@hugeicons/core-free-icons/FolderOpenIcon"
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon"
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import ViewIcon from "@hugeicons/core-free-icons/ViewIcon"
import { FileBadge } from "@/components/common/FileBadge"
import { FileAssistMenu } from "@/components/common/FileAssistMenu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/useLocale"
import { isOwnDrive, previewOnPlainClick, sourceUrl } from "@/lib/fileActions"
import {
  formatBytes,
  formatFileTime,
  highlightRanges,
  isModifiedByMe,
  opensExternally,
  parseSummary,
} from "@/lib/filesQuery"
import { pluralRules } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"

/**
 * DOSYALARIM SATIRI — dosya, klasör, kitaplık, site, kurumsal görsel, bağlantı.
 *
 * ⚠️ **BİRİNCİL HEDEF GERÇEK BİR ÖĞE.** Dosya bir `<a href target=_blank>`:
 * düz tık uygulama içi önizlemeyi açar (Keşfet'in duyuru ve posta satırının
 * emsali — sayfa yerinde kalır), Cmd/Ctrl+tık ve orta tuş yeni sekmede
 * açar. Klasör bir `<Link>`: gezinme GEÇMİŞE yazılır, geri tuşu üst klasöre
 * döner, orta tuş klasörü yeni sekmede açar.
 *
 * ⚠️ **İÇ İÇE DÜĞME YOK.** TYRO ve ⋯ birincil öğenin KARDEŞİ; satırın içine
 * konsaydı tıklama ikisine birden giderdi (`LauncherCard`ın kalp dersi).
 *
 * ⚠️ **HOVER'A BAĞLI BİLGİ YOK.** Önizleme hem düz tıkta hem ⋯ menüsünde;
 * TYRO her zaman görünür (dokunmatikte hover yok).
 *
 * ⚠️ **İKİNCİ TUR (2026-10-01, pano):** rozet 44px; konum ve "kim · ne
 * zaman · boyut" TEK satırda (iki satırlık meta satırı her dosyayı 4 satıra
 * çıkarıyordu — "çok yoğun, gözü yoruyor"). TYRO her zaman görünür ama SOLUK,
 * satırın üstüne gelince marka rengine döner; ⋯ ince işaretçide yalnız
 * üstüne gelince/odakta, dokunmatikte her zaman. Konum satırının kökü
 * ("OneDrive'ım") daha derin parça varsa yazılmaz — glif onu zaten söylüyor;
 * tam yol ekran okuyucuda (`row.path`).
 */

function Highlighted({ text, query }) {
  const ranges = query ? highlightRanges(text, query) : []
  if (!ranges.length) return text
  const out = []
  let at = 0
  ranges.forEach(([a, b], i) => {
    if (a > at) out.push(text.slice(at, a))
    out.push(
      <mark key={i} className="rounded-sm bg-brand/[0.14] text-inherit">
        {text.slice(a, b)}
      </mark>,
    )
    at = b
  })
  if (at < text.length) out.push(text.slice(at))
  return out
}

/** Eşleşme özeti — tek satır, Graph'ın işaretlediği parçalar vurgulu. */
function Snippet({ summary }) {
  const parts = parseSummary(summary)
  if (!parts.length) return null
  return (
    <span className="mt-0.5 line-clamp-1 text-[0.71875rem] leading-4 text-muted-foreground/90 [overflow-wrap:anywhere]">
      {parts.map((p, i) =>
        p.mark ? (
          <mark key={i} className="rounded-sm bg-brand/[0.14] px-0.5 text-foreground">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  )
}

function stopEscape(e) {
  // Sohbet rıhtımı pencere düzeyinde Escape dinliyor; menüyü kapatan Escape
  // rıhtımı da kapatmasın (TYRO devri rıhtımı bu sayfanın yanında açıyor).
  e.stopPropagation()
}

/**
 * @param {object} p
 * @param {object} p.item
 * @param {"browse"|"flat"} p.layout  flat: konum satırı çizilir (arama, son dosyalar)
 * @param {{ icon, label, full }|null} [p.place]  konum satırı (çağıran çözüyor)
 * @param {number} p.now
 * @param {object|null} p.me
 * @param {string} [p.query]  vurgulanacak metin
 * @param {string|null} [p.href]  gezilebilir öğenin uygulama içi adresi
 * @param {(item) => void} [p.onOpenGroup]  ekip satırı: kitaplığı çöz ve git
 * @param {boolean} [p.pending]  bu satırın kitaplığı çözülüyor (ekip)
 */
export function FileRow({
  item,
  layout = "browse",
  place,
  now,
  me,
  query = "",
  href,
  onOpen,
  onNavigate,
  onAsk,
  onMail,
  onCopy,
  onReveal,
  onSearchIn,
  onOpenGroup,
  pending = false,
  hideSelf = false,
  fresh = false,
  ownDriveId = null,
}) {
  const { t, locale } = useLocale()
  const corporate = item.source === "corporate"
  const navigable = Boolean(href)
  const external = !navigable && opensExternally(item)
  const graphFile = item.kind === "file" && !item.cdn && Boolean(item.driveId && item.itemId)
  // "Sen" = SON DEĞİŞTİREN benim (oluşturduğum ama Ayşe'nin değiştirdiği dosyada "Sen" yazmak yanlış olurdu).
  const mine = item.kind === "file" && isModifiedByMe(item, me)
  const otherName = (item.modifiedBy || "").split(";")[0]
  // `hideSelf` (açılış listesi: hepsi zaten "senin son dosyaların"): "Sen" görsel olarak
  // yazılmaz, ekran okuyucuya söylenir; başkası değiştirdiyse adıyla.
  const who =
    item.kind === "file" && !item.cdn
      ? mine
        ? hideSelf
          ? ""
          : t("myfiles.row.you")
        : hideSelf && otherName
          ? t("myfiles.row.changedBy", { name: otherName })
          : otherName
      : ""
  const when = item.modified ? formatFileTime(item.modified, now, locale) : ""
  const meta = [
    who,
    when,
    item.kind === "file" && item.size != null ? formatBytes(item.size, locale) : "",
    item.kind === "folder" && item.childCount != null
      ? t(`myfiles.items.${pluralRules(locale).select(item.childCount)}`, {
          count: item.childCount,
        })
      : "",
    item.kind === "drive" ? item.subtitle : "",
    item.kind === "site" ? item.subtitle?.replace(/^https?:\/\//, "") : "",
  ].filter(Boolean)

  const showPlace = layout === "flat" && place
  // Kök etiketi ("OneDrive'ım ›") daha derin parça varsa düşer: glif kökü söylüyor.
  const placeLabel = showPlace
    ? place.label.includes(" › ")
      ? place.label.split(" › ").slice(1).join(" › ")
      : place.label
    : ""
  const body = (
    <>
      {item.cdn ? (
        <img
          src={item.thumbUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-11 shrink-0 rounded-xl bg-muted object-cover"
        />
      ) : (
        <FileBadge item={item.kind === "link" ? { kind: "file", ext: "" } : item} size="md" />
      )}
      <span className="min-w-0 flex-1">
        <span
          lang={corporate ? "tr" : undefined}
          className="line-clamp-2 text-[0.875rem] font-medium leading-snug text-foreground [overflow-wrap:anywhere]"
        >
          <Highlighted text={item.name} query={query} />
        </span>
        {(showPlace || meta.length > 0) && (
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[0.75rem] leading-4 text-muted-foreground">
            {showPlace && (
              <>
                <HugeiconsIcon
                  icon={place.icon}
                  className="size-3 shrink-0 opacity-70"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
                <span className="min-w-0 truncate" aria-hidden="true">
                  {placeLabel}
                </span>
                <span className="sr-only">
                  {t("myfiles.row.path", { path: place.full ?? place.label })}
                </span>
              </>
            )}
            {meta.length > 0 && (
              <span className={cn("truncate", showPlace && "shrink-0 max-w-[65%]")}>
                {showPlace ? " · " : ""}
                {meta.join(" · ")}
              </span>
            )}
          </span>
        )}
        {mine && hideSelf && <span className="sr-only">{t("myfiles.row.youSr")}</span>}
        {/* Metin aramasında Graph'ın eşleşme özeti: TEK satır, işaretler
            `<mark>` olarak — `innerHTML` YOK, parçalar `parseSummary`den. */}
        {query && item.summary ? <Snippet summary={item.summary} /> : null}
      </span>
      {item.kind === "group" &&
        (pending ? (
          <HugeiconsIcon
            icon={Loading03Icon}
            className="mt-2 size-3.5 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
            strokeWidth={2}
            aria-hidden="true"
          />
        ) : (
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="mt-2 size-3.5 shrink-0 text-muted-foreground/60"
            strokeWidth={2}
            aria-hidden="true"
          />
        ))}
      {navigable && (
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          className="mt-2 size-3.5 shrink-0 text-muted-foreground/60"
          strokeWidth={2}
          aria-hidden="true"
        />
      )}
      {item.kind === "link" && (
        <HugeiconsIcon
          icon={LinkSquare02Icon}
          className="mt-2 size-3.5 shrink-0 text-muted-foreground/60"
          strokeWidth={2}
          aria-hidden="true"
        />
      )}
    </>
  )
  const hit =
    "flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/30 [@media(pointer:coarse)]:min-h-11"

  let primary
  if (item.kind === "group") {
    // Ekip bir adres değil: kitaplığı tıklayınca çözülüyor, sonra gezinme.
    primary = (
      <button
        type="button"
        onClick={() => !pending && onOpenGroup?.(item)}
        aria-busy={pending || undefined}
        className={hit}
      >
        {body}
      </button>
    )
  } else if (navigable) {
    primary = (
      <Link to={href} onClick={() => onNavigate?.(item)} className={hit}>
        {body}
      </Link>
    )
  } else if (item.webUrl) {
    primary = (
      <a
        // `sourceUrl`: değiştirici tuşla yeni sekmede açan da İNDİRMESİN (`web=1`).
        href={sourceUrl(item)}
        target="_blank"
        rel="noopener noreferrer"
        aria-haspopup={external ? undefined : "dialog"}
        title={external ? t("myfiles.row.opensExternal") : undefined}
        // Düz tık önizleme; değiştirici tuş / orta tuş tarayıcının işi (yeni sekme).
        onClick={(e) => previewOnPlainClick(e, item, onOpen, external)}
        className={hit}
      >
        {body}
      </a>
    )
  } else {
    primary = <span className={hit}>{body}</span>
  }

  return (
    <li
      data-file-row=""
      data-fresh={fresh || undefined}
      className={cn(
        "group/row relative flex items-start gap-1.5 rounded-[1.125rem] px-3 py-2.5 transition-colors hover:bg-foreground/[0.03] [contain-intrinsic-size:auto_4rem] [content-visibility:auto]",
        fresh && "files-fresh",
      )}
    >
      {primary}
      <span className="flex shrink-0 items-center gap-0.5 self-center">
        {graphFile && (
          <FileAssistMenu
            item={item}
            onAsk={onAsk}
            onMail={onMail}
            onEscapeKeyDown={stopEscape}
            triggerClassName="size-8 text-muted-foreground/70 group-hover/row:text-brand group-focus-within/row:text-brand [@media(pointer:coarse)]:size-10"
          />
        )}
        {/* Ekip satırının adresi yok (kitaplık tıklayınca çözülüyor): boş açılan bir ⋯ olmasın. */}
        {item.kind !== "group" && (
          <RowMenu
            item={item}
            layout={layout}
            graphFile={graphFile}
            external={external}
            navigable={navigable}
            ownDrive={item.kind === "file" && !item.cdn && isOwnDrive(item, ownDriveId)}
            onOpen={onOpen}
            onCopy={onCopy}
            onReveal={onReveal}
            onSearchIn={onSearchIn}
          />
        )}
      </span>
    </li>
  )
}

/**
 * ⋯ menüsü. Tetik ince işaretçide yalnız satırın üstüne gelince / odakta
 * görünür (`RevealMenu` sınıfları), dokunmatikte her zaman — içindekilerin
 * hepsi başka yoldan da ulaşılabilir değil, o yüzden gizli kalamaz.
 * ⚠️ Kendi OneDrive'ındaki dosyada bağlantı "OneDrive'da aç" der, "Tarayıcıda
 * aç" değil (D-10): gidilecek yer kişinin kendi sürücüsü.
 */
const ROW_MENU_REVEAL =
  "[@media(pointer:fine)]:opacity-0 group-hover/row:opacity-100 group-hover/tile:opacity-100 group-focus-within/row:opacity-100 group-focus-within/tile:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"

export function RowMenu({
  item,
  layout,
  graphFile,
  external,
  navigable,
  ownDrive = false,
  onOpen,
  onCopy,
  onReveal,
  onSearchIn,
  className,
}) {
  const { t } = useLocale()
  const canPreview = !navigable && !external && (graphFile || item.cdn)
  const canReveal = layout === "flat" && graphFile && onReveal
  const canSearchIn =
    navigable && (item.kind === "folder" || item.kind === "drive" || item.policyId) && onSearchIn
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("myfiles.row.more", { name: item.name })}
          title={t("myfiles.row.moreShort")}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 data-[state=open]:bg-accent/60 [@media(pointer:coarse)]:size-10",
            ROW_MENU_REVEAL,
            className,
          )}
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5" onEscapeKeyDown={stopEscape}>
        {canPreview && (
          <DropdownMenuItem
            onSelect={() => onOpen(item)}
            className="gap-2 rounded-lg px-2 py-1.5 text-[0.78125rem]"
          >
            <HugeiconsIcon icon={ViewIcon} strokeWidth={1.9} />
            {item.cdn ? t("myfiles.row.viewImage") : t("myfiles.row.preview")}
          </DropdownMenuItem>
        )}
        {canSearchIn && (
          <DropdownMenuItem
            onSelect={() => onSearchIn(item)}
            className="gap-2 rounded-lg px-2 py-1.5 text-[0.78125rem]"
          >
            <HugeiconsIcon icon={Search01Icon} strokeWidth={1.9} />
            {t("myfiles.row.searchInFolder")}
          </DropdownMenuItem>
        )}
        {canReveal && (
          <DropdownMenuItem
            onSelect={() => onReveal(item)}
            className="gap-2 rounded-lg px-2 py-1.5 text-[0.78125rem]"
          >
            <HugeiconsIcon icon={FolderOpenIcon} strokeWidth={1.9} />
            {t("myfiles.row.reveal")}
          </DropdownMenuItem>
        )}
        {(canPreview || canSearchIn || canReveal) && item.webUrl && <DropdownMenuSeparator />}
        {item.webUrl && (
          <DropdownMenuItem asChild className="gap-2 rounded-lg px-2 py-1.5 text-[0.78125rem]">
            <a href={sourceUrl(item)} target="_blank" rel="noopener noreferrer">
              <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.9} />
              {item.kind === "site" ||
              item.kind === "drive" ||
              (item.kind === "folder" && !item.cdnFolderId)
                ? t("myfiles.row.openInSharePoint")
                : ownDrive
                  ? t("myfiles.openOneDrive")
                  : t("files.openInBrowser")}
            </a>
          </DropdownMenuItem>
        )}
        {item.webUrl && (
          <DropdownMenuItem
            onSelect={() => onCopy(item)}
            className="gap-2 rounded-lg px-2 py-1.5 text-[0.78125rem]"
          >
            <HugeiconsIcon icon={Copy01Icon} strokeWidth={1.9} />
            {t("myfiles.row.copyLink")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Satırlar bir kabukta, grubun başlığıyla (Sana özel'in liste tarifi; kabuk panonun `.ms-surface`i). */
export function FileGroup({ label, count, children, className }) {
  const { locale } = useLocale()
  return (
    <section className={cn("min-w-0", className)}>
      {label && (
        <h3
          lang={locale}
          className="flex items-center gap-2 px-3 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
        >
          <span>{label}</span>
          {count != null && <span className="font-medium tabular-nums opacity-70">{count}</span>}
        </h3>
      )}
      <ul className="ms-surface rounded-[1.5rem] p-1.5">{children}</ul>
    </section>
  )
}
