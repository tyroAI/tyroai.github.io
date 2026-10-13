import { useEffect, useMemo, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { ENTITY_SET as HR_VIEW } from "@/lib/celebrations"
import { isMsalConfigured } from "@/lib/msal"
import { list, token } from "@/lib/selfServiceHttp"
import { teamDateParams, teamDatesFrom } from "@/lib/teamOccasions"

/**
 * Ekibin İK tarihleri (doğum gününün gün-ayı, kıdem tarihi) — Anasayfa'nın tebrikleriyle aynı İK
 * görünümü, yalnız ekibin adresleriyle (`teamDateParams`). Dönüş `{ [adres]: { birth, since } }`;
 * okunamazsa (yetki yok, ağ) boş nesne: ekranda doğum günü yok, hata da yok.
 *
 * ⚠️ Yalnız bellekte, hesap ve adres kümesiyle anahtarlı; çıkışta düşer (`clearTeamDatesCache`,
 * msal.js LOGOUT zinciri). Doğum yılı tutulmaz (`teamDatesFrom`).
 */
const EMPTY = Object.freeze({})
const cache = new Map() // anahtar → { [adres]: … } (yalnız başarılı cevap)
const inflight = new Map()
// Çıkıştan sonra dönen cevap önbelleğe yazılmasın.
let generation = 0

export function clearTeamDatesCache() {
  cache.clear()
  inflight.clear()
  generation += 1
}

async function fetchTeamDates(addresses) {
  const auth = await token()
  const parts = await Promise.all(
    teamDateParams(addresses).map((params) => list(auth, HR_VIEW, params)),
  )
  return teamDatesFrom(parts.flat())
}

function load(key, addresses) {
  if (cache.has(key)) return Promise.resolve(cache.get(key))
  if (inflight.has(key)) return inflight.get(key)
  const gen = generation
  const job = fetchTeamDates(addresses)
    .then((value) => {
      if (gen === generation) cache.set(key, value)
      return value
    })
    .catch(() => EMPTY)
    .finally(() => inflight.delete(key))
  inflight.set(key, job)
  return job
}

export function useTeamDates(people, enabled = true) {
  const { accounts } = useMsal()
  const account = accounts[0] ?? null
  const addresses = useMemo(
    () =>
      [...new Set((people ?? []).flatMap((p) => [p.address, p.upn]).filter(Boolean))]
        .map((a) => a.toLowerCase())
        .sort(),
    [people],
  )
  const key =
    enabled && isMsalConfigured && account && addresses.length
      ? `${account.homeAccountId}|${addresses.join(",")}`
      : null
  const [state, setState] = useState(null) // { key, value }

  // Yalnız anahtar değişince sorulur (adres listesi anahtarın içinde): liste dizisinin her
  // çizimde yeni olması yeniden istek ya da döngü doğurmasın.
  useEffect(() => {
    if (!key) return undefined
    let alive = true
    load(key, key.slice(key.indexOf("|") + 1).split(",")).then(
      (value) =>
        alive &&
        setState((prev) => (prev?.key === key && prev.value === value ? prev : { key, value })),
    )
    return () => {
      alive = false
    }
  }, [key])

  if (!key) return EMPTY
  return state?.key === key ? state.value : (cache.get(key) ?? EMPTY)
}
