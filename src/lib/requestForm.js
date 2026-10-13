import { TR_HOLIDAYS } from "@/lib/holidays"
import {
  PROMPT_TEMPLATES,
  composeTemplate,
  initialValues,
  isSlotEmpty,
  isValidAmount,
} from "@/lib/promptTemplates"

/**
 * SELF SERVİS TALEP FORMLARI — saf katman. Alanlar sohbetin alanlı şablonundan
 * (`PROMPT_TEMPLATES`) üretilir; gönderilen metin de şablonun cümlesidir (`composeTemplate`),
 * yani form ile bestecideki cümle asistana aynı biçimde ulaşır. Ayrıntı:
 * docs/features/self-servis-talep.md.
 */

/** Sayfanın talep türü → şablon anahtarı. */
export const FORM_TEMPLATE = { leave: "leaveRequest", expense: "expense", advance: "advance" }

/**
 * Formun alanları, şablondaki tanım sırasıyla. Tutarın para birimi ayrı satır değil, tutar
 * alanının eki (`unit`). `extra`: eklenebilir alanlar — formda "+ alan" çipiyle açılır.
 */
export function formFields(key) {
  const slots = PROMPT_TEMPLATES[key]?.slots ?? {}
  const main = []
  const extra = []
  for (const [name, slot] of Object.entries(slots)) {
    if (name === "currency" && slots.amount) continue
    const field = { name, slot, unit: name === "amount" && slots.currency ? "currency" : null }
    ;(slot.addable ? extra : main).push(field)
  }
  return { main, extra }
}

/**
 * Alanların hataları: `required` (boş zorunlu), `amount` (geçersiz tutar), `order` (bitiş
 * başlangıçtan önce). Eklenmemiş eklenebilir alan denetlenmez.
 */
export function formErrors(key, values) {
  const slots = PROMPT_TEMPLATES[key]?.slots ?? {}
  const out = {}
  for (const [name, slot] of Object.entries(slots)) {
    const value = values?.[name]
    if (slot.addable && value === undefined) continue
    const typed = String(value ?? "").trim() !== ""
    if (slot.type === "amount" && typed && !isValidAmount(value)) out[name] = "amount"
    else if (slot.required && isSlotEmpty(slot, value)) out[name] = "required"
    else if (slot.after && value && values[slot.after] && value < values[slot.after])
      out[name] = "order"
  }
  return out
}

/** Formda baştan açık eklenebilir alanlar: masrafın açıklaması en sık yazılan isteğe bağlı alan. */
export const FORM_OPEN = { expense: ["note"] }

/** Yeni masraf satırı: varsayılanlar (bugün, TRY, boş açıklama) ya da kopyalanan satırın değerleri. */
export function newExpenseRow(id, from) {
  const values = from ? { ...from.values } : { ...initialValues("expense"), note: "" }
  return { id, values, files: [] }
}

const sameValue = (a, b) =>
  a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b

/**
 * Kişi bir şey girdi mi: başlangıçtakinden farklı dolu bir alan (sonradan eklenen fiş no, firma,
 * kişi sayısı, şirket… dahil). Doluysa form sormadan kapanmaz.
 */
export function valuesChanged(initial, values) {
  return Object.entries(values ?? {}).some(
    ([k, v]) => String(v ?? "").trim() !== "" && !sameValue(v, initial?.[k]),
  )
}

const atNoon = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
// Takvim günüyle ilerlenir (+24 saat değil): yaz saati geçişinde öğlen 13'e kayıp son gün düşmesin.
const nextDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12)
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** Resmî tatil günleri: `{ "YYYY-AA-GG": düşülen gün }` — bayram 1, arife yarım gün. */
function holidayWeights(list) {
  const out = {}
  for (const h of list) {
    const [y, m, d] = h.start.split("-").map(Number)
    for (let i = 0; i < h.days; i++) out[ymd(new Date(y, m - 1, d + i))] = 1
    if (h.eve) out[h.eve] = Math.max(out[h.eve] ?? 0, 0.5)
  }
  return out
}
const HOLIDAY_WEIGHTS = holidayWeights(TR_HOLIDAYS)

/**
 * İzin aralığının tahmini iş günü: hafta sonu ve resmî tatiller düşülür, arife yarım gün. Kesin
 * süreyi ERP hesaplar (vardiya, kısmi gün); form yalnız ön izleme gösterir.
 */
export function leaveWorkdays(start, end, weights = HOLIDAY_WEIGHTS) {
  if (!start || !end || end < start) return null
  let days = 0
  for (let d = atNoon(start); d <= atNoon(end); d = nextDay(d)) {
    if (d.getDay() === 0 || d.getDay() === 6) continue
    days += 1 - (weights[ymd(d)] ?? 0)
  }
  return days
}

const decimalOf = (locale) => {
  try {
    return (
      new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === "decimal")?.value ??
      "."
    )
  } catch {
    return "."
  }
}

/**
 * Doğu Arap rakamları (٠–٩, ۰–۹) ve ayraçları (٫ ondalık, ٬ binlik) ASCII'ye: Arapça klavyeyle
 * yazılan tutar da geçerli sayılsın ve asistana Latin rakamla gitsin.
 */
