import { useCallback, useEffect, useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { graphGet, STATUS } from "@/lib/graph"
import { isMsalConfigured } from "@/lib/msal"
import { normaliseDrive, normaliseDriveItem, normaliseGroup, normaliseSite } from "@/lib/driveItem"
import { FILES_PAGE } from "@/lib/filesPolicy"
import { resetCaps, runLadder } from "@/lib/filesLadder"
import { tokenFor } from "@/lib/filesLocation"
import { rememberMeta } from "@/lib/filesNav"
import { CHILD_ORDERBY, childrenPath, childrenTrials, sortItems } from "@/lib/filesQuery"
import { trSort } from "@/lib/utils"

/**
 * Keşfet › Dosyalarım'ın GEZİNME kancası — bir konumun içeriği.
 *
 * Konumlar (düz veri, adreste taşınan kimliklerden kurulur):
 *   `{ kind: "onedrive" }`                      → kişinin OneDrive kökü
 *   `{ kind: "drive", driveId }`                → bir kitaplığın kökü
 *   `{ kind: "folder", driveId, itemId }`       → bir klasör
 *   `{ kind: "site", siteId }`                  → sitenin belge kitaplıkları
 *   `{ kind: "sites" }`                         → kök site + takip edilenler (Hızlı erişim)
 *   `{ kind: "sites", teams: true }`            → SharePoint kökü: + ekiplerin (§7.6: 3 istek)
 *   `{ kind: "teams" }`                         → yalnız ekipler (Microsoft 365 grupları)
 *
 * Header'daki panelin `useDriveItems`inden AYRI, bilerek: panel gezinirken
 * eski listeyi yerinde tutuyor (küçük bir panelde doğru), bu sayfa ise
 * `{ key, value }` tutuyor — yeni klasörün başlığı altında eskisinin satırı
 * çizilmez.
 *
 * ⚠️ **`$orderby` VE GENİŞ `$select` TEK-YETENEK ELEMESİYLE** (§7.3,
 * `lib/filesLadder.js`). Geniş liste `remoteItem` ve `createdBy`ı da istiyor;
 * kiracıda ÖLÇÜLMEDİ (P7). 400 gelince önce YALNIZ `$orderby` kapatılıp
 * denenir, sonra YALNIZ dar liste, sonra ikisi birden; adım ancak kurtaran
 * istek 200 dönünce hesap başına oturum boyunca yazılır. Eski basamak
 * `$orderby`ı 400'ü görür görmez suçluyordu — reddedilen geniş `$select`
 * iken bile. Sıralama kapalıysa yüklenen sayfa istemcide sıralanır
 * (`clientSorted` — çağıran "sıralama yüklenenlerde" notunu buradan çizer).
 *
 * ⚠️ **KISMİ SONUÇ SÖYLENİR, ÖNBELLEĞE GİRMEZ.** SharePoint kökü üç uçtan
 * geliyor (kök site · takip edilenler · ekipler); biri düşerse ötekiler
 * çizilir ama `partial` hangisinin okunamadığını, `parts` her birinin durumunu
 * taşır — sessizce eksik bir liste "sitem yok" gibi okunurdu.
 */

const SITE_SEL = "id,displayName,name,webUrl"
const FILES = ["Files.Read.All"]
const SITES = ["Sites.Read.All"]
const GROUPS = ["GroupMember.Read.All"]
const TTL_MS = 2 * 60 * 1000
const TEAMS_TTL_MS = 5 * 60 * 1000
const FOLLOWED_MAX_NEXT = 3
const TEAMS_MAX_NEXT = 5

const cache = new Map()
const inflight = new Map()
/** Parça önbelleği (`${hesap}::root|followed|teams`): Hızlı erişim ile SharePoint kökü aynı kök/takip okumasını paylaşır. */
const parts = new Map()
/** `${hesap}::${groupId}` → çözülmüş sürücü (oturum boyunca). */
const groupDrives = new Map()
/** Çıkışta artar: çıkıştan önce yola çıkmış bir istek önbelleğe YAZAMASIN. */
let epoch = 0

export function clearFilesListingCache() {
  epoch += 1
  cache.clear()
  inflight.clear()
  parts.clear()
  groupDrives.clear()
  resetCaps("children")
  resetCaps("teams")
}

/** Teşhis/sınama: bellekte kaç kayıt var (çıkıştan sonra 0 olmalı — U16). */
export function filesListingCacheSize() {
  return cache.size + inflight.size + parts.size + groupDrives.size
}

/**
 * ⚠️ Kimlikler yola HAM giriyor (sitenin bileşik kimliğindeki virgül
 * `%2C`e çevrilmesin — panelin sahada çalışan yolu da ham). Adresten gelen
 * her kimlik önce `lib/filesLocation.js`te doğrulanıyor: `../`, `?`, `#`
 * taşıyan bir değer buraya hiç ulaşmaz.
 */
function childrenBase(loc) {
  if (loc.kind === "onedrive") return "/me/drive/root/children"
  if (loc.kind === "drive") return `/drives/${encodeURIComponent(loc.driveId)}/root/children`
  if (loc.kind === "folder")
    return `/drives/${encodeURIComponent(loc.driveId)}/items/${encodeURIComponent(loc.itemId)}/children`
  return null
}

const failure = (res, call) => ({
  status: res.status,
  httpStatus: res.httpStatus,
  code: res.code,
  error: res.error,
  call: res.call ?? call,
  items: [],
  next: null,
})
const partOf = (res) =>
  res ? { status: res.status, httpStatus: res.httpStatus ?? null, code: res.code ?? "" } : null

async function fetchChildren(instance, account, loc, sort) {
  const base = childrenBase(loc)
  if (!base)
    return { status: STATUS.error, code: "badLocation", call: "children", items: [], next: null }
  const { res, caps } = await runLadder({
    domain: "children",
    accountKey: account.homeAccountId,
    call: "children",
    build: (c) => childrenPath(base, { sort, caps: c, top: FILES_PAGE.childrenTop }),
    send: (path) => graphGet(instance, account, { path, scopes: FILES, retry: 2 }),
    trials: (_path, c) => childrenTrials(sort, c),
  })
  if (res.status !== STATUS.ready) return failure(res, "children")
  const clientSorted = Boolean(CHILD_ORDERBY[sort]) && caps.orderby === false
  const items = (res.data?.value ?? []).map(normaliseDriveItem)
  return {
    status: STATUS.ready,
    items: clientSorted ? sortItems(items, sort) : items,
    next: res.data?.["@odata.nextLink"] ?? null,
    clientSorted,
  }
}

/**
 * İlk sayfanın `nextLink`ini en çok `maxNext` kez izler. Ortadaki bir sayfa
 * düşerse elde olan döner ve `incomplete` işaretlenir (önbelleğe girmez,
 * `partial` söyler); tavan dolduysa `truncated`.
 */
async function followNext(instance, account, data, scopes, maxNext) {
  const values = [...(data?.value ?? [])]
  let next = data?.["@odata.nextLink"] ?? null
  let incomplete = false
  for (let i = 0; next && i < maxNext; i += 1) {
    const r = await graphGet(instance, account, { path: next, scopes, retry: 2 })
    if (r.status !== STATUS.ready) {
      incomplete = true
      break
    }
    values.push(...(r.data?.value ?? []))
    next = r.data?.["@odata.nextLink"] ?? null
  }
  return { values, incomplete, truncated: !incomplete && Boolean(next) }
}

async function getPaged(instance, account, path, scopes, maxNext) {
  const first = await graphGet(instance, account, { path, scopes, retry: 2 })
  if (first.status !== STATUS.ready)
    return { ...first, values: [], incomplete: false, truncated: false }
  return {
    status: STATUS.ready,
    ...(await followNext(instance, account, first.data, scopes, maxNext)),
  }
}

/** Parça önbelleği: yalnız TAM ve hazır parça girer; `nonce` yenilemeyi zorlar. */
async function cachedPart(account, name, ttl, nonce, fetcher) {
  const k = `${account.homeAccountId}::${name}`
  const hit = parts.get(k)
  if (hit && Date.now() - hit.at < ttl && hit.nonce === nonce) return hit.value
  const startedAt = epoch
  const value = await fetcher()
  if (value.status === STATUS.ready && !value.incomplete && startedAt === epoch)
    parts.set(k, { at: Date.now(), nonce, value })
  return value
}

function fetchRootSite(instance, account, nonce) {
  return cachedPart(account, "root", TTL_MS, nonce, async () => {
    const r = await graphGet(instance, account, {
      path: `/sites/root?$select=${SITE_SEL}`,
      scopes: SITES,
      retry: 2,
    })
    return r.status === STATUS.ready
      ? { status: STATUS.ready, site: r.data?.id ? normaliseSite(r.data) : null }
      : r
  })
}

function fetchFollowed(instance, account, nonce) {
  return cachedPart(account, "followed", TTL_MS, nonce, async () => {
    const r = await getPaged(
      instance,
      account,
      `/me/followedSites?$select=${SITE_SEL}`,
      SITES,
      FOLLOWED_MAX_NEXT,
    )
    return r.status === STATUS.ready
      ? { status: STATUS.ready, sites: r.values.map(normaliseSite), incomplete: r.incomplete }
      : r
  })
}

function isUnifiedGroup(g) {
  return (
    g?.["@odata.type"] === "#microsoft.graph.group" &&
    Array.isArray(g.groupTypes) &&
    g.groupTypes.includes("Unified")
  )
}

/**
 * Ekiplerin (§12.8): `/me/memberOf` → yalnız Microsoft 365 grupları
 * (`groupTypes` ∋ `Unified`), Türkçe sırayla. Kapsam `GroupMember.Read.All` —
 * zaten `loginRequest`te, yeni kapsam YOK. `$select` kiracıda ÖLÇÜLMEDİ (P8):
 * 400 alırsa basamak onu kapatıp tam nesneyle dener. 5 dk bellekte.
 */
function fetchTeams(instance, account, nonce) {
  return cachedPart(account, "teams", TEAMS_TTL_MS, nonce, async () => {
    if (!FILES_PAGE.teams)
      return { status: STATUS.ready, items: [], incomplete: false, truncated: false }
    const { res } = await runLadder({
      domain: "teams",
      accountKey: account.homeAccountId,
      call: "teams",
      build: (c) =>
        c.select === false
          ? "/me/memberOf?$top=100"
          : "/me/memberOf?$select=id,displayName,groupTypes&$top=100",
      send: (path) => graphGet(instance, account, { path, scopes: GROUPS, retry: 2 }),
      trials: (_path, c) =>
        c.select === false
          ? []
          : [{ cap: "select", patch: { select: false }, label: "$select kapatıldı" }],
    })
    if (res.status !== STATUS.ready) return failure(res, "teams")
    const { values, incomplete, truncated } = await followNext(
      instance,
      account,
      res.data,
      GROUPS,
      TEAMS_MAX_NEXT,
    )
    const items = values
      .filter(isUnifiedGroup)
      .map(normaliseGroup)
      .sort((a, b) => trSort(a.name, b.name))
    return { status: STATUS.ready, items, incomplete, truncated }
  })
}

/**
 * Kök site + takip edilenler (+ `teams` ise ekipler), paralel. En az biri
 * okunduysa HAZIR; `partial` okunamayanları ("root" · "followed" · "teams"),
 * `parts` her birinin durumunu, `sitesDenied` iki site ucunun da izinle
 * reddedildiğini söyler (Bağlan → `Sites.Read.All`; ekipler yine listelenir).
 */
async function fetchSites(instance, account, { teams: withTeams = false, nonce }) {
  const [root, followed, teams] = await Promise.all([
    fetchRootSite(instance, account, nonce),
    fetchFollowed(instance, account, nonce),
    withTeams && FILES_PAGE.teams ? fetchTeams(instance, account, nonce) : Promise.resolve(null),
  ])
  const rootOk = root.status === STATUS.ready
  const followedOk = followed.status === STATUS.ready
  const teamsOk = teams?.status === STATUS.ready
  const partInfo = {
    root: partOf(root),
    followed: partOf(followed),
    ...(teams ? { teams: partOf(teams) } : {}),
  }
  const partial = [
    !rootOk && "root",
    (!followedOk || followed.incomplete) && "followed",
    teams && (!teamsOk || teams.incomplete) && "teams",
  ].filter(Boolean)
  const sitesDenied = root.status === STATUS.denied && followed.status === STATUS.denied
  if (!rootOk && !followedOk && !teamsOk) {
    // İzin reddi öne: çaresi (Bağlan) kullanıcıda, hatanınki değil.
    const lead =
      root.status === STATUS.denied ? root : followed.status === STATUS.denied ? followed : root
    return { ...failure(lead, "sites"), partial, parts: partInfo, sitesDenied }
  }
  const rootSite = rootOk ? root.site : null
  const seen = new Set(rootSite ? [rootSite.id] : [])
  const followedSites = (followedOk ? followed.sites : []).filter(
    (s) => !seen.has(s.id) && seen.add(s.id),
  )
  return {
    status: STATUS.ready,
    items: [
      ...(rootSite ? [{ ...rootSite, group: "root" }] : []),
      ...followedSites.map((s) => ({ ...s, group: "followed" })),
      ...(teamsOk ? teams.items.map((g) => ({ ...g, group: "teams" })) : []),
    ],
    next: null,
    partial,
    parts: partInfo,
    sitesDenied,
  }
}

async function fetchListing(instance, account, loc, sort, nonce) {
  if (loc.kind === "sites")
    return fetchSites(instance, account, { teams: Boolean(loc.teams), nonce })
  if (loc.kind === "teams") {
    const r = await fetchTeams(instance, account, nonce)
    if (r.status !== STATUS.ready) return { ...failure(r, "teams"), partial: ["teams"] }
    return {
      status: STATUS.ready,
      items: r.items.map((g) => ({ ...g, group: "teams" })),
      next: null,
      partial: r.incomplete ? ["teams"] : [],
      truncated: r.truncated,
    }
  }
  if (loc.kind === "site") {
    const res = await graphGet(instance, account, {
      path: `/sites/${loc.siteId}/drives?$select=id,name,description,webUrl,driveType`,
      scopes: SITES,
      retry: 2,
    })
    if (res.status !== STATUS.ready) return failure(res, "site")
    return { status: STATUS.ready, items: (res.data?.value ?? []).map(normaliseDrive), next: null }
  }
  return fetchChildren(instance, account, loc, sort)
}

const GROUP_ID = /^[A-Za-z0-9-]{2,64}$/

/**
 * Ekip satırına tıklandı: grubun belge kitaplığını çöz (§6, §7.1) —
 * `GET /groups/{id}/drive`, `Files.Read.All`. Çağıran dönen belirteçle
 * (`token`, `d~<driveId>`) gezinir (push). Adı ekibin adıyla `filesNav`e
 * tohumlanır: kitaplığın adı ("Documents") hangi ekip olduğunu söylemiyor.
 * Başarılı çözüm oturum boyunca bellekte; hata saklanmaz.
 *
 * @param {object} instance  MSAL
 * @param {object} account   MSAL hesabı
 * @param {{ groupId: string, name?: string }} group  ekip satırı
 * @returns {Promise<{ status: string, driveId?: string, token?: string, name?: string, webUrl?: string, driveType?: string, httpStatus?: number, code?: string, call?: string }>}
 */
export async function resolveGroupDrive(instance, account, group) {
  if (!instance || !account) return { status: STATUS.unauthenticated }
  const groupId = String(group?.groupId ?? "")
  if (!GROUP_ID.test(groupId))
    return { status: STATUS.error, code: "invalidGroupId", call: "groupDrive" }
  const k = `${account.homeAccountId}::${groupId}`
  let value = groupDrives.get(k)
  if (!value) {
    const startedAt = epoch
    const res = await graphGet(instance, account, {
      path: `/groups/${encodeURIComponent(groupId)}/drive?$select=id,name,webUrl,driveType`,
      scopes: FILES,
      retry: 2,
    })
    if (res.status !== STATUS.ready || !res.data?.id) {
      return {
        status: res.status === STATUS.ready ? STATUS.error : res.status,
        httpStatus: res.httpStatus,
        code: res.code || (res.status === STATUS.ready ? "noDrive" : ""),
        call: "groupDrive",
      }
    }
    const d = res.data
    value = {
      status: STATUS.ready,
      driveId: d.id,
      token: tokenFor({ kind: "drive", driveId: d.id }),
      name: d.name ?? "",
      webUrl: d.webUrl ?? "",
      driveType: d.driveType ?? "",
    }
    if (startedAt === epoch) groupDrives.set(k, value)
  }
  if (value.token)
    rememberMeta(value.token, { name: group?.name || value.name, webUrl: value.webUrl })
  return value
}

const LOADING = Object.freeze({ status: "loading", items: [], next: null })

/**
 * @param {object|null} loc  yukarıdaki konumlardan biri; `null` → istek yok (`idle`)
 * @param {{ sort?: "name"|"modified"|"size", nonce?: number }} [opts]
 */
export function useFilesListing(loc, { sort = "name", nonce = 0 } = {}) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const signedIn = isMsalConfigured && Boolean(account)
  const locJson = loc ? JSON.stringify(loc) : ""
  const key = locJson && account ? `${account.homeAccountId}::${locJson}::${sort}` : ""
  const [state, setState] = useState({ key: "", value: LOADING })
  const [loadingMore, setLoadingMore] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    if (!signedIn || !key) return
    const parsed = JSON.parse(locJson)
    const ttl = parsed.kind === "teams" ? TEAMS_TTL_MS : TTL_MS
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < ttl && hit.nonce === nonce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((s) => (s.key === key && s.value === hit.value ? s : { key, value: hit.value }))
      return
    }
    const mySeq = ++seq.current
    let alive = true
    const flightKey = `${key}::${nonce}`
    let flight = inflight.get(flightKey)
    if (!flight) {
      const startedAt = epoch
      flight = fetchListing(instance, account, parsed, sort, nonce)
        .catch((e) => ({
          status: STATUS.error,
          error: String(e?.message ?? e),
          call: "listing",
          items: [],
          next: null,
        }))
        .then((result) => {
          const value = { ...result, nonce }
          // Kısmi liste önbelleğe GİRMEZ: eksik kalan uç 2 dakika eksik kalmasın.
          if (value.status === STATUS.ready && !value.partial?.length && startedAt === epoch)
            cache.set(key, { at: Date.now(), nonce, value })
          return value
        })
        .finally(() => {
          if (inflight.get(flightKey) === flight) inflight.delete(flightKey)
        })
      inflight.set(flightKey, flight)
    }
    flight.then((value) => {
      if (!alive || mySeq !== seq.current) return
      setState({ key, value })
    })
    return () => {
      alive = false
    }
  }, [signedIn, key, locJson, sort, nonce, instance, account])

  const current = state.key === key ? state.value : null

  const loadMore = useCallback(async () => {
    if (!current?.next || loadingMore) return
    setLoadingMore(true)
    const mySeq = seq.current
    const startedAt = epoch
    const res = await graphGet(instance, account, { path: current.next, scopes: FILES, retry: 2 })
    setLoadingMore(false)
    if (mySeq !== seq.current || res.status !== STATUS.ready || startedAt !== epoch) return
    const more = (res.data?.value ?? []).map(normaliseDriveItem)
    const merged = [...current.items, ...more]
    const value = {
      ...current,
      items: current.clientSorted ? sortItems(merged, sort) : merged,
      next: res.data?.["@odata.nextLink"] ?? null,
    }
    cache.set(key, { at: Date.now(), nonce, value })
    setState({ key, value })
  }, [current, loadingMore, instance, account, key, nonce, sort])

  if (!signedIn)
    return {
      ...LOADING,
      status: STATUS.unauthenticated,
      hasMore: false,
      loadMore,
      loadingMore: false,
    }
  if (!key) return { ...LOADING, status: "idle", hasMore: false, loadMore, loadingMore: false }
  const value = current ?? LOADING
  return {
    ...value,
    hasMore: Boolean(value.next),
    loadMore,
    loadingMore,
    stale: !current && state.value.status === STATUS.ready ? state.value : null,
  }
}
