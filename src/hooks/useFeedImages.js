import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { fetchInlineImages } from "@/lib/feedImages"
import { createQueue } from "@/lib/feedQueue"
import { STATUS } from "@/lib/graph"
import { isMsalConfigured } from "@/lib/msal"

/**
 * Kapak görselleri — base64 `data:` dizgeleri, yani PAHALI.
 *
 * ⚠️ TAVAN ŞART. Gönderi başına tavan `FEED.hero.maxBytes` (3 MB) ve base64
 * şişmesiyle ~4 MB'lık bir dizge; sınırsız bir `Map`te uzun bir oturumda
 * onlarca kapak birikir ve sekme yüzlerce megabayta çıkar. En son 40 giriş
 * tutuluyor (`Map` ekleme sırasını koruyor, yani en eski anahtar ilk
 * sıradaki): kaydırdıkça eskiler düşüyor, geri kaydırınca yeniden
 * indiriliyor — bir kapak için kabul edilebilir bir bedel.
 */
const imageCache = new Map()
const IMAGE_CACHE_MAX = 40
function rememberImages(key, value) {
  if (imageCache.has(key)) imageCache.delete(key)
  imageCache.set(key, value)
  while (imageCache.size > IMAGE_CACHE_MAX) imageCache.delete(imageCache.keys().next().value)
}

/** Çıkışta düşer (`useFeedPosts` › `clearFeedCache` → LOGOUT zinciri). */
export function clearFeedImageCache() {
  imageCache.clear()
}

/**
 * Bir gönderinin gömülü görselleri — KAPAK ve detaydaki `cid:` eşlemesi.
 *
 * ⚠️ `enabled` ŞART. Kart görüş alanına girmeden çağrılırsa 20 gönderi için
 * 20+ ek isteği açılırdı; `FeedPostCard` bunu `IntersectionObserver` ile
 * açıyor, detay penceresi ise açılır açılmaz.
 *
 * ⚠️ Ek YOKSA da önbelleğe BOŞ DİZİ yazılır: aksi hâlde kapaksız her kart
 * her görünüşünde aynı iki isteği yeniden atardı.
 *
 * ⚠️ **ÖNBELLEK ANAHTARI VARYANTI DA İÇERİR.** Kart tek kapak istiyor
 * (`hero`), detay penceresi gövdedeki HER `cid:` için görsel (`body`). Aynı
 * anahtarı paylaşsalardı kartın tek görseli pencereye de servis edilir ve
 * gövdedeki öteki görseller yırtık ikona düşerdi.
 *
 * ⚠️ **BÜTÇE ÇAĞIRANDA DEĞİL POLİTİKADA** (`FEED.hero` / `FEED.body`).
 * Sayılar bir tur çağrı yerlerinde duruyordu ve pencere kapağın tavanlarını
 * miras alıyordu: 3 MB'ı aşan kişi fotoğrafları indirilmeden eleniyor,
 * ekranda yırtık çıkıyordu (sahada bildirildi).
 */
const heroQueue = createQueue(3)
const SKIPPED = { status: STATUS.error, images: [] }

export function useFeedImages(id, enabled, variant = "hero") {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const cacheKey = `${id}::${variant}`
  // ⚠️ DURUM KİMLİKLE BİRLİKTE TUTULUR (`{ key, value }`) ve kimlik
  // uyuşmazsa `null` döner. Çıplak bir değer tutmak ÖLÇÜLMÜŞ bir hataydı:
  // detay penceresi tek bir yerde mount kalıyor (`FeedPage` onu `key`siz
  // çiziyor ve `if (!post) return null` yalnız ÇİZİMİ durduruyor, bileşeni
  // sökmüyor). İkinci bir gönderi açıldığında yeni verinin ağdan gelmesine
  // kadar ekranda ÖNCEKİ gönderinin gövdesi ve kapağı duruyordu — yani
  // başlıkta B, metinde A. Aynı desen `useFeedPostById`de zaten vardı.
  const [state, setState] = useState(() =>
    imageCache.has(cacheKey) ? { key: cacheKey, value: imageCache.get(cacheKey) } : null,
  )

  useEffect(() => {
    if (!enabled || !isMsalConfigured || !account || !id) return
    if (imageCache.has(cacheKey)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ key: cacheKey, value: imageCache.get(cacheKey) })
      return
    }
    let cancelled = false
    ;(async () => {
      const load = () => fetchInlineImages(instance, account, id, variant)
      // Kart kapakları sıraya girer; görüş alanından çıkan kartın sırası gelince iş yapılmaz.
      const res = await (variant === "hero"
        ? heroQueue(() => (cancelled ? SKIPPED : load()))
        : load())
      if (cancelled) return
      const value = res.status === STATUS.ready ? res.images : []
      // Hata durumunda önbelleğe yazILMAZ: geçici bir ağ hatası kapağı
      // kalıcı olarak silmesin.
      if (res.status === STATUS.ready) rememberImages(cacheKey, value)
      setState({ key: cacheKey, value })
    })()
    return () => {
      cancelled = true
    }
  }, [id, cacheKey, enabled, variant, account, instance])

  // ⚠️ `state &&` ŞART, `state?.key === …` YETMEZ: pencere kapalıyken `id`
  // tanımsız oluyor ve `state` de null — `undefined === undefined` DOĞRU
  // çıkıp `null.value` okunuyordu. Gerçek kancalarla yapılan sınamada bütün
  // sayfayı düşürdü (kart sayısı 0). Sahte kancalı sınama bunu göremezdi.
  return state && state.key === cacheKey ? state.value : null
}
