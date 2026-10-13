import { useCallback, useMemo, useSyncExternalStore } from "react"
import { getPrompts, subscribeCatalogue } from "@/data/prompts"
import { useLocale } from "@/hooks/useLocale"

/**
 * Seçili asistanın istemleri.
 *
 * Katalog tembel yüklendiği için (bkz. `src/data/prompts.js`) dışarıdan
 * değişen bir kaynak: `useSyncExternalStore` tam bu iş için var — effect'te
 * setState çağırıp zincirleme render doğurmadan, veri gelince yeniden çizer.
 * Katalog inene kadar boş liste döner ve yüzeyler hiçbir şey çizmez.
 */
export function usePrompts(agentName) {
  const { locale } = useLocale()
  const subscribe = useCallback((fn) => subscribeCatalogue(fn), [])
  // Anlık görüntü olarak KATALOG NESNESİ değil, ondan türeyen sabit bir
  // gösterge kullanılamaz; `getPrompts` her çağrıda yeni dizi üretiyor.
  // O yüzden sürüm sayacı gibi davranan hafif bir anahtar alınır.
  const ready = useSyncExternalStore(
    subscribe,
    () => getPrompts(agentName, locale).topics.length > 0,
    () => false,
  )
  return useMemo(
    () => (ready ? getPrompts(agentName, locale) : { topics: [], starters: [] }),
    [ready, agentName, locale],
  )
}
