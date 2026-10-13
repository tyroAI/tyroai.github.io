import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { cachedJoinUrl, resolveJoinUrl } from "@/lib/meetingJoin"

/**
 * Bir toplantının katılma linki: listede varsa o, yoksa davetin gövdesinden
 * (`lib/meetingJoin`). Gövde yalnız `enabled` iken ve kendi takviminin
 * etkinliği için istenir. `pending` = henüz bilinmiyor (istek yolda).
 */
export function useJoinUrl(event, enabled = true) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const known = event?.joinUrl ?? null
  const id = event?.id
  const own = !event?.owner
  const need = Boolean(enabled && !known && id && own)
  const [found, setFound] = useState({})

  useEffect(() => {
    if (!need || cachedJoinUrl(id) !== undefined) return
    let live = true
    resolveJoinUrl(instance, account, id).then((url) => {
      if (live) setFound((prev) => ({ ...prev, [id]: url }))
    })
    return () => {
      live = false
    }
  }, [need, id, instance, account])

  if (known) return { url: known, pending: false }
  if (!id || !own) return { url: null, pending: false }
  const hit = cachedJoinUrl(id)
  if (hit !== undefined) return { url: hit, pending: false }
  if (id in found) return { url: found[id], pending: false }
  return { url: null, pending: need }
}
