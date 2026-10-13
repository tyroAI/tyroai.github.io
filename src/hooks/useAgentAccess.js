import { useMemo } from "react"
import { useConfig } from "@/hooks/useConfig"
import { useAppLock } from "@/hooks/useAuthorizations"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  "BU OTURUMUN AÇABİLECEĞİ BİR ASİSTAN VAR MI?" — TEK KAYNAK
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Kilit tek tek app'lere bakıyor (`useAppLock.isLocked(name)`); bu kanca
 * ondan TÜREYEN bir soruyu cevaplıyor: elinde hiç açık asistan kalmadı mı?
 * Sohbet bir KATALOG GİRDİSİ değil bir YÜZEY — kendi başına kilitlenemez,
 * kilidi asistanlarından devralır.
 *
 * ⚠️ **NEDEN AYRI DOSYA.** Cevabı ÜÇ yer birden soruyor: sidebar satırı,
 * "Yeni sohbet" düğmesi ve `ChatScreen`in kendisi. Üçü de `agents.filter(…)`
 * yazsaydı aynı kuralın üç kopyası olurdu — `appLockPolicy.appliesTo`nun
 * varlık sebebiyle aynı gerekçe.
 *
 * ⚠️ **KİLİT ÇÖZÜLENE KADAR KİLİTLENMEZ** (`lock.ready`). Dataverse satırı
 * uçarken `isLocked` zaten `false` dönüyor; burada da aynı yön korunuyor,
 * yoksa her soğuk açılışta sohbet bir an kilitli görünüp sonra açılırdı.
 * Aynı kural `NavApps` ve `useFavorites`te de yazılı.
 *
 * ⚠️ **KATALOG BOŞKEN DE KİLİTLENMEZ.** `agents` henüz inmemişse "açık
 * asistan yok" ile "asistan yok" ayırt edilemez; ikincisi bir yönetici
 * sorunu ve kullanıcıya kilit diye gösterilemez. Fail-open, çünkü bu bir
 * GÜVENLİK SINIRI DEĞİL (bkz. `appLockPolicy.js`): işi keşfi ve yanlışlıkla
 * girmeyi engellemek, talep akışını başlatmak. Gerçek sınır Copilot
 * Studio'nun kendi Entra kapısıdır.
 *
 * @returns {{ready: boolean, openAgents: Array, locked: boolean, lock: object}}
 *   `locked` yalnızca "cevap geldi, katalog geldi ve tek bir açık asistan
 *   yok" hâlinde true.
 */
export function useAgentAccess() {
  const { agents } = useConfig()
  const lock = useAppLock()
  return useMemo(() => {
    const openAgents = agents.filter((a) => !lock.isLocked(a.name))
    return {
      ready: lock.ready,
      openAgents,
      locked: lock.ready && agents.length > 0 && openAgents.length === 0,
      lock,
    }
  }, [agents, lock])
}
