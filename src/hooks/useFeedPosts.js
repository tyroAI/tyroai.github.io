import { useCallback, useEffect, useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { isMsalConfigured } from "@/lib/msal"
import { graphGet, graphGetBlob, STATUS } from "@/lib/graph"
import {
  fetchFeedPage,
  fetchImportantMail,
  fetchMailById,
  fetchPostById,
  resetFeedQuery,
} from "@/lib/feed"
import { FEED, FEED_SOURCES, sourceForTag } from "@/lib/feedPolicy"
import { clearForYouSession } from "@/lib/forYouSession"
import { clearFeedImageCache } from "./useFeedImages"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  GÜNDEM AKIŞI — çekme, sayfalama, önbellek
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **ÖNBELLEK YALNIZ BELLEKTE.** Akıştaki her satır başka insanların işi:
 * gönderen adı, konu, özet ve kapak görseli. Bu depoda posta içeriği
 * localStorage'a HİÇ yazılmıyor (CLAUDE.md: "bunlar başka insanların
 * konuları, adları ve yüzleri, üstelik tarayıcı paylaşılıyor olabilir") ve
 * çıkışta `clearFeedCache` ile düşüyor — `msal.js`in LOGOUT_SUCCESS zinciri.
 *
 * ⚠️ **`denied` ÖNBELLEĞE ALINMAZ.** Mail.Read onayı bir yöneticinin tek
 * tıkla verebileceği bir şey; onaylandığı an sayfanın yeniden yüklenmesini
 * beklememek gerekiyor. Mail kancalarının aynı kuralı.
 */

const cache = new Map()
const TTL_MS = 3 * 60 * 1000

const bodyCache = new Map()
/**
 * Postanın DOSYA ekleri (satır içi görseller DEĞİL) — okuma penceresinin ek
 * kartları için yalnız üst veri: ad · tür · boy. Bellekte, çıkışta düşer
 * (`clearFeedCache`): başkasının dosya adları paylaşılan tarayıcıda diske yazılmaz.
 */
const fileCache = new Map()

export function clearFeedCache() {
  cache.clear()
  clearFeedImageCache()
  bodyCache.clear()
  fileCache.clear()
  importantCache = null
  resetFeedQuery()
  // Sana özel'in oturum kaydı (açılan postalar, To-Do'ya devredilenler) da düşer.
  clearForYouSession()
}

/** Seçili etiketin adresleri; etiket yoksa dördü birden. */
function addressesFor(tag) {
  const source = sourceForTag(tag)
  return source ? [source.address] : FEED_SOURCES.map((s) => s.address)
}

/**
 * Akışın gönderileri.
 *
 * @param tag seçili etiket (`null` = tümü) — sunucu süzgecine giriyor, yani
 *   etiket değişince YENİ bir sorgu atılıyor. İstemcide süzmek, "daha fazla
 *   göster"in o etiketten değil genelden sayfa getirmesi demekti: dört kutunun
 *   en yenileri arasında Eğitim'den tek gönderi varsa kullanıcı "daha fazla"ya
 *   beş kez basıp ikinciyi görüyordu.
 */
export function useFeedPosts(tag = null) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const [state, setState] = useState({ status: "loading", posts: [], nextLink: null, pages: 0 })
  const [nonce, setNonce] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const seq = useRef(0)
  // Çizilen son liste — `refresh` yeni gelenleri ona göre sayıyor. Ref,
  // çünkü `refresh`i her liste değişiminde yeniden kurmak onu alan her
  // düğmeyi de yeniden çizdirirdi.
  const postsRef = useRef(state.posts)
  useEffect(() => {
    postsRef.current = state.posts
  }, [state.posts])
  /**
   * Bekleyen yenileme — `{ key, prevIds, resolve }`.
   *
   * ⚠️ **YENİLE GÖRÜNMEZDİ, BOZUK DEĞİL** (sahada, 2026-09-30: *"keşfetteki
   * yenile butonu çalışmıyor gibi"*). Düğme gerçekten yeni bir sorgu
   * atıyordu, ama tur sürerken eski liste yerinde kalıyor (kaydırma konumu
   * bozulmasın diye), düğme hiç değişmiyor ve yeni bir duyuru yoksa liste
   * birebir aynı dönüyordu — kullanıcının gördüğü şey "bastım, bir şey
   * olmadı". Artık tur sürerken düğme dönüyor ve sonuç SÖYLENİYOR
   * (`FeedPage` › bildirim: kaç yeni duyuru, ya da güncel olduğu).
   */
  const pendingRefresh = useRef(null)

  const signedIn = isMsalConfigured && Boolean(account)
  const key = signedIn ? `${account.homeAccountId}::${tag ?? "all"}` : null

  useEffect(() => {
    if (!signedIn || !FEED.enabled) return
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL_MS && hit.nonce === nonce) {
      // Modül önbelleğinden doldurma — dışsal değişebilir bir depo; render
      // sırasında okumak saf olmayan bir okuma olurdu ve `useSyncExternalStore`
      // üç dakikalık bir TTL için ağır. `useMailMessages`in aynı muafiyeti.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(hit.value)
      return
    }

    let cancelled = false
    const mySeq = ++seq.current
    // Elde gönderi varken "yükleniyor"a düşmek listeyi boşaltır ve kaydırma
    // konumunu sıfırlar; etiket değişiminde bu göze batıyor.
    setState((prev) =>
      prev.posts.length ? prev : { status: "loading", posts: [], nextLink: null, pages: 0 },
    )
    ;(async () => {
      const res = await fetchFeedPage(instance, account, { addresses: addressesFor(tag) })
      if (cancelled || mySeq !== seq.current) return

      // Bu tur bir yenilemeyse (ve hâlâ aynı etiketteyse) sonucu bekleyene
      // teslim et. Etiket arada değiştiyse sayım anlamsız — `null`.
      const pending = pendingRefresh.current
      pendingRefresh.current = null
      const settle = (value) => {
        if (!pending) return
        setRefreshing(false)
        pending.resolve(pending.key === key ? value : null)
      }

      if (res.status !== STATUS.ready) {
        // ⚠️ YENİLEME DÜŞERSE LİSTE SİLİNMEZ. Eskiden geçici bir hata elde
        // olan akışı hata kartıyla değiştiriyordu; yenilemeye basan kişi
        // okuduğu listeyi kaybediyordu. İlk yüklemede ise gösterecek bir
        // şey yok ve kart doğru cevap.
        if (pending && postsRef.current.length) {
          settle({ status: res.status, added: 0, kept: true })
          return
        }
        setState({ status: res.status, posts: [], nextLink: null, pages: 0, error: res.error })
        settle({ status: res.status, added: 0 })
        return
      }
      const value = { status: STATUS.ready, posts: res.posts, nextLink: res.nextLink, pages: 1 }
      cache.set(key, { at: Date.now(), value, nonce })
      setState(value)
      settle({
        status: STATUS.ready,
        added: pending ? res.posts.filter((p) => !pending.prevIds.has(p.id)).length : 0,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [instance, account, signedIn, key, tag, nonce])

  const loadMore = useCallback(async () => {
    const current = cache.get(key)?.value ?? state
    if (!current.nextLink || current.pages >= FEED.maxPages || loadingMore) return
    // ⚠️ YARIŞ KORUMASI efektinkiyle AYNI. Öncesinde yoktu ve somut sonucu
    // şuydu: "Tümü"ndeyken "daha fazla"ya basıp tur uçarken Eğitim etiketine
    // geçmek, Eğitim listesinin altına DÖRT KANALIN gönderilerini ekliyordu
    // — üstelik önbelleğe de öyle yazılıyordu.
    const mySeq = seq.current
    const myKey = key
    setLoadingMore(true)
    setLoadError(null)
    const res = await fetchFeedPage(instance, account, { nextLink: current.nextLink })
    if (mySeq !== seq.current || myKey !== key) return
    setLoadingMore(false)
    if (res.status !== STATUS.ready) {
      // ⚠️ Hata SESSİZ DEĞİL. Öncesinde `return` vardı: bir saat açık kalan
      // sekmede belirteç tazelenemeyince düğme basılıyor, hiçbir şey olmuyor
      // ve kullanıcı düğmeyi bozuk sanıyordu.
      setLoadError(res.status)
      return
    }
    // ⚠️ Kimliğe göre TEKİLLEŞTİR: sırasız kipte iki sayfa aynı iletiyi
    // döndürebiliyor ve React aynı `key` ile iki kart çizmeye çalışırdı.
    const seen = new Set(current.posts.map((p) => p.id))
    const merged = [...current.posts, ...res.posts.filter((p) => !seen.has(p.id))]
    const value = {
      status: STATUS.ready,
      posts: merged,
      nextLink: res.nextLink,
      pages: current.pages + 1,
    }
    cache.set(key, { at: Date.now(), value, nonce })
    setState(value)
  }, [instance, account, key, state, loadingMore, nonce])

  /**
   * Akışı sunucudan yeniden okur; `{ status, added }` ile çözülen bir söz
   * döner (`added` = listede daha önce olmayan gönderi sayısı), yenileme
   * yarıda kaldıysa `null`. Bayrak, sabitleme ve okundu durumu da bu turda
   * tazeleniyor — Outlook'ta işaretlenen bir duyuru karta böyle düşüyor.
   */
  const refresh = useCallback(() => {
    cache.delete(key)
    setLoadError(null)
    setRefreshing(true)
    // Üst üste basılırsa eski söz boşa çözülür; sonucu son basış alır.
    pendingRefresh.current?.resolve(null)
    return new Promise((resolve) => {
      pendingRefresh.current = { key, prevIds: new Set(postsRef.current.map((p) => p.id)), resolve }
      setNonce((n) => n + 1)
    })
  }, [key])

  if (!FEED.enabled)
    return {
      status: STATUS.ready,
      posts: [],
      hasMore: false,
      loadMore,
      refresh,
      loadingMore: false,
      loadError: null,
      refreshing: false,
    }
  if (!signedIn)
    return {
      status: STATUS.unauthenticated,
      posts: [],
      hasMore: false,
      loadMore,
      refresh,
      loadingMore: false,
      loadError: null,
      refreshing: false,
    }
  return {
    ...state,
    hasMore: Boolean(state.nextLink) && state.pages < FEED.maxPages,
    loadingMore,
    loadError,
    loadMore,
    refresh,
    refreshing,
  }
}

/**
 * Gönderinin TAM gövdesi — akışın kendi kancası, `useMailBody` DEĞİL.
 *
 * ⚠️ **AYRI OLMASININ SEBEBİ KIRPMA SINIRI.** `useMailBody` 200 KB'de kesiyor
 * ve bu bir açılır kart için doğru; gömülü görselli kurumsal bir bülten o
 * sınırı rahat aşıyor ve HTML ETİKETİN ORTASINDAN kesilince çerçeve bozuk
 * çiziyor — sessiz bir bozulma. Burada sınır 1,5 MB ve aşılırsa gövde HİÇ
 * gösterilmiyor: `oversize` işaretleniyor, ekran özete + "Outlook'ta aç"
 * düğmesine düşüyor. Yarım bir HTML'den dürüst bir yönlendirme iyidir.
 *
 * ⚠️ Önbellek yine YALNIZ BELLEKTE ve `clearFeedCache` ile düşüyor.
 */
const BODY_CAP = 1_500_000

export function useFeedBody(id, enabled) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  // ⚠️ Kimlikle birlikte — gerekçe `useFeedImages`te (pencere mount kalıyor,
  // çıplak durum önceki gönderinin gövdesini gösteriyordu).
  const [state, setState] = useState(() =>
    bodyCache.has(id) ? { key: id, value: bodyCache.get(id) } : null,
  )

  useEffect(() => {
    if (!enabled || !isMsalConfigured || !account || !id) return
    if (bodyCache.has(id)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ key: id, value: bodyCache.get(id) })
      return
    }
    let cancelled = false
    ;(async () => {
      // ⚠️ Alıcılar AYNI istekte (2026-10-02, Outlook'un okuma bölmesi gibi
      // "Kime · Bilgi" satırları): ikinci bir tur posta kutusunun dört
      // eşzamanlı istek sınırına bir istek daha eklerdi.
      const res = await graphGet(instance, account, {
        path: `/me/messages/${encodeURIComponent(id)}?$select=body,toRecipients,ccRecipients`,
        scopes: ["Mail.Read"],
        headers: { Prefer: 'outlook.body-content-type="html"' },
      })
      if (cancelled) return
      if (res.status !== STATUS.ready) {
        setState({
          key: id,
          value: { status: res.status, html: null, text: null, oversize: false },
        })
        return
      }
      const raw = res.data.body?.content ?? ""
      const isHtml = res.data.body?.contentType === "html"
      const people = (list) =>
        (list ?? [])
          .map((r) => ({
            name: r.emailAddress?.name?.trim() || r.emailAddress?.address || "",
            address: (r.emailAddress?.address ?? "").toLowerCase(),
          }))
          .filter((r) => r.name || r.address)
      const to = people(res.data.toRecipients)
      const cc = people(res.data.ccRecipients)
      const value =
        raw.length > BODY_CAP
          ? { status: STATUS.ready, html: null, text: null, oversize: true, to, cc }
          : {
              status: STATUS.ready,
              html: isHtml ? raw : null,
              text: isHtml ? null : raw.trim(),
              oversize: false,
              to,
              cc,
            }
      bodyCache.set(id, value)
      setState({ key: id, value })
    })()
    return () => {
      cancelled = true
    }
  }, [id, enabled, account, instance])

  // ⚠️ `state &&` ŞART — gerekçe `useFeedImages`te (kapalı pencerede çökme).
  return state && state.key === id ? state.value : null
}

/**
 * Adreste açık olan gönderi listede yoksa onu TEK BAŞINA getirir.
 *
 * `FeedPage` önce yüklenmiş listede arıyor; bulursa bu kanca hiç ağa
 * çıkmıyor (`enabled` false). Bulamazsa — sayfa yenilenmiş ve gönderi
 * üçüncü sayfadaysa — tek bir istekle geliyor, yoksa adres tıklanabilir ama
 * hiçbir şey yapmayan bir bağlantı olurdu.
 */
export function useFeedPostById(id, enabled) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const [post, setPost] = useState(null)

  useEffect(() => {
    if (!enabled || !isMsalConfigured || !account || !id) return
    let cancelled = false
    ;(async () => {
      const p = await fetchPostById(instance, account, id)
      if (!cancelled) setPost(p)
    })()
    return () => {
      cancelled = true
    }
  }, [id, enabled, account, instance])

  // Kimlik değişince eski gönderi bir kare görünmesin.
  return post && post.id === id ? post : null
}

