/**
 * SANA ÖZEL — OTURUM KAYDI (2026-10-01). Yaprak modül: hiçbir şey içe almaz,
 * `useFeedPosts` (çıkış zinciri) ve sekmenin kancaları onu okur.
 *
 * İki şey tutar, ikisi de YALNIZ BELLEKTE ve yalnız KİMLİK:
 *   opened   bu oturumda açılıp okunan postalar → "Sıradaki" kartı ilerler
 *   todo     To-Do'ya devredilen postalar → `{ state, listId?, listName? }`
 * Konu, gönderen, metin YOK: paylaşılan bir tarayıcıda başkasının postası
 * hakkında hiçbir şey bırakmaz. Çıkışta düşer (`clearFeedCache` → msal.js).
 *
 * ⚠️ **SEKME DEĞİŞİNCE "EKLENDİ" KAYBOLMUYOR** — eski sürümde durum bileşenin
 * içindeydi; Akışım'a bakıp dönen kişi aynı postayı ikinci kez göreve
 * çevirebiliyordu (iki görev, bir posta).
 * ⚠️ Değiştiriciler Set/Map'i YENİSİYLE değiştirir, sonra haber verir —
 * `useSyncExternalStore` anlık görüntüyü kimlikle karşılaştırıyor.
 */
let state = { key: null, opened: new Set(), todo: new Map() }
const listeners = new Set()

function emit() {
  for (const fn of listeners) fn()
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getSnapshot() {
  return state
}

/** Başka hesap → temiz kayıt (bir önceki hesabın izi devralınmaz). */
function own(key) {
  if (state.key !== key) state = { key, opened: new Set(), todo: new Map() }
}

export function markOpened(key, id) {
  if (!key || !id) return
  own(key)
  if (state.opened.has(id)) return
  state = { ...state, opened: new Set([...state.opened, id]) }
  emit()
}

/** `entry` = `{ state: "busy" | "done" | "connect", listId?, taskId?, listName? }`; `null` siler. */
export function setHandoff(key, id, entry) {
  if (!key || !id) return
  own(key)
  const todo = new Map(state.todo)
  if (entry) todo.set(id, entry)
  else todo.delete(id)
  state = { ...state, todo }
  emit()
}

export function clearForYouSession() {
  state = { key: null, opened: new Set(), todo: new Map() }
  emit()
}
