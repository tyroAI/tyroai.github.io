import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon"
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon"
import PinIcon from "@hugeicons/core-free-icons/PinIcon"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { SummaryTray } from "@/components/common/SummaryTray"
import { InsightTip } from "@/components/myspace/InsightTip"
import { useGradientInk } from "@/hooks/useGradientInk"
import { useLocale } from "@/hooks/useLocale"
import { formatAgo } from "@/lib/date"
import { HERO_INK } from "@/lib/gradientInk"
import { STATUS } from "@/lib/graph"
import { getNumberFormat, pluralKey } from "@/lib/intl-cache"
import { TIP_MAX } from "@/lib/forYouBoard"
import { cn } from "@/lib/utils"
import { FeedMarks } from "../FeedMarks"
import {
  HERO_GLOW,
  HERO_GRADIENT,
  HERO_GRID,
  HERO_ORB_BOX,
  HERO_ORB_CELL,
  HERO_SHELL,
  HERO_TEXT,
  HERO_SUB,
  HERO_TITLE,
  HERO_TRAY_CELL,
  SLOT_ROW,
} from "@/components/common/summaryCard"
import { MailOrb } from "./MailOrb"

/**
 * SANA ÖZEL'İN KARŞILAMASI — panonun TEK kartı (2026-10-01; 2026-10-02'den
 * beri üç işaret sayısı da İÇİNDE). Kabuk Dosyalarım ve To-Do'nunkiyle aynı:
 * paletin gradyanı, ölçülen mürekkep (`useGradientInk`), kürenin arkasında
 * ışık; "Sıradaki" ve üç sayı aynı beyaz tepside (`SummaryTray`). Eskiden
 * kart + üç ayrı kutucuk 424 px tutuyordu, liste ilk ekranın dibine
 * düşüyordu (*"resimdeki kısmı birleştir, ferah ve compact"*).
 *
 * ⚠️ **"SIRADAKİ" KARTI BİR SONRAKİ İŞİ AÇAR** (`lib/forYouBoard.js` ›
 * `nextUp`): tek dokunuşla postanın kendisi (Akışım'ın penceresi, `?post=`).
 * Kapanınca kart bir sonrakine geçer — bu oturumda açılan sıradan çıkıyor.
 * ⚠️ **TEPSİ DÜZ, GRADYANIN ÜSTÜNDE KÜÇÜK YAZI YOK**: kartın alt yarısı paletin
 * açık ucuna düşüyor; beyaz tepsi her palette iki temada da okunur.
 * ⚠️ **DÜĞME KİMLİĞİ SABİT**: değişen yalnız içi. Pencere kapanınca odak
 * açanın üstüne döner; düğme yeniden doğsaydı odak `<body>`ye düşerdi.
 * ⚠️ Çare (izin · tekrar dene) kartın İÇİNDE, aynı kabukta — kart yükleme ile
 * sonuç arasında boy değiştirmez.
 */
const TERM =
  "-mx-0.5 rounded-md px-0.5 font-semibold text-foreground/80 underline decoration-dotted decoration-2 underline-offset-4 decoration-current/45 outline-none transition hover:bg-foreground/[0.06] data-[state=open]:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-brand/40"
const CHIP = "grid size-9 shrink-0 place-items-center rounded-xl"

function HeroTerm({ children, title, items, note, t }) {
  const shown = items.slice(0, TIP_MAX)
  return (
    <InsightTip
      title={title}
      rows={shown.map((m) => ({ label: m.author, value: m.subject || t("feed.noSubject") }))}
      more={items.length > TIP_MAX ? t("myspace.tip.more", { n: items.length - TIP_MAX }) : null}
      note={note}
      valueLang={null}
    >
      <button type="button" className={TERM}>
        {children}
      </button>
    </InsightTip>
  )
}

/**
 * @param {object} p
 * @param {object} p.state       `useImportantMail` sonucu
 * @param {object} p.summary     `summarize()` · @param {object|null} p.next `nextUp()`
 * @param {object} p.counts      `markCounts()` · @param {number} p.priority takip bekleyen sayısı
 * @param {number} p.remaining   To-Do'ya gitmemiş takip bekleyen · @param {boolean} p.remainingFlag
 */
