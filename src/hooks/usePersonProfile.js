import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { isMsalConfigured } from "@/lib/msal"
import { cachedPerson, fetchPerson, PERSON, personKey } from "@/lib/personDirectory"

/**
 * Kişi kartının verisi. `enabled` yalnız kart AÇIKKEN doğru: listede yüz kişi
 * görünüyor diye yüz dizin sorgusu atılmaz.
 *
 * Durum KİMLİKLE birlikte tutulur (`{ key, value }`) ve kimlik uyuşmazsa
 * `loading` döner — kart yöneticinin profiline geçince bir kare boyunca
 * önceki kişinin bilgisi görünmesin (`useFeedBody`in dersi).
 *
 * @returns {{ status: string, profile?: object }}
 */
export function usePersonProfile(person, enabled) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const key = personKey(person)
  const [state, setState] = useState(() => {
    const hit = cachedPerson(key)
    return hit ? { key, value: hit } : null
  })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!enabled || !key) return
    if (!isMsalConfigured || !account) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ key, value: { status: PERSON.unauthenticated } })
      return
    }
    const hit = cachedPerson(key)
    if (hit) {
      setState({ key, value: hit })
      return
    }
    let alive = true
    fetchPerson(instance, account, person).then((value) => {
      if (alive) setState({ key, value })
    })
    return () => {
      alive = false
    }
    // `person` nesnesi her çizimde yeni; kimliği `key` taşıyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, account, instance, nonce])

  const value = state && state.key === key ? state.value : { status: PERSON.loading }
  return {
    ...value,
    retry: () => {
      setState(null)
      setNonce((n) => n + 1)
    },
  }
}
