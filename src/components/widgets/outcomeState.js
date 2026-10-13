import { INSIGHT } from "@/lib/meetingInsights"

/**
 * `useMeetingInsight` cevabından satırın durumu. Özet `res.insight` altında
 * (`{ notes, actions }`) — üst düzeyde değil; buradaki bir okuma hatası her
 * toplantıyı "özetsiz" sayıp kartı boş bırakıyordu.
 * Durumlar: loading · ready · consent (izin gerekiyor) · denied (Graph reddetti)
 * · error · none (gerçekten özet yok).
 */
export function outcomeState(res) {
  const actions = res?.insight?.actions ?? []
  const notes = res?.insight?.notes ?? []
  const status = res?.status
  if (status === INSIGHT.loading) return { state: "loading", data: null }
  if (status === INSIGHT.ready && (actions.length || notes.length))
    return { state: "ready", data: { actions, notes } }
  if (res?.needsConsent) return { state: "consent", data: null }
  if (status === INSIGHT.denied) return { state: "denied", data: null }
  if (status === INSIGHT.error) return { state: "error", data: null }
  return { state: "none", data: null }
}
