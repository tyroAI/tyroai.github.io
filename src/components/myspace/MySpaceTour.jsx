import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useSearchParams } from "react-router-dom"
import { motion, useReducedMotion } from "motion/react"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * ANASAYFA TURU — ilk ziyarette sayfanın tamamı, GRUPLU adımlarla.
 *
 * ⚠️ **BENZER KARTLAR TEK ADIMDA.** Bir adım birden çok hedefi birlikte
 * aydınlatır ve madde madde anlatır (ör. toplantı · odak · ritim · küre):
 * tur kart sayısıyla uzamaz. Hedef bir `data-tour` adı ya da ad listesi —
 * listede İLK GÖRÜNEN alınır (masaüstünde kenar çubuğu, telefonda onu açan
 * düğme); görünür hedefi olmayan adım atlanır.
 *
 * ⚠️ **DAMGA TUR GÖSTERİLİRKEN YAZILIR**, bitince değil: yarıda kapanan sekme
 * turu her açılışta dayatmasın. Depo kapalıysa tur HİÇ açılmaz — kaydedilemeyen
 * bir "görüldü", her ziyarette yeniden tur demek. Anahtar `v2`: kısa sürümü
 * görenler ayrıntılı turu bir kez görsün. Yeniden göstermek: `?tour=1`.
 *
 * ⚠️ **BAŞKA BİR PENCERE AÇIKKEN BAŞLAMAZ** (Yenilikler, onaylar): ikinci bir
 * karartma, ilkinin düğmelerini erişilmez kılardı.
 *
 * ⚠️ **SAYFA TUR SÜRERKEN `inert`** (`#root`; tur `body`ye portalda): odak
 * kartın dışına kaçmıyor, vurgulanan alan tıklanmıyor. Tur bitince odak eski
 * yerine döner.
 *
 * Karartma tek bir SVG maskesi: her hedef için bir delik, kartın konumu hiçbir
 * deliği örtmeyecek biçimde seçilir. Ölçüm her karede hedefleri YENİDEN bulur —
 * özet balonu hava kartı gelince kolondan ızgaraya taşınıyor (yeni eleman).
 */
const SEEN_KEY = "tyro-myspace-tour-v2"
const STEPS = [
  { id: "start", targets: ["welcome", "brief"], items: ["item1", "item2", "item3"] },
  { id: "ask", targets: ["ask"], items: ["item1", "item2", "item3"] },
  {
    id: "cards",
    targets: ["meeting", "focus", "rhythm", "helporb"],
    items: ["item1", "item2", "item3", "item4"],
  },
  { id: "apps", targets: ["apps"], items: ["item1", "item2", "item3"] },
  {
    id: "nav",
    targets: [["nav", "nav-trigger"], "search", "notch"],
    // Çentik yalnız masaüstünde; telefonda aynı paneller üst çubukta.
    items: ["item1", "item2", (shown) => (shown.includes("notch") ? "item3" : "item3Narrow")],
  },
]
const START_DELAY_MS = 1200
const DIALOG_POLL_MS = 800
const PAD = 8 // vurgunun hedef çevresindeki payı
const GAP = 12 // vurgu ile kart arası
const EDGE = 12 // kartın ekran kenarına en yakın mesafesi

function seenOrUnwritable() {
  try {
    return Boolean(window.localStorage.getItem(SEEN_KEY))
  } catch {
    return true
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, new Date().toISOString())
  } catch {
    // Depo kapalı: `seenOrUnwritable` zaten turu açtırmıyor.
  }
}

function visibleEl(name) {
  const sel = name === "notch" ? '[data-slot="edge-notch"]' : `[data-tour="${name}"]`
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
      continue
    return el
  }
  return null
}

/** Adımın görünen hedefleri: `[{ name, el }]`; listeli hedefte ilk görünen. */
function resolveTargets(step) {
  const out = []
  for (const target of step.targets) {
    for (const name of Array.isArray(target) ? target : [target]) {
      const el = visibleEl(name)
      if (el) {
        out.push({ name, el })
        break
      }
    }
  }
  return out
}

const inside = (o, h) =>
  h.left >= o.left - 1 &&
  h.top >= o.top - 1 &&
  h.left + h.width <= o.left + o.width + 1 &&
  h.top + h.height <= o.top + o.height + 1

/** Delikler: ekrana kırpılmış, iç içe olanın halkası çift çizilmesin diye ayıklanmış. */
function holesOf(targets) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const raw = targets
    .map(({ name, el }) => {
      const r = el.getBoundingClientRect()
      const left = Math.max(r.left - PAD, 4)
      const top = Math.max(r.top - PAD, 4)
      const width = Math.min(r.right + PAD, vw - 4) - left
      const height = Math.min(r.bottom + PAD, vh - 4) - top
      return { name, left, top, width, height }
    })
    .filter((h) => h.width > 0 && h.height > 0)
  return raw.filter((h, i) => !raw.some((o, j) => j < i && inside(o, h)))
}