export function ForYouHero({
  state,
  summary,
  next,
  counts,
  priority,
  remaining,
  remainingFlag,
  capped,
  photos,
  busy,
  celebrate,
  now,
  enter = false,
  stats,
  onOpen,
  onToList,
  onToShelf,
  onConnect,
  onRetry,
}) {
  const { t, locale } = useLocale()
  const ink = useGradientInk()
  const num = getNumberFormat(locale)
  const status = state.status
  const ready = status === STATUS.ready
  const total = summary.total
  const missing = state.missing ?? []

  let headline
  let sub
  let slot = null
  if (ready && total > 0) {
    const n = capped ? t("myfiles.count.atLeast", { n: num.format(total) }) : num.format(total)
    headline = t(
      capped
        ? "feed.important.hero.count.other"
        : pluralKey("feed.important.hero.count", locale, total),
      { n },
    )
    const unread = summary.unread.length
    const today = summary.today.length
    const parts = []
    if (unread)
      parts.push(
        <HeroTerm
          key="u"
          title={t("feed.important.tip.unread.title")}
          items={summary.unread}
          note={t("feed.important.tip.unread.note")}
          t={t}
        >
          {t(pluralKey("feed.important.hero.unread", locale, unread), { n: num.format(unread) })}
        </HeroTerm>,
      )
    if (today)
      parts.push(
        <HeroTerm key="d" title={t("feed.important.tip.today.title")} items={summary.today} t={t}>
          {t(pluralKey("feed.important.hero.newToday", locale, today), { n: num.format(today) })}
        </HeroTerm>,
      )
    if (!parts.length) parts.push(<span key="r">{t("feed.important.hero.allRead")}</span>)
    if (missing.length) parts.push(<span key="p">{t("feed.important.hero.partial")}</span>)
    sub = parts.flatMap((part, i) =>
      i
        ? [
            <span key={`s${i}`} aria-hidden="true">
              {" "}
              ·{" "}
            </span>,
            part,
          ]
        : [part],
    )
    slot = next
      ? { kind: "next", item: next }
      : priority > 0
        ? { kind: remaining === 0 ? "allInTodo" : "reviewed" }
        : counts.pinned > 0
          ? { kind: "calm" }
          : null
  } else if (ready && !missing.length) {
    headline = t("feed.important.empty")
    sub = t("feed.important.emptyBody")
    slot = { kind: "outlook" }
  } else if (ready) {
    headline = t("feed.important.hero.partialEmpty")
    sub = t("feed.important.hero.partialEmptySub")
    slot = { kind: "retry" }
  } else if (status === STATUS.denied) {
    headline = t("feed.denied")
    sub = t("feed.important.deniedBody")
    slot = { kind: "connect" }
  } else if (status === STATUS.error) {
    headline = t("feed.important.error")
    sub = t("feed.important.errorBody")
    slot = { kind: "retry" }
  } else {
    headline = t("feed.signedOut")
    sub = t("feed.important.signedOutBody")
  }

  const orbState = state.refreshing
    ? "syncing"
    : busy
      ? "working"
      : status === STATUS.error
        ? "error"
        : "idle"

  return (
    <section
      aria-labelledby="foryou-hero-title"
      data-ink={ink}
      style={{ "--hero-ink": HERO_INK[ink], "--i": 0 }}
      className={cn(HERO_SHELL, enter && "foryou-rise")}
    >
      <span aria-hidden="true" className={HERO_GRADIENT} />
      <span aria-hidden="true" className={HERO_GLOW} />
      <div className={HERO_GRID}>
        <div className={HERO_TEXT}>
          <p id="foryou-hero-title" className={HERO_TITLE}>
            {headline}
          </p>
          {sub && <p className={HERO_SUB}>{sub}</p>}
        </div>
        <div className={HERO_ORB_CELL}>
          <div className={HERO_ORB_BOX}>
            <MailOrb
              envelopes={Math.min(3, remaining)}
              flag={remainingFlag}
              tick={priority > 0 && remaining === 0}
              state={orbState}
              celebrate={celebrate}
            />
          </div>
        </div>
        <div className={HERO_TRAY_CELL}>
          <SummaryTray
            label={t("feed.important.tiles.aria")}
            top={
              slot && (
                <Slot
                  slot={slot}
                  photos={photos}
                  now={now}
                  refreshing={state.refreshing}
                  onOpen={onOpen}
                  onToList={onToList}
                  onToShelf={onToShelf}
                  onConnect={onConnect}
                  onRetry={onRetry}
                />
              )
            }
          >
            {stats}
          </SummaryTray>
        </div>
      </div>
    </section>
  )
}

