import { fold } from "@/lib/fold"
import { STATUS_RULES } from "@/lib/selfServiceStatusRules"

/**
 * Self Servis — ERP durum etiketinin KATEGORİSİ, tonu ve toplam kuralı.
 *
 * Etiket Dataverse'ten (`FormattedValue`) kişinin Dataverse arayüz dilinde gelir: çoğu zaman
 * İngilizce, ama TR/RU/AR de olabilir; dil paketi eksikse etiket kimliği ("@SYS…") ya da ham
 * sayı da gelebilir. Ham tamsayılar F&O ile Dataverse arasında kararlı olmadığından eşleme
 * ETİKETTEN yapılır. Kategoriler, kaynaklar ve toplam kuralı: docs/features/self-servis.md.
 */

/** Bütün kategoriler; `none` = durum alanı boş (izin satırında hep böyle). */
export const STATUS_KINDS = [
  "pending",
  "returned",
  "draft",
  "approved",
  "completed",
  "rejected",
  "cancelled",
  "other",
  "none",
]

/** Süzgeç çiplerinin sabit sırası — `none` çip değildir. */
export const STATUS_ORDER = STATUS_KINDS.filter((k) => k !== "none")

/** Toplama girmeyen kategoriler. Kayıtlar listede yine görünür; tutar ve sayıya katılmaz. */
export const EXCLUDED_FROM_TOTALS = Object.freeze(["draft", "rejected", "cancelled"])

/** Kategori → rozet tonu (`components/selfservice/kinds.js` TONE_CLASS). */
export const STATUS_TONE = Object.freeze({
  pending: "warning",
  returned: "warning",
  draft: "neutral",
  approved: "success",
  completed: "success",
  rejected: "danger",
  cancelled: "neutral",
  other: "neutral",
  none: "neutral",
})

const KIND_SET = new Set(STATUS_KINDS)

// Birleşen işaretler (Latin aksanları, Arapça hareke/hemze, tatvil) ve görünmez yön işaretleri.
// Sınıf kaçış dizisiyle yazılı: kaynağa çıplak birleşen karakter koymak editörde bozulur.
const MARKS = /[\u0300-\u036f\u064b-\u065f\u0670\u0640\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g

/**
 * Karşılaştırma biçimi: uygulamanın arama katlaması (`lib/fold`: Türkçe duyarsız, aksansız) +
 * Rusça ё→е, Arapça hemze taşıyıcıları (أ إ آ ؤ ئ) yalın harfe, ة→ه, ى→ي, yön işaretleri
 * silinir. Etiket dört dilden biriyle gelebildiği için arama ve süzgeçler de bunu kullanır.
 */
export function foldText(value) {
  return fold(
    String(value ?? "")
      .normalize("NFD")
      .replace(MARKS, ""),
  )
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
}

/** Durum etiketi için: F&O sembolleri ("NotSubmitted", "DEL_Ordered") sözcüklere ayrılır. */
function foldStatus(value) {
  return foldText(
    String(value ?? "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_+/g, " "),
  )
}

// Sözcükler katlanır (kaynakta doğal yazımla durur); düzenli ifade olduğu gibi kalır.
const RULES = STATUS_RULES.map(([kind, test]) => [
  kind,
  Array.isArray(test) ? test.map((w) => (w instanceof RegExp ? w : foldStatus(w))) : test,
])

const has = (s, w) => (w instanceof RegExp ? w.test(s) : s.includes(w))
const hit = (test, s) => (Array.isArray(test) ? test.some((w) => has(s, w)) : has(s, test))

const memo = new Map()

// Etiket kimliği ("@SYS…") ya da ham değer: çevirisi gelmemiş, anlamı bilinmiyor.
const opaque = (raw) => /^@/.test(raw) || /^[-+]?\d+(?:[.,]\d+)?$/.test(raw)

/**
 * ERP durum etiketi → kategori: `pending` (gönderildi, incelemede, onay bekliyor) · `returned`
 * (geri gönderildi, değişiklik istendi) · `draft` (gönderilmedi, taslak, geri çekildi) ·
 * `approved` (onaylandı, ödemeye hazır) · `completed` (ödendi, nakledildi, kapatıldı) ·
 * `rejected` · `cancelled` · `other` (tanınmayan, etiket kimliği, ham sayı) · `none` (boş).
 */
export function statusKind(label) {
  const raw = String(label ?? "").trim()
  if (!raw) return "none"
  if (memo.has(raw)) return memo.get(raw)
  let kind = "other"
  if (!opaque(raw)) {
    const s = foldStatus(raw)
    kind = RULES.find(([, test]) => hit(test, s))?.[0] ?? "other"
  }
  if (memo.size > 500) memo.clear()
  memo.set(raw, kind)
  return kind
}

/** Kaydın (ya da doğrudan kategorinin/etiketin) kategorisi. */
function kindOf(value) {
  if (value && typeof value === "object") return value.statusKind ?? statusKind(value.status)
  return KIND_SET.has(value) ? value : statusKind(value)
}

/** Durum etiketinin rozet tonu: success · warning · danger · neutral. */
export function statusTone(label) {
  return STATUS_TONE[statusKind(label)]
}

/**
 * Toplam kuralı — TEK yardımcı: kayıt (`{ statusKind | status }`), kategori ya da etiket alır.
 * Gönderilmemiş, reddedilmiş ve iptal edilmiş kayıtlar özet, rapor ve liste toplamına girmez.
 */
export function countsInTotals(value) {
  return !EXCLUDED_FROM_TOTALS.includes(kindOf(value))
}

/**
 * Ekranda gösterilecek durum metni: TYRA'nın kategori adı (dört dilde, `selfService.status.*`).
 * Tanınmayan etiket okunabiliyorsa olduğu gibi gösterilir; etiket kimliği/ham sayı "Diğer" olur.
 */
export function statusText(label, t) {
  const kind = statusKind(label)
  if (kind === "none") return ""
  const raw = String(label).trim()
  if (kind === "other" && !opaque(raw)) return raw
  return t(`selfService.status.${kind}`)
}
