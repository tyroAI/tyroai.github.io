/**
 * SANA ÖZEL PANOSUNUN SAF HESABI (2026-10-01) — ağ YOK, JSX YOK, `Date.now()`
 * YOK (`now` çağırandan: Keşfet'in dakika tiki).
 *
 * ⚠️ **İKİ AYRI SAYIM, İKİ AYRI SORU.** Kutucuklar (Sabitlenmiş · Bayraklı ·
 * Yüksek önem) ÖRTÜŞEN sayar: "Bayraklı 3" Outlook'un kendi bayrak süzgeciyle
 * aynı sayı olmalı. Şeritler (liste grupları) ise Outlook'un sırasıyla İLK
 * uyduğu grupta tutar — aynı posta iki kez çizilmez; aradaki fark şeridin
 * başlığında yazıyor ("+1 yukarıda"). Kutucuğa basınca liste o işarete
 * süzülür ve görünen sayı kutucuğunkine EŞİT olur.
 *
 * ⚠️ **"SIRADAKİ" BİR TAHMİN DEĞİL, BİR KURAL** (`nextUp`): yüksek önemli ve
 * okunmamış (en yenisi) → bayraklı ve okunmamış (en yenisi) → bayraklı (EN
 * ESKİSİ — en uzun bekleyen) → yüksek önemli (en yenisi). Bu oturumda açılan
 * ve To-Do'ya devredilen posta sıradan çıkar.
 */

export const MARKS = ["pinned", "flagged", "high"]
export const SHELF_COLLAPSE = 4
export const ROW_COLLAPSE = 6
export const STALE_DAYS = 7
export const ASK_MAX = 15
export const TIP_MAX = 3
export const CELEBRATE_MS = 1800

/** Outlook'un sırası; ton Outlook'un rengi (bayrak ve yüksek önem kırmızı). */
export const LANES = [
  { id: "pinned", tone: "text-brand-ink", test: (m) => Boolean(m?.pinned) },
  { id: "flagged", tone: "text-destructive", test: (m) => m?.flag === "flagged" },
  { id: "high", tone: "text-destructive", test: (m) => m?.importance === "high" },
]

export function matchesMark(m, mark) {
  const lane = LANES.find((l) => l.id === mark)
  return lane ? lane.test(m) : true
}

/**
 * Şeritler: `[{ id, items, above }]`, Outlook'un sırasıyla, İLK uyan şeritte.
 * `above` = bu şeridin işaretini taşıyıp daha üstteki bir şeritte duranlar.
 * Gelen sıra korunur (en yeni üstte); boş şerit hiç dönmez.
 */
export function buildLanes(items) {
  const used = new Set()
  const out = []
  for (const lane of LANES) {
    const list = []
    let above = 0
    for (const m of items ?? []) {
      if (!lane.test(m)) continue
      if (used.has(m.id)) {
        above += 1
        continue
      }
      used.add(m.id)
      list.push(m)
    }
    if (list.length) out.push({ id: lane.id, items: list, above })
  }
  return out
}

/** Kutucukların ÖRTÜŞEN sayıları. */
export function markCounts(items) {
  const out = { pinned: 0, flagged: 0, high: 0 }
  for (const m of items ?? []) for (const lane of LANES) if (lane.test(m)) out[lane.id] += 1
  return out
}

/** Takip bekleyenler: bayraklı ya da yüksek önemli (sabitli olan tek başına bir iş değil). */
export function priorityOf(items) {
  return (items ?? []).filter((m) => m?.flag === "flagged" || m?.importance === "high")
}

const time = (m) => m?.received?.getTime?.() ?? 0
const newest = (a, b) => time(b) - time(a)
const oldest = (a, b) => time(a) - time(b)

/** `nextUp`ın dört basamağı, sırasıyla (yinelenen ileti ilk basamağında kalır). */
function ranked(cands) {
  const steps = [
    cands.filter((m) => m.importance === "high" && !m.isRead).sort(newest),
    cands.filter((m) => m.flag === "flagged" && !m.isRead).sort(newest),
    cands.filter((m) => m.flag === "flagged").sort(oldest),
    cands.filter((m) => m.importance === "high").sort(newest),
  ]
  const seen = new Set()
  const out = []
  for (const step of steps) for (const m of step) if (!seen.has(m.id) && seen.add(m.id)) out.push(m)
  return out
}

/** Sıradaki posta ya da `null`. `opened`/`sent` = bu oturumda açılan / To-Do'ya giden kimlikler. */
export function nextUp(items, { opened, sent } = {}) {
  const cands = priorityOf(items).filter((m) => !opened?.has(m.id) && !sent?.has(m.id))
  return ranked(cands)[0] ?? null
}

function localDay(t) {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** Karşılamanın alt satırı: `{ total, unread, today }` (diziler en yeni üstte). */
export function summarize(items, now) {
  const list = [...(items ?? [])].sort(newest)
  const today = localDay(now)
  return {
    total: list.length,
    unread: list.filter((m) => !m.isRead),
    today: list.filter((m) => m.received && localDay(m.received.getTime()) === today),
  }
}

/** En uzun bekleyen bayraklı posta (kutucuğun "En eskisi …" satırı). */
export function oldestFlagged(items) {
  const flagged = (items ?? []).filter((m) => m.flag === "flagged" && m.received)
  return flagged.length ? flagged.sort(oldest)[0] : null
}

/** Bayraklı ve bir haftadan eski → satırda kehribar zaman. */
export function isStale(m, now) {
  return (
    m?.flag === "flagged" && Boolean(m.received) && now - m.received.getTime() >= STALE_DAYS * 864e5
  )
}

/**
 * "TYRO ile önceliklendir"in bağlamı: en çok 15 satır — önce takip
 * bekleyenler `nextUp` sırasıyla, sonra yalnız sabitli olanlar. Satıra YALNIZ
 * konu, gönderen, işaret adları ve yaş girer; önizleme ve gövde GİTMEZ.
 * ⚠️ Metin şablon dizesiyle kurulur, `.replace()` ile değil (konudaki `$`).
 *
 * @param {object[]} items
 * @param {{ t: Function, ago: (date: Date) => string }} deps
 */
export function askLines(items, { t, ago }) {
  const priority = ranked(priorityOf(items))
  const ids = new Set(priority.map((m) => m.id))
  const pinnedOnly = (items ?? []).filter((m) => m.pinned && !ids.has(m.id)).sort(newest)
  const all = [...priority, ...pinnedOnly]
  const lines = all.slice(0, ASK_MAX).map((m) => {
    const marks = LANES.filter((l) => l.test(m))
      .map((l) => t(`feed.mark.${l.id}`))
      .join(", ")
    return `• [${marks}] ${m.subject || t("feed.noSubject")} — ${m.author}, ${ago(m.received)}`
  })
  if (all.length > ASK_MAX) lines.push(t("feed.important.ask.more", { n: all.length - ASK_MAX }))
  return lines
}
