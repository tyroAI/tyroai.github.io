import { useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import ArrowExpandIcon from "@hugeicons/core-free-icons/ArrowExpandIcon"
import ArrowShrinkIcon from "@hugeicons/core-free-icons/ArrowShrinkIcon"
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { PersonPopover } from "@/components/common/PersonPopover"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useFeedBody } from "@/hooks/useFeedPosts"
import { useFeedImages } from "@/hooks/useFeedImages"
import { useLocale } from "@/hooks/useLocale"
import { askAboutPost } from "@/lib/feedAsk"
import { inlineCidImages, sealUnloadableImages, stripNetworkHints, unifyBold } from "@/lib/feedHtml"
import { STATUS } from "@/lib/graph"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"
import { feedFrameDoc } from "./feedFrame"
import { FeedMarks } from "./FeedMarks"
import { FeedTag, ForYouTag } from "./FeedTag"
import { Attachments } from "./reader/Attachments"
import { ReaderActions } from "./reader/ReaderActions"
import { ReaderBody } from "./reader/ReaderBody"
import { Recipients } from "./reader/Recipients"

/**
 * Outlook'un okuma bölmesindeki kısa damga: "Cum 2.10.2026 09:41". Parçalar
 * AYRI biçimlenip birleşiyor: tek bir `Intl` biçimi Türkçede günü sona atıyordu
 * ("2.10.2026 Cum 10:54"). Saat dilin kendi düzeninde (EN "10:54 AM"). Uzunu `title`da.
 */
const OPTS_STAMP_DAY = { weekday: "short" }
const OPTS_STAMP_DATE = { day: "numeric", month: "numeric", year: "numeric" }
const OPTS_STAMP_TIME = { hour: "2-digit", minute: "2-digit" }
const OPTS_FULL = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
}

/**
 * Gönderinin tam hâli — Outlook'un okuma bölmesi gibi: konu · gönderen kartı (Kime/Bilgi,
 * tarih) · eylem çubuğu (kartın satırı + Outlook'ta aç) · ek kartları · kâğıt gövde.
 * Masaüstünde sağdan açılan tam boy bölme, telefonda tam ekran. Adreste açılır
 * (`?post=<id>`): akış yerinde kalır, geri tuşu kapatır.
 * `list` verilince önceki/sonraki gönderiye geçilir (düğmeler ve j/k); kapanınca odak
 * son okunan gönderinin kartına döner, akış oraya kayar.
 * Tek kaydırma: çerçeve (`sandbox`) boyunu söyleyemez, kalan alanın tamamını alır.
 */