/** Sayfa içi hedefleri (Anasayfa'nın kaydırıcısında) kartla birlikte görünür kıl. */
function bringIntoView(targets, cardH, reduce) {
  const els = targets.map((x) => x.el).filter((el) => el.closest("[data-myspace-scroll]"))
  if (!els.length) return
  const scroller = els[0].closest("[data-myspace-scroll]")
  const sr = scroller.getBoundingClientRect()
  const rects = els.map((el) => el.getBoundingClientRect())
  const top = Math.min(...rects.map((r) => r.top))
  const height = Math.max(...rects.map((r) => r.bottom)) - top
  // Hedefler + altlarındaki kart bir blok gibi ortalanır; sığmazsa hedeflerin
  // başı üste hizalanır.
  const block = height + GAP + cardH
  const want = block <= sr.height - 48 ? sr.top + (sr.height - block) / 2 : sr.top + 24
  scroller.scrollBy({ top: top - want, behavior: reduce ? "auto" : "smooth" })
}

/** Kartın yeri: ilk hedefin altı · üstü · sağı · solu; hiçbiri olmazsa ekranın dibi. */
function placeCard(holes, w, h) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const fits = (c) =>
    c.left >= EDGE && c.top >= EDGE && c.left + w <= vw - EDGE && c.top + h <= vh - EDGE
  const clear = (c) =>
    holes.every(
      (o) =>
        c.left + w <= o.left ||
        c.left >= o.left + o.width ||
        c.top + h <= o.top ||
        c.top >= o.top + o.height,
    )
  const cx = (x) => Math.min(Math.max(x, EDGE), vw - w - EDGE)
  const cy = (y) => Math.min(Math.max(y, EDGE), vh - h - EDGE)
  const p = holes[0]
  if (p) {
    const candidates = [
      { left: cx(p.left), top: p.top + p.height + GAP },
      { left: cx(p.left), top: p.top - GAP - h },
      { left: p.left + p.width + GAP, top: cy(p.top) },
      { left: p.left - GAP - w, top: cy(p.top) },
    ]
    for (const c of candidates) if (fits(c) && clear(c)) return c
  }
  const bottom = { left: (vw - w) / 2, top: vh - h - 16 }
  const top = { left: (vw - w) / 2, top: 16 }
  return clear(bottom) || !clear(top) ? bottom : top
}

