import { STATUS, graphGet } from "@/lib/graph"
import { teamsLinkIn } from "@/lib/teamsJoin"

// Teams dışı sağlayıcılar; Teams linki varsa o kazanır.
const OTHER_LINKS = [
  /https:\/\/[\w.-]*zoom\.us\/(?:j|my|w)\/[^\s<>"')\]]+/i,
  /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i,
  /https:\/\/[\w.-]+\.webex\.com\/[^\s<>"')\]]*(?:j\.php|\/meet\/|\/join\/)[^\s<>"')\]]*/i,
]
// Defender "Safe Links" sarmalı: asıl adres `url` parametresinde.
const SAFE_LINK = /https:\/\/[\w.-]*safelinks\.protection\.outlook\.com\/\?[^\s<>"']+/gi

function unwrapSafeLinks(text) {
  return text.replace(SAFE_LINK, (wrapped) => {
    try {
      return new URL(wrapped.replace(/&amp;/g, "&")).searchParams.get("url") ?? wrapped
    } catch {
      return wrapped
    }
  })
}

/**
 * Davetin gövdesinde (HTML ya da metin) geçen toplantı katılma linki — önce
 * Teams, yoksa Zoom · Meet · Webex. HTML'deki `&amp;` çözülür, Safe Links
 * sarmalı açılır. Yoksa null.
 */
export function joinUrlIn(content) {
  if (!content) return null
  const text = unwrapSafeLinks(String(content))
  const hit = teamsLinkIn(text) ?? OTHER_LINKS.map((re) => text.match(re)?.[0]).find(Boolean)
  return hit ? hit.replace(/&amp;/g, "&") : null
}

// Etkinlik kimliği → link ya da null. Yalnız BAŞARILI okuma saklanır (hata
// bir sonraki açılışta yeniden denenir); çıkışta temizlenir (msal LOGOUT).
const cache = new Map()
const inflight = new Map()

/** Önbellekteki sonuç; `undefined` = henüz bilinmiyor. */
export function cachedJoinUrl(id) {
  return cache.get(id)
}

/**
 * Takvim listesi linki `onlineMeeting`tan ve ilk ~255 karakterlik önizlemeden
 * okur. Outlook'un klasik Teams eklentisi linki yalnız davetin GÖVDESİNE yazar
 * (`onlineMeeting` boş) — burada etkinliğin tamamı istenir ve link oradan
 * çıkarılır. Etkinlik başına bir istek.
 */
export function resolveJoinUrl(instance, account, id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id))
  if (inflight.has(id)) return inflight.get(id)
  const job = graphGet(instance, account, {
    path: `/me/events/${encodeURIComponent(id)}?$select=body,onlineMeeting,onlineMeetingUrl,location`,
    scopes: ["Calendars.Read"],
    retry: 1,
  }).then((res) => {
    inflight.delete(id)
    if (res.status !== STATUS.ready) return null
    const e = res.data ?? {}
    const url =
      e.onlineMeeting?.joinUrl ||
      e.onlineMeetingUrl ||
      joinUrlIn(e.body?.content) ||
      joinUrlIn(e.location?.displayName) ||
      null
    cache.set(id, url)
    return url
  })
  inflight.set(id, job)
  return job
}

export function clearJoinUrlCache() {
  cache.clear()
  inflight.clear()
}
