import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { graphGet, graphPost, STATUS } from "@/lib/graph"
import { isMsalConfigured } from "@/lib/msal"
import { useMyDrive } from "@/hooks/useMyDrive"
import { FILES_PAGE } from "@/lib/filesPolicy"
import { resetCaps, runLadder } from "@/lib/filesLadder"
import {
  ensureMineRung,
  knownRung,
  mineKql,
  personClauseFor,
  rootPending,
  walkRungs,
} from "@/lib/filesIdentity"
import {
  buildSearchRequest,
  normaliseHit,
  searchTrials,
  sortItems,
  typeCounts,
  typesNeedClientFilter,
} from "@/lib/filesQuery"

/**
 * Keşfet › Dosyalarım'ın ARAMA kancası — `POST /search/query` (driveItem).
 *
 * Aynı sözleşme: hiç fırlatmaz, her başarısızlık bir DURUM ("soramadık" ≠
 * "dosya yok"). Kuralları:
 *
 * ⚠️ **YETENEK BASAMAĞI TEK-YETENEK ELEMESİ** (`lib/filesLadder.js`, §7.3).
 * Sıralama, sayılar, alan listesi ve şablon kiracının şemasına bağlı ve CANLI
 * KİRACIDA ÖLÇÜLMEDİ. 400 gelince her kullanılan yetenek TEK BAŞINA kapatılıp
 * denenir; bir adım ancak onu kanıtlayan istek 200 dönünce, hesap başına ve
 * oturum boyunca hatırlanır. Hiçbiri kurtarmazsa sorgunun KENDİSİ
 * reddediliyor: HATA (`rejected: true`), boş liste DEĞİL, ve hiçbir yetenek
 * suçlanmaz. Yalnız 400 basamak indirir.
 *
 * ⚠️ **"BEN" BASAMAKLI** (`lib/filesIdentity.js`, §7.4). `params.recent`
 * (son çalıştıkların) ve `params.person` ("Kişi") kimliği upn → mail →
 * OneDrive yolu basamaklarıyla çözer; basamak bilinmeden "Kişi" kullanılırsa
 * önce TEK öğelik yoklama gider ve arama o bitene kadar "loading" kalır.
 * Kimlik girdileri (posta, OneDrive kökü) ANAHTARDA DEĞİL: sonradan gelen bir
 * posta adresi ya da kök, basamak zaten bilinirken ikinci bir istek
 * açtırmasın. Yalnız "kökü bekliyorum" (`waiting`) diyen sonuç, kök gelince
 * yeniden sorulur.
 *
 * ⚠️ **KLASÖR SORGUSU KİŞİ KISITI TAŞIMAZ** (§12.10) — `buildSearchRequest`.
 *
 * ⚠️ **DURUM KİMLİKLE BİRLİKTE** (`{ key, value }`): anahtar değişince eski
 * sorgunun sonucu yeni başlığın altında çizilmez ("başlıkta B, metinde A").
 * Önceki hazır sonuç `stale` olarak ayrıca verilir — çağıran onu soluk
 * gösterip her tuşta iskelete düşmemeyi seçebilir.
 *
 * ⚠️ **ÖNBELLEK BELLEKTE**, hesap anahtarlı, 2 dk, en çok 40 sorgu; yalnız
 * hazır sonuç girer ve çıkışta düşer (`clearFilesSearchCache`, msal.js).
 * Dosya adları ve yolları başkalarının belgeleri — diske yazılmaz. Yolda
 * olan aynı sorgu paylaşılır (StrictMode'un çift efekti tek istekle öder).
 */

const TTL_MS = 2 * 60 * 1000
const MAX_ENTRIES = 40
export const SEARCH_CAP = FILES_PAGE.maxResults
const FILES = ["Files.Read.All"]
const CLIENT_SORTS = new Set(["modified", "name", "size"])

const cache = new Map()
const inflight = new Map()
/** Çıkışta artar: çıkıştan önce yola çıkmış bir istek önbelleğe YAZAMASIN. */
let epoch = 0

export function clearFilesSearchCache() {
  epoch += 1
  cache.clear()
  inflight.clear()
  resetCaps("search")
}

/** Teşhis/sınama: bellekte kaç kayıt var (çıkıştan sonra 0 olmalı — U16). */
export function filesSearchCacheSize() {
  return cache.size + inflight.size
}

function remember(key, value, nonce) {
  cache.delete(key)
  cache.set(key, { at: Date.now(), value, nonce })
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value)
}

const LOADING = Object.freeze({
  status: "loading",
  items: [],
  total: 0,
  moreAvailable: false,
  aggregations: null,
  typeCounts: null,
  sortApplied: false,
  clientSorted: false,
  clientFiltered: false,
  personApplied: false,
  personUnavailable: false,
  mineRung: null,
  rejected: false,
})

