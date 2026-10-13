import { currentUserKey } from "@/lib/chatSession"

/**
 * KEŞFET TEPKİLERİ — beğeni ve "Kaydet" kaydı, bir DEPO ARAYÜZÜNÜN arkasında.
 *
 * Bileşenler yalnız kancaları görür (`useFeedLike`, `useFeedSave`); kancalar buradaki
 * deponun arayüzünü: `subscribe` · `getSnapshot` · `get(post)` · `set(post, value)` ·
 * `remove(post)`, beğenide ayrıca `toggle(post)` ve `countOf(post)`. Bugünkü uygulama
 * YEREL: kullanıcı başına localStorage (`tyro-feed-likes-v1:<kullanıcı>`), sayaç yok
 * (`countOf` → `null`, kart sayı çizmez). Paylaşımlı bir arka uç (ör. Dataverse tablosu)
 * aynı arayüzle `likeStore`un yerine geçer; bileşen değişmez. Tarif:
 * `docs/features/kesfet-eylemler.md` › Beğeni deposu.
 *
 * ANAHTAR `internetMessageId`: aynı ileti her alıcının kutusunda aynı kimliği taşır (paylaşımlı
 * sayacın da anahtarı olacak); `id` kutuya özel ve ileti klasör değiştirince değişebilir.
 * `internetMessageId` yoksa `id`e düşülür; okurken ikisine de bakılır.
 *
 * Saklanan yalnız KİMLİK (beğenide `1`, kayıtta To Do görev/liste kimliği) — konu, gönderen,
 * metin yok. Kullanıcıya bağlı bir tercih olduğu için çıkışta silinmez (anahtar kullanıcıya
 * özel, sonraki kullanıcı görmez); bellekteki anlık görüntü çıkışta düşer (`resetFeedReactions`,
 * msal.js LOGOUT zinciri).
 */
const VERSION = 1

/** Gönderinin tepki anahtarları, öncelik sırasıyla. */
export function reactionKeys(post) {
  return [post?.messageId, post?.id].filter(Boolean)
}

/** Anlık görüntüde gönderinin kaydı (yoksa `undefined`). */
export function recordOf(items, post) {
  for (const key of reactionKeys(post)) if (items.has(key)) return items.get(key)
  return undefined
}

/**
 * "Kaydet"in görevi: kalıcı kayıt; yoksa Sana özel'in bu oturumda açtığı görev (`handoff`,
 * `lib/forYouSession.js` girdisi) — yalnız görev kimliği biliniyorsa, yoksa kaldırılamaz.
 */
export function savedRecordOf(items, post, handoff) {
  return recordOf(items, post) ?? (handoff?.state === "done" && handoff.taskId ? handoff : null)
}

/**
 * Kullanıcı başına kalıcı, sınırlı bir harita. Anlık görüntü (`{ user, items }`) yalnız
 * değişince yenilenir — `useSyncExternalStore` kimlikle karşılaştırır. `storage` olayı
 * öteki sekmedeki değişikliği getirir.
 */
export function createUserStore(prefix, max) {
  let snap = { user: null, items: new Map() }
  const listeners = new Set()
  const storageKey = (user) => `${prefix}${user}`

  function read(user) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey(user)) ?? "null")
      if (parsed?.v === VERSION && Array.isArray(parsed.items)) return new Map(parsed.items)
    } catch {
      // Bozuk kayıt ya da kapalı depo: boş başlanır.
    }
    return new Map()
  }

  function commit(items) {
    snap = { user: snap.user, items }
    try {
      window.localStorage.setItem(
        storageKey(snap.user),
        JSON.stringify({ v: VERSION, items: [...items] }),
      )
    } catch {
      // Depo dolu ya da kapalı: kayıt bu sekmede bellekte yaşar.
    }
    for (const fn of listeners) fn()
  }

  // Oturum henüz kurulmadıysa ("anon") kullanıcı her okumada yeniden sorulur.
  function current() {
    if (snap.user && snap.user !== "anon") return snap
    const user = currentUserKey()
    if (user !== snap.user)
      snap = { user, items: typeof window === "undefined" ? new Map() : read(user) }
    return snap
  }

  function onStorage(e) {
    if (!snap.user || e.key !== storageKey(snap.user)) return
    snap = { user: snap.user, items: read(snap.user) }
    for (const fn of listeners) fn()
  }

  return {
    subscribe(fn) {
      if (!listeners.size && typeof window !== "undefined")
        window.addEventListener("storage", onStorage)
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
        if (!listeners.size && typeof window !== "undefined")
          window.removeEventListener("storage", onStorage)
      }
    },
    getSnapshot: current,
    get: (post) => recordOf(current().items, post),
    /** Kayıt birincil anahtara yazılır ve sona taşınır; tavanı aşınca en eskisi düşer. */
    set(post, value) {
      const [primary, ...rest] = reactionKeys(post)
      if (!primary) return
      const items = new Map(current().items)
      for (const key of [primary, ...rest]) items.delete(key)
      items.set(primary, value)
      while (items.size > max) items.delete(items.keys().next().value)
      commit(items)
    },
    remove(post) {
      const keys = reactionKeys(post)
      const { items: now } = current()
      if (!keys.some((k) => now.has(k))) return
      const items = new Map(now)
      for (const key of keys) items.delete(key)
      commit(items)
    },
    /** Çıkışta: bellekteki görüntü düşer, kalıcı kayıt kullanıcınınkiyle yerinde kalır. */
    reset() {
      snap = { user: null, items: new Map() }
      for (const fn of listeners) fn()
    },
  }
}

const likes = createUserStore("tyro-feed-likes-v1:", 500)

/** Beğeni deposu. Yerel uygulama: anında, iyimser; sayaç yok. */
export const likeStore = {
  ...likes,
  /** @returns {boolean} yeni durum (beğenildi mi) */
  toggle(post) {
    if (likes.get(post)) {
      likes.remove(post)
      return false
    }
    likes.set(post, 1)
    return true
  },
  /** Paylaşımlı sayaç; yerel depoda bilinmiyor → `null` (kart sayı çizmez). */
  countOf: () => null,
}

/** "Kaydet" kaydı: anahtar → `{ taskId, listId }` (To Do görevi). */
export const savedStore = createUserStore("tyro-feed-saved-v1:", 300)

export function resetFeedReactions() {
  likeStore.reset()
  savedStore.reset()
}
