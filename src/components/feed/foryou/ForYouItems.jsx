import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import Attachment01Icon from "@hugeicons/core-free-icons/Attachment01Icon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { PersonPopover } from "@/components/common/PersonPopover"
import { useLocale } from "@/hooks/useLocale"
import { formatAgo } from "@/lib/date"
import { isStale } from "@/lib/forYouBoard"
import { cn, foldTr } from "@/lib/utils"
import { LikeButton } from "../actions/LikeButton"
import { ShareMenu } from "../actions/ShareMenu"
import { FeedMarks } from "../FeedMarks"
import { FeedTag } from "../FeedTag"
import { TodoHandoff } from "./TodoHandoff"

/**
 * Sana özel'in iki satır biçimi: raf kartı (sabitlenmiş) ve sakin satır (bayraklı · yüksek önem).
 * Beğen ve Paylaş yalnız ikon (`showLabel` yok): kartın ana eylemi "To-Do'ya ekle". Satırda
 * ikisi yalnız geniş kapsayıcıda; dar ekranda içerik sütunu 180 px'e iner ve satır kalabalıklaşırdı
 * — orada eylemler satıra basınca açılan okuma bölmesinde. İkon düğmesi To-Do hapıyla aynı
 * boyda (`ICON`): masaüstünde 32 px, dokunmatikte 44 px.
 */
const ICON = "size-8 pointer-coarse:size-11"

function showTag(item, t) {
  // Kurumsal kutunun adı çoğu zaman kanalın adıyla aynı; aynıysa etiket tekrar etmez.
  return Boolean(item.tag) && foldTr(t(`feed.tag.${item.tag}`)) !== foldTr(item.author)
}

export function PinnedCard({ item, photo, now, fresh, handoff, todoOpen, onOpen, onDone }) {
  const { t, locale } = useLocale()
  const subject = item.subject || t("feed.noSubject")
  return (
    <li className="min-w-0">
      <article
        data-fresh={fresh || undefined}
        className="ms-surface group/pin relative flex h-full min-w-0 flex-col rounded-[1.5rem] p-4 transition hover:shadow-md motion-safe:hover:-translate-y-0.5"
      >
        <header className="flex items-start gap-2.5">
          <PersonPopover person={{ name: item.author, address: item.address }}>
            {(trigger) => (
              <button
                {...trigger}
                aria-label={t("person.openCard", { name: item.author })}
                className="relative z-10 grid shrink-0 rounded-full transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <PersonAvatar name={item.author} photo={photo} className="size-8" />
              </button>
            )}
          </PersonPopover>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              {!item.isRead && (
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-brand" />
              )}
              <span
                className={cn(
                  "truncate text-[0.8125rem]",
                  item.isRead ? "font-medium" : "font-semibold",
                )}
              >
                {item.author}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <time
                key={now}
                dateTime={item.received?.toISOString()}
                className="text-[0.6875rem] text-muted-foreground"
              >
                {formatAgo(item.received, locale)}
              </time>
              {showTag(item, t) && <FeedTag tag={item.tag} accent={item.accent} />}
            </div>
          </div>
          <FeedMarks post={item} />
        </header>
        <p className="mt-3 line-clamp-2 text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] [overflow-wrap:anywhere]">
          {subject}
        </p>
        {item.preview && (
          <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
            {item.preview}
          </p>
        )}
        {/* Kartın tamamı açar (gerilmiş kaplama); hap ve eylemler onun ÜSTÜNDE — iç içe düğme yok. */}
        <button
          type="button"
          onClick={() => onOpen(item.id)}
          className="absolute inset-0 rounded-[1.5rem] outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span className="sr-only">
            {subject} — {t("feed.readMore")}
            {!item.isRead ? `, ${t("feed.important.row.unread")}` : ""}
          </span>
        </button>
        <footer className="pointer-events-none relative z-10 mt-auto flex items-center gap-2 pt-4">
          <span className="pointer-events-auto">
            <TodoHandoff
              item={item}
              entry={handoff.entryOf(item.id)}
              todoOpen={todoOpen}
              onAdd={(x) => handoff.add(x, { onDone })}
              onConnect={(x) => handoff.connect(x, { onDone })}
            />
          </span>
          <span className="pointer-events-auto flex items-center gap-0.5">
            <LikeButton post={item} className={ICON} />
            <ShareMenu post={item} className={ICON} />
          </span>
          <span className="flex-1" />
          {item.hasAttachments && (
            <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
              <HugeiconsIcon
                icon={Attachment01Icon}
                className="size-3.5"
                strokeWidth={1.9}
                aria-hidden="true"
              />
              {t("feed.hasAttachment")}
            </span>
          )}
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-4 text-muted-foreground transition group-hover/pin:text-brand-ink motion-safe:group-hover/pin:translate-x-0.5"
            strokeWidth={2}
            aria-hidden="true"
          />
        </footer>
      </article>
    </li>
  )
}

