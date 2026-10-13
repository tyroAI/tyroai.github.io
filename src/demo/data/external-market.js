// Piyasa verisi — TÜMÜ KURGUSAL ama makul (Ekim 2026 civarına ayarlı).
//
// Truncgil `v4/today.json` ve Frankfurter `v1/latest` yanıtlarının BİREBİR şekli
// (`lib/market.js` › `parseTruncgil` / `parseEcb`). Değerler ZAMANA göre belirlenir:
// her gün tohumlu küçük bir oynama + yavaş bir eğilim (TL'nin aylık değer kaybı,
// altının ve BIST'in yükselişi), gün içinde beş dakikada bir hafif kıpırdanma.
// Aynı anda bakan herkes aynı rakamı görür; ertesi gün rakam değişir.

const DAY = 86_400_000
const TZ_OFFSET = 3 * 3_600_000 // İstanbul: kalıcı UTC+3
/** Değerlerin ayarlandığı gün (İstanbul yerel günü). */
const BASE_DAY = Math.floor((Date.UTC(2026, 9, 13) + TZ_OFFSET) / DAY)

/**
 * key → [ad, tür, taban satış fiyatı (TL), günlük eğilim (oran), günlük oynama (±oran), alış/satış farkı (oran)].
 * Türler Truncgil'in kendi değerleri: "Currency" · "Gold" · "Index".
 */
const INSTRUMENTS = {
  USD: ["ABD Doları", "Currency", 47.4185, 0.00052, 0.0016, 0.0008],
  EUR: ["Euro", "Currency", 55.1842, 0.00055, 0.0028, 0.0009],
  GBP: ["İngiliz Sterlini", "Currency", 63.3906, 0.00053, 0.003, 0.0011],
  CHF: ["İsviçre Frangı", "Currency", 59.2745, 0.00056, 0.0026, 0.0012],
  JPY: ["Japon Yeni", "Currency", 0.3121, 0.00048, 0.004, 0.0016],
  GRA: ["Gram Altın", "Gold", 6412.35, 0.0004, 0.009, 0.0018],
  CEYREKALTIN: ["Çeyrek Altın", "Gold", 10548.0, 0.0004, 0.009, 0.0125],
  YARIMALTIN: ["Yarım Altın", "Gold", 21052.0, 0.0004, 0.009, 0.0125],
  TAMALTIN: ["Tam Altın", "Gold", 41968.0, 0.0004, 0.009, 0.0125],
  GUMUS: ["Gümüş", "Gold", 78.42, 0.0003, 0.014, 0.012],
  XU100: ["BIST 100", "Index", 12480.55, 0.00045, 0.011, 0],
}

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // murmur3 fmix32: yakın tohumlar (gün 1, gün 2…) birbirine benzer sayı vermesin
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}
/** Tohumdan [-1, 1) aralığında sabit bir sayı. */
const unit = (seed) => (hash(seed) / 4294967296) * 2 - 1

const localDay = (t) => Math.floor((t + TZ_OFFSET) / DAY)
const isWeekend = (day) => {
  const wd = new Date(day * DAY).getUTCDay()
  return wd === 0 || wd === 6
}
/** Piyasa hafta sonu kapalı: cumartesi/pazar cumanın kapanışını taşır. */
function tradingDay(day) {
  let d = day
  while (isWeekend(d)) d -= 1
  return d
}
const prevTradingDay = (day) => tradingDay(tradingDay(day) - 1)

/** Bir işlem gününün kapanış fiyatı (satış). */
function close(key, day) {
  const [, , base, drift, vol] = INSTRUMENTS[key]
  return base * Math.exp(drift * (day - BASE_DAY)) * (1 + unit(`mkt-${key}-${day}`) * vol)
}

/** Şu anki fiyat: bugünün kapanışına doğru, beş dakikalık dilimlerde hafif kıpırdanarak. */
function quote(key, now) {
  const [, , , , vol] = INSTRUMENTS[key]
  const today = localDay(now)
  const day = tradingDay(today)
  const open = !isWeekend(today)
  const hourIst = new Date(now + TZ_OFFSET).getUTCHours() + new Date(now).getUTCMinutes() / 60
  // 09:30 öncesi dünkü kapanışa yakın, 18:00'den sonra bugünün kapanışı
  const progress = open ? Math.min(1, Math.max(0, (hourIst - 9.5) / 8.5)) : 1
  const prev = close(key, prevTradingDay(today))
  const target = close(key, day)
  const slot = Math.floor(now / 300_000)
  const wobble = open && progress < 1 ? unit(`mkt-${key}-slot-${slot}`) * vol * 0.12 : 0
  const value = (prev + (target - prev) * (0.35 + 0.65 * progress)) * (1 + wobble)
  return { value, prev }
}

const fixed = (n, key) => {
  const digits = INSTRUMENTS[key][1] === "Currency" ? 4 : 2
  return Number(n.toFixed(digits))
}

/** Tarayıcının yerel saatiyle "YYYY-MM-DD HH:mm:ss" (Truncgil'in biçimi, kart yerel saat sanıyor). */
function localStamp(d) {
  const p = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** Son güncelleme: iş günü gün içinde birkaç dakika önce; hafta sonu cuma 18:05 (İstanbul). */
function updatedAt(now) {
  const today = localDay(now)
  if (!isWeekend(today)) return new Date(Math.floor(now / 60_000) * 60_000 - 2 * 60_000 - 17_000)
  const friday = tradingDay(today)
  return new Date(friday * DAY - TZ_OFFSET + 18 * 3_600_000 + 5 * 60_000 + 12_000)
}

/** `finans.truncgil.com/v4/today.json` */
export function truncgilToday(now = Date.now()) {
  const out = { Update_Date: localStamp(updatedAt(now)) }
  for (const [key, [name, type, , , , spread]] of Object.entries(INSTRUMENTS)) {
    const { value, prev } = quote(key, now)
    out[key] = {
      Type: type,
      Name: name,
      Change: Number((((value - prev) / prev) * 100).toFixed(2)),
      Buying: fixed(value * (1 - spread), key),
      Selling: fixed(value, key),
    }
  }
  return out
}

/** ECB referans günü: 16:00 (Orta Avrupa) öncesi bir önceki iş günü. */
function ecbDay(now) {
  const cet = now + 3_600_000 // kaba CET; dakika hassasiyeti gerekmiyor
  const hour = new Date(cet).getUTCHours()
  let day = Math.floor(cet / DAY)
  if (hour < 16) day -= 1
  while (isWeekend(day)) day -= 1
  return day
}

/** `api.frankfurter.dev/v1/latest?base=…&symbols=…` — ECB günlük referansı (yalnız döviz). */
export function frankfurterLatest({ base = "EUR", symbols, amount = 1, now = Date.now() } = {}) {
  const day = ecbDay(now)
  const tl = (code) =>
    code === "TRY" ? 1 : INSTRUMENTS[code]?.[1] === "Currency" ? close(code, day) : null
  const baseTl = tl(base.toUpperCase())
  if (!baseTl) return null
  const wanted = symbols
    ? symbols.split(",").map((s) => s.trim().toUpperCase())
    : ["TRY", ...Object.keys(INSTRUMENTS).filter((k) => INSTRUMENTS[k][1] === "Currency")]
  const rates = {}
  for (const code of wanted) {
    const v = tl(code)
    if (v && code !== base.toUpperCase()) rates[code] = Number(((baseTl / v) * amount).toFixed(5))
  }
  return {
    amount: Number(amount),
    base: base.toUpperCase(),
    date: new Date(day * DAY).toISOString().slice(0, 10),
    rates,
  }
}
