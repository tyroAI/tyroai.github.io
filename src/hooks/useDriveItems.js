import { useCallback, useEffect, useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { isMsalConfigured } from "@/lib/msal"
import { graphGet, graphPost, STATUS } from "@/lib/graph"
import { normaliseDrive, normaliseDriveItem, normaliseSite } from "@/lib/driveItem"

/**
 * SharePoint / OneDrive gezinmesi — header'daki dosya paneli.
 *
 * `useMailMessages` ve `useCalendarEvents` ile aynı sözleşme: hiç fırlatmaz,
 * her başarısızlık bir DURUMDUR ve "soramadık" ile "dosya yok" birbirine
 * karıştırılmaz (bkz. src/lib/graph.js).
 *
 * **Kapsamlar bilinçli olarak İKİYE bölünmüştür.** Tek bir sessiz alımda
 * `Files.Read.All` ve `Sites.Read.All` birlikte istenseydi, ikisinden biri
 * onaysız olduğunda İKİSİ birden düşerdi — yani SharePoint izni verilmemiş
 * bir kurumda kullanıcı kendi OneDrive'ını da göremezdi. Her konum yalnızca
 * gerçekten ihtiyaç duyduğu kapsamı ister; SharePoint onaysızsa yalnızca
 * "Siteler" sekmesi izin uyarısı gösterir, gerisi çalışır.
 *
 * Önbellek BELLEKTEDİR: dosya adları ve klasör yolları da PII'dır ve bu
 * tarayıcı paylaşılıyor olabilir. Postada olduğu gibi çıkışta temizlenir.
 */

/** Kendi OneDrive'ı + kendisiyle paylaşılan dosyalar + kitaplık içerikleri. */
export const FILES_SCOPES = ["Files.Read.All"]
/** Yalnızca site/kitaplık LİSTESİ için. İçerik yine FILES_SCOPES ile okunur. */
export const SITES_SCOPES = ["Sites.Read.All"]

const cache = new Map()
const TTL_MS = 2 * 60 * 1000

export function clearDriveCache() {
  cache.clear()
}

/* ─────────── Konumlar ─────────── */

/** Panelin açılışta gösterdiği yer: "en son dokunduklarım". */
export const RECENT = { kind: "recent" }
/**
 * Sağ kenar çentiğinin okuduğu HAFİF varyant. Panelin 200'lük sayfası
 * "aradığım dosya nerede" sorusuna göre; çentik yalnız "bugün kaç dosyaya
 * dokundum" diye soruyor ve bunun için 25 kayıt yeter. İki ayrı önbellek
 * anahtarı (`top` anahtara giriyor), yani biri ötekinin verisini göstermez.
 */
export const RECENT_LITE = { kind: "recent", top: 25 }
export const ONEDRIVE = { kind: "onedrive" }
export const SITES = { kind: "sites" }

export function folderLocation({ driveId, itemId, name }) {
  return { kind: "folder", driveId, itemId, name }
}
export function driveLocation({ driveId, name }) {
  return { kind: "drive", driveId, name }
}
export function siteLocation({ siteId, name }) {
  return { kind: "site", siteId, name }
}
/** Sunucu tarafı arama — kutuya yazılan her şey OneDrive + SharePoint'i tarar. */
export function searchLocation(q) {
  return { kind: "search", q }
}

/**
 * Bir konumu Graph isteğine çevirir.
 *
 * `$select` her uçta dar tutulur: panel yalnızca ad, tür, boyut, değiştiren
 * ve bağlantıyı gösteriyor; tam driveItem gövdesi bunun on katı.
 */
function requestFor(loc) {
  const sel = "id,name,size,lastModifiedDateTime,lastModifiedBy,webUrl,folder,file,parentReference"
  // 200: Graph'ın rahatça verdiği sayfa boyutu. Gerisi `nextLink` ile,
  // "Daha fazla göster" düğmesine basıldığında gelir.
  const page = `$top=200&$select=${sel}`
  switch (loc.kind) {
    case "search":
      return { mode: "search", q: loc.q, scopes: FILES_SCOPES }
    case "recent":
      // `/me/drive/recent` kullanıcının SharePoint'te açtıklarını da getirir —
      // panelin varsayılanı bu, çünkü insanların aradığı dosya çoğunlukla
      // klasör ağacının dibinde değil, dün dokundukları dosyadır.
      return {
        mode: "get",
        paths: [`/me/drive/recent?$top=${loc.top ?? 200}`],
        scopes: FILES_SCOPES,
      }
    case "onedrive":
      return { mode: "get", paths: [`/me/drive/root/children?${page}`], scopes: FILES_SCOPES }
    case "sites":
      // İKİ kaynak — `/sites?search=*` BİLİNÇLİ olarak yok.
      //
      // O uç "search across a SharePoint TENANT" diye belgeli ve kullanıcıya
      // göre kısıtlama (security trimming) belgelenmiş değil: kiracının arama
      // dizininden site meta verisi döndürüyor ve bir sitenin adının
      // keşfedilebilir olması içeriğini açabilmekle aynı şey değil. Sahada
      // görüldü — kullanıcılar erişemedikleri siteleri listede görüyordu.
      //
      // Delegated izin kapsamı bunu ÇÖZMÜYOR: `Sites.Read.All` zaten
      // kullanıcı adına çalışıyor ve daha dar bir delegated site izni
      // (`Sites.Read`) Graph'ta YOK. Yani çare izinde değil, uçta.
      //
      // Kalanların ikisi de doğası gereği kullanıcıya bağlı:
      //   `/sites/root`        — kiracının kök sitesi. Herkesin gördüğü
      //                          şirket sitesi ve FileShare gibi şirket
      //                          çapındaki kitaplıklar tam orada duruyor.
      //   `/me/followedSites`  — kullanıcının KENDİ takip ettikleri.
      //
      // Bunun bedeli: erişebildiği ama takip etmediği bir siteyi listede
      // görmez. Görmediği bir siteyi görmesindense, görebileceği bir siteyi
      // takip etmesi istenir — yanlış tarafta hata yapmıyoruz.
      return {
        mode: "get",
        paths: ["/sites/root", "/me/followedSites"],
        scopes: SITES_SCOPES,
      }
    case "site":
      // Sitenin belge KİTAPLIKLARI. Bu durum bir düzenlemede yanlışlıkla
      // düşmüştü ve siteye tıklamak hiçbir şey yapmıyordu — `requestFor`
      // null dönünce effect erken çıkıyor, ekrandaki liste olduğu gibi
      // kalıyordu. Bkz. aşağıdaki "req yoksa hata" koruması.
      return { mode: "get", paths: [`/sites/${loc.siteId}/drives`], scopes: SITES_SCOPES }
    case "drive":
      return {
        mode: "get",
        paths: [`/drives/${loc.driveId}/root/children?${page}`],
        scopes: FILES_SCOPES,
      }
    case "folder":
      return {
        mode: "get",
        paths: [`/drives/${loc.driveId}/items/${loc.itemId}/children?${page}`],
        scopes: FILES_SCOPES,
      }
    default:
      return null
  }
}

/**
 * Graph'ın arama ucu. `/search/query` GET kabul etmiyor; sorgu gövdede gider.
 *
 * Kapsam OneDrive + erişilebilen SharePoint'in TAMAMIDIR — kutudaki metin
 * artık "yüklenmiş listeyi süz" değil, "her yerde ara" demektir.
 */
function searchBody(q) {
  return {
    requests: [
      {
        entityTypes: ["driveItem"],
        query: { queryString: q },
        from: 0,
        size: 50,
        fields: [
          "id",
          "name",
          "size",
          "lastModifiedDateTime",
          "lastModifiedBy",
          "webUrl",
          "parentReference",
          "file",
          "folder",
        ],
      },
    ],
  }
}

function cacheKeyFor(loc) {
  return [loc.kind, loc.siteId, loc.driveId, loc.itemId, loc.q, loc.top].filter(Boolean).join("::")
}

/* ─────────── Normalleştirme ─────────── */

// Satırın biçimi `lib/driveItem.js`te — Dosyalarım da aynısını okuyor.

function normalise(loc, values) {
  if (loc.kind === "sites") return values.map(normaliseSite)
  if (loc.kind === "site") return values.map(normaliseDrive)
  return values.map(normaliseDriveItem)
}

/** Her yoldan BİR sayfa çeker ve bekleyen `nextLink`'leri döndürür. */
async function fetchPages(instance, account, paths, scopes) {
  const results = await Promise.all(
    paths.map((path) => graphGet(instance, account, { path, scopes })),
  )
  const ok = results.filter((r) => r.status === STATUS.ready)
  // Uçlardan biri düşerse diğerinin sonucu YİNE gösterilir: eksik bir liste,
  // boş bir listeden iyidir. Hepsi düşerse ilk hatanın durumu taşınır.
  if (ok.length === 0) return { status: results[0]?.status ?? STATUS.error, rows: [], next: [] }

  const rows = []
  const next = []
  for (const r of ok) {
    const d = r.data
    // `/sites/root` TEK bir nesne döner, koleksiyon değil — `value` aramak
    // onu sessizce yutardı.
    if (Array.isArray(d?.value)) rows.push(...d.value)
    else if (d?.id) rows.push(d)
    if (d?.["@odata.nextLink"]) next.push(d["@odata.nextLink"])
  }
  return { status: "ready", rows, next }
}

/** Kimliğe göre tekilleştirir; İLK gelen kazanır (takip edilenler üstte kalsın). */
function dedupe(rows) {
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const id = row.id ?? row.webUrl
    if (id && seen.has(id)) continue
    if (id) seen.add(id)
    out.push(row)
  }
  return out
}

