import { useEffect, useState, useSyncExternalStore } from "react"
import { useMsal } from "@azure/msal-react"
import {
  isTeamMember,
  MEMBER_SELECT,
  MEMBER_SELECT_BASIC,
  memberFromGraph,
  rejectedSelect,
} from "@/lib/directReports"
import { graphGet, STATUS } from "@/lib/graph"

/**
 * Oturumdaki kişinin Entra'daki yöneticisi: `{ name, title, address }` ya da null.
 *
 * İmzalı formun alıcısını önceden doldurmak, Self Servis'in profil başlığındaki "Bağlı olduğum
 * kişi" ve Ekibim'in yönetici satırı için. Kapsam `User.Read.All` (kişi kartının ve "Çevrem"in
 * sessizce aldığı onaylı izin); yeni izin istenmez. Yönetici atanmamışsa (Graph 404) ya da izin
 * yoksa sonuç null ve alan boş kalır.
 *
 * Tek istek, ekip üyesiyle aynı seçim (`MEMBER_SELECT`; kiracı reddederse — 400 ya da 403 —
 * temel seçimle bir kez daha: başlık bugünkü gibi çıksın): başlık, ekip satırı (`member`,
 * kapalı hesapta null) ve ekip arkadaşlarını soran kimlik (`managerId`) aynı cevaptan.
 *
 * Kesin cevap (yönetici ya da "yok") hesap başına YALNIZ BELLEKTE tutulur ve çıkışta düşer
 * (`clearMyManagerCache`, msal.js LOGOUT zinciri): başkasının adı, adresi ve dizin kaydı.
 * Soramadıysak (izin · ağ) önbelleğe girmez, bir sonraki açılış yeniden sorar.
 */
const path = (select) => `/me/manager?$select=${select}`
const SCOPES = ["User.Read.All"]

const cache = new Map() // homeAccountId → { status, manager, member, managerId }
const inflight = new Map()
// Çıkıştan sonra dönen cevap önbelleğe yazılmasın (bir önceki oturumun verisi).
let generation = 0
// Önbelleğe cevap yazılınca abone kancalar yeniden çizer (başka bir yerde okunsa da).
const listeners = new Set()
let version = 0
const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const currentVersion = () => version

export function clearMyManagerCache() {
  cache.clear()
  inflight.clear()
  generation += 1
}

export function managerFromGraph(data) {
  const address = String(data?.mail || data?.userPrincipalName || "")
    .trim()
    .toLowerCase()
  if (!address) return null
  return {
    name: String(data?.displayName ?? "").trim() || address,
    title: String(data?.jobTitle ?? "").trim() || null,
    address,
  }
}

const NO_MANAGER = { status: STATUS.ready, manager: null, member: null, managerId: null }

/** `/me/manager` → `{ status, manager, member, managerId }`. */
export async function fetchMyManager(instance, account) {
  let res = await graphGet(instance, account, { path: path(MEMBER_SELECT), scopes: SCOPES })
  if (rejectedSelect(res))
    res = await graphGet(instance, account, { path: path(MEMBER_SELECT_BASIC), scopes: SCOPES })
  if (res.status === STATUS.ready) {
    const manager = managerFromGraph(res.data)
    if (!manager) return NO_MANAGER
    return {
      status: STATUS.ready,
      manager,
      member: isTeamMember(res.data) ? memberFromGraph(res.data) : null,
      managerId: String(res.data?.id ?? "").trim() || null,
    }
  }
  // 404 = yönetici atanmamış: bu da kesin bir cevap.
  if (res.httpStatus === 404) return NO_MANAGER
  return { status: res.status, manager: null, member: null, managerId: null }
}

function load(instance, account) {
  const key = account.homeAccountId
  if (inflight.has(key)) return inflight.get(key)
  const gen = generation
  const job = fetchMyManager(instance, account)
    .then((value) => {
      if (value.status === STATUS.ready && gen === generation) {
        cache.set(key, value)
        version += 1
        for (const listener of listeners) listener()
      }
      return value
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, job)
  return job
}

const LOADING = { status: "loading", manager: null, member: null, managerId: null }

/**
 * Yönetici ve durumu: `{ status: "loading" | "ready" | "denied" | "error" | …, manager, member,
 * managerId }`. Profil başlığı yüklenirken yer tutar, cevap gelince çizer (zıplama yok).
 * `attempt` değişince okunamamış cevap yeniden sorulur (Ekibim'in "Tekrar dene"si).
 */
export function useMyManagerState(enabled = true, attempt = 0) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const key = account?.homeAccountId ?? null
  const [state, setState] = useState(null) // { key, value }
  useSyncExternalStore(subscribe, currentVersion)

  useEffect(() => {
    if (!enabled || !account || cache.has(key)) return undefined
    let alive = true
    load(instance, account).then((value) => alive && setState({ key, value }))
    return () => {
      alive = false
    }
  }, [enabled, instance, account, key, attempt])

  if (!key) return { ...LOADING, status: STATUS.unauthenticated }
  return cache.get(key) ?? (state?.key === key ? state.value : null) ?? LOADING
}

export function useMyManager(enabled = true) {
  return useMyManagerState(enabled).manager
}
