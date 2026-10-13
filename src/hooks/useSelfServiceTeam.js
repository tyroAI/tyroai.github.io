import { useCallback, useEffect, useMemo, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { useMyTeam } from "@/hooks/useMyTeam"
import { isMsalConfigured } from "@/lib/msal"
import { fetchTeamLeave } from "@/lib/selfServiceTeamApi"
import { teamPeople } from "@/lib/selfServiceTeamQuery"

/**
 * Ekibim'in TEK kancası (tarayıcı denemesinde bütünüyle sahtelenir). KAYNAK KURALI: ekip üyeleri
 * ve kimlikleri GRAPH'TAN — `useMyTeam` (yönetici, aynı yöneticiye bağlılar, bana bağlılar; her
 * üyede `relation`); fotoğraf ve varlık bileşende (`usePeoplePhotos`, `usePresence`). ERP'den
 * YALNIZ izin bakiyesi (yalnız bana bağlılar) ve izinler (`fetchTeamLeave`; bana bağlı olmayanın
 * izni türsüz), kişinin kendi oturumuyla; ekibin masrafı ve avansı okunmaz. Yalnız Ekibim
 * açıkken çalışır.
 *
 * Dönüş: `{ status, people, failed, leave, busy, refresh, connect }` — `status` Graph listesinin
 * durumu ("loading" · "ready" · "denied" · "error" · "unauthenticated"); `failed` okunamayan
 * Graph parçaları (`useMyTeam`: liste eksik); `leave` = `{ status, reason?, members, failed,
 * updatedAt? }`, `status`: "loading" · "ready" · "empty" (ERP'de eşleşen yok ya da rol
 * göstermedi) · "denied" (`reason`: "role" 401/403 · "consent" belirteç alınamadı) · "error" ·
 * "none" (ekip yok). `refresh` okunamayan Graph parçasını da yeniden sorar; `connect` belirteci
 * tıklamaya bağlı onayla ister.
 *
 * ⚠️ ERP cevabı YALNIZ BELLEKTE (5 dk taze) ve çıkışta düşer (`clearSelfServiceTeamCache`,
 * msal.js LOGOUT zinciri): iş arkadaşlarının izinleri kişisel veri. Anahtar üyelerin ilişkisini
 * de taşır: ilişki değişirse (ör. ekip arkadaşı bana bağlandı) cevap yeniden sorulur.
 */
const TTL_MS = 5 * 60 * 1000
const cache = new Map() // anahtar → { at, value }
const inflight = new Map()
// Çıkıştan sonra dönen cevap önbelleğe yazılmasın (bir önceki oturumun verisi).
let generation = 0

const LOADING = { status: "loading", members: {}, failed: [] }
const NONE = { status: "none", members: {}, failed: [] }

export function clearSelfServiceTeamCache() {
  cache.clear()
  inflight.clear()
  generation += 1
}

function load(key, people, { force = false, interactive = false } = {}) {
  const hit = cache.get(key)
  if (!force && hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value)
  if (inflight.has(key) && !interactive) return inflight.get(key)
  const gen = generation
  const job = fetchTeamLeave(people, { interactive })
    .then((res) => ({ ...res, updatedAt: Date.now() }))
    .catch((err) => ({
      status: err?.kind === "denied" ? "denied" : "error",
      // HTTP 401/403 rolün cevabı; belirteç hatası (onay yok) "Bağlan" ile çözülebilir.
      reason: /^HTTP /.test(err?.message ?? "") ? "role" : "consent",
      members: {},
      failed: [],
    }))
    .then((value) => {
      if (gen === generation && (value.status === "ready" || value.status === "empty"))
        cache.set(key, { at: Date.now(), value })
      return value
    })
    .finally(() => {
      if (inflight.get(key) === job) inflight.delete(key)
    })
  inflight.set(key, job)
  return job
}

export function useSelfServiceTeam(enabled = true) {
  const { accounts } = useMsal()
  const account = accounts[0] ?? null
  const signedIn = isMsalConfigured && Boolean(account)
  const team = useMyTeam(enabled && signedIn)
  const people = team.people
  const input = useMemo(() => teamPeople(people), [people])
  const key =
    signedIn && team.status === "ready" && input.length
      ? `${account.homeAccountId}|${input.map((p) => `${p.key}:${p.relation}`).join(",")}`
      : null
  const [state, setState] = useState(null) // { key, value }
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!enabled || !key) return undefined
    let alive = true
    load(key, input).then((value) => alive && setState({ key, value }))
    return () => {
      alive = false
    }
  }, [enabled, key, input])

  // Yenile ve Bağlan: kullanıcının eylemi (ilk yükleme `leave.status` "loading" ile görünür).
  const run = useCallback(
    (opts) => {
      if (!key) return
      setBusy(true)
      load(key, input, opts).then((value) => {
        // Bu arada ekip değiştiyse (okunamayan parça geldi) yeni ekibin cevabı ezilmez.
        setState((prev) => (prev && prev.key !== key ? prev : { key, value }))
        setBusy(false)
      })
    },
    [key, input],
  )

  const cached = key ? cache.get(key)?.value : null
  const leave = !key
    ? team.status === "loading"
      ? LOADING
      : NONE
    : state?.key === key
      ? state.value
      : (cached ?? LOADING)
  return {
    status: team.status,
    people,
    failed: team.failed,
    leave,
    busy,
    refresh: () => {
      if (team.failed.length) team.retry()
      run({ force: true })
    },
    connect: () => run({ force: true, interactive: true }),
  }
}