export function asciiDigits(value) {
  return String(value ?? "")
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/\u066b/g, ".")
    .replace(/\u066c/g, ",")
}

/** Tutar alanının yer tutucusu yerel ayraçla ("0,00" · "0.00"), Latin rakamla. */
export function amountPlaceholder(locale) {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      numberingSystem: "latn",
    }).format(0)
  } catch {
    return "0.00"
  }
}

/**
 * Yazılan tutarın sayısı (toplam ön izlemesi için; asistana yazılan metin gider). İki ayraç
 * varsa sondaki ondalıktır; tek ayraç ardından tam üç hane geliyorsa ve yerelin ondalığı
 * değilse binliktir ("1.250" TR'de bin iki yüz elli).
 */
export function parseAmount(value, locale = "tr") {
  const v = String(value ?? "").replace(/\s/g, "")
  if (!isValidAmount(v)) return null
  const dot = v.lastIndexOf(".")
  const comma = v.lastIndexOf(",")
  let dec = null
  if (dot >= 0 && comma >= 0) dec = dot > comma ? "." : ","
  else if (dot >= 0 || comma >= 0) {
    const sep = dot >= 0 ? "." : ","
    const parts = v.split(sep)
    const grouping = parts.length > 2 || (parts[1].length === 3 && sep !== decimalOf(locale))
    dec = grouping ? null : sep
  }
  const at = dec ? v.lastIndexOf(dec) : -1
  const whole = (at >= 0 ? v.slice(0, at) : v).replace(/[.,]/g, "")
  const frac = at >= 0 ? v.slice(at + 1) : ""
  const n = Number(frac ? `${whole}.${frac}` : whole)
  return Number.isFinite(n) ? n : null
}

/** Masraf satırlarının para birimine göre toplamı `{ TRY: 1250.5, USD: 40 }` (geçersizler hariç). */
export function expenseTotals(rows, locale) {
  const out = {}
  for (const r of rows) {
    const n = parseAmount(r.values.amount, locale)
    if (n == null) continue
    const cur = r.values.currency ?? "TRY"
    out[cur] = (out[cur] ?? 0) + n
  }
  return out
}

const extOf = (file) => {
  const fromName = /\.([a-z0-9]{2,5})$/i.exec(file?.name ?? "")?.[1]
  if (fromName) return fromName.toLowerCase()
  const sub = String(file?.type ?? "").split("/")[1] ?? ""
  return sub.replace("jpeg", "jpg").replace(/[^a-z0-9]/gi, "") || "bin"
}

/**
 * Fiş görsellerinin sohbete gidecek adları: satır numarasıyla ("fis-2.jpg", aynı satırda ikinci
 * "fis-2-2.jpg"). Telefon kamerası her fotoğrafı "image.jpg" adlandırıyor; satırın cümlesi
 * dosyayı bu adla anar, asistan hangi fişin hangi kaleme ait olduğunu buradan bilir.
 */
export function receiptNames(rows, base) {
  return rows.map((r, i) =>
    r.files.map((f, j) => `${base(i + 1)}${j > 0 ? `-${j + 1}` : ""}.${extOf(f)}`),
  )
}

/**
 * Fişler önce küçültülür (`compress`: sohbetin gönderimdeki `compressImageFile`i), SONRA
 * adlandırılır: küçültme PNG/WebP/BMP'yi JPEG'e çevirip adı ".jpg" yapıyor. Gönderimdeki ikinci
 * küçültme adı değiştirmez (uzantı zaten çıktınınki), cümledeki ad ekin adıyla aynı kalır.
 * Dönüş: `{ names, files }` — `names[i][j]` satırın cümlesinde anılan ad.
 */
export async function packReceipts(rows, base, compress) {
  const packed = await Promise.all(rows.map((r) => Promise.all(r.files.map((f) => compress(f)))))
  const names = receiptNames(
    packed.map((files) => ({ files })),
    base,
  )
  const files = packed.flatMap((list, i) =>
    list.map((f, j) => new File([f], names[i][j], { type: f.type, lastModified: f.lastModified })),
  )
  return { names, files }
}

/** Şablonun cümlesi: izin ve avans. */
export const requestMessage = (t, locale, key, values) => composeTemplate(t, locale, key, values)

/**
 * Masraf satırları → tek mesaj. Tek satır: şablonun cümlesi. Çok satır: kısa başlık ("Aşağıdaki 3
 * masrafı gir:") + numaralı cümleler. Fişi olan satırın cümlesi fişi adıyla anar.
 */
export function expenseMessage(t, locale, rows, names) {
  const lines = rows.map((r, i) => {
    const sentence = composeTemplate(t, locale, "expense", r.values)
    const files = names?.[i] ?? []
    return files.length
      ? `${sentence}${t("selfService.form.receiptClause", { names: files.join(", ") })}`
      : sentence
  })
  if (lines.length === 1) return lines[0]
  return [
    t("selfService.form.expenseHeader", { n: lines.length }),
    ...lines.map((s, i) => `${i + 1}. ${s}`),
  ].join("\n")
}
