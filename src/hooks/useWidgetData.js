import { useCallback, useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { STATUS } from "@/lib/graph"
import { isMsalConfigured } from "@/lib/msal"
import { cached } from "@/lib/widgetCache"

/**
 * Bir widget'ın Graph verisi: `loader(instance, account)` → `{ status, data }`.
 * Önbellek kişiye ve widget'a göre (`lib/widgetCache`); `refresh` önbelleği
 * atlar. `loader` modül düzeyinde bir işlev olmalı (her render'da yeni işlev
 * isteği yeniden atardı).
 */
export function useWidgetData(name, loader, ttl = 120_000) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const key = isMsalConfigured && account ? `${account.homeAccountId}:${name}` : null
  const [state, setState] = useState({ key: null, status: "loading", data: null })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!key) return undefined
    let live = true
    cached(`${key}:${nonce}`, ttl, () => loader(instance, account)).then((res) => {
      if (live) setState({ key, status: res?.status ?? STATUS.error, data: res?.data ?? null })
    })
    return () => {
      live = false
    }
  }, [key, nonce, ttl, loader, instance, account])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])
  if (!key) return { status: STATUS.unauthenticated, data: null, refresh }
  return state.key === key ? { ...state, refresh } : { status: "loading", data: null, refresh }
}
