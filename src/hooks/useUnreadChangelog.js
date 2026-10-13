import { useEffect, useState } from "react"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { usePageAccess } from "@/hooks/usePageAccess"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import { readSeenId, subscribeSeenId } from "@/lib/changelogSeen"

/**
 * Okunmamış yenilik SAYISI.
 *
 * ⚠️ Sayaç, PENCEREYİ AÇAN kayıtlarla sınırlı değildir. Pencere yalnız
 * `notify` işaretli kayıtta açılıyor (bkz. WhatsNewDialog); sayaç ise
 * okunmamış HER kaydı sayar — küçük düzeltmelerin de bir yerden görünmesi
 * gerekiyor, yoksa liste sayfası kimsenin bakmadığı bir arşiv olurdu.
 *
 * ⚠️ **KATALOG TEMBEL YÜKLENİR VE BU YAPISALDIR.** `changelog.js` yalnız
 * BÜYÜR; doğrudan import etmek onu giriş paketine çiviler ve her yeni
 * kayıt, sayfayı hiç açmayan herkese de iner. Sayaç bir kare geç belirir —
 * bir bildirim rozetinin ödeyebileceği en ucuz bedel.
 *
 * ⚠️ Kendi dosyasında, `Sidebar`ın içinde DEĞİL: kancayı bir bileşen
 * dosyasında bırakmak fast refresh'i bozar ve ikinci bir tüketici
 * (ör. kullanıcı menüsü) çıktığında kopyalanırdı.
 */
export function useUnreadChangelog() {
  const isAdmin = useIsInGroup(ADMIN_GROUP_ID) === true
  // Açamadığı sayfayı anlatan kayıt sayılmaz (rota kapısı, `visibleEntries`).
  const { canOpen } = usePageAccess()
  const [unread, setUnread] = useState(0)
  // ⚠️ İŞARET DEĞİŞİNCE YENİDEN SAY. Kart (`useWhatsNewFeed`) bunu baştan
  // beri yapıyordu, dar raydaki rozet yapmıyordu: kullanıcı Yenilikler'i
  // açıyor, işaret yazılıyor, kart sönüyor ama rozet aynı sayıyı taşımaya
  // devam ediyordu — sayfayı yenileyene kadar. Aynı ekranda iki farklı
  // sayı, ve biri yalan.
  const [seenNonce, setSeenNonce] = useState(0)
  useEffect(() => subscribeSeenId(() => setSeenNonce((n) => n + 1)), [])
  useEffect(() => {
    let cancelled = false
    const seen = readSeenId()
    // İlk ziyaret: işaret HENÜZ kurulmadı (onu `WhatsNewDialog` kuruyor) ama
    // yakalanacak bir geçmiş de yok — kataloğu indirmeye bile gerek yok.
    if (!seen) return undefined
    import("@/data/changelog")
      .then(({ entriesSince, latestEntryId, visibleEntries }) => {
        if (cancelled) return
        const visible = visibleEntries({ isAdmin, canOpen })
        setUnread(seen === latestEntryId(visible) ? 0 : entriesSince(seen, visible).length)
      })
      .catch(() => {
        // Katalog inmediyse rozet çizilmez. Bir "yenilik var" göstergesinin
        // arızasını kullanıcıya duyurmak, hiç istemediği bir konuda uyarı
        // olurdu.
      })
    return () => {
      cancelled = true
    }
  }, [isAdmin, canOpen, seenNonce])
  return unread
}
