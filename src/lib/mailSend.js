import { requestGraphScopes } from "@/lib/graph"

/**
 * Kullanıcının KENDİ kutusundan posta yollamanın ortak parçaları: dosya postası
 * (`sendFileMail`), imzalı form (`useSignedFormSend`) ve Keşfet'in "Kişilere ilet"i
 * (`feedShare`) aynı alıcı kuralını ve aynı onay yolunu kullanır.
 */
export const MAIL_SEND_SCOPES = ["Mail.Send"]

/** `{name, address}` listesinden Graph alıcı listesi. Adresi olmayan düşer. */
export function toRecipients(list) {
  return (list ?? [])
    .filter((p) => p.address)
    .map((p) => ({ emailAddress: { address: p.address, name: p.name || undefined } }))
}

/**
 * Adresi olmayan (yalnızca ad yazılmış) girdiler — çağıran uyarır. Exchange'in
 * çözemeyeceği bir adı yollamak, sessizce yanlış kişiye ulaşmak demektir.
 */
export function unresolvedRecipients(list) {
  return (list ?? []).filter((p) => !p.address).map((p) => p.name)
}

/**
 * Gönderimi dener; izin yoksa (`reason: "denied"`) tıklamaya bağlı onay açılır ve TEK kez
 * yeniden denenir. `Mail.Send` giriş listesinde ama ondan ÖNCE açılmış bir oturum onu
 * taşımıyor olabilir; sessiz yenileme gizli iframe'de üçüncü taraf çerezlere takılıyor.
 *
 * @param {() => Promise<{ok: boolean, reason?: string}>} send
 */
export async function sendWithConsent(instance, account, send) {
  const res = await send()
  if (res.ok || res.reason !== "denied") return res
  const granted = await requestGraphScopes(instance, account, MAIL_SEND_SCOPES)
  return granted ? send() : res
}
