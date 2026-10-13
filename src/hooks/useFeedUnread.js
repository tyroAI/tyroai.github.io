import { useEffect, useState, useSyncExternalStore } from "react"
import { useMsal } from "@azure/msal-react"
import { isMsalConfigured } from "@/lib/msal"
import { graphGet, STATUS } from "@/lib/graph"
import { feedFilter, toPost } from "@/lib/feed"
import { FEED_SOURCES } from "@/lib/feedPolicy"
import { feedSeenThreshold, readFeedSeen, subscribeFeedSeen } from "@/lib/feedSeen"
import { usePageAccess } from "@/hooks/usePageAccess"

/**
 * Keşfet'e son girişten beri gelen kurumsal duyurular: SAYI (sidebar rozeti)
 * ve EN YENİ ÜÇÜ (Akışım'ın günün özeti).
 *
 * ⚠️ **TEK SORGU, AKIŞIN KENDİSİ DEĞİL.** Sidebar HER ROTADA mount oluyor;
 * burada `useFeedPosts`u çağırmak her gezinmede yirmi gönderilik bir sayfa
 * çekerdi. Emsal `countOpenRequests` ve `useMailMessages`in okunmamış sayacı:
 * `$filter` + `$count=true`, cevaptan `@odata.count`.
 *
 * ⚠️ **ADLAR AYNI CEVAPTAN.** Anasayfa özetinin Keşfet maddesi, öteki maddeler
 * gibi üstüne gelince en yeni üç kaydı listeliyor: sorgu `$top=3` ile konu ·
 * gönderen · zaman seçiyor. İKİNCİ BİR İSTEK YOK, sidebar'ın sorgusu özetin
 * listesini de taşıyor.
 *
 * ⚠️ **SIRALI SORGU, REDDEDİLİRSE ESKİ BİÇİM.** "En yeni üç" sıralama ister ve
 * Graph sıralanan özelliği filtrenin İLK yan tümcesinde görmek istiyor
 * (`ErrorInefficientFilter` — Keşfet'in kendi sorgusunun kuralı, `feed.js`).
 * 400 gelirse sırasız biçime dönülür, sayfa büyütülüp istemcide sıralanır ve karar oturum boyunca
 * hatırlanır (`orderedOk`; çıkışta sıfırlanır). Sayı iki biçimde de aynı.
 *
 * ⚠️ **UÇUŞTAKİ SORGU PAYLAŞILIR** (`inflight`). Sidebar ile Akışım aynı anda
 * mount oluyor; önbellek yalnız CEVAPTAN sonra doluyordu, yani soğuk
 * açılışta aynı sorgu iki kez atılıyordu.
 *
 * ⚠️ **MODÜL ÖNBELLEĞİ + TTL ŞART.** Beş dakika, "yeni duyuru geldi" için
 * fazlasıyla taze. Önbellek BELLEKTE (konular kurumsal duyurularınki ama
 * deponun kuralı aynı: posta içeriği diske yazılmaz) ve çıkışta düşer
 * (`clearFeedUnreadCache`, `msal.js`).
 *
 * ⚠️ Damga YOKSA (ilk ziyaret) rozet ÇİZİLMEZ — sıfır döner. Yeni kullanıcıya
 * "47 okunmamış" göstermek, hiçbirini okumayacağı bir yığın sunmak olurdu;
 * Yenilikler'in "gerçekten yeni kullanıcının yakalayacağı geçmiş yok" kuralı.
 *
 * ⚠️ **KAPI KANCANIN İÇİNDE** (`usePageAccess().feed`: şalter + kitle), iki
 * tüketicinin her birinde değil. Keşfet'i açamayan kişi için sorgu HİÇ
 * atılmaz.
 */
const cache = new Map()
const inflight = new Map()
const TTL_MS = 5 * 60 * 1000
const SHOW = 3
let orderedOk = true

const EMPTY = { count: 0, items: [] }

export function clearFeedUnreadCache() {
  cache.clear()
  inflight.clear()
  orderedOk = true
}

async function ask(instance, account, seen) {
  const senders = feedFilter(FEED_SOURCES.map((s) => s.address))
  // Damganın bir SONRAKİ saniyesinden itibaren: `gt damga` en yeni duyurunun
  // kendisini de sayıyordu (bkz. `feedSeenThreshold`).
  const after = feedSeenThreshold(seen)
  if (!after) return EMPTY
  const call = (ordered) => {
    const params = new URLSearchParams({
      // Sıralı biçimde zaman İLK yan tümce (yukarıda); eski biçim olduğu gibi.
      $filter: ordered
        ? `receivedDateTime ge ${after} and (${senders})`
        : `(${senders}) and receivedDateTime ge ${after}`,
      $count: "true",
      // Sırasız biçimde "en yeni üç"ü istemcide seçebilmek için sayfa geniş.
      $top: String(ordered ? SHOW : 25),
      $select: "id,subject,from,receivedDateTime",
    })
    if (ordered) params.set("$orderby", "receivedDateTime desc")
    return graphGet(instance, account, {
      path: `/me/messages?${params.toString()}`,
      scopes: ["Mail.Read"],
    })
  }

  let res = await call(orderedOk)
  if (orderedOk && res.status === STATUS.error && res.httpStatus === 400) {
    orderedOk = false
    console.info(
      "[feed] yeni duyuru sorgusu sıralı biçimde reddedildi; sırasız biçime dönülüyor:",
      res.code ?? "",
      res.error ?? "",
    )
    res = await call(false)
  }
  // Sayılamadıysa rozet YANMAZ. "Soramadık" bir sayı değildir; uydurma bir
  // rakam, kullanıcıyı olmayan bir duyuruya göndermek olurdu.
  if (res.status !== STATUS.ready || typeof res.data["@odata.count"] !== "number") return EMPTY
  const items = (res.data.value ?? [])
    .map(toPost)
    .filter(Boolean)
    .sort((a, b) => (b.received?.getTime() ?? 0) - (a.received?.getTime() ?? 0))
    .slice(0, SHOW)
    .map(({ id, tag, accent, subject, author, received }) => ({
      id,
      tag,
      accent,
      subject,
      author,
      received,
    }))
  return { count: res.data["@odata.count"], items }
}

/** Sayı + en yeni üç duyuru: `{ count, items: [{ id, tag, subject, author, received }] }`. */
export function useFeedFresh() {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const seen = useSyncExternalStore(subscribeFeedSeen, readFeedSeen, () => null)
  const [state, setState] = useState({ key: null, value: EMPTY })
  const open = usePageAccess().feed

  const signedIn = isMsalConfigured && Boolean(account)
  const key = open && signedIn && seen ? `${account.homeAccountId}::${seen}` : null

  useEffect(() => {
    if (!key) return
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL_MS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ key, value: hit.value })
      return
    }
    let cancelled = false
    let job = inflight.get(key)
    if (!job) {
      job = ask(instance, account, seen)
        .then((value) => {
          cache.set(key, { at: Date.now(), value })
          return value
        })
        .finally(() => inflight.delete(key))
      inflight.set(key, job)
    }
    job.then((value) => {
      if (!cancelled) setState({ key, value })
    })
    return () => {
      cancelled = true
    }
  }, [instance, account, key, seen])

  // Durum kimliğiyle birlikte: damga ilerleyince eski anahtarın sayısı bir
  // kare bile yeni anahtarın yerine okunmasın.
  return key && state.key === key ? state.value : EMPTY
}

/** Yalnız sayı — sidebar rozeti. */
export function useFeedUnread() {
  return useFeedFresh().count
}