/** Tek bir sayfa, yetenek basamağıyla. Kimlik burada YOK — çağıran `personClause`/kapsamı hazırlar. */
async function searchOnce(instance, account, params, from, size) {
  const folders = params.kind === "folders"
  const call = folders ? "folders" : "search"
  const { res, req } = await runLadder({
    domain: "search",
    accountKey: account.homeAccountId,
    call,
    build: (caps) => buildSearchRequest({ ...params, from, size, caps }),
    send: (body) =>
      graphPost(instance, account, { path: "/search/query", scopes: FILES, body, retry: 1 }),
    trials: searchTrials,
  })
  if (res.status !== STATUS.ready) {
    return {
      ...LOADING,
      status: res.status,
      httpStatus: res.httpStatus,
      code: res.code,
      error: res.error,
      call: res.call ?? call,
      rejected: Boolean(res.rejected),
    }
  }
  const container = res.data?.value?.[0]?.hitsContainers?.[0] ?? {}
  let items = (container.hits ?? []).map(normaliseHit).filter(Boolean)
  // Klasör sorgusunun isabetleri KLASÖRDÜR (§7.2) — `fields` kısıtlıysa `folder` yüzü gelmeyebilir.
  if (folders) items = items.map((it) => ({ ...it, kind: "folder", ext: "" }))
  const r0 = req?.requests?.[0] ?? {}
  return {
    ...LOADING,
    status: STATUS.ready,
    items,
    total: Number(container.total) || items.length,
    moreAvailable: Boolean(container.moreResultsAvailable),
    aggregations: container.aggregations ?? null,
    sortApplied: Boolean(r0.sortProperties),
  }
}

/** Son listenin isteği o basamakla (§7.2: kapsam = basamağın "benim" kısıtı, sıralama son değişiklik). */
function recentParams(params, rung) {
  return {
    kind: "files",
    text: params.text ?? "",
    scope: [...(params.scope ?? []), mineKql(rung)],
    types: params.types ?? [],
    date: params.date ?? "",
    sort: params.sort || "modified",
  }
}

/** `/me.mail` — posta basamağı için, YALNIZ upn düşünce (tembel). Okunamazsa `""`. */
async function fetchMyMail(instance, account) {
  const res = await graphGet(instance, account, {
    path: "/me?$select=mail,userPrincipalName",
    scopes: ["User.Read"],
    retry: 1,
  })
  return res.status === STATUS.ready ? String(res.data?.mail ?? "") : ""
}

async function runQuery(instance, account, params, from, size, ids) {
  const accountKey = account.homeAccountId
  const fetchMail = () => fetchMyMail(instance, account)
  if (params.recent) {
    return walkRungs({
      accountKey,
      ids,
      fetchMail,
      attempt: (rung) => searchOnce(instance, account, recentParams(params, rung), from, size),
    })
  }
  if (params.person && params.kind !== "folders") {
    let rung = knownRung(accountKey, ids)
    if (!rung) {
      const probe = await ensureMineRung({
        accountKey,
        ids,
        fetchMail,
        attempt: (r) => searchOnce(instance, account, recentParams({}, r), 0, 1),
      })
      // Basamak bulunamadı: yoklamanın sebebi (izin, hata, kökü bekleme) aramanın da sebebi.
      if (!probe.rung) return { ...LOADING, ...(probe.result ?? {}), items: [], mineRung: null }
      rung = probe.rung
    }
    if (!rung.value) return { ...LOADING, ...rootPending(ids) }
    const pc = personClauseFor(params.person, rung)
    const res = await searchOnce(
      instance,
      account,
      { ...params, personClause: pc.clause },
      from,
      size,
    )
    return {
      ...res,
      personApplied: pc.applied,
      personUnavailable: pc.unavailable,
      mineRung: rung.id,
    }
  }
  return searchOnce(instance, account, params, from, size)
}

