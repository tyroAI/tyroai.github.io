// Small window-event + subscribable-store bus for chat-wide signals.
//
// Two things travel here:
//
//   1. requestOpenChat() — "take me back to the conversation". Fired by a
//      browser-notification click or its in-app toast action. App.jsx listens
//      and navigates to /chat; ChatScreen listens and jumps to the latest
//      message.
//
//   2. Unread count — answers that landed while the user was elsewhere. A
//      module store rather than an event so the sidebar badge can read it
//      with useSyncExternalStore, without threading props through
//      DashboardLayout → Sidebar → NavMain.

const OPEN_EVENT = "tyro:chat:open"
const FOCUS_COMPOSER_EVENT = "tyro:chat:focus-composer"

/**
 * @param {{focusComposer?: boolean}} [detail] focusComposer is set by the
 *   notification's "Yanıtla" button — the user's intent is to type, not just
 *   to read, so the caret should already be waiting for them.
 */
export function requestOpenChat(detail = {}) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail }))
}

/** Subscribe to open-chat requests. Returns an unsubscribe function. */
export function onOpenChat(cb) {
  if (typeof window === "undefined") return () => {}
  const listener = (e) => cb(e.detail ?? {})
  window.addEventListener(OPEN_EVENT, listener)
  return () => window.removeEventListener(OPEN_EVENT, listener)
}

/** Ask the composer to take the caret (ChatComposer owns its own textarea ref). */
/**
 * @param {{selectPlaceholder?: boolean}} [detail] `selectPlaceholder`, hazır
 *   bir istem yazıldığında verilir: composer imleci sona koymak yerine ilk
 *   `[köşeli parantez]`i SEÇER, böylece kullanıcı yazmaya başlayınca üzerine
 *   yazar. Bildirimden gelen "Yanıtla" bunu vermez — orada yazılacak metin
 *   kullanıcınındır, seçilecek bir şey yok.
 */
export function requestFocusComposer(detail) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(FOCUS_COMPOSER_EVENT, { detail }))
}

export function onFocusComposer(cb) {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(FOCUS_COMPOSER_EVENT, cb)
  return () => window.removeEventListener(FOCUS_COMPOSER_EVENT, cb)
}

const TEMPLATE_EVENT = "tyro:chat:composer-template"

/**
 * Bestecide alanlı hazır soru aç (`{ key, preset, text }`) ya da açık olanı
 * kapat (`null` · anahtarsız `{ text }` = düz kart seçildi). Öneri kartları ve Öneri Laboratuvarı besteciyle aynı ağaçta
 * değil; textarea'nın sahibi `ChatComposer` (odak isteğiyle aynı gerekçe).
 */
export function requestComposerTemplate(detail) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(TEMPLATE_EVENT, { detail: detail ?? null }))
}

export function onComposerTemplate(cb) {
  if (typeof window === "undefined") return () => {}
  const listener = (e) => cb(e.detail ?? null)
  window.addEventListener(TEMPLATE_EVENT, listener)
  return () => window.removeEventListener(TEMPLATE_EVENT, listener)
}

/* ── Pending files ────────────────────────────────────────────────────── */

// Park edilen soruyla gidecek dosyalar (Self Servis masraf formunun fiş görselleri). `File`
// sessionStorage'a yazılamaz: bellekte durur, sohbet soruyu alırken bir kez alınır
// (`useParkedAsk`). Kişisel veri: çıkışta `clearPendingAsk` siler.
let pendingFiles = []

/** Bir sonraki park edilen soruyla gönderilecek dosyaları bırakır (öncekilerin yerine). */
export function setPendingFiles(files) {
  pendingFiles = Array.from(files ?? []).filter(
    (f) => typeof Blob !== "undefined" && f instanceof Blob,
  )
}

/** Okur VE siler — dosyalar soruyla tam bir kez gider. */
export function takePendingFiles() {
  const out = pendingFiles
  pendingFiles = []
  return out
}

