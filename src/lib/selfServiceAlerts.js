import { extraValue } from "@/lib/selfServiceFields"
import { isAbsence } from "@/lib/selfServiceNames"
import { countsInTotals, statusKind } from "@/lib/selfServiceStatus"

/**
 * Self Servis — akıllı uyarılar (saf, veri döner; cümleyi arayüz kurar). Öncelik sırasıyla:
 * düzeltme istenen kayıt → gönderilmemiş masraf raporu → mahsup edilmemiş iş avansı → yaklaşan
 * izin → yıl sonuna kalan izin. En fazla `limit` tanesi; kapatılanlar (`dismissed`: tür ya da
 * `alertKey`) atlanır.
 */

const DAY = 86400000
/** Yaklaşan izin uyarısının penceresi (gün). */
export const NEXT_LEAVE_DAYS = 45

const kindOf = (r) => r.statusKind ?? statusKind(r.status)
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const of = (list, kind) => (list ?? []).filter((r) => kindOf(r) === kind)
const group = (id, records) =>
  records.length
    ? { id, count: records.length, numbers: records.map((r) => r.number), records }
    : null

/** Kısa özet (djb2): kapatılan uyarının izi depoda kayıt numarası taşımasın. */
function digest(text) {
  let h = 5381
  for (let i = 0; i < text.length; i += 1) h = (h * 33 + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/**
 * Uyarının kapatma anahtarı: tür + içeriğin özeti ("unsubmitted:1x9k2"). İçerik değişince
 * (yeni bir gönderilmemiş rapor, başka bir sıradaki izin, farklı kalan gün) uyarı yeniden çıkar.
 */
export function alertKey(alert) {
  const body = alert?.numbers?.join("|") ?? alert?.record?.id ?? alert?.remain ?? ""
  return `${alert?.id}:${digest(String(body))}`
}

const FILTER_STATUS = { returned: "returned", unsubmitted: "draft" }

/**
 * Kayıt taşıyan uyarının GİZLİ kayıtlarının ("+n": ilk `skip` tanesinden sonrası) listedeki
 * karşılıkları — türe göre birer süzgeç `{ tab, status, year, n }`: sekme, uyarının durum
 * kategorisi, o türün gizli kayıtları aynı yıldaysa o yıl (değilse Tümü) ve sayısı. Düzeltme
 * istenen uyarısında masraf ve avans ayrı "+n" olur: her biri kendi listesini açar.
 */
export function alertFilters(alert, skip = 0) {
  const hidden = (alert?.records ?? []).slice(skip)
  const tabs = [...new Set(hidden.map((r) => r.kind))]
  return tabs.map((tab) => {
    const mine = hidden.filter((r) => r.kind === tab)
    const years = new Set(mine.map((r) => r.date?.getFullYear()))
    const [year] = [...years]
    return {
      tab,
      status: FILTER_STATUS[alert.id] ?? null,
      year: years.size === 1 && year != null ? year : null,
      n: mine.length,
    }
  })
}

/**
 * Uyarılar `[{ id, … }]`:
 * - `returned` `{ count, numbers, records }` — masraf ya da avans için düzeltme istendi
 * - `unsubmitted` `{ count, numbers, records }` — gönderilmemiş masraf raporları
 * - `unsettledAdvance` `{ count, numbers, records }` — kalan tutarı olan avans (yalnız ERP
 *   kalan tutarı veriyorsa; "Ödendi" durumu mahsuptan sonra da sürdüğü için durumdan çıkarılamaz)
 * - `nextLeave` `{ record, inDays }` — bugünden sonra başlayan ilk izin (devamsızlık; pencere içinde)
 * - `yearEnd` `{ remain }` — Kasım–Aralık'ta kullanılmamış yıllık izin
 */
export function buildAlerts(data, { now = new Date(), limit = 2, dismissed = [] } = {}) {
  const today = startOfDay(now)
  const alerts = [
    group("returned", [...of(data?.expenses, "returned"), ...of(data?.advances, "returned")]),
    group("unsubmitted", of(data?.expenses, "draft")),
    group(
      "unsettledAdvance",
      (data?.advances ?? []).filter((r) => (extraValue(r.extra, "balance") ?? 0) > 0),
    ),
    nextLeave(data?.leaves, today),
    yearEnd(data?.balance, today),
  ]
  const gone = new Set(dismissed)
  return alerts.filter((a) => a && !gone.has(a.id) && !gone.has(alertKey(a))).slice(0, limit)
}

/** Bugünden sonra başlayan ilk izin (devamsızlık, toplama giren); yoksa null. */
export function upcomingLeave(leaves, now = new Date()) {
  const today = startOfDay(now)
  // Evden çalışma ya da dış görev "izin" değil; iptal edilmiş talep de.
  return (
    (leaves ?? [])
      .filter((r) => r.start && r.start > today && isAbsence(r) && countsInTotals(r))
      .sort((a, b) => a.start - b.start)[0] ?? null
  )
}

function nextLeave(leaves, today) {
  const record = upcomingLeave(leaves, today)
  if (!record) return null
  const inDays = Math.round((record.start - today) / DAY)
  return inDays <= NEXT_LEAVE_DAYS ? { id: "nextLeave", record, inDays } : null
}

function yearEnd(balance, today) {
  const remain = balance?.remain ?? 0
  return today.getMonth() >= 10 && remain > 0 ? { id: "yearEnd", remain } : null
}
