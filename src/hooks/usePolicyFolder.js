import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { graphGet, STATUS } from "@/lib/graph"
import { isMsalConfigured } from "@/lib/msal"
import { shareId } from "@/lib/shareId"

/**
 * Politika klasörünün Graph ADRESİ (`driveId` + `itemId`) — sonra sıradan
 * bir klasör gibi geziliyor (`useFilesListing`).
 *
 * Basamaklar (gerekçe `lib/corporateFiles.js`):
 *   1. `/sites/{host}:{sitePath}`            — site kimliği   (Sites.Read.All)
 *   2. `/sites/{id}/drives`                   — adı eşleşen kitaplık (varsayılan
 *      "Shared Documents" olmayabilir; listeden seçiliyor)
 *   3. `/drives/{d}/root:/{yol}`              — klasörün kendisi (Files, o
 *      reddederse Sites — İKİ AYRI sessiz deneme, tek listede değil)
 *   4. YEDEK: `/shares/{u!…}/driveItem`       — klasörün KODLANMIŞ adresiyle
 *      (`encodeURI(target.folderUrl)`); belgeye göre bu uç en az
 *      `Files.ReadWrite` istiyor, yani bizim okuma kapsamlarımızla belki hiç
 *      çalışmıyor — o yüzden en sonda. Kiracıda ÖLÇÜLMEDİ (P9).
 * Hepsi düşerse durum `denied`/`error` ve çağıran klasörün SharePoint
 * bağlantısını gösteriyor: "çalışmazsa eski hâline döner" sınıfı.
 *
 * ⚠️ Site ve kitaplık kimlikleri oturum boyunca bellekte (dört şirket aynı
 * siteyi paylaşıyor — bir kez çözülür), çıkışta düşer.
 */

const sites = new Map() // account::host:path → { siteId, drives }
const folders = new Map() // account::policyId → { driveId, itemId, webUrl }
/** account::policyId::nonce → yoldaki çözüm (StrictMode'un çift efekti ikinci turu açmasın). */
const inflight = new Map()
/** Çıkışta artar: çıkıştan önce yola çıkmış bir çözüm önbelleğe YAZAMASIN. */
let epoch = 0

export function clearPolicyFolderCache() {
  epoch += 1
  sites.clear()
  folders.clear()
  inflight.clear()
}

/** Teşhis/sınama: bellekte kaç kayıt var (çıkıştan sonra 0 olmalı — U16). */
export function policyFolderCacheSize() {
  return sites.size + folders.size + inflight.size
}

const encodePath = (rel) =>
  rel
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")
const decoded = (url) => {
  try {
    return decodeURI(url ?? "")
  } catch {
    return url ?? ""
  }
}

async function resolveSite(instance, account, target) {
  const key = `${account.homeAccountId}::${target.host}:${target.sitePath}`
  if (sites.has(key)) return { status: STATUS.ready, ...sites.get(key) }
  const startedAt = epoch
  const site = await graphGet(instance, account, {
    path: `/sites/${target.host}:${target.sitePath}?$select=id,webUrl`,
    scopes: ["Sites.Read.All"],
    retry: 2,
  })
  if (site.status !== STATUS.ready || !site.data?.id)
    return {
      status: site.status === STATUS.ready ? STATUS.error : site.status,
      httpStatus: site.httpStatus,
    }
  const drives = await graphGet(instance, account, {
    path: `/sites/${site.data.id}/drives?$select=id,name,webUrl`,
    scopes: ["Sites.Read.All"],
    retry: 2,
  })
  if (drives.status !== STATUS.ready)
    return { status: drives.status, httpStatus: drives.httpStatus }
  const value = { siteId: site.data.id, drives: drives.data?.value ?? [] }
  if (startedAt === epoch) sites.set(key, value)
  return { status: STATUS.ready, ...value }
}

async function getItem(instance, account, path) {
  let last = null
  for (const scopes of [["Files.Read.All"], ["Sites.Read.All"]]) {
    last = await graphGet(instance, account, { path, scopes, retry: 1 })
    if (last.status !== STATUS.denied) return last
  }
  return last
}

