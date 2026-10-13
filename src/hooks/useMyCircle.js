import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { isMsalConfigured } from "@/lib/msal"
import { cachedMyCircle, loadMyCircle } from "@/lib/myCircle"

/**
 * Kişinin ekibi ve departmanı (`lib/myCircle`). Yüklenirken ve oturum yokken
 * `null`; izin yoksa `status` hazır olmayan bir nesne — çağıran ikisinde de
 * hiçbir şeyi vurgulamaz.
 */
export function useMyCircle(enabled = true) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const key = account?.homeAccountId ?? null
  const [loaded, setLoaded] = useState(null) // { key, value }

  useEffect(() => {
    if (!enabled || !key || !isMsalConfigured) return undefined
    let live = true
    loadMyCircle(instance, account).then((value) => live && setLoaded({ key, value }))
    return () => {
      live = false
    }
  }, [enabled, key, instance, account])

  if (!key) return null
  return loaded?.key === key ? loaded.value : cachedMyCircle(key)
}