/**
 * Bir konumun içeriği.
 *
 * SAYFALIDIR: ilk açılışta tek sayfa gelir, gerisi `loadMore()` ile istenir.
 * Otomatik olarak on sayfa çekmek de bir seçenekti ama büyük bir kitaplıkta
 * panel saniyelerce boş durur ve kullanıcı hiçbir şey olmuyor sanır — oysa
 * aradığı dosya çoğu zaman ilk sayfadadır. Devamı istendiğinde gelir.
 *
 * @returns `{ status, items, hasMore, loadingMore, loadMore, scopes }` —
 *   `scopes` çağıranın izin uyarısında hangi iznin eksik olduğunu
 *   söyleyebilmesi için.
 */
export function useDriveItems(loc, nonce = 0) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const [state, setState] = useState({ status: "loading", items: [], next: [] })
  const [loadingMore, setLoadingMore] = useState(false)
  const seq = useRef(0)

  const signedIn = isMsalConfigured && Boolean(account)
  const req = loc ? requestFor(loc) : null
  const key = loc ? cacheKeyFor(loc) : ""
  const ck = account ? `${account.homeAccountId}::${key}` : ""

  useEffect(() => {
    if (!signedIn) return
    // Tanınmayan konum bir KODLAMA hatasıdır. Sessizce dönmek, ekrandaki
    // önceki listeyi olduğu gibi bırakıyor ve kullanıcıya "tıklama işe
    // yaramıyor" olarak görünüyordu — hatayı da gizliyordu. Artık durum
    // değişiyor, yani hem kullanıcı hem biz görüyoruz.
    if (!req) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: STATUS.error, items: [], next: [] })
      return
    }
    const hit = cache.get(ck)
    if (hit && Date.now() - hit.at < TTL_MS && hit.nonce === nonce) {
      // Modül önbelleği harici değişken bir depo; render sırasında okumak
      // saf olmayan bir okuma olurdu. useMailMessages ile aynı muafiyet.
      setState(hit.value)
      return
    }

    let cancelled = false
    const mySeq = ++seq.current
    // Dolu bir listeyi boşaltma: klasörler arası gezinirken panelin her
    // adımda beyaza dönmesi gezinmeyi olduğundan yavaş hissettiriyor.
    setState((prev) => (prev.items.length ? prev : { status: "loading", items: [], next: [] }))
    ;(async () => {
      let value
      if (req.mode === "search") {
        const res = await graphPost(instance, account, {
          path: "/search/query",
          scopes: req.scopes,
          body: searchBody(req.q),
        })
        if (cancelled || mySeq !== seq.current) return
        const hits = res.data?.value?.[0]?.hitsContainers?.[0]?.hits ?? []
        value =
          res.status === STATUS.ready
            ? {
                status: "ready",
                items: normalise(loc, hits.map((h) => h.resource).filter(Boolean)),
                next: [],
              }
            : { status: res.status, items: [], next: [] }
      } else {
        const res = await fetchPages(instance, account, req.paths, req.scopes)
        if (cancelled || mySeq !== seq.current) return
        value =
          res.status === "ready"
            ? { status: "ready", items: normalise(loc, dedupe(res.rows)), next: res.next }
            : { status: res.status, items: [], next: [] }
      }
      if (value.status === "ready") cache.set(ck, { at: Date.now(), nonce, value })
      setState(value)
    })()

    return () => {
      cancelled = true
    }
    // `req` her render'da yeni bir nesne; bağımlılık `key` (konumun kimliği).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, key, nonce, account, instance, ck])

  const loadMore = useCallback(async () => {
    if (!signedIn || !req || loadingMore || state.next.length === 0) return
    setLoadingMore(true)
    const mySeq = seq.current
    const res = await fetchPages(instance, account, state.next, req.scopes)
    // Gezinme sırasında sayfa istenmişse sonucu ATMAK gerekiyor: başka bir
    // klasörün satırlarını bu listeye eklemek sessiz bir karışıklık olurdu.
    if (mySeq !== seq.current) {
      setLoadingMore(false)
      return
    }
    if (res.status === "ready") {
      setState((prev) => {
        const value = {
          status: "ready",
          items: dedupe([...prev.items, ...normalise(loc, dedupe(res.rows))]),
          next: res.next,
        }
        cache.set(ck, { at: Date.now(), nonce, value })
        return value
      })
    }
    setLoadingMore(false)
    // `req`/`loc` her render'da yeni nesne; kimlik `key` üzerinden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, key, nonce, account, instance, ck, loadingMore, state.next])

  return {
    ...state,
    hasMore: state.next.length > 0,
    loadingMore,
    loadMore,
    scopes: req?.scopes ?? FILES_SCOPES,
  }
}