export function MySpaceTour() {
  const { t } = useLocale()
  const reduce = useReducedMotion()
  const [params, setParams] = useSearchParams()
  const replay = params.get("tour") === "1"
  const [index, setIndex] = useState(null) // null = kapalı
  const [layout, setLayout] = useState(null) // { holes, shown }
  const [cardSize, setCardSize] = useState({ w: 360, h: 260 })
  const cardRef = useRef(null)
  const primaryRef = useRef(null)
  const returnFocusRef = useRef(null)
  const focusedRef = useRef(null)
  const titleId = useId()
  const bodyId = useId()
  const maskId = `tour-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`

  // İlk ziyaret: damga yoksa, sayfa oturduktan ve açık pencere kalmadığında.
  useEffect(() => {
    if (seenOrUnwritable()) return undefined
    let timer
    const attempt = () => {
      if (document.querySelector('[role="dialog"][data-state="open"]')) {
        timer = setTimeout(attempt, DIALOG_POLL_MS)
        return
      }
      setIndex(0)
    }
    timer = setTimeout(attempt, START_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  // Yeniden göster: parametre adreste kalmaz (yenileyince tur tekrar açılmasın).
  // ⚠️ Tur HEMEN açılır, zamanlayıcıyla DEĞİL: parametreyi silmek bu efekti
  // `replay=false` ile yeniden koşturup bekleyen zamanlayıcıyı iptal ediyordu.
  useEffect(() => {
    if (!replay) return
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.delete("tour")
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/set-state-in-effect -- adresin isteği bir kez tüketiliyor
    setIndex(0)
  }, [replay, setParams])

  const active = index != null

  // Tur açıkken sayfa `inert`; kapanınca odak eski yerine.
  useEffect(() => {
    if (!active) return undefined
    markSeen()
    returnFocusRef.current = document.activeElement
    const root = document.getElementById("root")
    if (root) root.inert = true
    return () => {
      if (root) root.inert = false
      focusedRef.current = null
      const back = returnFocusRef.current
      if (back && typeof back.focus === "function") back.focus({ preventScroll: true })
    }
  }, [active])

  // Adımın hedefleri: görünür kıl, ölç; kaydırma ve boy değişiminde yeniden ölç.
  useLayoutEffect(() => {
    if (!active) return undefined
    const step = STEPS[index]
    const first = resolveTargets(step)
    if (!first.length) {
      // Görünür hedef yok: adım atlanır, son adımdaysa tur biter.
      const timer = setTimeout(() => setIndex((i) => (i < STEPS.length - 1 ? i + 1 : null)), 0)
      return () => clearTimeout(timer)
    }
    bringIntoView(first, cardRef.current?.offsetHeight ?? 260, reduce)
    let frame = 0
    const ro = new ResizeObserver(() => measure())
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const targets = resolveTargets(step)
        for (const x of targets) ro.observe(x.el)
        setLayout({ holes: holesOf(targets), shown: targets.map((x) => x.name) })
      })
    }
    measure()
    for (const x of first) ro.observe(x.el)
    const scroller = document.querySelector("[data-myspace-scroll]")
    scroller?.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      scroller?.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
    }
  }, [active, index, reduce])

  // Kartın gerçek boyu konum kararına girsin (madde sayısı ve dil değiştiriyor).
  const hasLayout = layout != null
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!active || !hasLayout || !el) return undefined
    const ro = new ResizeObserver(() =>
      setCardSize((s) =>
        s.w === el.offsetWidth && s.h === el.offsetHeight
          ? s
          : { w: el.offsetWidth, h: el.offsetHeight },
      ),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [active, hasLayout])

  // Odak adım BAŞINA bir kez: ölçüm her kaydırmada yenileniyor ve her seferinde
  // odaklamak, Tab'la "Turu geç"e geçen kişiyi geri çekerdi.
  useEffect(() => {
    if (!active || !layout || focusedRef.current === index) return
    focusedRef.current = index
    primaryRef.current?.focus({ preventScroll: true })
  }, [active, index, layout])

  if (!active || !layout) return null

  const step = STEPS[index]
  const last = index === STEPS.length - 1
  const finish = () => {
    setIndex(null)
    setLayout(null)
  }
  const next = () => (last ? finish() : setIndex(index + 1))
  const back = () => index > 0 && setIndex(index - 1)
  const pos = placeCard(layout.holes, cardSize.w, cardSize.h)
  const tween = reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 34 }

  return createPortal(
    <div
      className="fixed inset-0 z-[70]"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault()
          finish()
        } else if (e.key === "ArrowRight") next()
        else if (e.key === "ArrowLeft") back()
      }}
    >
      <svg aria-hidden="true" className="pointer-events-none fixed inset-0 size-full">
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            {layout.holes.map((h, i) => (
              <motion.rect
                key={i}
                rx={20}
                fill="black"
                initial={false}
                animate={{ x: h.left, y: h.top, width: h.width, height: h.height }}
                transition={tween}
              />
            ))}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgb(0 0 0 / 0.5)" mask={`url(#${maskId})`} />
      </svg>
      {layout.holes.map((h, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          className="pointer-events-none fixed rounded-[1.25rem] ring-2 ring-white/80"
          initial={false}
          animate={{ top: h.top, left: h.left, width: h.width, height: h.height }}
          transition={tween}
        />
      ))}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="fixed w-[min(22.5rem,calc(100vw-1.5rem))] rounded-2xl bg-neutral-900 p-4 text-white shadow-2xl ring-1 ring-white/10 dark:bg-neutral-800"
        style={{ left: pos.left, top: pos.top }}
      >
        {/* Canlı bölge KALICI, içi adımla yeniden doğar: yeni eklenen bir canlı
            bölgenin içeriği okunmaz, değişen içeriği okunur. */}
        <div aria-live="polite">
          <motion.div
            key={step.id}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[color-mix(in_oklch,var(--brand-to)_62%,white)]">
              {t("myspace.tour.counter", { n: index + 1, total: STEPS.length })}
            </p>
            <h2 id={titleId} className="mt-1 text-[0.9375rem] font-semibold leading-snug">
              {t(`myspace.tour.${step.id}.title`)}
            </h2>
            <ul id={bodyId} className="mt-2 space-y-1.5">
              {step.items.map((item) => {
                const key = typeof item === "function" ? item(layout.shown) : item
                return (
                  <li
                    key={key}
                    className="flex gap-2 text-[0.8125rem] leading-relaxed text-white/80"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-[color-mix(in_oklch,var(--brand-to)_62%,white)]"
                    />
                    <span>{t(`myspace.tour.${step.id}.${key}`)}</span>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={finish}
            className="rounded-full px-2 py-1.5 text-[0.75rem] font-medium text-white/60 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {t("myspace.tour.skip")}
          </button>
          <div className="flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-full px-3 py-1.5 text-[0.75rem] font-semibold text-white outline-none ring-1 ring-white/20 transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {t("myspace.tour.back")}
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              onClick={next}
              className={cn(
                "rounded-full bg-gradient-to-br from-brand-from via-brand-via to-brand-to px-3.5 py-1.5 text-[0.75rem] font-semibold text-brand-on-brand outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/70",
                "[@media(pointer:coarse)]:min-h-10",
              )}
            >
              {last ? t("myspace.tour.done") : t("myspace.tour.next")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
