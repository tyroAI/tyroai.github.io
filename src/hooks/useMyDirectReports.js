import { useEffect, useState, useSyncExternalStore } from "react"
import { useMsal } from "@azure/msal-react"
import {
  cachedDirectReports,
  cachedManagerReports,
  directReportsVersion,
  loadDirectReports,
  loadManagerReports,
  managerReportsKey,
  subscribeDirectReports,
} from "@/lib/directReports"
import { isMsalConfigured } from "@/lib/msal"

const LOADING = { status: "loading", people: [] }
const NONE = { status: "unauthenticated", people: [] }

/**
 * Kişinin doğrudan bağlıları (`lib/directReports`): `{ status, people }` — `status` "loading" ·
 * "ready" · "denied" · "error" · "unauthenticated". `people` Self Servis kişi biçiminde
 * (`memberFromGraph`). Ekip yoksa `ready` + boş liste. Önbelleğe yazılan listeyle yeniden çizer
 * (başka bir yerde okunsa da). `attempt` değişince okunamamış liste yeniden sorulur (yeni
 * cevaba dek eski durum kalır: ekran zıplamaz).
 */
export function useMyDirectReports(enabled = true, attempt = 0) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const key = account?.homeAccountId ?? null
  const [loaded, setLoaded] = useState(null) // { key, value }
  useSyncExternalStore(subscribeDirectReports, directReportsVersion)

  useEffect(() => {
    if (!enabled || !key || !isMsalConfigured || cachedDirectReports(key)) return undefined
    let live = true
    loadDirectReports(instance, account).then((value) => live && setLoaded({ key, value }))
    return () => {
      live = false
    }
  }, [enabled, key, instance, account, attempt])

  if (!key || !isMsalConfigured) return NONE
  return cachedDirectReports(key) ?? (loaded?.key === key ? loaded.value : LOADING)
}

/**
 * Yöneticinin (`managerId`) doğrudan bağlıları — kişinin ekip arkadaşları, kendisi de içinde
 * (`lib/directReports` › `loadManagerReports`). Aynı dönüş biçimi ve `attempt`; `managerId`
 * yoksa "unauthenticated" (çağıran yöneticinin durumuna bakar).
 */
export function useManagerReports(managerId, enabled = true, attempt = 0) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const key = managerReportsKey(account, managerId)
  const [loaded, setLoaded] = useState(null) // { key, value }
  useSyncExternalStore(subscribeDirectReports, directReportsVersion)

  useEffect(() => {
    if (!enabled || !key || !isMsalConfigured || cachedManagerReports(key)) return undefined
    let live = true
    loadManagerReports(instance, account, managerId).then(
      (value) => live && setLoaded({ key, value }),
    )
    return () => {
      live = false
    }
  }, [enabled, key, instance, account, managerId, attempt])

  if (!key || !isMsalConfigured) return NONE
  return cachedManagerReports(key) ?? (loaded?.key === key ? loaded.value : LOADING)
}
