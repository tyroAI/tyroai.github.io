/**
 * Copilot Studio SDK'sı TEMBEL yüklenir (ölçüldü: 177 KB ham).
 *
 * Tepede import edildiğinde giriş paketinde duruyordu — yani sohbeti hiç
 * açmayan, dashboard'a bakıp çıkan kullanıcı da onu indiriyordu. Her kullanım
 * yeri zaten `getToken()` ile başlıyor ve o bir ağ turudur; paket o turla AYNI
 * ANDA iner, dolayısıyla gecikme kullanıcıya yansımaz.
 *
 * Söz saklanır: aynı sekmede ikinci konuşma yeniden indirmez.
 */
let sdkPromise = null
export function loadSdk() {
  // Reddedilen söz SAKLANMAZ. `??=` ile tutulsaydı tek bir başarısız indirme
  // (ağ kesintisi, deploy sırasında kaybolan parça) sekmenin ömrü boyunca
  // sohbeti öldürürdü: sonraki her deneme aynı reddi yeniden alırdı.
  sdkPromise ??= import("@/demo/copilot/mockSdk").catch((err) => {
    sdkPromise = null
    throw err
  })
  return sdkPromise
}
import { msalInstance, copilotStudioRequest } from "./msal"
import { isInteractionRequired, isSessionAlive, clearLocalSession } from "./sessionExpiry"
import { TOOL_TRACE, toolEventOf } from "./toolTracePolicy"
import { toolDocumentOf } from "./botFiles"

// DEMO: Copilot Studio yok — konuşmalar src/demo/copilot/mockSdk.js'ten.
const ENVIRONMENT_ID = "demo"

async function getToken() {
  const account = msalInstance.getActiveAccount()
  if (!account) throw new Error("No active account")
  try {
    const result = await msalInstance.acquireTokenSilent({ ...copilotStudioRequest, account })
    return result.accessToken
  } catch (err) {
    // Popup TEK bir durum için var: Copilot Studio kapsamı bu hesapta hiç
    // onaylanmamış ve onu almanın tek yolu bir istem. Eskiden HER hatada
    // çalışıyordu, yani süresi dolmuş bir oturum açıklama yerine popup
    // üretiyordu — kullanıcı mesajını gönderemiyor ve oturumunun düştüğünü
    // hiçbir yerden anlamıyordu.
    if (!isInteractionRequired(err)) throw err
    if (!(await isSessionAlive(msalInstance))) {
      // Onay sorunu değil: oturumun kendisi gitmiş. Ölü bir hesabın üstüne
      // kapsam istemek yerine yerel oturumu düşürüp giriş akışına
      // devrediyoruz (popup'ı üreten ve hiçbir yere çıkmayan yol buydu).
      await clearLocalSession(msalInstance)
      window.location.replace(`${import.meta.env.BASE_URL}login`)
      // Yönlendirme anında olmuyor; hiçbir çağıran belirteç geliyormuş gibi
      // devam etmesin.
      throw new Error("Session expired — signing in again", { cause: err })
    }
    const result = await msalInstance.acquireTokenPopup({ ...copilotStudioRequest, account })
    return result.accessToken
  }
}

/**
 * Belirteci SESSİZCE, ÖNCEDEN alır — ön-ısıtma için (bkz. warmStart.js).
 *
 * `getToken()`ten tek farkı POPUP AÇMAMASI, ve bu bilinçli: `getToken()` onayı
 * hiç verilmemiş bir kapsam için popup açabiliyor — orada doğru, çünkü
 * kullanıcı bir mesaj göndermiş ve bekliyor. Burada kullanıcı hiçbir şeye
 * basmadı; kendiliğinden açılan bir oturum penceresi, ısıtmanın kazandırdığı
 * saniyelerden çok daha pahalı olurdu. Başarısızlık YUTULUR ve karar VERİLMEZ:
 * `false` döner, normal yol kendi kararını kendi verir.
 *
 * Kazanılan şey MSAL'ın belirteç önbelleği: sohbet açıldığında
 * `acquireTokenSilent` ağ turu yapmadan döner.
 */
export async function prewarmToken() {
  const account = msalInstance.getActiveAccount()
  if (!account) return false
  try {
    await msalInstance.acquireTokenSilent({ ...copilotStudioRequest, account })
    return true
  } catch {
    return false
  }
}

