import { useEffect, useState } from "react"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { usePageAccess } from "@/hooks/usePageAccess"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { readSeenId, subscribeSeenId } from "@/lib/changelogSeen"

/**
 * Sidebar kartının VERİSİ: en yeni `limit` kayıt + okunmamış sayısı.
 *
 * ⚠️ **KATALOG TEMBEL** — `useUnreadChangelog` ile aynı karar ve aynı
 * gerekçe: `changelog.js` yalnız büyür, statik import onu giriş paketine
 * çiviler. Kart bir kare boş başlar (aynı yükseklikte iskelet), sonra dolar.
 *
 * ⚠️ **GÖRÜNÜRLÜK SÜZGECİ SAYFANIN AYNISI DEĞİL** (`visibleEntries` ›
 * `surface`): yönetici kaydı burada da gizlenir (yetkisi olmayana olmayan
 * bir düğmeyi vaat etmek olurdu) ama AYRICA düzeltme kayıtları hiç
 * çizilmez — kart kullanıcının işini kesen bir yüzey, düzeltmeler ise
 * gidilen bir yerde okunacak şeyler.
 *
 * ⚠️ **OKUNMAMIŞ = işaretten SONRAKİLER.** İşaret yoksa (ilk ziyaret) 0 —
 * `entriesSince`in kendi kuralı; kart yine de son kayıtları gösterir, yalnız
 * "yeni" demez. Okundu işareti değişince (sayfa açıldı, pencere kapandı)
 * `subscribeSeenId` sayesinde aynı sekmede anında tazelenir.
 */
export function useWhatsNewFeed(limit = 3) {
  // ⚠️ ROTA İZNİ de süzülüyor (tyroTrade'in `@/access` deseni, 2026-09-28'de
  // alındı): Keşfet ve Akışım önizleme ekibine daraldı ve açamadığı bir
  // sayfayı anlatan kart, kişiyi basınca dashboard'a düşürürdü. Kural
  // `lib/pageAccess.js`te; kart ve sayı AYNI `canOpen`ı kullanıyor.
  const isAdmin = useIsInGroup(ADMIN_GROUP_ID) === true
  const { canOpen } = usePageAccess()
  const [state, setState] = useState({ loaded: false, entries: [], unread: 0, unreadIds: [] })

  useEffect(() => {
    let cancelled = false
    let mod = null

    const compute = () => {
      if (!mod || cancelled) return
      // KARTIN LİSTESİ: düzeltme kayıtları burada çizilmez.
      const visible = mod.visibleEntries({ isAdmin, surface: "card", canOpen })
      // ⚠️ SAYI BAŞKA LİSTEDEN, ve bu bilerek. Rozet kullanıcıyı Yenilikler
      // SAYFASINA götürüyor; oradaki okunmamış sayısını söylemeli. Kart
      // yüzeyinden sayılsaydı iki arıza birden çıkardı: (1) yöneticinin
      // işareti bir düzeltmeye yazıldığında `entriesSince` onu kart
      // listesinde bulamaz (`findIndex` → -1) ve rozet o tarayıcıda bir
      // daha hiç yanmaz; (2) sayfada 5 okunmamış varken rozet 3 derdi.
      // Liste zaten `limit` ile kırpılıyor, yani sayı ile liste uzunluğu
      // hiçbir hâlde birbirinin aynısı değil — sayının anlamı "orada seni
      // bekleyen".
      const counted = mod.visibleEntries({ isAdmin, canOpen })
      const seen = readSeenId()
      const fresh = seen ? mod.entriesSince(seen, counted) : []
      setState({
        loaded: true,
        entries: visible.slice(0, limit),
        unread: fresh.length,
        unreadIds: fresh.map((e) => e.id),
      })
    }

    import("@/data/changelog")
      .then((m) => {
        mod = m
        compute()
      })
      .catch(() => {
        // Katalog inmediyse kart boş durumunu çizer; "yenilikler alınamadı"
        // demek, hiç istenmeyen bir konuda uyarı olurdu.
        if (!cancelled) setState((s) => ({ ...s, loaded: true }))
      })

    const unsubscribe = subscribeSeenId(compute)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [isAdmin, canOpen, limit])

  return state
}
