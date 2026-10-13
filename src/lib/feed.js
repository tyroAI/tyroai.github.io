import { graphGet, STATUS } from "@/lib/graph"
import { FEED, FEED_SOURCES, sourceForAddress } from "@/lib/feedPolicy"
import { cleanPreview } from "./feedPreview"
export { namesFromSubject, peopleRows } from "./feedPeople"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  GÜNDEM AKIŞI — MEKANİZMA (sorgu, sayfalama, normalleştirme)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Politika `feedPolicy.js`te (hangi kutu, kaç gönderi, hangi kalıp); burada
 * yalnız "nasıl": Graph sorgusu, `@odata.nextLink` takibi ve ham iletinin
 * ekranda kullanılabilir bir GÖNDERİYE çevrilmesi.
 *
 * ── SORGU: TEK TUR, DÖRT ADRES ─────────────────────────────────────────
 *
 * `/me/messages` bütün klasörleri kapsıyor — akış kullanıcının dosyalama
 * alışkanlığına bağlı olmamalı; duyuruyu arşivleyen biri de gündemi görmeli.
 * Dört adres tek `$filter` içinde `or` ile birleşiyor, yani sayfa başına BİR
 * ağ turu. Adres başına ayrı sorgu dört tur ve dört ayrı `nextLink` demekti.
 *
 * ⚠️ **`$filter` + `$orderby` BİRLİKTE REDDEDİLEBİLİR.** Graph bazı
 * kiracılarda bu ikiliye `InefficientFilter` diyor. Bir şema gecikmesinin
 * çalışan bir ekranı boş göstermesine izin vermeyen `authorizations.js`
 * (`notesAvailable`) deseninin aynısı burada da var: 400 gelince sorgu bir
 * alt biçimle tekrarlanıyor (`QUERY_VARIANTS` — `$orderby` ya da sabitleme
 * genişletmesi düşüyor) ve kabul edilen biçim oturum boyunca hatırlanıyor;
 * sırasız kipte sıralama istemcide yapılıyor. Bedeli açık ve yazılı: sırasız kipte
 * SAYFALAR arası sıra Graph'ın varsayılanına kalıyor (pratikte yine
 * `receivedDateTime desc`), yani "daha fazla" ile gelen sayfa teorik olarak
 * araya girebilir. Alternatif — hiç göstermemek — daha kötü.
 *
 * ── GÖRSELLER: CSP GEVŞETİLMİYOR ───────────────────────────────────────
 *
 * Postanın çerçevesi `img-src data:` ile geliyor (MailPopover'ın
 * `mailFrameDoc`u) ve bu kasıtlı: uzak bir `<img>` yüklemek, bültenlerdeki
 * 1×1 takip pikselini de yüklemek demek. Akış için o politika GEVŞETİLMEDİ.
 * Bunun yerine gömülü (`cid:`) ekler indirilip `data:` URL'e çevriliyor —
 * gerçek görsel geliyor, tek bir uzak istek çıkmıyor. UZAKTA barındırılan
 * görselli bir bülten yine boş kutu gösterir; bu bilinçli ve kullanıcıya
 * söylenmesi gereken bir sınır, sessizce gevşetilecek bir ayar değil.
 *
 * ⚠️ **`$top` SAYFA BOYUDUR, TAVAN DEĞİL.** Graph `nextLink` veriyor ve
 * `graphGet` mutlak URL'i olduğu gibi kabul ediyor (`graph.js`: "path mutlak
 * olabilir"). Yani "daha fazla göster" gerçekten bir sonraki sayfayı
 * istiyor; elde olanı kırpmıyor.
 */

/**
 * Feed sorgusunun istediği alanlar — fazlası boşuna bant genişliği. `internetMessageId`
 * beğeninin ve "Kaydet"in anahtarı: her alıcının kutusunda aynı (`lib/feedReactions.js`).
 */
const SELECT =
  "id,internetMessageId,subject,from,receivedDateTime,bodyPreview,hasAttachments,webLink,isRead,flag,importance"

