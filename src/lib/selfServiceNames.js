import { ADVANCE_PURPOSES, EXPENSE_CATEGORY_PAIRS } from "@/data/hrValues"
import { foldText, statusText } from "@/lib/selfServiceStatus"

/**
 * Self Servis — ERP kodlarının görünen adları (saf). İzin türü ERP'de KOD olarak durur
 * ("TR01"); adı dört sözlükte (`selfService.leaveType.TR01`…). Masraf kategorisi ERP DEĞERİ
 * olarak gelir ("y.içi konaklama"); başlığı `hrValues` eşlemesinden (başlıklar çevrilmez).
 * Avans amacı ERP'de Türkçe metin ("Fuar"); adı `myspace.purpose.<anahtar>`.
 */

/** ERP'deki izin türü kodları — tyraHR `HRLeaveCreate` ve İK MCP'siyle aynı liste. */
export const LEAVE_TYPE_CODES = Array.from(
  { length: 19 },
  (_, i) => `TR${String(i + 1).padStart(2, "0")}`,
)
const CODES = new Set(LEAVE_TYPE_CODES)

/** "tr01" → "TR01"; bilinen bir kod değilse "". */
export function leaveTypeCode(value) {
  const code = /^\s*(tr\d{2})(?![0-9a-z])/i.exec(String(value ?? ""))?.[1].toUpperCase()
  return code && CODES.has(code) ? code : ""
}

/**
 * İzin tablosunda olup devamsızlık OLMAYAN türler: Dış Görev (TR02), Kart Unutuldu (TR15), Evden
 * Çalışma (TR17) — kişi çalışıyor. "İzinde" sayımları ve yaklaşan izin uyarısı bunları saymaz.
 */
export const NOT_ABSENCE_CODES = Object.freeze(["TR02", "TR15", "TR17"])

/** Kayıt gerçek bir devamsızlık mı (izin); kodu bilinmeyen tür izin sayılır. */
export const isAbsence = (record) => !NOT_ABSENCE_CODES.includes(record?.typeCode)

/** İzin türünün adı (dört dilde); bilinmeyen kod ya da düz metin olduğu gibi. */
export function leaveTypeName(value, t) {
  const code = leaveTypeCode(value)
  return code && t ? t(`selfService.leaveType.${code}`) : String(value ?? "").trim()
}

// Hem ERP değeri hem başlık aynı başlığa çıkar (bazı akışlar başlığı yazıyor).
const CATEGORY_TITLE = new Map(
  EXPENSE_CATEGORY_PAIRS.flatMap(([title, value]) => [
    [foldText(value), title],
    [foldText(title), title],
  ]),
)

/** Masraf kategorisinin başlığı ("y.içi konaklama" → "Konaklama (Yurtiçi)"); bilinmeyen olduğu gibi. */
export function expenseCategoryName(value) {
  const raw = String(value ?? "").trim()
  return CATEGORY_TITLE.get(foldText(raw)) ?? raw
}

const PURPOSE_KEY = new Map(
  Object.entries(ADVANCE_PURPOSES).map(([key, erp]) => [foldText(erp), key]),
)

/** Avans amacının anahtarı ("Fuar" → "fair"); bilinmiyorsa "". */
export function purposeKeyOf(value) {
  return PURPOSE_KEY.get(foldText(value)) ?? ""
}

/** Avans amacının adı (dört dilde); bilinmeyen değer olduğu gibi. */
export function purposeName(value, t) {
  const key = purposeKeyOf(value)
  return key && t ? t(`myspace.purpose.${key}`) : String(value ?? "").trim()
}

const named = (r, t, extra) => ({
  ...r,
  ...extra,
  ...(r.status ? { statusName: statusText(r.status, t) } : null),
})

/**
 * Kayıtlara dile bağlı adları ekler — izinde `typeName`, avansta `purposeName`, durumu olan
 * her kayıtta `statusName`. Arama ve süzgeçler bu adlarla da çalışır. Bölüm `null` ise
 * (okunamadıysa) `null` kalır. Sonuç yeni nesne: çağıran `useMemo([data, t])` ile tutar.
 */
export function withNames(data, t) {
  if (!data) return data
  return {
    ...data,
    leaves: data.leaves?.map((r) => named(r, t, { typeName: leaveTypeName(r.type, t) })) ?? null,
    expenses: data.expenses?.map((r) => named(r, t)) ?? null,
    advances:
      data.advances?.map((r) => named(r, t, { purposeName: purposeName(r.purpose, t) })) ?? null,
  }
}
