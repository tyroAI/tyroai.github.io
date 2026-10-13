import { useCallback, useEffect, useMemo, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { dismissedKey, readDismissed, writeDismissed } from "@/lib/selfServiceDismissed"

/**
 * Kapatılan akıllı uyarılar — OTURUM boyu ve HESAP BAŞINA (sekme kapanınca ya da çıkışta
 * biter; aynı oturumda sayfa yenilense de geri gelmez). Depo kuralı `lib/selfServiceDismissed`.
 * Depolama kapalıysa kapatma yalnız bu görünümde yaşar.
 */
export function useDismissedAlerts() {
  const { accounts } = useMsal()
  const key = dismissedKey(accounts[0]?.homeAccountId)
  // Bu görünümde kapatılanlar, depo anahtarına göre: hesap değişince öbürünün listesi okunur.
  const [local, setLocal] = useState({})
  const dismissed = useMemo(() => local[key] ?? readDismissed(key), [local, key])
  const dismiss = useCallback(
    (alertKey) =>
      setLocal((prev) => {
        const list = prev[key] ?? readDismissed(key)
        return list.includes(alertKey) ? prev : { ...prev, [key]: [...list, alertKey] }
      }),
    [key],
  )
  useEffect(() => {
    if (local[key]?.length) writeDismissed(key, local[key])
  }, [local, key])
  return [dismissed, dismiss]
}
