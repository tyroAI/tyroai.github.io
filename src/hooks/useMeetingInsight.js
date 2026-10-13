import { useCallback, useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import {
  fetchMeetingInsight,
  forgetMeetingIdentity,
  grantMeetingScopes,
  INSIGHT,
} from "@/lib/meetingInsights"

// Kesin cevaplar (özet ya da "yok") bellekte; çıkışta düşer (msal.js LOGOUT).
const cache = new Map()
const MIN = 60_000
// Copilot özeti toplantı bitince birkaç saat içinde gelir: yeni biten toplantının
// "yok" cevabı on dakika sonra yeniden sorulur, oturum boyunca saklanmaz.
const RECENT_MS = 6 * 60 * MIN
const RECHECK_MS = 10 * MIN

export function clearMeetingInsightCache() {
  cache.clear()
  forgetMeetingIdentity()
}

function cached(key, event) {
  const v = cache.get(key)
  if (!v) return null
  const now = Date.now()
  const recent = event?.end && now - event.end.getTime() < RECENT_MS
  if (v.status === INSIGHT.none && recent && now - v.at > RECHECK_MS) {
    cache.delete(key)
    return null
  }
  return v
}

/**
 * Bir toplantının yapay zekâ özeti (`lib/meetingInsights`). `event` yoksa
 * istek atılmaz. "Soramadık" (izin, hata) önbelleğe girmez: izin verilince ya
 * da yeniden denenince tekrar sorulur.
 */
export function useMeetingInsight(event) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const key = event?.joinUrl ? `${event.joinUrl}|${event.start?.getTime?.() ?? ""}` : null
  const [loaded, setLoaded] = useState(null) // { key, value }
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!key || cached(key, event)) return undefined
    let live = true
    fetchMeetingInsight(instance, account, event).then((value) => {
      if (value.status === INSIGHT.ready || value.status === INSIGHT.none)
        cache.set(key, { ...value, at: Date.now() })
      if (live) setLoaded({ key, value })
    })
    return () => {
      live = false
    }
    // `event` her çizimde yeni olabilir; kimliği `key` taşıyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce, instance, account])

  const retry = useCallback(() => {
    if (key) cache.delete(key)
    setLoaded(null)
    setNonce((n) => n + 1)
  }, [key])

  const grant = useCallback(async () => {
    if (await grantMeetingScopes(instance, account)) retry()
  }, [instance, account, retry])

  if (!key) return { status: INSIGHT.none, retry, grant }
  const value = cache.get(key) ?? (loaded?.key === key ? loaded.value : { status: INSIGHT.loading })
  return { ...value, retry, grant }
}
