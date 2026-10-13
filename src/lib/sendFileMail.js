import { graphGetBinary, graphPostNoContent, STATUS } from "@/lib/graph"
import { FILES_SCOPES } from "@/hooks/useDriveItems"
import { MAIL_SEND_SCOPES, toRecipients } from "@/lib/mailSend"

/**
 * Dosyayı EK OLARAK e-postayla gönderir — asistana devretmeden, doğrudan.
 *
 * Panelin diğer yolu (`tyro office`) dosyanın adresini ajana verir ve gönderme
 * işini ona bırakır. Bu yol dosyanın kendisini alıcının kutusuna koyar:
 * dokümanı SharePoint'e erişimi olmayan birine (dış tedarikçi, acente,
 * denetçi) yollamak gerektiğinde bağlantı işe yaramaz, ek yarar.
 *
 * ÜÇ SINIR, üçü de Graph'ın kendi kuralları:
 *
 *   1. `Mail.Send` kapsamı gerekir. Kiracıda verildi ve `loginRequest`e
 *      eklendi; ama ondan ÖNCE açılmış bir oturum onu taşımıyor olabilir —
 *      o durumda çağıran `sendWithConsent` (`lib/mailSend.js`) ile tıklamaya
 *      bağlı bir onay açar (gizli iframe yenilemesi üçüncü taraf çerezlere takılıyor).
 *   2. Tek istekte gönderilen ek ~4 MB ile sınırlı ve base64 ham boyutu
 *      üçte bir şişiriyor. Bu yüzden ham dosya 3 MB'ı aşarsa gönderim
 *      DENENMEZ: yarıda kalan bir istek yerine net bir cevap verilir.
 *      (Daha büyüğü için yükleme oturumlu taslak gerekir; o ayrı bir iş.)
 *   3. Adres çözümlemesi Exchange'e aittir. Kullanıcı ad yazdıysa onu
 *      göndermeyiz — çözemeyeceğimiz bir şeyi göndermek, sessizce yanlış
 *      kişiye ulaşma riski. Ad yazılan satırlar çağırana geri bildirilir.
 */

/** Graph'ın tek istek sınırı 4 MB; base64 şişmesi düşülünce kalan ham pay. */
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024

/** ArrayBuffer → base64. Parça parça, çünkü tek seferde `String.fromCharCode`
 *  megabaytlık bir dizide çağrı yığınını taşırıyor. */
export function toBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  const CHUNK = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/**
 * @returns {Promise<{ok: true} | {ok: false, reason: string, detail?: string}>}
 *   `reason`: "too-large" | "no-recipient" | "no-file" | "denied" | "download" | "send"
 */
export async function sendFileMail(instance, account, { item, to, cc, subject, body }) {
  const toList = toRecipients(to)
  if (toList.length === 0) return { ok: false, reason: "no-recipient" }
  if (item.size != null && item.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, reason: "too-large" }
  }

  if (!item.itemId) return { ok: false, reason: "no-file" }
  // `driveId` HER ZAMAN gelmiyor: "Son kullanılanlar" ve arama sonuçlarında
  // `parentReference.driveId` boş olabiliyor (paylaşılan kitaplıklardaki
  // öğeler). Boşken adres `/drives/null/...` olup 400 dönüyordu — kullanıcı
  // için "çalışmıyor"un bir sebebi buydu. Sürücü bilinmiyorsa kullanıcının
  // kendi sürücüsü denenir.
  const contentPath = item.driveId
    ? `/drives/${item.driveId}/items/${item.itemId}/content`
    : `/me/drive/items/${item.itemId}/content`
  const content = await graphGetBinary(instance, account, {
    path: contentPath,
    scopes: FILES_SCOPES,
  })
  if (content.status !== STATUS.ready) {
    return {
      ok: false,
      reason: content.status === STATUS.denied ? "denied" : "download",
      detail: content.error ?? String(content.httpStatus ?? ""),
    }
  }
  // Boyut alanı eksik gelebiliyor (arama sonuçları); indirdikten sonra
  // gerçek boyut elimizde, sınır burada bir kez daha kontrol edilir.
  if (content.data.byteLength > MAX_ATTACHMENT_BYTES) return { ok: false, reason: "too-large" }

  return sendAttachmentMail(instance, account, {
    to,
    cc,
    subject,
    body,
    attachment: { name: item.name, bytes: content.data },
  })
}

/**
 * Elde olan baytları ek yapıp kullanıcının kendi kutusundan gönderir
 * (sohbette imzalanan form gibi, sürücüde olmayan dosyalar için).
 *
 * @returns {Promise<{ok: true} | {ok: false, reason: string, detail?: string}>}
 *   `reason`: "too-large" | "no-recipient" | "denied" | "send"
 */
export async function sendAttachmentMail(instance, account, { to, cc, subject, body, attachment }) {
  const toList = toRecipients(to)
  if (toList.length === 0) return { ok: false, reason: "no-recipient" }
  if (attachment.bytes.byteLength > MAX_ATTACHMENT_BYTES) return { ok: false, reason: "too-large" }
  const res = await graphPostNoContent(instance, account, {
    path: "/me/sendMail",
    scopes: MAIL_SEND_SCOPES,
    body: {
      message: {
        subject,
        // Düz metin: gövdeyi kullanıcı yazıyor ve HTML'e çevirmek, yazdığı
        // "<" işaretini yutmak ya da satır sonlarını kaybetmek demekti.
        body: { contentType: "Text", content: body },
        toRecipients: toList,
        ccRecipients: toRecipients(cc ?? []),
        attachments: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: attachment.name,
            ...(attachment.contentType ? { contentType: attachment.contentType } : {}),
            contentBytes: toBase64(attachment.bytes),
          },
        ],
      },
      saveToSentItems: true,
    },
  })
  if (res.status === STATUS.ready) return { ok: true }
  return {
    ok: false,
    reason: res.status === STATUS.denied ? "denied" : "send",
    detail: res.error ?? String(res.httpStatus ?? ""),
  }
}