/**
 * ── OUTLOOK İŞARETLERİ: SABİTLE · BAYRAK · ÖNEM (2026-09-30, istek) ─────
 *
 * *"Sabitlenmiş, bayrak eklediğimiz, yüksek önemde gelen maillerin
 * işaretlerini de yanlarında göster."* Bayrak (`flag.flagStatus`) ve önem
 * (`importance`) Graph'ın düz alanları — `$select`e eklemek yetiyor.
 *
 * ⚠️ **SABİTLEME DÜZ BİR ALAN DEĞİL.** Graph'ın `message` kaynağında
 * "pinned" diye bir özellik YOK. Outlook (web ve yeni Outlook) sabitlenen
 * iletinin MAPI `PR_RENEW_TIME` (`0x0F02`, SystemTime) özelliğini
 * **4500-09-01**e yazıyor, sabitleme kaldırılınca özelliği SİLİYOR
 * (Glen Scales, "Using OWA's Pin email feature using EWS"). Yani okunacak
 * şey genişletilmiş özellik: `$expand=singleValueExtendedProperties(...)`.
 * Yıl ≥ 4500 şartı, özelliğin sabitlemeden başka bir sebeple dolu olduğu
 * (gerçek bir yenileme zamanı taşıdığı) iletiyi sabitlenmiş saymasın diye.
 *
 * ⚠️ **GENİŞLETME REDDEDİLİRSE AKIŞ BOŞ KALMAZ.** `$filter` + `$orderby` +
 * `$expand` üçlüsü canlı kiracıda ÖLÇÜLEMEDİ (oturumsuz Graph çağrısı yok);
 * reddedilirse aşağıdaki `QUERY_VARIANTS` basamağı bir alt biçime iner.
 */
const PIN_PROP = "SystemTime 0x0F02"
const PIN_EXPAND = `singleValueExtendedProperties($filter=id eq '${PIN_PROP}')`

/**
 * ── SORGU BASAMAĞI: 400 GELİNCE NEYİ BIRAKACAĞIZ (2026-09-30) ──────────
 *
 * İki parça reddedilebilir: `$orderby` (`InefficientFilter`, yukarıda) ve
 * sabitleme genişletmesi. İlk sürüm 400'ü GÖRÜNCE hep genişletmeyi suçluyor
 * ve onu SEKME BOYUNCA kapatıyordu; oysa suçlu `$orderby` ise ikinci deneme
 * de 400 dönüyor, akış sırasız kipe iniyor ve sabitleme işareti hiç suçu
 * olmadığı hâlde oturumun geri kalanında kayboluyordu. Artık dört biçim
 * sırayla deneniyor ve ilk kabul edilen hatırlanıyor (`todo.js`in
 * `COMPLETED_QUERIES` deseni):
 *
 * | basamak | `$orderby` | sabitleme | neden bu sırada |
 * |---|---|---|---|
 * | 0 | var | var | tam sorgu |
 * | 1 | var | yok | sunucu sıralaması sayfalamanın doğruluğu, işaretten önemli |
 * | 2 | yok | var | suçlu `$orderby`sa işaret korunur |
 * | 3 | yok | yok | son çare — akış yine gelir |
 *
 * ⚠️ Basamak `+= 1` ile İNMEZ: iki etiketin sorgusu aynı anda reddedilirse
 * basamağı iki kez artırıp bir biçimi hiç denemeden atlardı (To Do'da
 * ölçülmüş hata). İnilen yer, denenenin bir altı.
 *
 * ⚠️ Bayrak ve önem DÜZ ALAN — hiçbir basamakta düşmüyor.
 */
const QUERY_VARIANTS = [
  { ordered: true, pins: true },
  { ordered: true, pins: false },
  { ordered: false, pins: true },
  { ordered: false, pins: false },
]
let variantStep = 0

/** Çıkışta (`clearFeedCache`) — bir sonraki oturum tam sorguyla başlasın. */
export function resetFeedQuery() {
  variantStep = 0
  markedStep = { pinned: 0, flagged: 0, high: 0 }
  skipFolders = null
  skipFoldersInflight = null
}

/** `SystemTime 0x0F02` → Graph dönüşte `0xf02` da yazabiliyor; ikisi de. */
const PIN_ID_RE = /^systemtime\s+0x0*f02$/i

/** Ham ileti Outlook'ta sabitlenmiş mi (gerekçe yukarıda). */
export function isPinnedMessage(message) {
  const prop = (message?.singleValueExtendedProperties ?? []).find((p) =>
    PIN_ID_RE.test(p?.id ?? ""),
  )
  const year = prop?.value ? new Date(prop.value).getUTCFullYear() : NaN
  return Number.isFinite(year) && year >= 4500
}