async function resolvePolicy(instance, account, policy) {
  const t = policy.target
  let firstFailure = null
  if (t) {
    const site = await resolveSite(instance, account, t)
    if (site.status === STATUS.ready) {
      const lib = site.drives.find((d) =>
        decoded(d.webUrl).replace(/\/+$/, "").toLowerCase().endsWith(`/${t.library}`.toLowerCase()),
      )
      if (lib) {
        const item = await getItem(
          instance,
          account,
          `/drives/${lib.id}/root:/${encodePath(t.relPath)}?$select=id,name,webUrl,parentReference`,
        )
        if (item.status === STATUS.ready && item.data?.id) {
          return {
            status: STATUS.ready,
            driveId: item.data.parentReference?.driveId ?? lib.id,
            itemId: item.data.id,
            webUrl: item.data.webUrl ?? t.folderUrl,
          }
        }
        firstFailure = item
      } else firstFailure = { status: STATUS.error, httpStatus: 404 }
    } else firstFailure = site
  }
  // Yedek: paylaşım ucu — KLASÖRÜN KENDİ adresiyle (`encodeURI(target.folderUrl)`),
  // görünüm sayfasıyla (`…/Forms/AllItems.aspx?id=…`) DEĞİL (§12.7): paylaşım
  // kimliği bir sürücü öğesinin adresinden kuruluyor; görünüm adresi bir öğe
  // değil, bir liste SAYFASI ve o kimlik hiçbir şeye çözülmezdi. Adres
  // çözülmüş hâlde saklanıyor ("Shared Documents"), paylaşım kimliği ise
  // tarayıcının göndereceği KODLANMIŞ adresi bekliyor.
  const shareUrl = t?.folderUrl ? encodeURI(t.folderUrl) : policy.fallbackUrl
  const share = await getItem(
    instance,
    account,
    `/shares/${shareId(shareUrl)}/driveItem?$select=id,name,webUrl,parentReference`,
  )
  if (share.status === STATUS.ready && share.data?.id) {
    return {
      status: STATUS.ready,
      driveId: share.data.parentReference?.driveId ?? null,
      itemId: share.data.id,
      webUrl: share.data.webUrl ?? policy.fallbackUrl,
    }
  }
  const f = firstFailure ?? share
  console.warn(
    `[files] politika klasörü "${policy.policyId}" çözülemedi: HTTP ${f?.httpStatus ?? "?"} · ${f?.status}`,
  )
  return {
    status: f?.status === STATUS.denied ? STATUS.denied : STATUS.error,
    httpStatus: f?.httpStatus,
  }
}

/** @param {object|null} policy `POLICY_ITEMS`tan biri; `null` → istek yok */
export function usePolicyFolder(policy, nonce = 0) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const signedIn = isMsalConfigured && Boolean(account)
  const key = policy && account ? `${account.homeAccountId}::${policy.policyId}` : ""
  const [state, setState] = useState({ key: "", value: null })

  useEffect(() => {
    if (!signedIn || !key) return
    const hit = folders.get(key)
    if (hit && !nonce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ key, value: hit })
      return
    }
    let alive = true
    const flightKey = `${key}::${nonce}`
    let flight = inflight.get(flightKey)
    if (!flight) {
      const startedAt = epoch
      flight = resolvePolicy(instance, account, policy)
        .then((value) => {
          if (value.status === STATUS.ready && startedAt === epoch) folders.set(key, value)
          return value
        })
        .finally(() => {
          if (inflight.get(flightKey) === flight) inflight.delete(flightKey)
        })
      inflight.set(flightKey, flight)
    }
    flight.then((value) => {
      if (alive) setState({ key, value })
    })
    return () => {
      alive = false
    }
    // `policy` sabit listeden; kimliği `key`te.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, key, nonce, instance, account])

  if (!signedIn) return { status: STATUS.unauthenticated }
  if (!key) return { status: "idle" }
  return state.key === key && state.value ? state.value : { status: "loading" }
}
