import { STATUS, graphGet } from "@/lib/graph"

// Yoğun bir takvimde aralıkta yüzlerce etkinlik olur (tekrarlayan serinin her
// oturumu ayrı). Graph sonucu sayfalar (`@odata.nextLink`); yalnız ilk sayfayı
// okumak fazlasını SESSİZCE düşürüyordu — bu haftanın toplantıları görünmüyordu.
export const CALENDAR_PAGE_SIZE = 250
export const CALENDAR_MAX_PAGES = 8

/**
 * calendarView'u sayfa sayfa okur: `{ status, data: { value } }` — `value`
 * tüm sayfalar. İlk sayfa okunamazsa o hata döner; sonraki bir sayfa düşerse
 * okunanlar döner (uyarıyla) — hiç göstermemekten iyi.
 */
export async function getCalendarPages(
  instance,
  account,
  { path, scopes, headers, retry },
  maxPages = CALENDAR_MAX_PAGES,
) {
  const value = []
  let next = path
  for (let page = 0; next && page < maxPages; page += 1) {
    const res = await graphGet(instance, account, { path: next, scopes, headers, retry })
    if (res.status !== STATUS.ready) {
      if (page === 0) return res
      console.warn(`[calendar] ${page + 1}. sayfa okunamadı; ${value.length} etkinlik gösteriliyor`)
      break
    }
    value.push(...(res.data?.value ?? []))
    next = res.data?.["@odata.nextLink"] ?? null
  }
  if (next) console.warn(`[calendar] ${maxPages} sayfadan fazlası okunmadı`)
  return { status: STATUS.ready, data: { value } }
}