export async function createCopilotClient(schemaName) {
  const { ConnectionSettings } = await loadSdk()
  const settings = new ConnectionSettings({
    environmentId: ENVIRONMENT_ID,
    schemaName,
  })
  return { settings }
}

// Bot Framework streaming protokolünde akış tipi ya `streaminfo` entity'sinde
// ya da (eski stil) channelData'da taşınır: "streaming" (token delta'ları),
// "informative" (ara DURUM güncellemesi — "Processing…", ilerleme kartı) ve
// "final" (nihai mesaj). SDK yalnızca "streaming"i özel işliyor; diğerlerini
// burada okuyoruz. (Doğrulandı: agents-copilotstudio-client entity+channelData'yı
// olduğu gibi geçirir; yalnızca streaming-text birikiminde activity.text'i yazar.)
function streamTypeOf(activity) {
  const ent = activity?.entities?.find((e) => e?.type === "streaminfo")
  return ent?.streamType ?? activity?.channelData?.streamType ?? null
}

// Maps a Bot Framework activity to our chunk shape. Captures text, card
// attachments AND suggestedActions (the quick-reply buttons menu-driven
// bots use, e.g. İşlemler / ERP / Jira) which live outside attachments.
function activityToChunk(activity) {
  // ARAÇ ÇAĞRISI — metni olmayan `event` aktivitesi.
  //
  // Orkestratör bir araç çalıştırdığında Copilot Studio bunu `event` olarak
  // yayınlıyor ve SDK bize veriyor (`default:` dalı her tipi yield ediyor).
  // Aşağıdaki `hasContent` kapısı metni/eki olmayan her şeye `null` dediği
  // için bugüne kadar SESSİZCE DÜŞÜYORLARDI — ekranda uydurma saat
  // basamakları dururken gerçek adımlar çöpe gidiyordu.
  //
  // Yalnız KİMLİĞİ olan event'ler geçer; ötekiler (istemci aracı çağrıları,
  // kanal olayları) eskisi gibi düşer.
  const tool = TOOL_TRACE.enabled ? toolEventOf(activity) : null
  // Aracın ürettiği belge (izin formu) — iz şalterinden BAĞIMSIZ: izi kapatmak
  // formu sessizce yok etmesin. Bkz. botFiles.
  const toolDoc = toolDocumentOf(activity)
  if (tool || toolDoc) {
    return {
      text: "",
      attachments: [],
      suggestedActions: [],
      // Balona hiçbir şey yazmaz; ChatScreen bunu izin kendi dalında işler.
      transient: true,
      streamType: null,
      final: false,
      done: false,
      tool,
      document: toolDoc,
    }
  }

  const suggested = activity?.suggestedActions?.actions || []
  const hasContent = activity?.text || activity?.attachments?.length || suggested.length
  if (!hasContent) return null
  // DEV: botun döndürdüğü kart-DIŞI attachment'ların gerçek şekli (dosya
  // indirme renderer'ını/auth'unu kesinleştirmek için). Prod'da çalışmaz.
  if (import.meta.env?.DEV) {
    const files = (activity?.attachments || []).filter(
      (a) => a?.contentType !== "application/vnd.microsoft.card.adaptive",
    )
    if (files.length) console.debug("[copilot] non-card attachments:", files)
  }
  const streamType = streamTypeOf(activity)
  // GEÇİCİ (transient) durum güncellemesi: agent flow çalışırken gelen
  // "informative" akış güncellemeleri ve streaming-DIŞI typing aktiviteleri
  // (Copilot'un "Processing…" / ilerleme kartı gönderdiği yer). Bunları nihai
  // içerik sanıp balona basMIYORUZ — Teams gibi yalnızca "yazıyor" göstergesini
  // koruyup gerçek yanıtı bekliyoruz. Yalnızca `message` aktiviteleri ve
  // "streaming" token birikimi görünür içerik üretir.
  const transient =
    streamType === "informative" || (activity?.type === "typing" && streamType !== "streaming")
  return {
    text: activity.text || "",
    attachments: activity.attachments || [],
    suggestedActions: suggested,
    transient,
    // Passed through so the UI can tell an "informative" status update — the
    // agent narrating its own work, which AgentActivity shows verbatim — from
    // the other transient traffic, which is just "still alive" and carries no
    // words worth repeating.
    streamType,
    // Akış protokolü: bot önce ara "typing" delta'ları, en sonda TEK bir
    // tamamlanmış "message" aktivitesi gönderir. `final` yalnızca bu son
    // (geçici-olmayan) mesajda true olur — iOS PWA'da bağlantı final gelmeden
    // koparsa ChatScreen yanıtın yarıda kesildiğini buradan anlar.
    final: activity?.type === "message" && !transient,
    done: false,
  }
}

