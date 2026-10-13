/**
 * Self Servis — ERP kayıtlarının tutarlılık denetimi (saf). Mantıken imkânsız kayıt (ör. tek
 * günlük aralığa 50 gün) hesaba katılmaz: toplamlara, rapora, uyarılara, ekibin görünümüne ve
 * dışa aktarmaya girmez; listede değil, köşedeki uyarıda nedeniyle gösterilir. Kayıt ERP'de
 * durur; düzeltmesi İK'da.
 */
const DAY = 86400000

/** Başlangıç ve bitiş dahil takvim günü (bitiş yoksa 1); başlangıç yoksa null. */
export function spanDays(start, end) {
  if (!start) return null
  const e = end ?? start
  // Yaz saati geçişi farkı bozmasın: yerel günleri UTC'de karşılaştır.
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const b = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate())
  return Math.round((b - a) / DAY) + 1
}

/**
 * İzin kaydının sorunu ya da null: "negative" (eksi gün ya da saat), "endBeforeStart",
 * "daysOverSpan" (gün > aralıktaki takvim günü), "hoursOverSpan" (saat > 24 × takvim günü).
 */
export function leaveIssue(leave) {
  const { start, end, days, hours } = leave ?? {}
  if ((days ?? 0) < 0 || (hours ?? 0) < 0) return "negative"
  const span = spanDays(start, end)
  if (span == null) return null
  if (span < 1) return "endBeforeStart"
  if ((days ?? 0) > span) return "daysOverSpan"
  if ((hours ?? 0) > span * 24) return "hoursOverSpan"
  return null
}

/** İzinleri ayırır: `ok` hesaba girenler, `suspect` `[{ ...izin, issue, span }]`. */
export function splitLeaves(leaves) {
  const ok = []
  const suspect = []
  for (const leave of leaves ?? []) {
    const issue = leaveIssue(leave)
    if (issue) suspect.push({ ...leave, issue, span: spanDays(leave.start, leave.end) })
    else ok.push(leave)
  }
  return { ok, suspect }
}
