import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Attachment01Icon from "@hugeicons/core-free-icons/Attachment01Icon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { PersonPopover } from "@/components/common/PersonPopover"
import { useFeedImages } from "@/hooks/useFeedImages"
import { useLocale } from "@/hooks/useLocale"
import { formatAgo } from "@/lib/date"
import { askAboutPost } from "@/lib/feedAsk"
import { PostActions } from "./actions/PostActions"
import { FeedMarks } from "./FeedMarks"
import { FeedTag, ForYouTag } from "./FeedTag"
import { PostMedia } from "./timeline/PostMedia"

/**
 * Kart görüş alanına yaklaşınca bir kez `true` olur; kapak isteği ancak o zaman açılır
 * (yirmi kart için peşin istek ilk boyamaya yirmi Graph turu eklerdi). Kök sayfanın
 * kaydırıcısı: `rootMargin` yalnız kökün dikdörtgenine uygulanır.
 */
function useNearViewport(ref, scrollRoot) {
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true)
          io.disconnect()
        }
      },
      { root: scrollRoot?.current ?? null, rootMargin: "300px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, near, scrollRoot])
  return near
}

/**
 * Akıştaki tek gönderi — Twitter tarzı satır: avatar, kimlik satırı, başlık, özet,
 * kapak ve eylemler (Beğen · Paylaş · TYRO ile özetle · Kaydet, `actions/PostActions`).
 * Satırın tamamı okuma penceresini açar (gerilmiş kaplama, `z-[1]`); kişi kartı ve
 * eylemler kaplamanın üstünde (`z-10`), iç içe düğme yok.
 * Kapak kapısı `hasAttachments` değil: Graph gövdeye gömülü (`cid:`) görselde o
 * bayrağı yakmaz. Kişisel (işaretli) postada kapak aranmaz.
 */
export function FeedPostCard({ post, photo, now, scrollRoot, onOpen }) {
  const { t, locale } = useLocale()
  const ref = useRef(null)
  const near = useNearViewport(ref, scrollRoot)
  const images = useFeedImages(post.id, near && !post.personal, "hero")
  const hero = images?.[0] ?? null
  const subject = post.subject || t("feed.noSubject")

  return (
    <article
      ref={ref}
      data-post-id={post.id}
      className="group/post relative px-4 py-3.5 transition-colors hover:bg-accent/30 focus-within:bg-accent/30"
    >
      <button
        type="button"
        onClick={() => onOpen(post.id)}
        className="absolute inset-0 z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
      >
        <span className="sr-only">{`${subject} — ${t("feed.readMore")}`}</span>
      </button>

      <PersonPopover person={{ name: post.author, address: post.address }}>
        {(trigger) => (
          <div className="flex items-start gap-3">
            <button
              {...trigger}
              aria-label={t("person.openCard", { name: post.author })}
              className="relative z-10 grid shrink-0 rounded-full transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <PersonAvatar name={post.author} photo={photo} className="size-10" />
            </button>
            {/* Dar sütunda kimlik iki satır (ad · kanal + zaman): ad kırpılmaz. */}
            <div className="@container/post min-w-0 flex-1">
              <div className="flex min-w-0 flex-col gap-0.5 @[26rem]/post:flex-row @[26rem]/post:items-center @[26rem]/post:gap-x-1.5">
                <button
                  {...trigger}
                  className="relative z-10 min-w-0 self-start truncate rounded text-left text-[0.8125rem] font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 @[26rem]/post:self-auto"
                >
                  {post.author}
                </button>
                <div className="flex min-w-0 items-center gap-x-1.5">
                  {post.tag ? <FeedTag tag={post.tag} accent={post.accent} /> : <ForYouTag />}
                  <span aria-hidden="true" className="text-muted-foreground/50">
                    ·
                  </span>
                  {/* `now` dakikada bir değişir: göreli zaman uzun açık kalan akışta donmasın. */}
                  <time
                    key={now}
                    dateTime={post.received?.toISOString()}
                    className="shrink-0 text-[0.75rem] text-muted-foreground"
                  >
                    {formatAgo(post.received, locale)}
                  </time>
                  <FeedMarks post={post} />
                  {post.hasAttachments && (
                    <span
                      title={t("feed.hasAttachment")}
                      className="inline-flex shrink-0 items-center rounded-md bg-muted px-1 py-px leading-4 text-muted-foreground"
                    >
                      <HugeiconsIcon icon={Attachment01Icon} className="size-3" strokeWidth={2.2} />
                      <span className="sr-only">{t("feed.hasAttachment")}</span>
                    </span>
                  )}
                </div>
              </div>

              <h2 className="mt-0.5 line-clamp-2 text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] text-foreground">
                {subject}
              </h2>
              {post.preview && (
                <p className="mt-1 line-clamp-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  {post.preview}
                </p>
              )}
              {hero && <PostMedia src={hero.dataUrl} />}

              {/* Eylem satırı gönderinin hemen altında, metinle aynı hizada (ikon payı kadar
                  dışarı); kaydet içerik sütununun SONUNDA — genişlik sınırı onu kartın ortasında
                  bırakıyordu. "Outlook'ta aç" okuma bölmesinde, kartta tekrar etmez. */}
              <PostActions
                post={post}
                onAsk={() => askAboutPost(post, t)}
                className="-mx-2.5 mt-1.5"
              />
            </div>
          </div>
        )}
      </PersonPopover>
    </article>
  )
}