// Konuşma kimliğini okur. Aktivite taşıyorsa oradan, yoksa SDK'nın kendi
// alanından: ID yalnızca handshake'i taşıyacak aktivite YOKKEN yanıt
// başlığında geldiği için ikisine de bakmak gerekiyor.
export function readConversationId(client, activity) {
  const fromActivity = activity?.conversation?.id
  if (fromActivity?.trim()) return fromActivity
  const internal = client?.conversationId
  return internal?.trim() ? internal : null
}

// Returns an async generator that yields text chunks as they stream in.
export async function* startConversation(schemaName) {
  const [token, { settings }, { CopilotStudioClient }] = await Promise.all([
    getToken(),
    createCopilotClient(schemaName),
    loadSdk(),
  ])
  const client = new CopilotStudioClient(settings, token)

  for await (const activity of client.startConversationStreaming()) {
    const chunk = activityToChunk(activity)
    if (chunk) yield chunk
  }
  yield {
    text: "",
    attachments: [],
    suggestedActions: [],
    done: true,
    client,
    conversationId: readConversationId(client),
  }
}

// Var olan bir konuşmaya BAĞLANIR — hiç ağ isteği yapmadan.
//
// Copilot Studio ajan tarafındaki bağlamı (konu durumu, değişkenler, önceki
// turlar) conversationId'ye karşı tutar; client'a kimliği vermek onu o
// konuşmanın üstüne oturtmaya yeter, çünkü sendActivityStreaming isteği zaten
// client'ın taşıdığı kimliğe gönderiyor.
//
// startConversationStreaming({ conversationId, emitStartConversationEvent:
// false }) ile DE devam ettirilebilir görünüyor ama ETMEYİN: o çağrı var olan
// bir konuşmada hiç aktivite üretmiyor, servis `end` olayı da göndermediği
// için SSE akışı açık kalıyor ve `for await` hiç bitmiyor — sohbet "yeni
// sekmede eski konuşma geliyor ama yazamıyorum" hâlinde kilitleniyor.
//
// Kimliğin sunucudaki ömrü belgelenmemiş olduğu için burada canlılık
// DOĞRULAMASI yapmıyoruz: konuşma ölmüşse bunu ilk gönderim söyler, çağıran da
// o noktada sıfırdan konuşma kurar.
export async function resumeConversation(schemaName, conversationId) {
  const [token, { settings }, { CopilotStudioClient }] = await Promise.all([
    getToken(),
    createCopilotClient(schemaName),
    loadSdk(),
  ])
  const client = new CopilotStudioClient(settings, token)
  // Alan TypeScript'te `private`, çalışma zamanında sıradan bir alan; SDK'nın
  // kendisi de handshake sırasında tam olarak böyle yazıyor.
  client.conversationId = conversationId
  return client
}

// Inline attachment limiti. Dosyalar activity'ye base64 data-URI olarak GÖMÜLÜR
// (ayrı bir DirectLine upload endpoint'i yok); base64 ham boyutu ~%33 şişirir ve
// Copilot Studio'nun direct-connection inline payload'ı ~1 MB civarında sorun
// çıkarmaya başlar. GÖRSELLER gönderimden önce otomatik küçültülüp sıkıştırılır
// (bkz. compressImageFile) — o yüzden büyük foto/ekran görüntüleri de sorunsuz
// geçer. Bu tavan yalnızca GÖRSEL-OLMAYAN dosyalar (PDF/Office vb.) için geçerli;
// onlar sıkıştırılamadığı için inline limite takılabilir, o durumda gönderim
// "bağlantı hatası" ile sonuçlanır. Tek yerden ayarlanır.
export const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024 // 6 MB (görsel-olmayan dosyalar)

