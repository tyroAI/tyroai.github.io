import { STATUS, graphPostNoContent, requestGraphScopes } from "@/lib/graph"

// Yanıt yazmak okumadan ayrı izin: takvim girişte yalnız okunuyor.
const RSVP_SCOPES = ["Calendars.ReadWrite"]
export const RSVP_ACTIONS = ["accept", "tentativelyAccept", "decline"]
// Yanıt gidince etkinliğin yeni `myResponse` değeri (kart takvim tazelenmeden gösterir).
export const RSVP_RESULT = {
  accept: "accepted",
  tentativelyAccept: "tentativelyAccepted",
  decline: "declined",
}

/**
 * Yanıt bekleyen davetler: KENDİ takvimimde (paylaşılan takvimler değil),
 * yanıtlamadığım ve henüz bitmemiş toplantılar, en yakını önce.
 * ⚠️ Takvim okuması tekrarlayan toplantının HER oturumunu ayrı getirir:
 * yanıtlanmamış haftalık bir seri ayda dört davet sayılıyordu. Seri TEK davet
 * (en yakın oturumu), yanıtı da serinin kendisine gider (`respondId`).
 */
export function pendingInvites(events, now) {
  const seen = new Set()
  const out = []
  const open = (events ?? [])
    .filter((e) => !e.owner && e.myResponse === "notResponded" && e.end?.getTime() > now)
    .sort((a, b) => a.start - b.start)
  for (const e of open) {
    const key = e.seriesMasterId ?? e.id
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...e, series: Boolean(e.seriesMasterId), respondId: key })
  }
  return out
}

/**
 * Davete yanıt (`accept` · `tentativelyAccept` · `decline`), düzenleyiciye
 * bildirimle. İlk yanıtta yazma izni yoktur: sessiz belirteç reddedilince
 * kişiye bir kez sorulur, onay gelirse aynı istek yeniden gider.
 */
export async function respondToInvite(instance, account, eventId, action) {
  if (!RSVP_ACTIONS.includes(action)) return { status: STATUS.error, error: "action" }
  const send = () =>
    graphPostNoContent(instance, account, {
      path: `/me/events/${encodeURIComponent(eventId)}/${action}`,
      scopes: RSVP_SCOPES,
      body: { sendResponse: true },
    })
  const first = await send()
  // HTTP kodu yoksa belirteç alınamadı (izin verilmemiş) — sunucu reddi değil.
  if (first.status !== STATUS.denied || first.httpStatus) return first
  const granted = await requestGraphScopes(instance, account, RSVP_SCOPES)
  return granted ? send() : first
}
