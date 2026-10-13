import { newRecordKeys, recordKey } from "@/lib/selfServiceModel"

/**
 * Yeni talebin ERP'ye yansımasını bekleyen gözcünün saf kuralları (`useNewRecordWatch`).
 *
 * Kontrol anları izlemenin başından, GÖRÜNÜR süreyle: 45 sn · 2 dk · 4 dk · 8 dk. Toplam 10
 * dakikayı aşmaz; talep çoğu zaman ilk dakikalarda yansır, sonrası seyrek bakışla yetinir.
 */
export const WATCH_AT_MS = [45_000, 120_000, 240_000, 480_000]

/** `step`. kontrolden önce beklenecek süre (ilk kontrol 0); kontrol kalmadıysa `null`. */
export function watchDelay(step) {
  if (!Number.isInteger(step) || step < 0 || step >= WATCH_AT_MS.length) return null
  return WATCH_AT_MS[step] - (step ? WATCH_AT_MS[step - 1] : 0)
}

const time = (r) => r.date?.getTime?.() ?? 0

/**
 * Başlangıç yüklemesinde (`baseline`) olmayan kayıtlar: `keys` ("Yeni" rozeti, her türden) ve
 * duyurulacak `first` — YALNIZ başlatılan türden (`kind`), tarihi en yeni olan. Başka türden
 * yeni kayıt (ör. başka sekmede açılmış talep) gözcüyü bitirmez; rozetini yine alır. Başlangıç
 * yoksa ya da bölüm okunamamışsa o bölümde hiçbir şey yeni sayılmaz (`newRecordKeys`).
 */
export function arrivals(baseline, next, kind) {
  const keys = newRecordKeys(baseline, next)
  if (!keys.size) return { keys, first: null }
  const found = ["leaves", "expenses", "advances"]
    .flatMap((part) => next?.[part] ?? [])
    .filter((r) => r.kind === kind && keys.has(recordKey(r)))
    .sort((a, b) => time(b) - time(a))
  return { keys, first: found[0] ?? null }
}
