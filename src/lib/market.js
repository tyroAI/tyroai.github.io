/**
 * Piyasa verisi — Türkiye bazlı kurlar, altın ve BIST 100.
 *
 * DEMO: iki uç da `src/demo/handlers/external.js`te KURGUSAL verilerle cevaplanır,
 * hiçbir istek ağa çıkmaz. Yanıt şekilleri gerçek servislerin aynısı:
 * - Birincil: Truncgil biçimi (`v4/today.json`) — döviz (alış · satış · % değişim),
 *   gram/çeyrek altın, BIST 100.
 * - Yedek: Frankfurter biçimi (ECB, günlük) — yalnız döviz.
 */

const TRUNCGIL = "https://finans.truncgil.com/v4/today.json"
const ECB = "https://api.frankfurter.dev/v1/latest?base=TRY&symbols=USD,EUR,GBP"
const TTL = 5 * 60_000

/**
 * Kartta gösterilenler, sırasıyla: kaynak anahtarı → kartın kimliği. Altı kutucuk
 * (3×2): solda kurlar (dolar · euro · sterlin), sağda altın ve BIST 100.
 */
export const MARKET_ROWS = [
  { id: "usd", key: "USD", kind: "fx" },
  { id: "eur", key: "EUR", kind: "fx" },
  { id: "gbp", key: "GBP", kind: "fx" },
  { id: "gram", key: "GRA", kind: "gold" },
  { id: "quarter", key: "CEYREKALTIN", kind: "gold" },
  { id: "bist", key: "XU100", kind: "index" },
]

/**
 * Kartın altındaki dış bağlantılar (yeni sekmede açılır). Demoda YOK: liste boşken
 * kart bağlantı satırını hiç çizmez.
 */
export const CBOT_LINKS = []

const num = (v) => {
  const n = typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : Number(v)
  return Number.isFinite(n) ? n : null
}

/** Truncgil yanıtı → kartın satırları. Fiyatı olmayan (0) satır düşer. */
export function parseTruncgil(data) {
  const rows = MARKET_ROWS.map((r) => {
    const raw = data?.[r.key]
    const value = num(raw?.Selling) || num(raw?.Buying)
    return value ? { ...r, value, change: num(raw?.Change) } : null
  }).filter(Boolean)
  const at =
    typeof data?.Update_Date === "string" ? new Date(data.Update_Date.replace(" ", "T")) : null
  return { rows, at: at && !Number.isNaN(at.getTime()) ? at : null, source: "truncgil" }
}

/** Frankfurter (TRY tabanlı) → döviz satırları (değişim bilinmiyor). */
export function parseEcb(data) {
  const rates = data?.rates ?? {}
  const rows = MARKET_ROWS.filter((r) => r.kind === "fx")
    .map((r) => (rates[r.key] ? { ...r, value: 1 / rates[r.key], change: null } : null))
    .filter(Boolean)
  const at = data?.date ? new Date(`${data.date}T16:00:00Z`) : null
  return { rows, at, source: "ecb" }
}

let cache = null
let inflight = null

async function getJson(url) {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Satırlar + güncelleme anı; birincil düşerse yedek. İkisi de düşerse `null`. */
export function fetchMarket({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.fetchedAt < TTL) return Promise.resolve(cache.value)
  if (inflight) return inflight
  inflight = (async () => {
    const primary = await getJson(TRUNCGIL).then(parseTruncgil, () => null)
    const value = primary?.rows.length ? primary : await getJson(ECB).then(parseEcb, () => null)
    if (value) cache = { value, fetchedAt: Date.now() }
    inflight = null
    return value ?? cache?.value ?? null
  })()
  return inflight
}