function Slot({ slot, photos, now, refreshing, onOpen, onToList, onToShelf, onConnect, onRetry }) {
  const { t, locale } = useLocale()
  const arrow = (icon = ArrowRight01Icon, spin = false) => (
    <span aria-hidden="true" className={cn(CHIP, "bg-brand/[0.1] text-brand-ink")}>
      <HugeiconsIcon
        icon={icon}
        className={cn(
          "size-[1.125rem] transition-transform motion-safe:group-hover/next:translate-x-0.5",
          spin && "animate-spin motion-reduce:animate-none",
        )}
        strokeWidth={2.2}
      />
    </span>
  )
  const lines = (a, b) => (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[0.875rem] font-semibold">{a}</span>
      {b && (
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[0.75rem] text-muted-foreground">
          {b}
        </span>
      )}
    </span>
  )

  if (slot.kind === "outlook") {
    return (
      <a
        href="https://outlook.office.com/mail/"
        target="_blank"
        rel="noopener noreferrer"
        className={SLOT_ROW}
      >
        <span aria-hidden="true" className={cn(CHIP, "bg-destructive/10 text-destructive")}>
          <HugeiconsIcon icon={Flag02Icon} className="size-[1.125rem]" strokeWidth={1.9} />
        </span>
        {lines(t("feed.important.next.outlook"), t("feed.important.next.outlookSub"))}
        {arrow(ArrowUpRight01Icon)}
      </a>
    )
  }

  let content
  let onClick
  let label
  let busy = false
  if (slot.kind === "next") {
    const m = slot.item
    label = t("feed.important.next.aria", {
      subject: m.subject || t("feed.noSubject"),
      author: m.author,
    })
    onClick = () => onOpen(m.id)
    content = (
      <>
        <PersonAvatar name={m.author} photo={photos?.get(m.address)} className="size-9 shrink-0" />
        {lines(
          m.subject || t("feed.noSubject"),
          <>
            {/* Dar tepside işaretler bu satıra sığmıyor (alt alta diziliyorlardı);
                orada alttaki sayılar ve şeritler onları zaten gösteriyor. */}
            <FeedMarks post={m} className="shrink-0 flex-nowrap @max-[30rem]/tray:hidden" />
            <span className="shrink-0 font-semibold text-brand-ink">
              {t("feed.important.next.label")}
            </span>
            <span aria-hidden="true">·</span>
            <span className="min-w-0 truncate">{m.author}</span>
            <span aria-hidden="true">·</span>
            <time key={now} dateTime={m.received?.toISOString()} className="shrink-0">
              {formatAgo(m.received, locale)}
            </time>
          </>,
        )}
        {arrow()}
      </>
    )
  } else if (slot.kind === "reviewed" || slot.kind === "allInTodo") {
    const done = slot.kind === "allInTodo"
    onClick = onToList
    content = (
      <>
        <span
          aria-hidden="true"
          className={cn(
            CHIP,
            done
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-brand/[0.1] text-brand-ink",
          )}
        >
          <HugeiconsIcon
            icon={done ? Tick02Icon : CheckmarkCircle02Icon}
            className="size-[1.125rem]"
            strokeWidth={2}
          />
        </span>
        {lines(
          t(done ? "feed.important.next.allInTodo" : "feed.important.next.reviewed"),
          t("feed.important.next.toList"),
        )}
        {arrow()}
      </>
    )
  } else if (slot.kind === "calm") {
    onClick = onToShelf
    content = (
      <>
        <span aria-hidden="true" className={cn(CHIP, "bg-brand/[0.1] text-brand-ink")}>
          <HugeiconsIcon icon={PinIcon} className="size-[1.125rem]" strokeWidth={2} />
        </span>
        {lines(t("feed.important.next.calm"), t("feed.important.next.toShelf"))}
        {arrow()}
      </>
    )
  } else {
    const connect = slot.kind === "connect"
    onClick = connect ? onConnect : onRetry
    busy = !connect && refreshing
    content = (
      <>
        <span
          aria-hidden="true"
          className={cn(CHIP, "bg-amber-500/10 text-amber-700 dark:text-amber-400")}
        >
          <HugeiconsIcon icon={Alert02Icon} className="size-[1.125rem]" strokeWidth={2} />
        </span>
        {lines(t(connect ? "feed.connect" : "feed.retry"))}
        {arrow(connect ? ArrowRight01Icon : RefreshIcon, busy)}
      </>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (!busy) onClick?.()
      }}
      aria-label={label}
      aria-busy={busy || undefined}
      className={SLOT_ROW}
    >
      {/* Yalnız İÇİ yeniden doğar (sıradaki değişince kısa bir geçiş); düğmenin kendisi sabit. */}
      <span
        key={slot.kind === "next" ? slot.item.id : slot.kind}
        className="flex min-w-0 flex-1 items-center gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
      >
        {content}
      </span>
    </button>
  )
}
