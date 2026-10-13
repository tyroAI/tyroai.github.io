import { foldTr } from "@/lib/feed"
import { graphGet, graphGetBlob, STATUS } from "@/lib/graph"
import { photoFromBlob } from "@/lib/initialsPhoto"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  KİŞİ KARTI — dizinden bir kişinin profili (2026-10-02)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İstek: *"Keşfet sayfasında kişiye tıkladığımızda kişi kartını görelim —
 * doğum günleri, iş yıl dönümleri, maillerdeki kişiler, keza toplantı
 * katılımcıları için de öyle."*
 *
 * ⚠️ **YENİ KAPSAM YOK, `loginRequest`E DOKUNULMADI.** Profil `User.Read.All`
 * ile SESSİZCE istenir (`useIsUnderManager` ve `usePeopleTitles`in kullandığı,
 * kayıtta 2026-08-03'ten beri onaylı izin); alınamazsa `User.ReadBasic.All`e
 * iner (ad + adres) ve kart ünvan/iletişim satırlarını çizmez, bunu SÖYLER.
 * İkisi de alınamazsa kart yalnız çağıranın bildiğini (ad, adres) gösterir.
 * Desen `usePresence` / `usePeopleTitles`in aynısı: "çalışmazsa bozar" değil,
 * "çalışmazsa eksik".
 *
 * ⚠️ **ÜÇ CEVAP, ÜÇ CÜMLE — "soramadık ≠ yok".** `notFound` dizin "böyle biri
 * yok" dedi (şirket dışı adres, ayrılmış çalışan); `ambiguous` adla aranan
 * kişi dizinde tek bir kayda inmedi (aynı adlı iki çalışan — yanlış kişinin
 * kartını açmak bu ekranın yapabileceği en kötü hata); `denied` / `error`
 * SORAMADIK. İlk ikisi önbelleğe girer, son ikisi GİRMEZ (yönetici izni
 * verince bir sonraki açılış çalışsın).
 *
 * ⚠️ **ADRES UPN DEĞİLSE İKİNCİ TUR.** `/users/{x}` yalnız kimlik ya da UPN
 * kabul ediyor ve kiracıda 801 kullanıcının 237'sinde posta adresi UPN'den
 * farklı (ölçüldü, 2026-09-17). 404 gelirse `mail eq '…'` süzgeciyle bir kez
 * daha aranır.
 *
 * ⚠️ **ÖNBELLEK YALNIZ BELLEKTE ve çıkışta düşer** (`clearPersonCache`, msal.js
 * LOGOUT zinciri): başkalarının telefonu, ünvanı ve fotoğrafı paylaşılan bir
 * tarayıcıda diske yazılmaz. Uçuştaki tur SÖZ olarak paylaşılır — StrictMode'un
 * çift efekti ikinci bir istek atmasın, ilk efekt iptal edilse de cevap
 * önbelleğe yazılsın (`useDrivePreview`in 2026-10-02 dersi).
 */

const FULL_SELECT =
  "id,displayName,givenName,jobTitle,department,officeLocation,companyName,city,mail,userPrincipalName,businessPhones,mobilePhone"
const BASIC_SELECT = "id,displayName,givenName,mail,userPrincipalName"
const MANAGER_EXPAND = "$expand=manager($select=id,displayName,jobTitle,mail,userPrincipalName)"

/** anahtar → { status, profile } (yalnız kesin cevaplar) */
const cache = new Map()
/** anahtar → Promise */
const inflight = new Map()
/** Oturumda bir kez öğrenilir: tam okuma izni yok, her kartta yeniden sorma. */
let fullDenied = false

export function clearPersonCache() {
  cache.clear()
  inflight.clear()
  fullDenied = false
}

export const PERSON = {
  ...STATUS,
  loading: "loading",
  notFound: "notFound",
  ambiguous: "ambiguous",
}

/** Kişinin önbellek anahtarı: adres varsa adres, yoksa katlanmış ad. */
export function personKey({ address, name } = {}) {
  const a = String(address ?? "")
    .trim()
    .toLowerCase()
  if (a) return `a:${a}`
  const n = foldTr(name ?? "").trim()
  return n ? `n:${n}` : ""
}

export function cachedPerson(key) {
  return key ? (cache.get(key) ?? null) : null
}

/**
 * Ad ile aramada gidecek kelime: `İ`/`I` TAŞIMAYAN, sondan ilk üç harfli
 * kelime. Duyuru konuları BÜYÜK HARF ("AİDA BEKTAYEVA") ve `İ` ile `i`
 * Graph'ın eşleştirmesinde aynı harf değil — gerekçe `usePeopleTitles`te.
 */
export function directorySearchTerm(name) {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  for (let i = words.length - 1; i >= 0; i--) {
    if (!/[İI]/.test(words[i]) && words[i].length >= 3) return words[i]
  }
  return null
}

const odataString = (s) => String(s).replace(/'/g, "''")

function normalise(user, limited) {
  const address = String(user.mail || user.userPrincipalName || "").toLowerCase()
  const m = user.manager
  return {
    id: user.id ?? null,
    name: String(user.displayName ?? "").trim(),
    givenName: String(user.givenName ?? "").trim() || null,
    title: limited ? null : String(user.jobTitle ?? "").trim() || null,
    department: limited ? null : String(user.department ?? "").trim() || null,
    office: limited ? null : String(user.officeLocation ?? "").trim() || null,
    company: limited ? null : String(user.companyName ?? "").trim() || null,
    city: limited ? null : String(user.city ?? "").trim() || null,
    address,
    upn: String(user.userPrincipalName ?? "").toLowerCase() || address,
    phones: limited ? [] : (user.businessPhones ?? []).map((p) => String(p).trim()).filter(Boolean),
    mobile: limited ? null : String(user.mobilePhone ?? "").trim() || null,
    manager:
      !limited && m && (m.displayName || m.mail || m.userPrincipalName)
        ? {
            name: String(m.displayName ?? "").trim(),
            title: String(m.jobTitle ?? "").trim() || null,
            address: String(m.mail || m.userPrincipalName || "").toLowerCase(),
          }
        : null,
    limited,
    photo: null,
  }
}

async function getUser(instance, account, idOrUpn, scope, full) {
  const select = full ? FULL_SELECT : BASIC_SELECT
  const path = `/users/${encodeURIComponent(idOrUpn)}?$select=${select}`
  if (!full) return graphGet(instance, account, { path, scopes: [scope] })
  // Yönetici genişletmesi reddedilirse profil yine gelsin (400 — biçim reddi).
  const res = await graphGet(instance, account, {
    path: `${path}&${MANAGER_EXPAND}`,
    scopes: [scope],
  })
  if (res.status === STATUS.error && res.httpStatus === 400)
    return graphGet(instance, account, { path, scopes: [scope] })
  return res
}

/**
 * Tek bir izinle kişiyi bulur.
 * @returns {Promise<{status: string, user?: object}>}
 */
async function resolve(instance, account, { address, name }, scope, full) {
  if (address) {
    const direct = await getUser(instance, account, address, scope, full)
    if (direct.status === STATUS.ready) return { status: STATUS.ready, user: direct.data }
    if (!(direct.status === STATUS.error && direct.httpStatus === 404)) return direct
    const list = await graphGet(instance, account, {
      path: `/users?$filter=${encodeURIComponent(`mail eq '${odataString(address)}'`)}&$select=id&$top=2`,
      scopes: [scope],
    })
    if (list.status !== STATUS.ready) return list
    const hits = list.data?.value ?? []
    if (hits.length !== 1) return { status: PERSON.notFound }
    const one = await getUser(instance, account, hits[0].id, scope, full)
    return one.status === STATUS.ready ? { status: STATUS.ready, user: one.data } : one
  }
  const term = directorySearchTerm(name)
  if (!term) return { status: PERSON.notFound }
  const found = await graphGet(instance, account, {
    path: `/users?$search=${encodeURIComponent(`"displayName:${term}"`)}&$select=id,displayName&$top=25`,
    scopes: [scope],
    // $search dizinde "eventual consistency" istiyor; başlıksız 400 döner.
    headers: { ConsistencyLevel: "eventual" },
  })
  if (found.status !== STATUS.ready) return found
  const wanted = foldTr(name)
  const hits = (found.data?.value ?? []).filter((u) => foldTr(u.displayName ?? "") === wanted)
  if (hits.length === 0) return { status: PERSON.notFound }
  if (hits.length > 1) return { status: PERSON.ambiguous }
  const one = await getUser(instance, account, hits[0].id, scope, full)
  return one.status === STATUS.ready ? { status: STATUS.ready, user: one.data } : one
}

/** Kartın büyük fotoğrafı (120 px — kart 56 px'lik avatarı 2× yoğunlukta çiziyor). */
async function fetchPhoto(instance, account, id) {
  const res = await graphGetBlob(instance, account, {
    path: `/users/${encodeURIComponent(id)}/photos/120x120/$value`,
    scopes: ["User.ReadBasic.All"],
  })
  if (res.status !== STATUS.ready || !res.blob) return null
  // Harf resmi (baş harflerin yazıldığı "fotoğraf") null döner: kart harf çizer.
  return photoFromBlob(res.blob)
}

async function load(instance, account, person) {
  let res = null
  let limited = false
  if (!fullDenied) {
    res = await resolve(instance, account, person, "User.Read.All", true)
    // Yalnız BELİRTEÇ alınamadıysa oturum boyu hatırlanır; tek bir kaydın
    // 403'ü (httpStatus var) öteki kartları kısıtlı moda düşürmesin.
    if (res.status === STATUS.denied && !res.httpStatus) fullDenied = true
  }
  if (!res || res.status === STATUS.denied) {
    limited = true
    res = await resolve(instance, account, person, "User.ReadBasic.All", false)
  }
  if (res.status !== STATUS.ready) return { status: res.status, httpStatus: res.httpStatus }
  const profile = normalise(res.user, limited)
  if (profile.id) profile.photo = await fetchPhoto(instance, account, profile.id).catch(() => null)
  return { status: STATUS.ready, profile }
}

/**
 * Kişiyi bulur, önbelleğe yazar. Aynı kişi için uçuştaki tur paylaşılır.
 * @param {{address?: string, name?: string}} person
 */
export function fetchPerson(instance, account, person) {
  const key = personKey(person)
  if (!key) return Promise.resolve({ status: PERSON.notFound })
  const hit = cache.get(key)
  if (hit) return Promise.resolve(hit)
  if (inflight.has(key)) return inflight.get(key)
  const job = load(instance, account, person)
    .catch(() => ({ status: STATUS.error }))
    .then((value) => {
      inflight.delete(key)
      const final =
        value.status === STATUS.ready ||
        value.status === PERSON.notFound ||
        value.status === PERSON.ambiguous
      if (final) {
        cache.set(key, value)
        // Adla bulunan kişi adresiyle de bulunsun (ikinci kart aynı kişiyi adresle açabilir).
        if (value.profile?.address) cache.set(`a:${value.profile.address}`, value)
      }
      return value
    })
  inflight.set(key, job)
  return job
}