/**
 * ÖNEMLİ sekmesinin postaları — kimden gelirse gelsin sabitlenmiş, bayraklı
 * ve yüksek önemli (sorgular ve gerekçe `lib/feed.js` › `fetchImportantMail`).
 *
 * ⚠️ `enabled` ŞART: sekme hiç açılmadıysa üç sorgu hiç atılmaz — Keşfet'in
 * her açılışı üç posta sorgusu daha demek olurdu.
 * ⚠️ Önbellek bellekte, hesap anahtarlı, 2 dk; `clearFeedCache` ile çıkışta
 * düşüyor — başkalarının konusu ve adı, Gündem'in aynı kuralı.
 * ⚠️ Yenileme `{ status, added, kept }` ile çözülen bir söz döndürüyor ve
 * düşerse ekrandaki liste SİLİNMİYOR (Gündem'in yenile dersi).
 */
let importantCache = null // { key, at, value }
const IMPORTANT_TTL_MS = 2 * 60 * 1000

export function useImportantMail(enabled) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const signedIn = isMsalConfigured && Boolean(account)
  const key = signedIn ? account.homeAccountId : null
  const [state, setState] = useState(() =>
    importantCache && importantCache.key === key
      ? importantCache.value
      : { status: "loading", items: [], missing: [], capped: {} },
  )
  const [nonce, setNonce] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pending = useRef(null)
  const itemsRef = useRef(state.items)
  useEffect(() => {
    itemsRef.current = state.items
  }, [state.items])

  useEffect(() => {
    if (!enabled || !signedIn) return undefined
    const hit =
      importantCache &&
      importantCache.key === key &&
      Date.now() - importantCache.at < IMPORTANT_TTL_MS
    // ⚠️ Önbelleği atlayan şey YALNIZ bekleyen bir yenileme (bug #16): eski
    // `nonce === 0` koşulu, bir kez yenilenmiş oturumda sekmeye her dönüşte
    // üç posta sorgusunu yeniden attırıyordu.
    if (hit && !pending.current) {
      setState(importantCache.value)
      return undefined
    }
    let cancelled = false
    fetchImportantMail(instance, account).then((res) => {
      if (cancelled) return
      const waiting = pending.current
      pending.current = null
      if (res.status !== STATUS.ready && waiting && itemsRef.current.length) {
        setRefreshing(false)
        waiting.resolve({ status: res.status, kept: true })
        return
      }
      const value = {
        status: res.status,
        items: res.items,
        missing: res.missing ?? [],
        pinnedPartial: Boolean(res.pinnedPartial),
        capped: res.capped ?? {},
      }
      if (res.status === STATUS.ready) importantCache = { key, at: Date.now(), value }
      setState(value)
      if (waiting) {
        setRefreshing(false)
        waiting.resolve({
          status: res.status,
          added: res.items.filter((x) => !waiting.ids.has(x.id)).length,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [enabled, signedIn, key, nonce, instance, account])

  const refresh = useCallback(() => {
    importantCache = null
    setRefreshing(true)
    pending.current?.resolve(null)
    return new Promise((resolve) => {
      pending.current = { ids: new Set(itemsRef.current.map((x) => x.id)), resolve }
      setNonce((n) => n + 1)
    })
  }, [])

  if (!signedIn)
    return {
      status: STATUS.unauthenticated,
      items: [],
      missing: [],
      capped: {},
      refresh,
      refreshing: false,
    }
  return { ...state, refresh, refreshing }
}

/**
 * Önemli sekmesinde `?post=` ile açılan ve listede olmayan ileti — Gündem'in
 * `useFeedPostById`inin kaynak kapısı OLMAYAN eşi (`fetchMailById`).
 */
export function useMailById(id, enabled) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const [item, setItem] = useState(null)
  useEffect(() => {
    if (!enabled || !isMsalConfigured || !account || !id) return
    let cancelled = false
    fetchMailById(instance, account, id).then((x) => {
      if (!cancelled) setItem(x)
    })
    return () => {
      cancelled = true
    }
  }, [id, enabled, account, instance])
  return item && item.id === id ? item : null
}

/**
 * Okuma penceresinin EK KARTLARI (2026-10-02, istek: *"açılan mail görünüşü
 * Outlook'taki kaliteye yakın olsun"*). Yalnız `hasAttachments` doğruyken
 * sorulur — Graph o bayrağı tam da satır içi OLMAYAN ekler için yakıyor, yani
 * eki olmayan postada sıfır istek. Görsel kancasının (`useFeedImages`) üst veri
 * listesiyle AYNI uç ama ayrı önbellek: o liste görseli süzüyor, bu dosyayı.
 */
export function useMailAttachments(id, enabled) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const [state, setState] = useState(() =>
    fileCache.has(id) ? { key: id, value: fileCache.get(id) } : null,
  )

  useEffect(() => {
    if (!enabled || !isMsalConfigured || !account || !id) return
    if (fileCache.has(id)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ key: id, value: fileCache.get(id) })
      return
    }
    let cancelled = false
    ;(async () => {
      const res = await graphGet(instance, account, {
        path: `/me/messages/${encodeURIComponent(id)}/attachments?$select=id,name,contentType,size,isInline`,
        scopes: ["Mail.Read"],
      })
      if (cancelled) return
      if (res.status !== STATUS.ready) {
        setState({ key: id, value: [] })
        return
      }
      const value = (res.data.value ?? [])
        .filter((a) => !a.isInline)
        .map((a) => ({
          id: a.id,
          name: a.name || "",
          size: typeof a.size === "number" ? a.size : null,
          contentType: String(a.contentType ?? "")
            .split(";")[0]
            .trim()
            .toLowerCase(),
          // Bağlantı eki (OneDrive/SharePoint paylaşımı) bayt taşımaz — kart Outlook'a götürür.
          kind:
            a["@odata.type"] === "#microsoft.graph.referenceAttachment"
              ? "reference"
              : a["@odata.type"] === "#microsoft.graph.itemAttachment"
                ? "item"
                : "file",
        }))
      fileCache.set(id, value)
      setState({ key: id, value })
    })()
    return () => {
      cancelled = true
    }
  }, [id, enabled, account, instance])

  return state && state.key === id ? state.value : null
}

/**
 * Eki indirir: `/$value` → `blob:` adresi → `<a download>`. Tarayıcının indirme
 * çubuğuna düşer, uygulama yerinde kalır. Blob hemen bırakılır.
 * @returns {Promise<boolean>} indirme başladı mı
 */
export async function downloadMailAttachment(instance, account, messageId, att) {
  const res = await graphGetBlob(instance, account, {
    path: `/me/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(att.id)}/$value`,
    scopes: ["Mail.Read"],
  })
  if (res.status !== STATUS.ready || !res.blob) return false
  const url = URL.createObjectURL(res.blob)
  const a = document.createElement("a")
  a.href = url
  // Ek olarak iliştirilmiş posta (`itemAttachment`) MIME döner — uzantısızsa `.eml`.
  a.download =
    att.kind === "item" && !/\.[a-z0-9]{2,5}$/i.test(att.name)
      ? `${att.name || "mail"}.eml`
      : att.name || "attachment"
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return true
}