/* ── Pending ask ──────────────────────────────────────────────────────── */

// A question typed somewhere OTHER than the composer — today the mail,
// calendar and files panels in the header. It can't be delivered as an event:
// the chat may not be mounted when the user hits send (they are on
// /dashboard), and an event fired into an empty room is lost. So it is parked
// here and claimed by the chat as soon as it is on screen.
//
// sessionStorage rather than a module variable so it also survives the full
// page load that navigating to /chat does.
const PENDING_KEY = "tyro:chat:pendingAsk"

/**
 * Park a question for the chat to claim.
 *
 * `agent` names the assistant the ask belongs to — the mail, calendar and
 * files panels all say "tyro office" — and ChatScreen switches to it before
 * sending. It is a NAME, not an id: the catalog row's GUID differs between
 * Dataverse environments.
 *
 * `template`: soru YERİNE bestecide açılacak alanlı hazır sorunun anahtarı
 * (`PROMPT_TEMPLATES`: leaveRequest · expense · advance — Self Servis'in yeni
 * talep düğmeleri). Hiçbir şey gönderilmez; kişi alanları doldurup kendisi
 * gönderir. Şablon varsa soru yok sayılır; ikisi de yoksa park edilmez.
 *
 * Anything added to the ask has to be added in three places: the destructure,
 * the payload, and takePendingAsk's guard. A field listed in only one of them
 * is silently dropped on the wire while both ends still look correct.
 */
export function setPendingAsk({ question, context, agent, kind, windowId, template } = {}) {
  if (typeof window === "undefined" || (!question?.trim() && !template)) return
  try {
    window.sessionStorage.setItem(
      PENDING_KEY,
      // `kind`/`windowId`: gün özeti bu kanaldan geçiyor ve ChatScreen
      // "bu soruyu ısıtılmış konuşmadan mı basacağım, canlı mı soracağım"
      // kararını onlara bakarak veriyor (bkz. dailyBriefPolicy.js).
      JSON.stringify({ question, context, agent, kind, windowId, template }),
    )
  } catch {
    // Storage unavailable — the question is lost, but the chat still opens
    // and the user can retype. Failing loudly here would be worse.
  }
}

/** Sign-out hook (msal.js): a parked question can carry meeting details or a
 *  mail subject — another user signing into the same tab must not inherit and
 *  auto-send it. */
export function clearPendingAsk() {
  pendingFiles = []
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // storage blocked — nothing was persisted to leak
  }
}

/**
 * Park edilmiş soru VAR MI? Okur ama TÜKETMEZ.
 *
 * `takePendingAsk` okuduğunu siliyor ve bu doğru: bir soru tam bir kez
 * gönderilmeli. Ama "kullanıcı belirli bir iş yapmaya geldi mi?" sorusunu
 * soran taraf (Yenilikler penceresi) soruyu tüketemez — tüketirse asıl
 * göndermesi gereken ekran onu bir daha bulamaz.
 */
export function hasPendingAsk() {
  if (typeof window === "undefined") return false
  try {
    return Boolean(window.sessionStorage.getItem(PENDING_KEY))
  } catch {
    return false
  }
}

/** Reads AND clears — a pending ask must be sent exactly once. */
export function takePendingAsk() {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    window.sessionStorage.removeItem(PENDING_KEY)
    const parsed = JSON.parse(raw)
    return parsed?.question || parsed?.template ? parsed : null
  } catch {
    return null
  }
}

/* ── Unread store ─────────────────────────────────────────────────────── */

let unread = 0
const listeners = new Set()

function emit() {
  for (const l of listeners) l()
}

/** useSyncExternalStore getSnapshot */
export function getUnreadCount() {
  return unread
}

/** useSyncExternalStore subscribe */
export function subscribeUnread(cb) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function bumpUnread() {
  unread += 1
  emit()
}

export function clearUnread() {
  if (unread === 0) return
  unread = 0
  emit()
}