function dedupe(items) {
  const seen = new Set()
  return items.filter((it) => {
    const k = `${it.driveId}::${it.itemId}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** Hazır sonucun türetilen alanları: sıralama, tür sayıları, istemci süzgeci bayrağı. */
function derive(value, params) {
  if (value.status !== STATUS.ready) return value
  let items = dedupe(value.items)
  const sortKey = CLIENT_SORTS.has(params.sort) ? params.sort : ""
  // Sunucu sıralayamadıysa YÜKLENENLER istemcide sıralanır (`notice.sortedLoaded`) —
  // son liste gün bantlarına sırasız bölünmesin (§12.17).
  const clientSorted = Boolean(sortKey) && !value.sortApplied
  if (clientSorted) items = sortItems(items, sortKey, { foldersFirst: false })
  return {
    ...value,
    items,
    clientSorted,
    clientFiltered: typesNeedClientFilter(params.types),
    typeCounts: typeCounts({ aggregations: value.aggregations, items }),
  }
}

/**
 * @param {object|null} params  `buildSearchRequest`in girdisi (text, scope, kind,
 *   types, date, person, upn, sort, withAggregations) — ya da `{ recent: true,
 *   sort: "modified" }` (son çalıştıkların; `useRecentFiles`). `null` → istek yok.
 * @param {{ nonce?: number, firstPage?: number, identity?: { mail?: string, myRoot?: string } }} [opts]
 *   `identity.mail`: posta basamağının adresi (verilmezse gerekince `/me`den);
 *   `identity.myRoot`: OneDrive kökü (verilmezse `useMyDrive`).
 */
export function useFilesSearch(
  params,
  { nonce = 0, firstPage = FILES_PAGE.pageFirst, identity = null } = {},
) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const signedIn = isMsalConfigured && Boolean(account)
  const myDrive = useMyDrive({ nonce })
  // Parametreler KİMLİK olarak metin: her render'da yeni bir nesne gelse de
  // efekt yalnız sorgu gerçekten değişince koşar.
  const paramsJson = params ? JSON.stringify(params) : ""
  const key = paramsJson && account ? `${account.homeAccountId}::${firstPage}::${paramsJson}` : ""
  const [state, setState] = useState({ key: "", value: LOADING })
  const [loadingMore, setLoadingMore] = useState(false)
  const seq = useRef(0)

  const upn = params?.upn || account?.username || ""
  const mail = identity?.mail
  const myRoot = identity?.myRoot || myDrive.webUrl || ""
  const myRootStatus = identity?.myRoot ? STATUS.ready : myDrive.status
  const ids = useMemo(
    () => ({
      upn,
      mail,
      myRoot,
      myRootStatus,
      myRootHttp: myDrive.httpStatus,
      myRootCode: myDrive.code,
    }),
    [upn, mail, myRoot, myRootStatus, myDrive.httpStatus, myDrive.code],
  )
  const current = state.key === key ? state.value : null
  // Yalnız "kökü bekliyorum" diyen sonuç yeniden sorulur — kök (ya da sürücünün durumu) değişince.
  const waitDep = current?.waiting ? `${myRoot}|${myRootStatus}` : ""
  const readIds = useEffectEvent(() => ids)

  useEffect(() => {
    if (!signedIn || !key) return
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL_MS && hit.nonce === nonce) {
      // Modül önbelleği harici bir depo; efektte okunuyor (useMailMessages'ın muafiyeti).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((s) => (s.key === key && s.value === hit.value ? s : { key, value: hit.value }))
      return
    }
    const mySeq = ++seq.current
    let alive = true
    const flightKey = `${key}::${nonce}::${waitDep}`
    let flight = inflight.get(flightKey)
    if (!flight) {
      const parsed = JSON.parse(paramsJson)
      const startedAt = epoch
      flight = runQuery(instance, account, parsed, 0, firstPage, readIds())
        .catch((e) => ({
          ...LOADING,
          status: STATUS.error,
          error: String(e?.message ?? e),
          call: "search",
        }))
        .then((raw) => {
          // `nonce`: bu sonucu hangi yenileme üretti — çağıran "yenileme bitti mi" diye buna bakar.
          const value = { ...derive(raw, parsed), nonce }
          if (value.status === STATUS.ready && startedAt === epoch) remember(key, value, nonce)
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
  }, [signedIn, key, paramsJson, nonce, instance, account, firstPage, waitDep])

  const loadMore = useCallback(async () => {
    if (!current || current.status !== STATUS.ready || !current.moreAvailable || loadingMore) return
    if (current.items.length >= SEARCH_CAP) return
    setLoadingMore(true)
    const mySeq = seq.current
    const startedAt = epoch
    const parsed = JSON.parse(paramsJson)
    const size = Math.min(FILES_PAGE.pageNext, SEARCH_CAP - current.items.length)
    const page = await runQuery(instance, account, parsed, current.items.length, size, ids)
    setLoadingMore(false)
    // Arada sorgu değiştiyse gelen sayfa ATILIR: başka bir aramanın satırları
    // bu listeye eklenmez.
    if (mySeq !== seq.current || page.status !== STATUS.ready || startedAt !== epoch) return
    const value = {
      ...derive(
        {
          ...current,
          items: [...current.items, ...page.items],
          moreAvailable: page.moreAvailable,
          total: page.total || current.total,
        },
        parsed,
      ),
      nonce,
    }
    remember(key, value, nonce)
    setState({ key, value })
  }, [current, loadingMore, instance, account, key, paramsJson, nonce, ids])

  if (!signedIn)
    return {
      ...LOADING,
      status: STATUS.unauthenticated,
      key,
      loadMore,
      loadingMore: false,
      capReached: false,
      stale: null,
    }
  if (!key)
    return {
      ...LOADING,
      status: "idle",
      key,
      loadMore,
      loadingMore: false,
      capReached: false,
      stale: null,
    }
  const value = current ?? LOADING
  return {
    ...value,
    key,
    loadMore,
    loadingMore,
    capReached: value.items.length >= SEARCH_CAP,
    // Yeni sorgu yoldayken bir önceki HAZIR sonuç (başka anahtar) — soluk gösterilebilir.
    stale: !current && state.value.status === STATUS.ready ? state.value : null,
  }
}
