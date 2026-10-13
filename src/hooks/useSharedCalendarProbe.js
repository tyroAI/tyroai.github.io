import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { isMsalConfigured } from "@/lib/msal"
import { graphGet, STATUS } from "@/lib/graph"

/**
 * "Kimin takvimi bana açık?" — sorulamadığı için DENENİR.
 *
 * Graph'ta "kim seninle paylaştı" diye bir uç yok; paylaşım Exchange
 * tarafında yapılıyor. Okunabilen tek gerçek şu: adını verdiğin kişinin
 * takvimi sana açıksa `/users/{upn}/calendarView` 200, değilse 403 döner.
 * Bu kanca o denemeyi aday listesi üzerinde yapar, böylece kullanıcıya
 * "toplantılarında geçen herkes" değil GERÇEKTEN açabildiği takvimler
 * gösterilir — önceki hâli alakasız isimlerle dolu bir liste üretiyordu.
 *
 * Deneme UCUZ tutulur: bir saatlik pencere, tek kayıt, tek alan. Aynı anda
 * en fazla dört istek — elli kişilik bir listeyi tek seferde göndermek
 * tarayıcıyı da kiracıyı da gereksiz yorar. Sonuç sekme boyunca hatırlanır;
 * paylaşım ayarı bir oturum içinde nadiren değişir.
 */

const CONCURRENCY = 4
const verdicts = new Map() // adres (küçük harf) -> boolean

export function clearSharedCalendarProbe() {
  verdicts.clear()
}

async function probe(instance, account, address) {
  const key = address.toLowerCase()
  if (verdicts.has(key)) return verdicts.get(key)
  const now = new Date()
  const params = new URLSearchParams({
    startDateTime: now.toISOString(),
    endDateTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    $select: "id",
    $top: "1",
  })
  const res = await graphGet(instance, account, {
    path: `/users/${encodeURIComponent(address)}/calendarView?${params.toString()}`,
    scopes: ["Calendars.Read.Shared"],
  })
  // Yalnızca AÇIK BİR EVET kaydedilir. Ağ hatası "paylaşmamış" demek
  // değildir; onu kalıcı bir hayır olarak yazmak, sonraki denemeleri de
  // sessizce engellerdi.
  const ok = res.status === STATUS.ready
  if (ok || res.status === STATUS.denied) verdicts.set(key, ok)
  return ok
}

export function useSharedCalendarProbe(candidates, enabled) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const [open, setOpen] = useState(() =>
    candidates.filter((c) => verdicts.get(c.address?.toLowerCase())),
  )
  const [checking, setChecking] = useState(false)

  const key = candidates.map((c) => c.address).join(",")

  useEffect(() => {
    if (!enabled || !isMsalConfigured || !account || candidates.length === 0) return
    let alive = true
    const found = []
    const queue = [...candidates]
    ;(async () => {
      // `setChecking` etkinin gövdesinde EŞZAMANLI çağrılmaz: zincirleme
      // render doğuruyor (lint kuralı bunu yakalıyor). Bir mikro görev
      // sonrası yazmak aynı işi görür, ilk boyamayı geciktirmez.
      setChecking(true)
      async function worker() {
        while (queue.length && alive) {
          const person = queue.shift()
          if (!person?.address) continue
          const ok = await probe(instance, account, person.address)
          if (!alive) return
          if (ok) {
            found.push(person)
            // Bulunan hemen gösterilir: tüm listenin bitmesini beklemek,
            // kullanıcıyı boş bir kutuya baktırmak olurdu.
            setOpen([...found])
          }
        }
      }
      await Promise.all(Array.from({ length: CONCURRENCY }, worker))
      if (alive) setChecking(false)
    })()
    return () => {
      alive = false
    }
  }, [enabled, key, account, instance, candidates])

  return { open, checking }
}