export function MailRow({ item, photo, now, fresh, handoff, todoOpen, onOpen, onDone }) {
  const { t, locale } = useLocale()
  const stale = isStale(item, now)
  return (
    <li
      data-fresh={fresh || undefined}
      className="group/imp relative flex items-start gap-3 rounded-[1.125rem] px-3 py-3 transition-colors hover:bg-foreground/[0.03]"
    >
      {/* Foto kişi kartını açar; satırın geri kalanı postayı. */}
      <PersonPopover person={{ name: item.author, address: item.address }}>
        {(trigger) => (
          <button
            {...trigger}
            aria-label={t("person.openCard", { name: item.author })}
            className="mt-0.5 grid shrink-0 rounded-full transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <PersonAvatar name={item.author} photo={photo} className="size-9" />
          </button>
        )}
      </PersonPopover>
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        className="min-w-0 flex-1 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {!item.isRead && (
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-brand" />
          )}
          <span
            className={cn(
              "truncate text-[0.8125rem]",
              item.isRead ? "font-medium" : "font-semibold",
            )}
          >
            {item.author}
          </span>
          {showTag(item, t) && <FeedTag tag={item.tag} accent={item.accent} />}
          <time
            key={now}
            dateTime={item.received?.toISOString()}
            className={cn(
              "shrink-0 text-[0.6875rem]",
              stale ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground",
            )}
          >
            {formatAgo(item.received, locale)}
          </time>
          {stale && <span className="sr-only">{t("feed.important.row.stale")}</span>}
          <FeedMarks post={item} />
          {item.hasAttachments && (
            <span className="inline-flex items-center">
              <HugeiconsIcon
                icon={Attachment01Icon}
                className="size-3 text-muted-foreground"
                strokeWidth={1.9}
                aria-hidden="true"
              />
              <span className="sr-only">{t("feed.hasAttachment")}</span>
            </span>
          )}
        </span>
        <span className="mt-1 line-clamp-2 text-[0.875rem] font-medium leading-snug [overflow-wrap:anywhere]">
          {item.subject || t("feed.noSubject")}
        </span>
        {/* TEK satır = `block truncate` (bug #1: `block line-clamp-1` iki `display` yazıyordu). */}
        {item.preview && (
          <span className="mt-0.5 block truncate text-[0.78125rem] text-muted-foreground">
            {item.preview}
          </span>
        )}
        {!item.isRead && <span className="sr-only">{t("feed.important.row.unread")}</span>}
      </button>
      <div className="flex shrink-0 items-center gap-0.5 self-center">
        <span className="hidden items-center gap-0.5 @[40rem]/foryou:flex">
          <LikeButton post={item} className={ICON} />
          <ShareMenu post={item} align="end" className={ICON} />
        </span>
        <TodoHandoff
          item={item}
          entry={handoff.entryOf(item.id)}
          todoOpen={todoOpen}
          onAdd={(x) => handoff.add(x, { onDone })}
          onConnect={(x) => handoff.connect(x, { onDone })}
        />
      </div>
    </li>
  )
}
