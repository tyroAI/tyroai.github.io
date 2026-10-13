import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { isMsalConfigured } from "@/lib/msal"
import { graphGet, STATUS } from "@/lib/graph"
import { FILES_SCOPES } from "@/hooks/useDriveItems"

/**
 * Bir dosyanın önizleme görseli.
 *
 * Graph'ın `/thumbnails` ucu ÖNCEDEN KİMLİK DOĞRULANMIŞ, kısa ömürlü bir URL
 * döndürüyor — `<img src>` ile doğrudan gösterilebiliyor, belirteç taşımaya
 * gerek yok. Alternatif olan `/preview` ucu gömülebilir bir sayfa veriyor ama
 * POST istiyor, iframe gerektiriyor ve dış içerik yüklüyor; bir hover
 * önizlemesi için o kadar yüzey gereksiz.
 *
 * Yalnızca kart AÇILDIĞINDA istenir (çağıran `enabled` ile söyler), yoksa
 * listedeki her satır için istek atılırdı. Sonuç modül belleğinde birikir:
 * aynı dosyanın üstüne ikinci kez gelmek ağa çıkmaz.
 *
 * Her dosyanın küçük resmi YOKTUR (.zip, .txt, çoğu .csv). O durumda uç boş
 * `value` döner ve burada `null` olur — çağıran tür rozetiyle metadata
 * gösterir. Bu bir hata değil, dosyanın doğası.
 */

const cache = new Map() // `driveId::itemId` -> url | null
/**
 * Uçuştaki istek SÖZ (`useDrivePreview`in kuralı, 2026-10-02): ikinci çağıran
 * isteği yeniden atmaz, SONUCUNU bekler; cevap, isteyen bileşen o arada
 * sökülse de önbelleğe yazılır. Eskiden iptal edilen efektin cevabı hiç
 * yazılmıyordu ve StrictMode'un ikinci efekti "uçuşta" diye dönüyordu —
 * küçük resim geliştirmede hiç gelmiyordu.
 */
const inflight = new Map() // key -> Promise

export function clearThumbnailCache() {
  cache.clear()
  inflight.clear()
}

export function useDriveThumbnail(driveId, itemId, enabled) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const key = driveId && itemId ? `${driveId}::${itemId}` : ""
  const [, bump] = useState(0)

  useEffect(() => {
    if (!enabled || !key || !isMsalConfigured || !account) return
    if (cache.has(key)) return
    let cancelled = false
    let job = inflight.get(key)
    if (!job) {
      job = (async () => {
        // `$select=large`: uç varsayılanda small/medium/large üçünü birden
        // döndürüyor; hover kartı yalnızca büyüğünü çiziyor.
        const res = await graphGet(instance, account, {
          path: `/drives/${driveId}/items/${itemId}/thumbnails?$select=large`,
          scopes: FILES_SCOPES,
        })
        const url = res.status === STATUS.ready ? (res.data?.value?.[0]?.large?.url ?? null) : null
        cache.set(key, url)
      })().finally(() => inflight.delete(key))
      inflight.set(key, job)
    }
    job.then(() => {
      if (!cancelled) bump((n) => n + 1)
    })
    return () => {
      cancelled = true
    }
  }, [enabled, key, driveId, itemId, account, instance])

  return {
    url: cache.get(key) ?? null,
    // `undefined` = henüz sorulmadı; `null` = soruldu, küçük resmi yok.
    pending: enabled && Boolean(key) && !cache.has(key),
  }
}