// Görseller için pick-time ham boyut tavanı: yüksek tutulur çünkü gönderimden
// önce sıkıştırılacak. Tek amacı canvas'ı kilitleyebilecek absürt girdileri
// (ör. 50 MP RAW) elemek; tipik telefon fotoğrafları 2-8 MB.
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024 // 25 MB ham

// Yalnızca raster görselleri sıkıştırırız — SVG vektördür, GIF animasyonu kaybeder.
export function isCompressibleImage(file) {
  return /^image\/(jpe?g|png|webp|bmp)$/i.test(file?.type || "")
}

// Sıkıştırma hedefi: ham ~900 KB ⇒ base64'te ~1.2 MB — direct-connection inline
// tavanının güvenle altında. En uzun kenar 1600px'e indirilir; PNG (şeffaflık)
// önce PNG denenir, hâlâ büyükse JPEG'e düşülür; JPEG kalitesi hedefe inene
// kadar kademeli azaltılır.
const IMAGE_TARGET_BYTES = 900 * 1024
const IMAGE_MAX_DIM = 1600

export async function compressImageFile(file) {
  if (!isCompressibleImage(file)) return file
  let bitmap
  try {
    // imageOrientation:"from-image" → EXIF rotasyonunu uygular (telefon fotoğrafı).
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    return file // decode edilemezse orijinali bırak (boyut kontrolünden geçti zaten)
  }
  const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  const toBlob = (type, q) => new Promise((res) => canvas.toBlob(res, type, q))
  let blob = null
  if (/png/i.test(file.type)) {
    blob = await toBlob("image/png")
    if (blob && blob.size > IMAGE_TARGET_BYTES) blob = null // şeffaflık yoksa JPEG çok daha küçük
  }
  if (!blob) {
    for (const q of [0.82, 0.7, 0.6, 0.5]) {
      blob = await toBlob("image/jpeg", q)
      if (blob && blob.size <= IMAGE_TARGET_BYTES) break
    }
  }
  if (!blob || blob.size >= file.size) return file // sıkıştırma fayda etmediyse orijinal

  const ext = blob.type === "image/png" ? "png" : "jpg"
  const baseName = file.name.replace(/\.[^.]+$/, "")
  return new File([blob], `${baseName}.${ext}`, {
    type: blob.type,
    lastModified: file.lastModified,
  })
}

// Bir File'ı Copilot/Bot Framework attachment'ına çevirir:
// { contentType, name, contentUrl: "data:<mime>;base64,..." }. Bot tarafında
// System.Activity.Attachments üzerinden .Name / .Content olarak okunur.
// Görseller önce compressImageFile'dan geçer.
async function fileToAttachment(file) {
  const out = await compressImageFile(file)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error("read failed"))
    reader.onload = () =>
      resolve({
        contentType: out.type || "application/octet-stream",
        name: out.name,
        contentUrl: reader.result, // data:<mime>;base64,<...>
      })
    reader.readAsDataURL(out)
  })
}

// Birden çok File'ı paralel olarak wire attachment'larına çevirir.
export function filesToAttachments(files) {
  return Promise.all((files || []).map(fileToAttachment))
}

export async function* sendMessage(client, text, attachments = []) {
  const activity = { type: "message", text }
  if (attachments.length) activity.attachments = attachments
  for await (const reply of client.sendActivityStreaming(activity)) {
    const chunk = activityToChunk(reply)
    if (chunk) yield chunk
  }
  yield { text: "", attachments: [], suggestedActions: [], done: true }
}

export async function* sendAction(client, actionData) {
  const activity = { type: "message", value: actionData }
  for await (const reply of client.sendActivityStreaming(activity)) {
    const chunk = activityToChunk(reply)
    if (chunk) yield chunk
  }
  yield { text: "", attachments: [], suggestedActions: [], done: true }
}

// imBack/messageBack quick replies: imBack sends the title as a user message;
// messageBack/postBack send the value. Returns { kind, payload } for the caller.
export function resolveSuggestedAction(action) {
  if (action.type === "imBack" || action.type === "messageBack") {
    return { kind: "message", payload: action.value ?? action.title }
  }
  if (action.type === "postBack") {
    return { kind: "action", payload: action.value ?? action.title }
  }
  if (action.type === "openUrl") {
    return { kind: "url", payload: action.value }
  }
  return { kind: "message", payload: action.title }
}
