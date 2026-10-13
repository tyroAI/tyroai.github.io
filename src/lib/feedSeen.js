import { FEED } from "@/lib/feedPolicy"

/**
 * Gündem Akışında EN SON GÖRÜLEN gönderinin zaman damgası.
 *
 * Sidebar'daki "Gündem" satırı bundan sonrasını sayıyor: kullanıcı sayfayı
 * açtığında damga en yeni gönderiye çekiliyor ve rozet sönüyor.
 *
 * ⚠️ **YALNIZ BİR ISO DAMGASI SAKLANIR** — gönderi kimliği, konusu ya da
 * göndereni DEĞİL. Bu depoda posta içeriği localStorage'a HİÇ yazılmıyor
 * (önbellekler yalnız bellekte, gerekçesi `useFeedPosts.js`te); bir ziyaret
 * damgası ise kullanıcının kendi bilgisi, başkasının işi değil.
 *
 * ⚠️ **YENİLİKLER'İN "KAYIT KİMLİĞİ" DESENİ BURADA İŞLEMEZ.**
 * `tyro-changelog-seen-v1` bir kayıt kimliği tutuyor, çünkü katalog pakette
 * gömülü ve sıralı. Akış uzak bir posta kutusu: kimlik saklamak, o ileti
 * silindiğinde "listede yok" ile "artık yok"u ayırt edemeyen aynı onarım
 * problemini getirirdi (Yenilikler'de ölçüldü). Zaman damgası o soruyu hiç
 * doğurmuyor.
 *
 * ⚠️ `appMeta.localStorageRegistry`e EKLENDİ: kullanıcıya görünen, silinmesi
 * zararsız bir tercih. Silinirse rozet bir kez tüm akışı "yeni" sayar.
 *
 * Desen `orbStyle.js` / `edgeNotchState.js` ile aynı: localStorage + aynı
 * sekme için özel olay (`storage` yalnız BAŞKA sekmeleri haberdar eder).
 */
const KEY = FEED.seenKey
const EVENT = "tyro:feed-seen"

export function readFeedSeen() {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const t = Date.parse(raw)
    return Number.isFinite(t) ? raw : null
  } catch {
    return null
  }
}

/**
 * Damgayı ileri taşır.
 *
 * ⚠️ **YALNIZ İLERİ.** Eski bir gönderiyi açmak damgayı geriye çekerse, o
 * arada gelen her şey yeniden "okunmamış" olurdu. Yenilikler'in onarım
 * dalında tam bu hata ölçülmüştü.
 */
export function writeFeedSeen(iso) {
  if (typeof window === "undefined" || !iso) return
  const next = Date.parse(iso)
  if (!Number.isFinite(next)) return
  const current = readFeedSeen()
  if (current && Date.parse(current) >= next) return
  try {
    window.localStorage.setItem(KEY, new Date(next).toISOString())
  } catch {
    // Depo kapalı: rozet bu oturumda sönmez. Akış yine çalışır.
  }
  window.dispatchEvent(new Event(EVENT))
}

/**
 * "Görülmedi" sayılan ilk an: damganın bir SONRAKİ tam saniyesi.
 *
 * ⚠️ Graph `receivedDateTime`ı saniyeye KIRPARAK döndürüyor ("07:12:33Z") ama
 * `$filter` sunucudaki tam değerle (saniyenin kesirleriyle) karşılaştırıyor.
 * Damga en yeni duyurunun döndürülen saati olduğu için `gt damga` o duyurunun
 * KENDİSİNİ de sayıyordu: rozet Keşfet'e girildikten sonra bile 1'de kalıyordu.
 * Aynı saniyede gelen ikinci bir duyuruyu kaçırmak pratikte imkânsız.
 */
export function feedSeenThreshold(seen) {
  const t = Date.parse(seen ?? "")
  if (!Number.isFinite(t)) return null
  return new Date(Math.floor(t / 1000) * 1000 + 1000).toISOString()
}

/**
 * "Buradan sonrasını görmüştün" ayracının yeri: damgadan eski ya da ona eşit ilk
 * gönderi. Üstünde en az bir yeni gönderi yoksa ayraç yok (-1).
 */
export function seenDividerIndex(posts, seen) {
  const t = Date.parse(seen ?? "")
  if (!Number.isFinite(t)) return -1
  const i = posts.findIndex((p) => p.received && p.received.getTime() <= t)
  return i > 0 ? i : -1
}

export function subscribeFeedSeen(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}
