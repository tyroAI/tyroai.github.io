import { useCallback, useSyncExternalStore } from "react"
import { likeStore, recordOf } from "@/lib/feedReactions"

/**
 * Gönderinin beğenisi: `{ liked, count, toggle }`. Kart, okuma bölmesi ve Sana özel aynı
 * depoya abone — birinde beğenmek ötekinde anında görünür. `count` deponun sayısı; yerel
 * depoda `null` (sayı çizilmez). `toggle()` yeni durumu döner (kalp yalnız beğenince atar).
 */
export function useFeedLike(post) {
  const { items } = useSyncExternalStore(
    likeStore.subscribe,
    likeStore.getSnapshot,
    likeStore.getSnapshot,
  )
  const liked = Boolean(recordOf(items, post))
  const count = likeStore.countOf(post)
  const toggle = useCallback(() => likeStore.toggle(post), [post])
  return { liked, count, toggle }
}
