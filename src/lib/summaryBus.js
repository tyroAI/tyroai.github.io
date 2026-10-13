// Yapay zekâ özetini uygulamanın her yerinden açma kanalı. Özet penceresi
// App'te bir kez yaşar (MeetingSummaryHost): onu açan kart çoğu zaman bir
// üzerine-gelme önizlemesi ve pencere açılınca kapanır — pencere onunla
// birlikte gitmesin.

const listeners = new Set()

/** Toplantının özet penceresini açar. */
export function openMeetingSummary(event) {
  for (const fn of listeners) fn(event)
}

/** Özet isteklerini dinler; aboneliği bırakan fonksiyonu döndürür. */
export function onMeetingSummary(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
