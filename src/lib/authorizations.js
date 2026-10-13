import { apiAll, dvApi } from "./dataverse"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  YETKİ TABLOLARI — okuma katmanı
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İki Dataverse tablosu (TYRO ortamı, `TYROAIPlatform` solution'ı):
 *
 *   tyro_authorizedapp   kullanıcı başına TEK satır — hangi app'leri
 *                        açabildiği ve yönetici olup olmadığı.
 *                        `tyro_useremail` üzerinde alternate key var, yani
 *                        tekillik SUNUCUDA zorlanıyor.
 *   tyro_requestapp      kullanıcı başına ÇOK satır — her satır bir app
 *                        talebi. Anahtar YOK, tekrar serbest.
 *
 * ⚠️ **`tyro_useremail` GİRİŞ ADRESİDİR (UPN), posta adresi DEĞİL.**
 * Ölçüldü (2026-09-17, TYRO dizini): 801 aktif kullanıcının 237'sinde ikisi
 * farklı — giriş adresi şirket alanındayken posta adresi bir iştirakin
 * alanında olabiliyor. MSAL oturumdan
 * `account.username` olarak UPN veriyor, yani eşleşme ancak UPN ile tutar.
 * Posta adresine göre kurulmuş bir satır o kişiyi SESSİZCE yetkisiz yapar:
 * hata çıkmaz, kullanıcı yalnızca hiçbir şey göremez.
 *
 * ⚠️ Kolonun ARAYÜZDEKİ adı "User Email" — bu bilinçli bir kullanıcı kararı
 * (2026-09-17). Taşıdığı değer yine UPN'dir; kolonun Dataverse açıklaması da
 * bunu yazar. Ad ile içerik arasındaki bu fark buradaki tek tuzaktır.
 */

const AUTH_SET = "tyro_authorizedapps" // entity-set adı (çoğul)
const REQ_SET = "tyro_requestapps"

/** App listesinin ayracı. Tek satırda yönetilebilsin diye metin alanı. */
export const APP_SEPARATOR = ";"

/**
 * `"TYRO Trader;Power BI"` → `["TYRO Trader", "Power BI"]`.
 * Boş parçalar düşer: sondaki ayraç ya da çift ayraç bir app sayılmamalı.
 */
export function parseApps(value) {
  if (!value) return []
  return String(value)
    .split(APP_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** OData string literalinde tek tırnak iki tırnakla kaçırılır. */
function odataQuote(value) {
  return String(value ?? "").replace(/'/g, "''")
}

const AUTH_SELECT = ["tyro_authorizedappid", "tyro_useremail", "tyro_apps", "tyro_isadmin"].join(
  ",",
)

const REQ_BASE_COLUMNS = [
  "tyro_requestappid",
  "tyro_useremail",
  "tyro_requestedapp",
  "tyro_iscompleted",
  "createdon",
]

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  NOT KOLONLARI — şemadan ÖNCE gönderilebilir
 * ═══════════════════════════════════════════════════════════════════════
 *
 * `tyro_usernote` talebi açan kişinin gerekçesi, `tyro_adminnote` yöneticinin
 * cevabı. İkisi AYRI kolon, tek bir "açıklama" değil: biri kullanıcının
 * yazdığı ve yöneticinin okuduğu, diğeri yöneticinin yazdığı ve kullanıcının
 * okuduğu metin. Tek alanda tutmak, ikisinden birinin diğerini ezmesi
 * demekti — üstelik kimin yazdığı da kaybolurdu.
 *
 * ⚠️ **KOLONLAR ORTAMDA YOKKEN DE ÇALIŞIR.** Bu sürüm kolonlardan önce
 * yayına çıkabilir: olmayan bir kolonu `$select` etmek Dataverse'te 400
 * verir ve TÜM talep listesini düşürürdü — yani şema gecikmesi, çalışan bir
 * ekranı boş gösterirdi. İlk 400'de kolon adı yanıtta geçiyorsa bayrak
 * kapanır, sorgu notlarsız tekrarlanır ve oturum boyunca öyle devam eder.
 * Kolonlar açıldığında bir sonraki oturum kendiliğinden notlu moda döner —
 * geri alınacak bir şey yok.
 */
const REQ_NOTE_COLUMNS = ["tyro_usernote", "tyro_adminnote"]

let notesAvailable = true

/** Not kolonları hâlâ elimizdeyken mi çalışıyoruz — arayüz "not alanı
 *  gösterilsin mi" kararını buradan okur. */
export function areNotesAvailable() {
  return notesAvailable
}

function reqSelect() {
  const cols = notesAvailable ? [...REQ_BASE_COLUMNS, ...REQ_NOTE_COLUMNS] : REQ_BASE_COLUMNS
  return cols.join(",")
}

/** 400'ün gövdesinde kolon adı geçiyorsa şema henüz gelmemiş demektir.
 *  Başka bir 400'ü (kötü filtre, kötü GUID) yutmamak için ad aranıyor. */
function isMissingNoteColumn(err) {
  const msg = String(err?.message ?? "")
  return REQ_NOTE_COLUMNS.some((c) => msg.includes(c))
}

/** Notlu dener, kolon yoksa bayrağı düşürüp notsuz tekrarlar. */
/**
 * Notlu dener, kolon yoksa bayrağı düşürüp notsuz tekrarlar.
 *
 * ⚠️ `apiAll` — talep tablosu satır sayısı bakımından yetki tablosundan
 * HIZLI büyüyor (kişi başına tek satır değil, her talep bir satır), yani
 * 5000 sınırına önce burası dayanır. Tek sayfalık `dvApi` ile bırakmak,
 * en çok büyüyen tabloyu sessizce kırpmak olurdu.
 */
async function reqQuery(build) {
  try {
    return await apiAll(build(reqSelect()))
  } catch (err) {
    if (notesAvailable && isMissingNoteColumn(err)) {
      notesAvailable = false
      return apiAll(build(reqSelect()))
    }
    throw err
  }
}

function toAuthorization(r) {
  return {
    id: r.tyro_authorizedappid,
    upn: r.tyro_useremail ?? "",
    apps: parseApps(r.tyro_apps),
    isAdmin: r.tyro_isadmin === true,
  }
}

function toRequest(r) {
  return {
    id: r.tyro_requestappid,
    upn: r.tyro_useremail ?? "",
    app: r.tyro_requestedapp ?? "",
    isCompleted: r.tyro_iscompleted === true,
    createdOn: r.createdon ?? null,
    // Boş dize ile `null` arasındaki fark burada taşınmıyor: ikisi de
    // "not yok" demek ve arayüzün ayırması gereken bir şey değil.
    userNote: r.tyro_usernote ?? "",
    adminNote: r.tyro_adminnote ?? "",
  }
}

/** Bütün yetki satırları, giriş adresine göre sıralı. */
/**
 * Bütün yetki satırları, giriş adresine göre sıralı.
 *
 * ⚠️ `apiAll` — sayfa sınırını AŞARSA takip eder. Dataverse 5000'de
 * kesiyor; bugün ~800 satır var ama bu bir ERİŞİM listesi ve eksik
 * göstermesi, yöneticinin var olan bir kaydı yok sanıp ikincisini açmaya
 * çalışması demek (alternate key onu 412 ile reddeder ve sebebi görünmez).
 */
export async function fetchAuthorizations() {
  const data = await apiAll(`/${AUTH_SET}?$select=${AUTH_SELECT}&$orderby=tyro_useremail asc`)
  return (data?.value ?? []).map(toAuthorization)
}

/**
 * Bütün talepler, EN YENİ ÖNCE. Sıra `createdon`dan geliyor — ayrı bir
 * "talep tarihi" kolonu açmadık, Dataverse zaten her kayda bu damgayı
 * yazıyor ve ikinci bir tarih alanı aynı bilgiyi iki yerde tutmak olurdu.
 */
export async function fetchRequests() {
  const data = await reqQuery((sel) => `/${REQ_SET}?$select=${sel}&$orderby=createdon desc`)
  return (data?.value ?? []).map(toRequest)
}

/**
 * Tek kullanıcının yetki satırı — yönetici kapısı bunu okur.
 *
 * Sorgu SUNUCUDA süzülür (`$filter`), bütün tabloyu çekip istemcide aramaz:
 * kapı her mount'ta çalışıyor ve tablo zamanla büyüyecek. `$top=1` çünkü
 * alternate key tekilliği zaten garanti ediyor.
 *
 * @returns {Promise<object|null>} satır yoksa `null` — "kayıtlı değil".
 */
export async function fetchAuthorizationFor(upn) {
  const key = odataQuote(upn)
  if (!key) return null
  const data = await dvApi(
    `/${AUTH_SET}?$select=${AUTH_SELECT}&$filter=tyro_useremail eq '${key}'&$top=1`,
  )
  const row = (data?.value ?? [])[0]
  return row ? toAuthorization(row) : null
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  YAZMA — yalnız iki alan
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Yönetim sayfasının değiştirebildiği üç şey: bir kullanıcının app listesi,
 * yöneticilik bayrağı ve bir talebin tamamlandı bayrağı.
 *
 * Kullanıcı adının kendisi (`tyro_useremail`) BİLEREK yazılabilir değil —
 * o bir kimlik ve üzerinde tekillik anahtarı var; ekrandan düzeltilebilir
 * olsaydı bir harf hatası kişiyi sessizce başka biri yapardı.
 *
 * ⚠️ **YÖNETİCİLİKTE TEK KURAL: KİŞİ KENDİNİNKİNİ KALDIRAMAZ** (kapı
 * `AuthorizationsPage`te). Kaldırabilseydi tek tıkla bu sayfaya bir daha
 * giremez ve geri almak maker portal gerektirirdi. Başkasınınki
 * kaldırılabildiği için kural kimseyi kilitlemiyor; yan etkisi de faydalı —
 * en az bir yönetici her zaman ayakta kalır.
 */

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  YETKİ SATIRI — oluştur · kimliği düzelt · sil
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **SATIR AÇMAK ARTIK EKRANDAN YAPILIYOR** (2026-09-17, istek üzerine).
 * Önce yalnız `approveRequest` satır açabiliyordu, yani bir kişiye yetki
 * vermek için önce ONUN talep açmasını beklemek gerekiyordu. Yeni gelen
 * birine peşin yetki vermenin yolu yoktu.
 *
 * ⚠️ **TEKİLLİK SUNUCUDA.** `tyro_useremail` üzerinde alternate key var;
 * aynı adresle ikinci satır Dataverse tarafından reddedilir. İstemcide
 * ayrıca kontrol ETMİYORUZ — iki istemci aynı anda yazarsa istemci
 * kontrolü zaten geç kalır, sunucununki kalmaz. Hata `DV_DUPLICATE_UPN`
 * koduyla yukarı çıkar ki arayüz "bu kişinin zaten satırı var" diyebilsin.
 */

/** Dataverse'in tekillik ihlali yanıtı — arayüz bunu ayrı bir cümleye
 *  çevirebilsin diye kendi kodunu taşıyor. */
export const DV_DUPLICATE_UPN = "duplicate-upn"

function asDuplicate(err) {
  const msg = String(err?.message ?? "")
  // ⚠️ **DURUM KODU BAŞTAN EŞLEŞİR, GÖVDEDEN DEĞİL.** Önce `msg.includes("412")`
  // yazılmıştı ve bu yanlıştı: hata metni `Dataverse <durum>: <gövde>` ve
  // gövdede GUID'ler var — `...aaad-7ced8d412...` gibi bir kayıt kimliği
  // içinde "412" geçtiği an alakasız bir hata "bu kişinin zaten kaydı var"
  // diye gösterilirdi. `dvApi`nin ürettiği önek sabit, onu bağlıyoruz.
  //
  // Dataverse tekillik ihlalini duruma göre 412 ya da 400 + `duplicate`
  // metniyle döndürüyor; ikisi de burada.
  const isPrecondition = /^Dataverse 412:/.test(msg)
  const saysDuplicate = /duplicate|0x80040237|0x8004025[0-9a-f]/i.test(msg)
  if (isPrecondition || saysDuplicate) {
    const e = new Error(msg)
    e.code = DV_DUPLICATE_UPN
    e.cause = err
    return e
  }
  return err
}

/**
 * Yeni yetki satırı. `upn` zorunlu ve KIRPILIR; app listesi boş olabilir
 * (yetkisi olmayan ama yönetici olan bir kayıt anlamlı).
 */
export async function createAuthorization({ upn, apps = [], isAdmin = false }) {
  const key = String(upn ?? "").trim()
  if (!key) throw new Error("UPN bos olamaz")
  try {
    const row = await dvApi(`/${AUTH_SET}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        tyro_useremail: key,
        tyro_apps: apps.length ? apps.join(APP_SEPARATOR) : null,
        tyro_isadmin: Boolean(isAdmin),
      }),
    })
    return row ? toAuthorization(row) : null
  } catch (err) {
    throw asDuplicate(err)
  }
}

/**
 * Satırın KİMLİĞİNİ değiştirir.
 *
 * ⚠️ **BU SATIRIN SAHİBİNİ DEĞİŞTİRİR, bir yazım düzeltmesi değil.** Uzun
 * süre bilinçli olarak yazılamaz tutuldu (bir harf hatası kişiyi sessizce
 * başka biri yapar). 2026-09-17'de açıldı, çünkü satır açmak da ekrana
 * geldi: yanlış yazılmış bir UPN'i düzeltmenin tek yolu sil-yeniden-aç
 * olurdu ve o yol yetkiyi ve yöneticilik bayrağını da beraberinde siler.
 * Arayüz bunu ayrı bir onayla soruyor — kimlik alanı, ad alanı değil.
 */
export async function updateAuthorizationUpn(id, upn) {
  const key = String(upn ?? "").trim()
  if (!key) throw new Error("UPN bos olamaz")
  try {
    await dvApi(`/${AUTH_SET}(${id})`, {
      method: "PATCH",
      body: JSON.stringify({ tyro_useremail: key }),
    })
  } catch (err) {
    throw asDuplicate(err)
  }
}

/**
 * Satırı siler.
 *
 * ⚠️ Kişinin TALEPLERİ silinmez — onlar ayrı tablo ve ayrı bir kayıt: kimin
 * ne istediği, yetkisi kaldırıldığında da tarihin parçası. Talep listesi
 * zaten kendi sekmesinden temizlenebiliyor.
 *
 * "Kendi satırını silememe" kuralı ÇAĞIRANDA (`useAuthorizationsAdmin`),
 * yöneticilik bayrağındaki kuralla aynı yerde — veri katmanının oturumdan
 * haberi yok.
 */
export async function deleteAuthorization(id) {
  await dvApi(`/${AUTH_SET}(${id})`, { method: "DELETE" })
}

/** Seçilen app adlarını `;` ile birleştirip yazar. Boş seçim alanı
 *  gerçekten BOŞALTIR (`null`), boş dize bırakmaz — aradaki fark
 *  "app atanmamış" ile "bir şey yazılmış ama boş" ayrımıdır. */
export async function updateAuthorizedApps(id, apps) {
  const value = apps.length ? apps.join(APP_SEPARATOR) : null
  await dvApi(`/${AUTH_SET}(${id})`, {
    method: "PATCH",
    body: JSON.stringify({ tyro_apps: value }),
  })
}

/**
 * Yöneticinin cevabı. Boş kutu alanı gerçekten BOŞALTIR (`null`) — "not
 * yazılmamış" ile "yazılmış ama silinmiş" ayrımı tutulmuyor, çünkü ekranda
 * ikisi de aynı şeyi söylerdi.
 *
 * ⚠️ Kolon yoksa SESSİZ DÜŞMEZ, hata fırlatır: okuma tarafı notsuz çalışmaya
 * devam edebilir ama yöneticinin YAZDIĞI bir notu yutmak, yazdığını sanan
 * birini yanıltmak olurdu.
 */
export async function setRequestAdminNote(id, note) {
  const value = String(note ?? "").trim()
  await dvApi(`/${REQ_SET}(${id})`, {
    method: "PATCH",
    body: JSON.stringify({ tyro_adminnote: value || null }),
  })
}

/** Talebin tamamlandı bayrağı. */
export async function setRequestCompleted(id, completed) {
  await dvApi(`/${REQ_SET}(${id})`, {
    method: "PATCH",
    body: JSON.stringify({ tyro_iscompleted: Boolean(completed) }),
  })
}

/**
 * Bir app için talep oluşturur. Aynı kullanıcının aynı app için AÇIK
 * (tamamlanmamış) talebi varsa ikincisi yazılmaz — kilitli karta iki kez
 * basmak talep kuyruğunu şişirmemeli.
 *
 * @returns {Promise<{created: boolean}>} `false` → zaten açık talebi vardı.
 */
export async function createRequest(upn, app, userNote) {
  const u = odataQuote(upn)
  const a = odataQuote(app)
  if (!u || !a) return { created: false, row: null }
  // Var olan talebin TAM satırı çekiliyor, yalnız kimliği değil: çağıran
  // "zaten açık talebin var" dediğinde kartın detay kutusu o talebin
  // tarihini ve notlarını gösterebilmeli — yoksa ikinci bir tur gerekirdi.
  const existing = await reqQuery(
    (sel) =>
      `/${REQ_SET}?$select=${sel}` +
      `&$filter=tyro_useremail eq '${u}' and tyro_requestedapp eq '${a}' and tyro_iscompleted eq false` +
      `&$top=1`,
  )
  const open = (existing?.value ?? [])[0]
  if (open) return { created: false, row: toRequest(open) }

  const note = String(userNote ?? "").trim()
  const body = {
    tyro_useremail: upn,
    tyro_requestedapp: app,
    tyro_iscompleted: false,
  }
  if (note && notesAvailable) body.tyro_usernote = note

  // `return=representation` ile yazılan satır GERİ GELİYOR: aksi hâlde
  // `createdon` damgasını istemcide uydurmak gerekirdi ve tarayıcı saati
  // sunucununkiyle aynı olmak zorunda değil.
  const post = (payload) =>
    dvApi(`/${REQ_SET}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    })

  let created
  try {
    created = await post(body)
  } catch (err) {
    // Not kolonu henüz açılmamışsa talep NOTSUZ yazılır. Talebin kendisi
    // nota bağlı değil; notu yüzünden yazılmaması kullanıcıyı kilitli
    // kartın karşısında bırakırdı.
    if (notesAvailable && isMissingNoteColumn(err)) {
      notesAvailable = false
      delete body.tyro_usernote
      created = await post(body)
    } else {
      throw err
    }
  }
  return { created: true, row: created ? toRequest(created) : null }
}

/** Yöneticilik bayrağı. Kendi satırını kapatma kuralı ÇAĞIRANDA
 *  (`AuthorizationsPage`) — kural bir arayüz kararı, veri katmanının
 *  oturumdan haberi yok. */
export async function setAuthorizationAdmin(id, isAdmin) {
  await dvApi(`/${AUTH_SET}(${id})`, {
    method: "PATCH",
    body: JSON.stringify({ tyro_isadmin: Boolean(isAdmin) }),
  })
}

/**
 * Talebi ONAYLAR: istenen app kişinin yetki listesine eklenir ve talep
 * tamamlandı işaretlenir. Kişinin hiç satırı yoksa oluşturulur — talep
 * eden çoğu kişinin zaten satırı olmayacak, ve iki adıma bölmek yöneticiyi
 * "önce kaydı aç, sonra onayla" diye gereksiz bir sıraya sokardı.
 *
 * ⚠️ Sıra ÖNEMLİ: önce yetki yazılır, sonra talep kapatılır. Ters olsaydı
 * yetki yazımı düşen bir turda talep "tamamlandı" görünür ama kişi app'i
 * hâlâ açamazdı — sessiz ve bulunması zor bir yanlış.
 *
 * ⚠️ Yeni açılan satır `tyro_isadmin: false` ile açılır: bir app talebini
 * onaylamak kimseyi yönetici yapmamalı.
 */
export async function approveRequest({ upn, app, requestId }) {
  const row = await fetchAuthorizationFor(upn)
  if (row) {
    if (!row.apps.includes(app)) {
      await updateAuthorizedApps(row.id, [...row.apps, app])
    }
  } else {
    await dvApi(`/${AUTH_SET}`, {
      method: "POST",
      body: JSON.stringify({
        tyro_useremail: upn,
        tyro_apps: app,
        tyro_isadmin: false,
      }),
    })
  }
  await setRequestCompleted(requestId, true)
}

/** Talebi siler. Onaylamak ile silmek AYRI: onaylamak yetki verir ve izi
 *  bırakır, silmek yalnız kaydı kaldırır (yanlış ya da geçersiz talep). */
export async function deleteRequest(id) {
  await dvApi(`/${REQ_SET}(${id})`, { method: "DELETE" })
}

/**
 * BEKLEYEN talep sayısı — yalnız sayı, satır çekilmez.
 *
 * Sidebar'daki kullanıcı düğmesi ve sekme rozeti bunu okuyor. `$top=0` ile
 * hiç satır getirilmiyor; tablo büyüdükçe bu sorgu aynı kalır. Tam listeyi
 * çeken `fetchRequests` yönetim sekmesinin işi ve sayfa açılmadan
 * koşturulmamalı — bir rozet için iki tablo indirmek olurdu.
 */
export async function countOpenRequests() {
  // ⚠️ `$top=0` ile `$count` ÇALIŞMIYOR (Dataverse 400 veriyor, ölçüldü
  // 2026-09-17). `$top=1` sayıyı bozmuyor — `@odata.count` süzgecin
  // TAMAMINI sayar, sayfanın uzunluğunu değil — ve tek bir kimlik alanı
  // dönüyor. Tablo büyüdükçe bu sorgu aynı kalır.
  const data = await dvApi(
    `/${REQ_SET}?$select=tyro_requestappid&$count=true&$top=1` +
      `&$filter=tyro_iscompleted eq false`,
  )
  return Number(data?.["@odata.count"] ?? 0)
}

/**
 * Kişinin AÇIK (tamamlanmamış) talepleri — TAM satırlar.
 *
 * Kilitli kart bunu iki iş için okuyor: rozet "Kilitli" mi "Talep
 * inceleniyor" mu diyecek, ve kart tıklandığında açılan detay kutusu
 * talebin tarihini, kullanıcının gerekçesini ve yöneticinin notunu
 * gösterecek. Eskiden yalnız app ADI çekiliyordu; detay kutusu gelince
 * ad tek başına yetmez oldu ve ikinci bir tur atmaktansa aynı sorgu
 * genişletildi — satır sayısı kişi başına birkaç tane.
 */
export async function fetchMyOpenRequests(upn) {
  const u = odataQuote(upn)
  if (!u) return []
  const data = await reqQuery(
    (sel) =>
      `/${REQ_SET}?$select=${sel}` +
      `&$filter=tyro_useremail eq '${u}' and tyro_iscompleted eq false` +
      `&$orderby=createdon desc`,
  )
  return (data?.value ?? []).map(toRequest).filter((r) => r.app)
}
