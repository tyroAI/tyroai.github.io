import { graphGet, STATUS } from "@/lib/graph"

/**
 * Bir yöneticinin DOĞRUDAN bağlıları — Graph `directReports`: kişinin kendi bağlıları
 * (`/me/directReports`: Self Servis'in "Ekibim"i ve profil başlığı) ve yöneticisinin bağlıları
 * (`/users/{id}/directReports`: aynı yöneticiye bağlı ekip arkadaşları, kişinin kendisi dahil —
 * çıkarmak `lib/teamCircle.js`in işi). Kapsam `User.Read.All`, yalnız sessizce (kişi kartının ve
 * "Çevrem"in onaylı izni); yeni izin istenmez. Alınamazsa liste "bilinmiyor" kalır.
 *
 * Liste başına tek istek, alanlar seçili (ad, unvan, departman, ofis, şirket, sicil, çalışan
 * tipi, işe giriş): üye başına istek yok. Kiracı genişletilmiş seçimi reddederse (400 ya da
 * alan yetkisi için 403) temel seçimle bir kez daha. Kişi olmayan nesneler (posta kişisi, grup)
 * ve kapatılmış hesaplar (ayrılan çalışan) ekip sayılmaz.
 *
 * Sonuçlar YALNIZ BELLEKTE, hesap başına ve çıkışta düşer (`clearDirectReportsCache` ikisini de
 * siler, msal.js LOGOUT zinciri): iş arkadaşlarının adı, adresi ve işe giriş tarihi. Soramadıysak
 * önbelleğe girmez.
 */
const SCOPES = ["User.Read.All"]
const MAX_PAGES = 3
/** Ekip üyesinin dizin seçimi — yöneticinin kaydı da aynı seçimle (`useMyManager`). */
export const MEMBER_SELECT =
  "id,displayName,givenName,jobTitle,department,officeLocation,companyName,employeeId,employeeType,employeeHireDate,mail,userPrincipalName,accountEnabled"
export const MEMBER_SELECT_BASIC =
  "id,displayName,jobTitle,department,officeLocation,mail,userPrincipalName"

/** Genişletilmiş seçim reddedildi mi (bilinmeyen alan 400, alan yetkisi 403): temel seçime düş. */
export const rejectedSelect = (res) => res?.httpStatus === 400 || res?.httpStatus === 403

// Ad → { key, promise, value }: bana bağlılar ("reports") ve yöneticimin bağlıları ("peers").
const slots = { reports: null, peers: null }
// Önbelleğe liste yazılınca abone kancalar yeniden çizer: bir yerde (ör. Ekibim'in "Tekrar
// dene"si) okunan liste, aynı listeyi gösteren öteki yerlere de (profil başlığının sayısı) gider.
const listeners = new Set()
let version = 0

export function subscribeDirectReports(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const directReportsVersion = () => version

export function clearDirectReportsCache() {
  slots.reports = null
  slots.peers = null
}

const text = (v) => String(v ?? "").trim()

/** Dizin kaydı → ekip üyesi (Self Servis'in kişi biçimi; boş alan `""`). */
export function memberFromGraph(user) {
  const address = text(user?.mail || user?.userPrincipalName).toLowerCase()
  return {
    id: text(user?.id),
    name: text(user?.displayName) || address,
    givenName: text(user?.givenName),
    title: text(user?.jobTitle),
    department: text(user?.department),
    office: text(user?.officeLocation),
    company: text(user?.companyName),
    employeeId: text(user?.employeeId),
    employeeType: text(user?.employeeType),
    employeeHireDate: text(user?.employeeHireDate),
    address,
    upn: text(user?.userPrincipalName).toLowerCase() || address,
  }
}

/** Yalnız kişi ve açık hesap: tür bilgisi yoksa (seçim dışı) kişi sayılır. */
export function isTeamMember(user) {
  const type = user?.["@odata.type"]
  if (type && type !== "#microsoft.graph.user") return false
  if (user?.accountEnabled === false) return false
  return Boolean(user?.mail || user?.userPrincipalName)
}

async function collect(instance, account, base, select) {
  const users = []
  let next = `${base}?$select=${select}`
  for (let page = 0; next && page < MAX_PAGES; page += 1) {
    const res = await graphGet(instance, account, { path: next, scopes: SCOPES })
    if (res.status !== STATUS.ready) return page === 0 ? res : { status: STATUS.ready, users }
    users.push(...(res.data?.value ?? []))
    next = res.data?.["@odata.nextLink"] ?? null
  }
  return { status: STATUS.ready, users }
}

async function fetchReportsOf(instance, account, base) {
  let res = await collect(instance, account, base, MEMBER_SELECT)
  if (rejectedSelect(res)) res = await collect(instance, account, base, MEMBER_SELECT_BASIC)
  if (res.status !== STATUS.ready) return { status: res.status, people: [] }
  const people = res.users
    .filter(isTeamMember)
    .map(memberFromGraph)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"))
  return { status: STATUS.ready, people }
}

export const fetchDirectReports = (instance, account) =>
  fetchReportsOf(instance, account, "/me/directReports")

/** Yöneticinin bağlıları — kişinin ekip arkadaşları (kendisi de içinde). */
export const fetchManagerReports = (instance, account, managerId) =>
  fetchReportsOf(instance, account, `/users/${encodeURIComponent(managerId)}/directReports`)

/** Tek istek, paylaşılan söz: aynı oturumda ikinci çağıran yeni istek atmaz. */
function shared(name, key, run) {
  const hit = slots[name]
  if (hit?.key === key) return hit.promise
  const entry = { key, value: null, promise: null }
  entry.promise = run().then((value) => {
    // Çıkıştan sonra dönen cevap yazılmaz; "soramadık" önbelleğe girmez.
    if (slots[name] === entry) {
      if (value.status === STATUS.ready) {
        entry.value = value
        version += 1
        for (const listener of listeners) listener()
      } else slots[name] = null
    }
    return value
  })
  slots[name] = entry
  return entry.promise
}

const NONE = { status: STATUS.unauthenticated, people: [] }

export function loadDirectReports(instance, account) {
  const key = account?.homeAccountId
  if (!key) return Promise.resolve(NONE)
  return shared("reports", key, () => fetchDirectReports(instance, account))
}

export function cachedDirectReports(key) {
  return slots.reports?.key === key ? slots.reports.value : null
}

/** Önbellek anahtarı hesap + yönetici: yönetici değişirse liste yeniden sorulur. */
export const managerReportsKey = (account, managerId) =>
  account?.homeAccountId && managerId ? `${account.homeAccountId}|${managerId}` : null

export function loadManagerReports(instance, account, managerId) {
  const key = managerReportsKey(account, managerId)
  if (!key) return Promise.resolve(NONE)
  return shared("peers", key, () => fetchManagerReports(instance, account, managerId))
}

export function cachedManagerReports(key) {
  return key && slots.peers?.key === key ? slots.peers.value : null
}
