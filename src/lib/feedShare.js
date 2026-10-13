import { teamsChat } from "@/lib/celebrate"
import { graphPostNoContent, STATUS } from "@/lib/graph"
import { MAIL_SEND_SCOPES, toRecipients } from "@/lib/mailSend"

/**
 * Keşfet gönderisini PAYLAŞMANIN yolları — yalnız iş kanalları:
 *
 *   Kişilere ilet   postanın KENDİSİ (gövde + ekler) kullanıcının kutusundan iletilir
 *                   (`/me/messages/{id}/forward`, `Mail.Send`); alıcı postayı okuyabilir.
 *   Teams           seçilen kişilerle sohbet açılır, mesaj kutusu hazır dolu (konu + tek
 *                   satır özet); göndermeyi kişi yapar.
 *
 * ⚠️ Paylaşılan metinde Outlook bağlantısı (`webLink`) YOK: ileti kimliği posta kutusuna
 * özel, bağlantı alıcıda açılmaz (yalnız gönderenin kutusunu açar).
 * ⚠️ WhatsApp ya da herkese açık kanal YOK: iş bildirimi satış rakamı gibi iş verisi
 * taşıyabilir. İşletim sisteminin paylaşım sayfası (`navigator.share`) da yok: WhatsApp'ı ve
 * kişisel uygulamaları açıyor. Gerekçe: `docs/features/kesfet-eylemler.md`.
 */

const PREVIEW_MAX = 140

/** Tek satırlık özet: boşluklar teke iner, uzunsa kelime sınırında "…" ile kesilir. */
export function shortPreview(text, max = PREVIEW_MAX) {
  const flat = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const space = cut.lastIndexOf(" ")
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`
}

/** Paylaşılan metin: konu ve varsa tek satır özet — bağlantı yok (gerekçe yukarıda). */
export function shareText(post, t) {
  const subject = post.subject || t("feed.noSubject")
  const preview = shortPreview(post.preview)
  return preview ? `${subject} — ${preview}` : subject
}

/** Seçilen kişilerle Teams sohbeti; adresi olmayan satır düşer. */
export function teamsShareUrl(people, text) {
  return teamsChat(people.map((p) => p.address).filter(Boolean), text)
}

/**
 * Postayı iletir; `comment` kullanıcının notu, düz metin (boş olabilir).
 * @returns {Promise<{ok: true} | {ok: false, reason: "no-recipient" | "denied" | "send", detail?: string}>}
 */
export async function forwardPost(instance, account, { id, to, comment }) {
  const toList = toRecipients(to)
  if (!toList.length) return { ok: false, reason: "no-recipient" }
  const res = await graphPostNoContent(instance, account, {
    path: `/me/messages/${encodeURIComponent(id)}/forward`,
    scopes: MAIL_SEND_SCOPES,
    body: { comment: comment ?? "", toRecipients: toList },
  })
  if (res.status === STATUS.ready) return { ok: true }
  return {
    ok: false,
    reason: res.status === STATUS.denied ? "denied" : "send",
    detail: res.error ?? (res.httpStatus ? String(res.httpStatus) : ""),
  }
}
