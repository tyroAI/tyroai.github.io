import { STATUS } from "@/lib/graph"

/**
 * Widget'ların ortak bellek önbelleği (posta konusu, belge adı, ekip durumu,
 * Planner işleri — kişisel veri): yalnız BAŞARILI okuma saklanır, aynı anda
 * gelen ikinci istek ilkini bekler, çıkışta silinir (msal LOGOUT zinciri).
 */
const cache = new Map()

export function cached(key, ttl, load) {
  const hit = cache.get(key)
  if (hit?.promise) return hit.promise
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value)
  const promise = load().then(
    (value) => {
      if (value?.status === STATUS.ready) cache.set(key, { at: Date.now(), value })
      else cache.delete(key)
      return value
    },
    () => {
      cache.delete(key)
      return { status: STATUS.error }
    },
  )
  cache.set(key, { ...hit, promise })
  return promise
}

export function clearWidgetCache() {
  cache.clear()
}