/** Ufkun başlangıcı — filtrenin İLK yan tümcesi (gerekçe `feedPolicy.js`). */
export function lookbackIso(now = new Date()) {
  const d = new Date(now)
  d.setMonth(d.getMonth() - FEED.lookbackMonths)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** OData dizge değeri: tek tırnak, içindeki tek tırnak ikilenir. */
function odataString(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

/**
 * Dört adresi (ya da tek etiketi) kapsayan `$filter`.
 *
 * ⚠️ Adres listesi BOŞSA sorgu hiç kurulmaz — `$filter` olmadan bu sorgu
 * kullanıcının BÜTÜN postasını akışa dökerdi.
 */
export function feedFilter(addresses) {
  const list = addresses.filter(Boolean)
  if (!list.length) return null
  return list.map((a) => `from/emailAddress/address eq ${odataString(a)}`).join(" or ")
}

/**
 * Türkçe duyarlı katlama — arama ve kalıp eşleşmesi için.
 *
 * `HelpPage` ve `data/prompts.js` aynı işi kendi içlerinde yapıyor ve bu
 * ÜÇÜNCÜ kopya. Ortak bir yardımcıya çıkarmak iki ilgisiz dosyayı bu işin
 * içine katardı; kopyanın bedeli bir gün üçünü birden düzeltmek, ve kural
 * üçünde de aynı yazılı: NFD'ye ayrıştır, birleşen işaretleri at, `ışğüöç`
 * ASCII'ye katlansın. ⚠️ Sınıf KAÇIŞ DİZİSİYLE yazılır — kaynağa çıplak
 * birleşen karakter koymak editörde bozulmaya açık kapıdır.
 */
export function foldTr(value) {
  return String(value ?? "")
    .replace(/[İI]/g, "i")
    .replace(/ı/g, "i")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
}

/** Katlanmış metinde kalıplardan biri geçiyor mu. */
export function matchesAny(text, patterns) {
  const hay = foldTr(text)
  return patterns.some((p) => hay.includes(foldTr(p)))
}

/**
 * Ham Graph iletisi → akış gönderisi.
 *
 * ⚠️ Kaynağı BULUNAMAYAN ileti `null` döner ve akışa girmez. Sunucu süzgeci
 * zaten dört adresle sınırlı; bu ikinci kapı, süzgecin bir gün gevşemesi
 * hâlinde kullanıcının özel postasının akışa sızmamasını garanti ediyor.
 * Biçim `toMailItem`in aynısı (tek kaynak); fark yalnız bu kapı.
 */
export function toPost(message) {
  if (!sourceForAddress(message?.from?.emailAddress?.address ?? "")) return null
  return toMailItem(message)
}

/** İlk sayfanın Graph yolu, verilen basamağın biçimiyle. */
function firstPagePath(filter, variant) {
  // ⚠️ SIRALANAN ÖZELLİK FİLTRENİN BAŞINDA. Graph, karmaşık bir filtreyi
  // başka bir özelliğe göre sıralamayı reddedebiliyor; `receivedDateTime`i
  // ilk yan tümce yapmak kabul edilen şekil. Ufuk ayrıca `nextLink`
  // zincirini sonlandırıyor (bkz. feedPolicy.lookbackMonths).
  const scoped = `receivedDateTime ge ${lookbackIso()} and (${filter})`
  const params = new URLSearchParams({
    $select: SELECT,
    $top: String(FEED.pageSize),
    $filter: scoped,
  })
  if (variant.ordered) params.set("$orderby", "receivedDateTime desc")
  if (variant.pins) params.set("$expand", PIN_EXPAND)
  return `/me/messages?${params.toString()}`
}

function toPage(res, ordered) {
  if (res.status !== STATUS.ready) {
    return {
      status: res.status,
      posts: [],
      nextLink: null,
      error: res.error,
      httpStatus: res.httpStatus,
    }
  }
  const posts = (res.data.value ?? []).map(toPost).filter(Boolean)
  // Sırasız kipte sayfa kendi içinde sıralanır; sayfalar arası sıra Graph'ın.
  if (!ordered) posts.sort((a, b) => (b.received?.getTime() ?? 0) - (a.received?.getTime() ?? 0))
  return { status: STATUS.ready, posts, nextLink: res.data["@odata.nextLink"] ?? null }
}

/**
 * Bir sayfa gönderi çeker.
 *
 * @param nextLink varsa doğrudan o sayfa istenir (ilk sayfa için `null`) —
 *   Graph'ın kendi adresi, biçimi ilk sayfanın basamağını taşıyor.
 * @param addresses süzülecek adresler (tek etiket seçiliyse tek elemanlı).
 * @returns `{ status, posts, nextLink }`
 */
export async function fetchFeedPage(instance, account, { nextLink, addresses } = {}) {
  if (nextLink) {
    const res = await graphGet(instance, account, { path: nextLink, scopes: ["Mail.Read"] })
    return toPage(res, QUERY_VARIANTS[variantStep].ordered)
  }

  const filter = feedFilter(addresses ?? FEED_SOURCES.map((s) => s.address))
  if (!filter) return { status: STATUS.ready, posts: [], nextLink: null }

  const last = QUERY_VARIANTS.length - 1
  for (let step = variantStep; ; step = Math.max(step + 1, variantStep)) {
    const variant = QUERY_VARIANTS[step]
    const res = await graphGet(instance, account, {
      path: firstPagePath(filter, variant),
      scopes: ["Mail.Read"],
    })
    // Yalnız 400 bir BİÇİM reddi; 401/403/5xx ve ağ hatası basamağı
    // indirmez — onlar sorgunun değil oturumun ya da sunucunun derdi.
    if (res.status === STATUS.error && res.httpStatus === 400 && step < last) {
      variantStep = Math.max(variantStep, step + 1)
      console.info(
        `[feed] sorgu reddedildi (sıralı: ${variant.ordered}, sabitleme: ${variant.pins}); bir alt biçim deneniyor:`,
        res.code ?? "",
        res.error ?? "",
      )
      continue
    }
    return toPage(res, variant.ordered)
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ÖNEMLİ — kimden gelirse gelsin işaretli postalar (2026-09-30)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Sahada: Outlook'ta sabitlenmiş (iki kişiden), bayraklı ve yüksek önemli
 * postalar Keşfet'te yoktu — çünkü Gündem yalnız altı KURUMSAL kutuyu okuyor.
 * Kullanıcının seçimi (2026-09-30): Gündem şirket duyurusu olarak KALIR, bu
 * postalar ayrı bir "Önemli" sekmesinde toplanır.
 *
 * ⚠️ **KAYNAK KAPISI BURADA YOK — BİLEREK.** `toPost` kurumsal olmayan
 * postayı AKIŞA sokmuyor (özel posta Gündem'e sızmasın); bu sekmenin işi tam
 * da kişinin kendi postası. Kapı yerine SORGU dar: yalnız üç işaretin biri
 * taşıyan ileti gelir, başka hiçbir şey.
 *
 * Üç ayrı sorgu (her biri basit ve tek başına anlamlı), kimliğe göre
 * birleşiyor. Her birinin kendi basamağı var ve kabul edilen biçim oturum
 * boyunca hatırlanıyor (`markedStep`, Gündem'in `QUERY_VARIANTS` deseni):
 *
 * | işaret | 1. biçim | yedek |
 * |---|---|---|
 * | bayraklı | son 12 ay, `flag/flagStatus eq 'flagged'`, sıralı | sırasız → genişletmesiz |
 * | yüksek önem | son 30 gün, `importance eq 'high'`, sıralı | sırasız (istemcide 30 güne süzülür) → genişletmesiz |
 * | sabitlenmiş | `PR_RENEW_TIME` (`SystemTime 0x0F02`) ≥ 4000 yılı | yalnız özelliğin VARLIĞI → gelen kutusunun son 50'si |
 *
 * ⚠️ **SABİTLEME SÜZGECİ BELGEDEN, AMA BU KİRACIDA DENENMEDİ.** Graph'ın
 * genişletilmiş özellik süzgeci `singleValueExtendedProperties/any(ep: ep/id
 * eq '…' and cast(ep/value, Edm.X) op değer)` biçiminde (belgenin
 * "numeric extended properties" örneği `Edm.Int32`); tarih için `Edm.DateTimeOffset`.
 * Outlook sabitlerken özelliği 4500-09-01'e yazıyor, kaldırınca SİLİYOR
 * (Glen Scales, "Using OWA's Pin email feature using EWS" — EWS'deki süzgeç
 * de `IsGreaterThan(0xF02, 4500-9-1)`). Reddedilirse varlık süzgecine, o da
 * reddedilirse gelen kutusunun son 50 iletisini tarayıp istemcide ayırmaya
 * iniliyor — son basamakta ESKİ sabitlenmişler görünmeyebilir ve sekme bunu
 * SÖYLÜYOR (`pinnedPartial`). Her basamakta sonuç `isPinnedMessage` ile
 * yeniden doğrulanıyor.
 *
 * ⚠️ **SEÇİLEN ALANLAR GÜNDEM'LE AYNI** (`SELECT`) — pencere ve kart aynı
 * nesneyi okuyor. Tavan tür başına 25 ileti.
 */
const MARKED_TOP = 25
const FLAGGED_MONTHS = 12
const HIGH_DAYS = 30
let markedStep = { pinned: 0, flagged: 0, high: 0 }

/**
 * ⚠️ **TASLAK, SİLİNMİŞ VE GEREKSİZ POSTA "SANA ÖZEL" DEĞİL** (2026-09-30,
 * sahada: *"konu yok maili önemli işaretlenmiş ama taslaklardaydı ve sildim,
 * yenileye bastım hâlâ geliyor"*). Sorgular `/me/messages`i — BÜTÜN posta
 * kutusunu — okuyor (Gündem'in kuralı: kuralla klasöre taşınan posta da
 * görünsün). Bedeli: yüksek önemli bir TASLAK "yüksek önem" grubuna düşüyor,
 * silinen posta da Silinmiş Öğeler'e taşındığı için sorguda KALIYORDU —
 * Yenile gerçekten sunucuya soruyordu, sunucu onu hâlâ döndürüyordu.
 *
 * Süzgeç İSTEMCİDE (`isDraft` + `parentFolderId`), sorguya bir yan tümce
 * eklemek yerine: işaretli sorguların `$filter`/`$orderby` basamakları
 * canlıda ölçülmedi ve yeni bir yan tümce `InefficientFilter` riskini
 * yeniden açardı. Bedeli sayfanın (`$top` 25) atılan satır kadar kısalması.
 *
 * Klasör kimlikleri iyi bilinen adlardan (`/me/mailFolders/{ad}`), oturumda
 * bir kez, SIRAYLA (posta kutusunun eşzamanlılık sınırı). Biri okunamazsa o
 * klasör süzülmez ama taslak süzgeci (`isDraft`) yine çalışır — liste düşmez.
 * ⚠️ Gönderilmiş Öğeler yalnız YÜKSEK ÖNEM grubundan çıkar: o grup "yüksek
 * önemle GELEN" demek, senin gönderdiğin posta sana gelmiş değil. Bayraklı ve
 * sabitli gönderilmiş posta KALIR — gönderdiği postaya takip bayrağı koymak
 * yaygın bir alışkanlık.
 */
const MARKED_SELECT = `${SELECT},isDraft,parentFolderId`
const SKIP_ALWAYS = ["drafts", "deleteditems", "junkemail"]
const SKIP_HIGH = ["sentitems"]
let skipFolders = null // { key, ids: Map(adı → kimlik) }
let skipFoldersInflight = null // { key, promise } — aynı anda iki okuma aynı turu bekler

function wellKnownFolderIds(instance, account) {
  const key = account?.homeAccountId ?? ""
  if (skipFolders?.key === key) return Promise.resolve(skipFolders.ids)
  if (skipFoldersInflight?.key === key) return skipFoldersInflight.promise
  const promise = (async () => {
    const ids = new Map()
    for (const name of [...SKIP_ALWAYS, ...SKIP_HIGH]) {
      const res = await graphGet(instance, account, {
        path: `/me/mailFolders/${name}?$select=id`,
        scopes: ["Mail.Read"],
        retry: 1,
      })
      if (res.status === STATUS.ready && res.data?.id) ids.set(name, res.data.id)
    }
    // Eksik okunan küme önbelleğe GİRMEZ: bir sonraki açılış yeniden sorsun.
    if (ids.size === SKIP_ALWAYS.length + SKIP_HIGH.length) skipFolders = { key, ids }
    return ids
  })().finally(() => {
    if (skipFoldersInflight?.promise === promise) skipFoldersInflight = null
  })
  skipFoldersInflight = { key, promise }
  return promise
}

/** Ham ileti bu türün listesine girer mi (taslak / atılacak klasör değil)? */
export function keepMarkedMessage(message, kind, folderIds) {
  if (message?.isDraft === true) return false
  const folder = message?.parentFolderId
  if (!folder || !folderIds?.size) return true
  const names = kind === "high" ? [...SKIP_ALWAYS, ...SKIP_HIGH] : SKIP_ALWAYS
  return !names.some((n) => folderIds.get(n) === folder)
}

/** Kaynak kapısı OLMADAN gönderi biçimi — kurumsal kutudan geliyorsa etiketi de. */
export function toMailItem(message) {
  if (!message?.id) return null
  const address = message.from?.emailAddress?.address ?? ""
  const source = sourceForAddress(address)
  const received = message.receivedDateTime ? new Date(message.receivedDateTime) : null
  return {
    id: message.id,
    messageId: message.internetMessageId ?? null,
    tag: source?.tag ?? null,
    accent: source?.accent ?? null,
    address: address.toLowerCase(),
    author: message.from?.emailAddress?.name?.trim() || address,
    subject: message.subject?.trim() || "",
    // Graph'ın 255 karakterlik özeti; boşluklar tek boşluğa indirilir, yoksa
    // HTML'den gelen satır sonları kartta üç satır yer kaplıyor.
    preview: cleanPreview(message.bodyPreview, message.subject),
    received,
    hasAttachments: Boolean(message.hasAttachments),
    webLink: message.webLink ?? null,
    isRead: Boolean(message.isRead),
    // Outlook işaretleri — `FeedMarks` çiziyor. Bayrak: `flagged` · `complete`
    // (işaretlenmemişse `null`); önem: `high` · `low` (normalse `null`).
    pinned: isPinnedMessage(message),
    flag: ["flagged", "complete"].includes(message.flag?.flagStatus)
      ? message.flag.flagStatus
      : null,
    importance: ["high", "low"].includes(message.importance) ? message.importance : null,
  }
}

function sinceIso({ months = 0, days = 0 }) {
  const d = new Date()
  if (months) d.setMonth(d.getMonth() - months)
  if (days) d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

const PIN_BY_VALUE = `singleValueExtendedProperties/any(ep:ep/id eq '${PIN_PROP}' and cast(ep/value, Edm.DateTimeOffset) ge 4000-01-01T00:00:00Z)`
const PIN_BY_PRESENCE = `singleValueExtendedProperties/any(ep:ep/id eq '${PIN_PROP}')`

/** Türün basamakları: `{ path, params, orderedBy?, keep? }` — `keep` istemci süzgeci. */
function markedLadder(kind) {
  if (kind === "flagged") {
    const since = sinceIso({ months: FLAGGED_MONTHS })
    return [
      {
        params: {
          $filter: `receivedDateTime ge ${since} and flag/flagStatus eq 'flagged'`,
          $orderby: "receivedDateTime desc",
          $expand: PIN_EXPAND,
        },
      },
      { params: { $filter: "flag/flagStatus eq 'flagged'", $expand: PIN_EXPAND } },
      { params: { $filter: "flag/flagStatus eq 'flagged'" } },
    ]
  }
  if (kind === "high") {
    const since = sinceIso({ days: HIGH_DAYS })
    const recent = (m) => m.received && m.received.toISOString() >= since
    return [
      {
        params: {
          $filter: `receivedDateTime ge ${since} and importance eq 'high'`,
          $orderby: "receivedDateTime desc",
          $expand: PIN_EXPAND,
        },
      },
      { params: { $filter: "importance eq 'high'", $expand: PIN_EXPAND }, keep: recent },
      { params: { $filter: "importance eq 'high'" }, keep: recent },
    ]
  }
  return [
    { params: { $filter: PIN_BY_VALUE, $expand: PIN_EXPAND }, keep: (m) => m.pinned },
    { params: { $filter: PIN_BY_PRESENCE, $expand: PIN_EXPAND }, keep: (m) => m.pinned },
    {
      path: "/me/mailFolders/inbox/messages",
      params: { $orderby: "receivedDateTime desc", $expand: PIN_EXPAND },
      top: 50,
      keep: (m) => m.pinned,
      partial: true,
    },
  ]
}

async function fetchMarked(instance, account, kind, folderIds) {
  const ladder = markedLadder(kind)
  const last = ladder.length - 1
  for (let step = markedStep[kind]; ; step = Math.max(step + 1, markedStep[kind])) {
    const rung = ladder[step]
    const params = new URLSearchParams({
      $select: MARKED_SELECT,
      $top: String(rung.top ?? MARKED_TOP),
      ...rung.params,
    })
    const res = await graphGet(instance, account, {
      path: `${rung.path ?? "/me/messages"}?${params.toString()}`,
      scopes: ["Mail.Read"],
      retry: 2,
    })
    // Yalnız 400 bir BİÇİM reddi (Gündem'in kuralı); gerisi oturumun ya da
    // sunucunun derdi ve basamak inmez.
    if (res.status === STATUS.error && res.httpStatus === 400 && step < last) {
      markedStep = { ...markedStep, [kind]: Math.max(markedStep[kind], step + 1) }
      console.info(
        `[feed] önemli/${kind} sorgusu reddedildi (basamak ${step}); bir alt biçim deneniyor:`,
        res.code ?? "",
        res.error ?? "",
      )
      continue
    }
    if (res.status !== STATUS.ready) return { status: res.status, items: [] }
    // ⚠️ "DAHA FAZLASI OLABİLİR" (`capped`): sunucu sayfayı DOLU döndürdüyse ya da
    // bir sonraki sayfanın adresini verdiyse liste eksik olabilir — Sana özel
    // sayıyı "25+" yazar, "en eskisi" demez. Taslak/klasör süzgecinden ÖNCEKİ
    // boyla: sunucunun sayfası dolu mu, ona bakılıyor. Son basamak (gelen
    // kutusunun son 50'si) zaten kendi notunu taşıyor (`pinnedPartial`).
    const capped =
      !rung.partial &&
      (Boolean(res.data?.["@odata.nextLink"]) ||
        (res.data?.value?.length ?? 0) >= (rung.top ?? MARKED_TOP))
    let items = (res.data.value ?? [])
      .filter((m) => keepMarkedMessage(m, kind, folderIds))
      .map(toMailItem)
      .filter(Boolean)
    if (rung.keep) items = items.filter(rung.keep)
    return { status: STATUS.ready, items, partial: Boolean(rung.partial), capped }
  }
}

/**
 * Önemli sekmesinin postaları. Dönen: `{ status, items, missing, pinnedPartial }`
 * — `missing` okunamayan işaret türleri (sekme SÖYLÜYOR), `pinnedPartial`
 * sabitlenmişlerin yalnız son 50 iletiden okunduğu.
 *
 * ⚠️ Üç sorgu AYNI ANDA değil, sırayla: aynı posta kutusuna uygulama başına
 * dört eşzamanlı istek sınırı var ve Keşfet o sırada Gündem'i ve kapak
 * görsellerini de okuyor (To Do'nun dokuzuncu turdaki dersi).
 */
export async function fetchImportantMail(instance, account) {
  const kinds = ["pinned", "flagged", "high"]
  const folderIds = await wellKnownFolderIds(instance, account)
  const results = []
  for (const kind of kinds)
    results.push({ kind, ...(await fetchMarked(instance, account, kind, folderIds)) })
  const ok = results.filter((r) => r.status === STATUS.ready)
  if (!ok.length) {
    const denied = results.find((r) => r.status === STATUS.denied)
    return {
      status: denied ? STATUS.denied : (results[0]?.status ?? STATUS.error),
      items: [],
      missing: kinds,
      capped: {},
    }
  }
  const byId = new Map()
  for (const r of ok) {
    for (const item of r.items) {
      const prev = byId.get(item.id)
      // Aynı ileti iki sorguda da gelebilir (sabitli VE bayraklı); işaretler
      // BİRLEŞİR — genişletmesiz basamaktan gelen kopya sabitlemeyi bilmiyor.
      byId.set(item.id, prev ? { ...prev, pinned: prev.pinned || item.pinned } : item)
    }
  }
  const items = [...byId.values()].sort(
    (a, b) => (b.received?.getTime() ?? 0) - (a.received?.getTime() ?? 0),
  )
  return {
    status: STATUS.ready,
    items,
    missing: results.filter((r) => r.status !== STATUS.ready).map((r) => r.kind),
    pinnedPartial: Boolean(results.find((r) => r.kind === "pinned")?.partial),
    capped: Object.fromEntries(ok.map((r) => [r.kind, Boolean(r.capped)])),
  }
}

/**
 * AKIŞIM ZAMAN ÇİZGİSİ — kurumsal duyurular + "Sana özel" (işaretli) postalar,
 * tarih-saat sırasıyla (istek, 2026-09-30: *"Akışım sekmesinde sana özel
 * sekmesindekileri de gösterelim, takvim tarih saat sıralamasına göre"*).
 *
 * ⚠️ **AYNI İLETİ İKİ KEZ ÇİZİLMEZ.** Bayrak koyulmuş bir kurumsal duyuru
 * hem akışta hem işaretlilerde geliyor; akıştaki kopyası kalır (işaretlerini
 * zaten taşıyor).
 * ⚠️ **SAYFA SINIRI.** Akış sayfalı (`hasMore`): yüklenen en eski duyurudan
 * ESKİ bir işaretli posta şimdilik GİRMEZ, yoksa listenin dibinde durur ve
 * "daha fazla"ya her basışta yukarı kayardı. Akış bitince hepsi girer.
 * ⚠️ Kurumsal kutudan gelmeyen her ek `personal` işaretini taşır — kart onu
 * "Sana özel" diye etiketliyor ve kapak görseli aramıyor.
 */
export function mergeTimeline(posts, marked, { hasMore = false } = {}) {
  if (!marked?.length) return posts
  const seen = new Set(posts.map((p) => p.id))
  const time = (p) => p.received?.getTime() ?? 0
  const floor = hasMore && posts.length ? Math.min(...posts.map(time)) : -Infinity
  const extra = []
  for (const m of marked) {
    if (seen.has(m.id) || time(m) < floor) continue
    extra.push(m.tag ? m : { ...m, personal: true })
  }
  if (!extra.length) return posts
  return [...posts, ...extra].sort((a, b) => time(b) - time(a))
}

/** Önemli sekmesinden `?post=` ile açılan ve listede bulunamayan ileti. */
export async function fetchMailById(instance, account, id) {
  const res = await graphGet(instance, account, {
    path: `/me/messages/${encodeURIComponent(id)}?$select=${SELECT}&$expand=${encodeURIComponent(PIN_EXPAND)}`,
    scopes: ["Mail.Read"],
  })
  if (res.status === STATUS.error && res.httpStatus === 400) {
    const plain = await graphGet(instance, account, {
      path: `/me/messages/${encodeURIComponent(id)}?$select=${SELECT}`,
      scopes: ["Mail.Read"],
    })
    return plain.status === STATUS.ready ? toMailItem(plain.data) : null
  }
  return res.status === STATUS.ready ? toMailItem(res.data) : null
}

/**
 * TEK bir gönderi — `?post=<id>` ile gelip listede bulunamayınca.
 *
 * ⚠️ Sayfa yenilendiğinde açık pencere adreste duruyor ama gönderi henüz
 * yüklenmemiş olabilir (üçüncü sayfadaysa). Bulunamayan bir kimlikte pencere
 * sessizce açılmıyordu — tıklanabilir ama hiçbir şey yapmayan bir adres.
 *
 * ⚠️ **BU BAĞLANTI BAŞKASINA GÖNDERİLEMEZ ve bu Graph'ın yapısı.** İleti
 * kimlikleri POSTA KUTUSUNA ÖZEL: aynı duyuru herkesin kutusunda başka bir
 * `id` taşıyor. Yani `?post=` yalnız kendi oturumunda anlamlı; başkasına
 * gönderilen bağlantı onun akışını açar, o gönderiyi değil. Paylaşmanın yolu
 * "Outlook'ta aç" bağlantısı.
 */
export async function fetchPostById(
  instance,
  account,
  id,
  { pins = QUERY_VARIANTS[variantStep].pins } = {},
) {
  const expand = pins ? `&$expand=${encodeURIComponent(PIN_EXPAND)}` : ""
  const res = await graphGet(instance, account, {
    path: `/me/messages/${encodeURIComponent(id)}?$select=${SELECT}${expand}`,
    scopes: ["Mail.Read"],
  })
  // Tek iletide genişletme reddedilirse YALNIZ bu okuma işaretsiz tekrarlanır;
  // akışın basamağı tek bir iletinin cevabıyla inmez.
  if (res.status === STATUS.error && res.httpStatus === 400 && pins) {
    return fetchPostById(instance, account, id, { pins: false })
  }
  if (res.status !== STATUS.ready) return null
  return toPost(res.data)
}

/**
 * Akıştaki gönderilerden SAĞ RAYIN kişi panellerini türetir.
 *
 * ⚠️ Ad `derivePeople` DEĞİL: `lib/derivePeople.js` zaten var ve BAŞKA bir iş
 * yapıyor (toplantı/posta kişilerinden alıcı listesi). İki ayrı kavrama aynı
 * adı vermek, ikisini de arayan kişiyi yanlış dosyaya götürürdü.
 *
 * ⚠️ Bu bir DİZİN SORGUSU DEĞİL, aynı akışa bakan bir mercek — gerekçesi
 * `feedPolicy.js`te (dizin `User.Read.All` isterdi, `birthday` alanı çoğu
 * hesapta boş). Gösterilen şey İK'nın kendi duyurusu; kart o duyuruyu açıyor.
 *
 * ⚠️ Kalıp tutmazsa BOŞ dizi döner ve panel HİÇ çizilmez. "Yeni katılan yok"
 * yazmak, duyurunun nasıl yazıldığını bilmediğimiz hâlde kimsenin
 * katılmadığını iddia etmek olurdu.
 */
export function deriveHighlights(posts, kind, now = Date.now()) {
  const cfg = FEED.people
  const patterns = kind === "birthday" ? cfg.birthdayPatterns : cfg.joinerPatterns
  const days = kind === "birthday" ? cfg.birthdayDays : cfg.joinerDays
  const since = now - days * 24 * 60 * 60 * 1000
  return (
    posts
      // ⚠️ YALNIZ İK KUTUSU. Kalıp bütün akışta arandığında "aramıza hoş
      // geldin" geçen bir HABER bülteni ya da bir eğitim duyurusu "yeni
      // katılanlar" panelinde beliriyordu — panelin iddiası İK'nın kendi
      // duyurusu olması ve başka kanaldan gelen bir satır o iddiayı bozuyor.
      .filter((p) => p.tag === "ik")
      .filter((p) => p.received && p.received.getTime() >= since)
      .filter((p) => matchesAny(`${p.subject} ${p.preview}`, patterns))
      .slice(0, cfg.limit)
  )
}

/**
 * Akışta arama: konu + özet, katlanmış metin, kelimeler AND'lenir.
 *
 * AND kuralı `HelpPage`in aramasıyla aynı ve aynı gerekçeyle: "eğitim
 * duyurusu" daralsın, iki katı sonuç getirmesin.
 */
export function searchPosts(posts, query) {
  const words = foldTr(query).split(/\s+/).filter(Boolean)
  if (!words.length) return posts
  return posts.filter((p) => {
    const hay = foldTr(`${p.subject} ${p.preview} ${p.author}`)
    return words.every((w) => hay.includes(w))
  })
}