export function FeedPostDialog({ post, photo, open, onOpenChange, list, onNavigate }) {
  const { t, locale } = useLocale()
  // Geniş görünüm bölmeyi büyütür (bülten tabloları 600–800 px); durum bölmeye ait, adrese değil.
  const [wide, setWide] = useState(false)
  // Bölmeyi açan eleman: adresten açıldığı için Radix'in geri vereceği bir tetik yok.
  const returnTo = useRef(null)
  const body = useFeedBody(post?.id, Boolean(post && open))
  // ⚠️ Kart TEK kapak istiyor (`hero`), pencere GÖVDEDEKİ HER `cid:` için
  // görsel (`body`): eksik kalan bir eşleşme o görseli YIRTIK ikona
  // çeviriyordu. İki varyantın bütçeleri `feedPolicy.js`te ayrı ve önbellek
  // anahtarı varyantı içerdiği için ikisi birbirinin sonucunu yemiyor.
  const images = useFeedImages(post?.id, Boolean(post && open), "body")

  // ⚠️ Bağımlılık `body?.html` DEĞİL: isteğe bağlı zincir bir bağımlılık
  // olarak izlenemiyor (`react-hooks/preserve-manual-memoization` hata
  // veriyor). Değer önce çıkarılıyor, sonra bağımlılık oluyor.
  const bodyHtml = body?.html ?? null
  const html = useMemo(() => {
    if (!bodyHtml) return null
    // Sıra ÖNEMLİ: önce `cid:` eşlemesi (gömülü görsel `data:` olur), sonra
    // ağa çıkan görünmez etiketler, en sonda GERİYE KALAN her görselin
    // mühürlenmesi — mühür son adım olmazsa az önce çözülen görseller de
    // mühürlenirdi.
    const { html: sealedHtml, sealed } = sealUnloadableImages(
      stripNetworkHints(inlineCidImages(unifyBold(bodyHtml), images ?? [])),
    )
    return feedFrameDoc(sealedHtml, {
      note: sealed ? t("feed.imagesSealed", { count: sealed }) : null,
    })
  }, [bodyHtml, images, t])

  const at = list && post ? list.findIndex((p) => p.id === post.id) : -1
  const prev = at > 0 ? list[at - 1] : null
  const next = at >= 0 && at < list.length - 1 ? list[at + 1] : null

  if (!post) return null

  function askAssistant() {
    askAboutPost(post, t)
    onOpenChange(false)
  }

  const waiting = body === null
  const failed = body?.status && body.status !== STATUS.ready

  const stamp = post.received
    ? [OPTS_STAMP_DAY, OPTS_STAMP_DATE, OPTS_STAMP_TIME]
        .map((o) => getDateTimeFormat(locale, o).format(post.received))
        .join(" ")
    : ""
  const full = post.received ? getDateTimeFormat(locale, OPTS_FULL).format(post.received) : ""
  const subject = post.subject || t("feed.noSubject")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        // Sohbet rıhtımı da Escape dinliyor: bölmeyi kapatan Escape rıhtımı kapatmasın.
        onEscapeKeyDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea")) return
          // Bölmeden açılan menü ve pencere portalda: tuşları React ağacından buraya
          // kabarır, ama j/k onların içinde gönderi değiştirmemeli.
          if (!e.currentTarget.contains(e.target)) return
          const to = e.key === "j" ? next : e.key === "k" ? prev : null
          if (!to) return
          e.preventDefault()
          onNavigate?.(to.id)
        }}
        onOpenAutoFocus={() => {
          returnTo.current = document.activeElement
        }}
        onCloseAutoFocus={(e) => {
          const card = document.querySelector(
            `article[data-post-id="${CSS.escape(post.id)}"] button`,
          )
          const el = card?.offsetParent ? card : returnTo.current
          returnTo.current = null
          if (el && el !== document.body && el.isConnected) {
            e.preventDefault()
            el.focus({ preventScroll: el !== card })
          }
        }}
        className={cn(
          "gap-0 overflow-hidden p-0 text-[0.8125rem] transition-[width] data-[side=right]:w-full data-[side=right]:sm:max-w-none sm:rounded-l-2xl",
          wide
            ? "data-[side=right]:sm:w-[min(92rem,calc(100vw-1.5rem))]"
            : "data-[side=right]:sm:w-[min(54rem,calc(100vw-1.5rem))]",
        )}
      >
        <div className="shrink-0 px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-4 sm:px-6 sm:pt-5">
          {/* KONU — Outlook'ta olduğu gibi postanın başlığı, kanalı ve işaretleri yanında. */}
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-pretty text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] [overflow-wrap:anywhere] sm:text-[1.125rem]">
                {subject}
              </SheetTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                {/* Kişisel (işaretli) postada kanal YOK — yerinde "Sana özel". */}
                {post.tag ? <FeedTag tag={post.tag} accent={post.accent} /> : <ForYouTag />}
                <FeedMarks post={post} />
              </div>
            </div>
            <div className="-mr-1.5 -mt-0.5 flex shrink-0 items-center gap-0.5">
              {list && (
                <>
                  <NavButton
                    icon={ArrowUp01Icon}
                    label={t("feed.prevPost")}
                    keyHint="K"
                    target={prev}
                    onNavigate={onNavigate}
                  />
                  <NavButton
                    icon={ArrowDown01Icon}
                    label={t("feed.nextPost")}
                    keyHint="J"
                    target={next}
                    onNavigate={onNavigate}
                  />
                </>
              )}
              {/* Yalnız `sm` üstünde: telefonda bölme zaten ekranın tamamı. */}
              <button
                type="button"
                onClick={() => setWide((v) => !v)}
                aria-pressed={wide}
                aria-label={t(wide ? "feed.narrow" : "feed.wide")}
                title={t(wide ? "feed.narrow" : "feed.wide")}
                className="hidden size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:grid"
              >
                <HugeiconsIcon
                  icon={wide ? ArrowShrinkIcon : ArrowExpandIcon}
                  className="size-4"
                  strokeWidth={2}
                />
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label={t("feed.close")}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:size-11"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* GÖNDEREN KARTI — foto · ad <adres> · Kime / Bilgi · sağda tarih; eylemler altında. */}
          {/* Foto ve ad AYNI kişi kartını açar — Outlook'ta da gönderenin adı kişi kartını açar. */}
          <PersonPopover person={{ name: post.author, address: post.address }}>
            {(trigger) => (
              <div className="mt-4 flex items-start gap-3">
                <button
                  {...trigger}
                  aria-label={t("person.openCard", { name: post.author })}
                  className="grid shrink-0 rounded-full transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <PersonAvatar name={post.author} photo={photo} className="size-10" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                    <button
                      {...trigger}
                      className="rounded text-left text-[0.875rem] font-semibold underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    >
                      {post.author}
                    </button>
                    {post.address && post.address !== post.author?.toLowerCase() && (
                      <span className="min-w-0 truncate text-[0.78125rem] text-muted-foreground">
                        {"<"}
                        {post.address}
                        {">"}
                      </span>
                    )}
                  </div>
                  {/* Pencerenin açıklaması TAM tarih — görünen kısa damga darda burada, genişte sağda. */}
                  <SheetDescription className="sr-only">{full}</SheetDescription>
                  <p
                    aria-hidden="true"
                    className="mt-0.5 text-[0.75rem] text-muted-foreground sm:hidden"
                  >
                    <time dateTime={post.received?.toISOString()} title={full}>
                      {stamp}
                    </time>
                  </p>
                  {waiting ? (
                    <span
                      aria-hidden="true"
                      className="mt-1 block h-3.5 w-48 max-w-full rounded-full bg-muted"
                    />
                  ) : (
                    <>
                      <Recipients label={t("feed.mail.to")} list={body?.to} />
                      <Recipients label={t("feed.mail.cc")} list={body?.cc} />
                    </>
                  )}
                </div>
                <time
                  aria-hidden="true"
                  dateTime={post.received?.toISOString()}
                  title={full}
                  className="hidden shrink-0 text-[0.75rem] tabular-nums text-muted-foreground sm:block"
                >
                  {stamp}
                </time>
              </div>
            )}
          </PersonPopover>
          <ReaderActions post={post} onAsk={askAssistant} />

          {post.hasAttachments && <Attachments post={post} enabled={open} />}
        </div>

        <ReaderBody
          post={post}
          body={body}
          html={html}
          waiting={waiting}
          failed={failed}
          title={subject}
        />
      </SheetContent>
    </Sheet>
  )
}

/** Önceki/sonraki gönderi. Uçta `aria-disabled`: `disabled` düğme klavye odağını düşürür. */
function NavButton({ icon, label, keyHint, target, onNavigate }) {
  return (
    <button
      type="button"
      onClick={() => target && onNavigate?.(target.id)}
      aria-disabled={!target || undefined}
      aria-label={label}
      title={`${label} (${keyHint})`}
      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 aria-disabled:pointer-events-none aria-disabled:opacity-35 [@media(pointer:coarse)]:size-11"
    >
      <HugeiconsIcon icon={icon} className="size-4" strokeWidth={2} />
    </button>
  )
}
