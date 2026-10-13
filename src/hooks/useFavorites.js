import { useCallback, useMemo, useSyncExternalStore } from "react"
import { useConfig } from "@/hooks/useConfig"
import { useAppLock } from "@/hooks/useAuthorizations"
import { appliesTo } from "@/lib/appLockPolicy"
import {
  favoriteMatches,
  getFavorites,
  getFavoritesServerSnapshot,
  subscribeFavorites,
  toggleFavorite,
} from "@/lib/favorites"

/**
 * Favori girdilerini CANLI katalogla eşleştirir.
 *
 * Saklanan şey yalnızca bir işaret ({kind, id, name}); ad, ikon, URL ve
 * `locked` her zaman useConfig'ten okunur — böylece Dataverse'te yeniden
 * adlandırılan bir uygulama favorilerde eski adıyla kalmaz.
 *
 * Kataloğa artık bulunmayan bir girdi LİSTELENMEZ ama SİLİNMEZ: config
 * yüklenirken (ya da Dataverse hata verip seed'e düşerken) listenin
 * kendini sessizce boşaltması, kullanıcının favorilerini kalıcı olarak
 * kaybetmesi demek olurdu.
 *
 * ⚠️ **KİLİTLİ GİRDİ DE LİSTELENMEZ — VE AYNI ŞEKİLDE SİLİNMEZ**
 * (2026-09-17, istek üzerine: "erişimim olmayan şeyi sidebarda
 * görememeliyim"). Sidebar bir GİDİLECEK YERLER listesi; açılmayan bir
 * satır orada yalnızca hayal kırıklığı üretiyor. Dashboard kartı ise
 * KATALOG — orada kilitli görünmeye devam ediyor, çünkü talebin açıldığı
 * yer orası. İki yüzey, iki farklı soru.
 *
 * Kayıt silinmiyor: yetki sonradan verildiğinde favori kendiliğinden geri
 * gelsin. Silseydik kullanıcı kalbi ikinci kez basmak zorunda kalırdı ve
 * bunu hatırlayan olmazdı.
 */
export function useFavorites() {
  const entries = useSyncExternalStore(subscribeFavorites, getFavorites, getFavoritesServerSnapshot)
  const { agents, aiApps, businessApps } = useConfig()
  const lock = useAppLock()

  const items = useMemo(() => {
    const catalogue = { agent: agents, aiApp: aiApps, businessApp: businessApps }
    const resolved = []
    for (const entry of entries) {
      const list = catalogue[entry.kind] ?? []
      const item = list.find((x) => favoriteMatches(entry, entry.kind, x))
      if (!item) continue
      // ⚠️ Kilit ÇÖZÜLENE KADAR süzmez (`useAppLock` beklerken `isLocked`
      // hep false döner): liste bir an dolu görünüp sonra kısalıyor. Tersi
      // — boş başlayıp dolmak — favorisi olan herkese her açılışta "hiç
      // favorin yok" demek olurdu ve o cümle yanlış.
      if (appliesTo(entry.kind) && lock.isLocked(item.name)) continue
      resolved.push({ ...item, kind: entry.kind })
    }
    return resolved
  }, [entries, agents, aiApps, businessApps, lock])

  const isFavorite = useCallback(
    (kind, item) => entries.some((entry) => favoriteMatches(entry, kind, item)),
    [entries],
  )

  return { items, isFavorite, toggle: toggleFavorite }
}
