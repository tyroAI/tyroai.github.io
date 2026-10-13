import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useLocale } from "@/hooks/useLocale"
import { useMailHandoff } from "@/hooks/useMailHandoff"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { requestOpenChat, setPendingAsk } from "@/lib/chatBus"
import { formatAgo } from "@/lib/date"
import { searchPosts } from "@/lib/feed"
import {
  CELEBRATE_MS,
  MARKS,
  askLines,
  buildLanes,
  markCounts,
  matchesMark,
  nextUp,
  priorityOf,
  summarize,
} from "@/lib/forYouBoard"
import { STATUS } from "@/lib/graph"
import { getDateTimeFormat, pluralKey } from "@/lib/intl-cache"
import { ForYouHero } from "./ForYouHero"
import { ForYouList } from "./ForYouList"
import { ForYouSkeleton } from "./ForYouSkeleton"
import { ForYouStats } from "./ForYouStats"
import { MailOrb } from "./MailOrb"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  KEŞFET › SANA ÖZEL — işaretli postaların panosu (2026-10-01)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İstek: *"dosyalarım ve sana özel sekmesinde de aynı şekilde yapmalıyız —
 * ferah, canlı, enerjik, bentolu; tüm fonksiyonlar kalsın"*.
 *
 *   KART   sayım + zarflı maskot; beyaz tepside "Sıradaki" (bir sonraki iş, tek
 *          dokunuş) ve Sabitlenmiş · Bayraklı · Yüksek önem — her biri süzgeç kapısı
 *   LİSTE  raf (sabitliler, kart) · bayraklı · yüksek önem (satır)
 *
 * ⚠️ TEK KART (2026-10-02, istek: *"resimdeki kısmı birleştir, ferah ve
 * compact"*): üç kutucuk kartın tepsisine girdi; liste başı 1440×900'de
 * 652 → ~470 px.
 *
 * Veri `useImportantMail`den (FeedPage — Akışım sekmesiyle ORTAK, yeni istek
 * YOK). Süzgeç adreste (`?mark=`, replace): kutucuğa basınca liste o işarete
 * daralır ve görünen sayı kutucuğunkine eşittir. Arama (Keşfet'in kutusu)
 * yalnız LİSTEYİ süzer; pano süzülmemiş hâli anlatır.
 *
 * ⚠️ "Sıradaki" ve To-Do'ya devredilenler OTURUM KAYDINDA (`lib/forYouSession.js`)
 * — sekme değişince sıfırlanmasın, çıkışta düşsün.
 */
const OPTS_ASK = { day: "numeric", month: "long", year: "numeric" }

export function ForYouPanel({
  state,
  query,
  now,
  onOpen,
  onConnect,
  onRetry,
  onClearQuery,
  todoOpen,
}) {
  const { t, locale } = useLocale()
  const [params, setParams] = useSearchParams()
  const rawMark = params.get("mark")
  const mark = MARKS.includes(rawMark) ? rawMark : null
  const items = useMemo(() => state.items ?? [], [state.items])
  const searched = useMemo(() => searchPosts(items, query), [items, query])
  const listed = useMemo(
    () => (mark ? searched.filter((m) => matchesMark(m, mark)) : searched),
    [searched, mark],
  )
  const lanes = useMemo(() => buildLanes(listed), [listed])
  const counts = useMemo(() => markCounts(items), [items])
  const summary = useMemo(() => summarize(items, now), [items, now])
  const addresses = useMemo(
    () => [...new Set(items.map((m) => m.address).filter(Boolean))],
    [items],
  )
  const photos = usePeoplePhotos(addresses)
  const handoff = useMailHandoff()
  const { session } = handoff
  const sent = useMemo(
    () => new Set([...session.todo].filter(([, e]) => e.state === "done").map(([id]) => id)),
    [session],
  )
  const busy = useMemo(() => [...session.todo.values()].some((e) => e.state === "busy"), [session])
  const priority = useMemo(() => priorityOf(items), [items])
  const remainingItems = priority.filter((m) => !sent.has(m.id))
  const next = useMemo(
    () => nextUp(items, { opened: session.opened, sent }),
    [items, session.opened, sent],
  )
  const capped = Object.values(state.capped ?? {}).some(Boolean)
  const listRef = useRef(null)
  const titleRef = useRef(null)
  const [celebrate, setCelebrate] = useState(false)
  const [freshId, setFreshId] = useState(null)
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Kademe yalnız veri önbellekten HAZIR geldiyse: iskelet gösterildiyse yeniden doğmak titreme olurdu.
  const [enter] = useState(() => state.status !== "loading")
  const loading = state.status === "loading"
  const ready = state.status === STATUS.ready
  const showList = ready && items.length > 0

  function later(fn, ms) {
    timers.current.push(setTimeout(fn, ms))
  }
  /** To-Do'ya giden satırın ışığı + maskotun sevinci (To-Do'nun `cheer`i). */
  function done(id) {
    setFreshId(id)
    setCelebrate(true)
    later(() => setFreshId((cur) => (cur === id ? null : cur)), 1600)
    later(() => setCelebrate(false), CELEBRATE_MS)
  }

  function scrollToList() {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    requestAnimationFrame(() =>
      listRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }),
    )
  }
  /** Kutucuk kapısı: süzgeci aç/kapat (replace), listeye kaydır; odak kutucukta kalır. */
  function toggleMark(id) {
    const p = new URLSearchParams(params)
    if (mark === id) p.delete("mark")
    else p.set("mark", id)
    setParams(p, { replace: true })
    scrollToList()
  }
  /** Çipteki ✕: süzgeç kalkar, odak eşleşen kutucuğa döner. */
  function clearMark() {
    const id = mark
    const p = new URLSearchParams(params)
    p.delete("mark")
    setParams(p, { replace: true })
    requestAnimationFrame(() => document.getElementById(`foryou-tile-${id}`)?.focus())
  }
  function toList() {
    scrollToList()
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }))
  }
  function toShelf() {
    const head = document.getElementById("foryou-lane-pinned")
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    head?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" })
    head?.focus({ preventScroll: true })
  }
  /**
   * "TYRO ile önceliklendir" — soru sohbete park edilir, rıhtım açılır, sayfa
   * yerinde kalır (To-Do'nun `askTyro`su). Bağlama YALNIZ konu, gönderen,
   * işaret ve yaş girer; önizleme ve gövde GİTMEZ.
   */
  function askTyro() {
    const date = getDateTimeFormat(locale, OPTS_ASK).format(new Date(now))
    const lines = askLines(items, { t, ago: (d) => formatAgo(d, locale) })
    setPendingAsk({
      question: t("feed.important.ask.question"),
      context: `${t("feed.important.ask.context", { date })}\n${lines.join("\n")}`,
      agent: "tyro office",
    })
    requestOpenChat({})
  }

  const announce = loading
    ? t("myspace.loading")
    : ready
      ? t(pluralKey("feed.important.countAnnounce", locale, listed.length), { n: listed.length })
      : ""

  if (loading) {
    return <ForYouSkeleton now={now} mascot={<MailOrb envelopes={2} state="searching" />} />
  }

  return (
    <div className="@container/foryou min-w-0">
      <div className="pb-20">
        <p role="status" aria-live="polite" className="sr-only">
          {announce}
        </p>
        <section aria-labelledby="foryou-summary-title">
          <h2 id="foryou-summary-title" className="sr-only">
            {t("feed.important.hero.aria")}
          </h2>
          <ForYouHero
            state={state}
            summary={summary}
            next={next}
            counts={counts}
            priority={priority.length}
            remaining={remainingItems.length}
            remainingFlag={remainingItems.some((m) => m.flag === "flagged")}
            capped={capped}
            photos={photos}
            busy={busy}
            celebrate={celebrate}
            now={now}
            enter={enter}
            onOpen={onOpen}
            onToList={toList}
            onToShelf={toShelf}
            onConnect={onConnect}
            onRetry={onRetry}
            stats={
              <ForYouStats
                state={state}
                items={items}
                counts={counts}
                mark={mark}
                now={now}
                listRendered={showList}
                onToggle={toggleMark}
              />
            }
          />
        </section>
        {showList && (
          <section
            ref={listRef}
            id="foryou-list"
            aria-labelledby="foryou-list-title"
            className="mt-8 scroll-mt-4 @[34rem]/foryou:mt-10"
          >
            <ForYouList
              state={state}
              lanes={lanes}
              listed={listed}
              mark={mark}
              query={query}
              now={now}
              photos={photos}
              freshId={freshId}
              handoff={handoff}
              todoOpen={todoOpen}
              canAsk={priority.length > 0}
              titleRef={titleRef}
              onOpen={onOpen}
              onDone={done}
              onAsk={askTyro}
              onClearMark={clearMark}
              onClearQuery={onClearQuery}
            />
          </section>
        )}
      </div>
    </div>
  )
}
