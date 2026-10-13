// Sıradaki toplantının geri sayımı — saf mantık (hangi toplantı, ne kadar
// kaldı, hangi aşama) ve "bu toplantı için gösterme" kaydı.

export const ALERT_LEAD_MS = 15 * 60 * 1000
export const FINAL_MS = 60 * 1000
// Başladıktan sonra kart bu kadar "Toplantı başladı · Katıl" der, sonra çekilir.
export const STARTED_GRACE_MS = 5 * 60 * 1000

const DISMISS_KEY = "tyro-meeting-alert-dismissed"

/** Tekrarlayan serinin her oturumu ayrı: kimlik + başlangıç. */
export const alertKey = (e) => `${e.id}@${+e.start}`

/** Geri sayım yalnız kendi takviminde, tüm gün olmayan, reddedilmemiş/iptal edilmemiş toplantıda. */
export const isAlertable = (e) =>
  Boolean(e?.start) && !e.owner && !e.isAllDay && !e.isCancelled && e.myResponse !== "declined"

/** Şu an geri sayımı gösterilecek toplantı: en yakın başlayan, gösterme denmemiş. */
export function nextAlert(events, now, dismissed = new Set()) {
  return (
    (events ?? [])
      .filter(isAlertable)
      .filter((e) => !dismissed.has(alertKey(e)))
      .filter((e) => now >= +e.start - ALERT_LEAD_MS && now < +e.start + STARTED_GRACE_MS)
      .sort((a, b) => a.start - b.start)[0] ?? null
  )
}

/** Yaklaşan bir toplantı var mı (saat saniyede bir mi atsın). */
export const hasNearAlert = (events, now) =>
  (events ?? []).some(
    (e) =>
      isAlertable(e) &&
      +e.start - now < ALERT_LEAD_MS + 60 * 1000 &&
      +e.start + STARTED_GRACE_MS > now,
  )

/** calm (15 dk → 1 dk) · final (son dakika) · started (başladı). */
export const alertPhase = (msLeft) =>
  msLeft <= 0 ? "started" : msLeft <= FINAL_MS ? "final" : "calm"

/** "14:59" — yukarı yuvarlanır: 0'a gelmeden "00:00" yazmaz. */
export function formatCountdown(msLeft) {
  const total = Math.max(0, Math.ceil(msLeft / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/** Gösterme denmiş toplantılar (süresi geçenler atılır). */
export function readDismissed(now = Date.now()) {
  try {
    const map = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}")
    return new Set(Object.keys(map).filter((k) => map[k] > now))
  } catch {
    return new Set()
  }
}

export function writeDismissed(key, until) {
  try {
    const now = Date.now()
    const map = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}")
    for (const k of Object.keys(map)) if (map[k] <= now) delete map[k]
    map[key] = until
    localStorage.setItem(DISMISS_KEY, JSON.stringify(map))
  } catch {
    // Depo kapalı: gösterme bu oturumda (bellekte) geçerli.
  }
}

/**
 * Önizleme (`?countdown=saniye`): takvimdeki gerçek sıradaki toplantı (konu,
 * katılımcılar, fotoğraflar, link) — yalnız başlangıcı öne alınır. Takvimde
 * yaklaşan toplantı yoksa örnek toplantı.
 */
export function previewEvent(startAt, events = [], now = startAt) {
  // Katıl da görünsün diye önce Teams linkli en yakın toplantı, yoksa herhangi.
  const upcoming = (events ?? [])
    .filter((e) => isAlertable(e) && +e.start > now)
    .sort((a, b) => a.start - b.start)
  const base = upcoming.find((e) => e.joinUrl) ?? upcoming[0]
  if (base) {
    const length = +base.end - +base.start
    return { ...base, start: new Date(startAt), end: new Date(startAt + length), preview: true }
  }
  const start = new Date(startAt)
  return {
    id: "preview",
    subject: "Haftalık Satış Toplantısı",
    start,
    end: new Date(startAt + 45 * 60 * 1000),
    isOnlineMeeting: true,
    joinUrl: "https://teams.microsoft.com/",
    location: "",
    organizer: "Kerem Öztürk",
    organizerAddress: "",
    myResponse: "accepted",
    attendees: [
      { name: "Kerem Öztürk", address: "", response: "accepted" },
      { name: "Ece Yıldız", address: "", response: "accepted" },
      { name: "Mert Kaya", address: "", response: "accepted" },
      { name: "Selin Aksoy", address: "", response: "none" },
      { name: "Burak Demir", address: "", response: "tentativelyAccepted" },
      { name: "Zeynep Çelik", address: "", response: "accepted" },
      { name: "Ayşe Koç", address: "", response: "none" },
      { name: "Can Şahin", address: "", response: "declined" },
    ],
    preview: true,
  }
}
