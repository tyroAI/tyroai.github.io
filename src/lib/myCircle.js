import { graphGet, STATUS } from "@/lib/graph"

/**
 * "Çevrem": kişinin EKİBİ (yöneticisi, aynı yöneticiye bağlı olanlar, ona
 * bağlı olanlar) ve DEPARTMANI (dizindeki `department` alanı aynı olanlar).
 * Kutlamalarda yakın çevreyi öne çıkarmak için — Anasayfa'nın yardım kartı
 * ve özel günler paneli.
 *
 * Kapsam `User.Read.All` (kişi kartının sessizce aldığı, onaylı izin); yeni
 * izin istenmez. Alınamazsa çevre "bilinmiyor" kalır ve hiçbir şey vurgulanmaz.
 * Kişi başına istek yok: departman tek süzgeçli sorgu (sayfalı), ekip iki
 * `directReports` çağrısı. Sonuç YALNIZ BELLEKTE ve çıkışta düşer
 * (`clearMyCircleCache`, msal.js LOGOUT zinciri).
 */
const SCOPES = ["User.Read.All"]
const MAX_PAGES = 5 // 999'luk sayfa × 5 — en kalabalık departmana yeter
const ME =
  "/me?$select=id,department,mail,userPrincipalName&$expand=manager($select=id,mail,userPrincipalName)"
const ADDR = "$select=mail,userPrincipalName"

let cache = null // { key, promise, value }

export function clearMyCircleCache() {
  cache = null
}

/** Bir dizin kaydının adresleri (posta ve UPN farklı olabilir), küçük harf. */
export function addressesOf(user) {
  return [user?.mail, user?.userPrincipalName].filter(Boolean).map((s) => String(s).toLowerCase())
}

async function collect(instance, account, path, headers) {
  const users = []
  let next = path
  for (let page = 0; next && page < MAX_PAGES; page += 1) {
    const res = await graphGet(instance, account, { path: next, scopes: SCOPES, headers })
    if (res.status !== STATUS.ready)
      return page === 0 ? { status: res.status, users } : { status: STATUS.ready, users }
    users.push(...(res.data?.value ?? []))
    next = res.data?.["@odata.nextLink"] ?? null
  }
  return { status: STATUS.ready, users }
}

const odataString = (s) => String(s).replace(/'/g, "''")
const EMPTY = { status: STATUS.ready, users: [] }

export async function fetchMyCircle(instance, account) {
  const me = await graphGet(instance, account, { path: ME, scopes: SCOPES })
  if (me.status !== STATUS.ready) return { status: me.status }
  const department = String(me.data?.department ?? "").trim() || null
  const manager = me.data?.manager ?? null
  const [dept, peers, reports] = await Promise.all([
    department
      ? collect(
          instance,
          account,
          `/users?$filter=${encodeURIComponent(`department eq '${odataString(department)}'`)}&${ADDR}&$count=true&$top=999`,
          // `department` süzgeci gelişmiş sorgu ister.
          { ConsistencyLevel: "eventual" },
        )
      : EMPTY,
    manager?.id
      ? collect(instance, account, `/users/${encodeURIComponent(manager.id)}/directReports?${ADDR}`)
      : EMPTY,
    collect(instance, account, `/me/directReports?${ADDR}`),
  ])
  const self = new Set(addressesOf(me.data))
  const team = new Set([
    ...addressesOf(manager),
    ...peers.users.flatMap(addressesOf),
    ...reports.users.flatMap(addressesOf),
  ])
  const colleagues = new Set(dept.users.flatMap(addressesOf))
  for (const a of self) {
    team.delete(a)
    colleagues.delete(a)
  }
  return { status: STATUS.ready, department, team, colleagues }
}

/** Kişinin çevredeki yeri: "team" · "department" · null (bilinmiyor ya da dışarıda). */
export function circleOf(circle, mail) {
  if (circle?.status !== STATUS.ready || !mail) return null
  const m = String(mail).toLowerCase()
  if (circle.team.has(m)) return "team"
  if (circle.colleagues.has(m)) return "department"
  return null
}

/** Tek istek, paylaşılan söz: aynı oturumda ikinci çağıran yeni istek atmaz. */
export function loadMyCircle(instance, account) {
  const key = account?.homeAccountId
  if (!key) return Promise.resolve({ status: STATUS.unauthenticated })
  if (cache?.key === key) return cache.promise
  const entry = { key, value: null, promise: null }
  entry.promise = fetchMyCircle(instance, account).then((value) => {
    // "Soramadık" önbelleğe girmez: izin verilince bir sonraki açılış denesin.
    if (cache === entry) {
      if (value.status === STATUS.ready) entry.value = value
      else cache = null
    }
    return value
  })
  cache = entry
  return entry.promise
}

export function cachedMyCircle(key) {
  return cache?.key === key ? cache.value : null
}

const RANK = { team: 0, department: 1 }

/**
 * Bugünün kutlamalarından çevredekiler (doğum günü ve iş yıl dönümü), ekip
 * önce. Kişinin kendisi çıkar (onun günü kartın kendi sahnesi).
 */
export function circleCelebrations(celebrations, circle, isSelf = () => false) {
  if (!celebrations || circle?.status !== STATUS.ready) return []
  const pick = (list, kind) =>
    (list ?? [])
      .filter((p) => p.inDays === 0 && !isSelf(p.mail))
      .map((p) => ({ ...p, kind, circle: circleOf(circle, p.mail) }))
      .filter((p) => p.circle)
  return [
    ...pick(celebrations.birthdays, "birthday"),
    ...pick(celebrations.anniversaries, "anniversary"),
  ].sort((a, b) => RANK[a.circle] - RANK[b.circle] || a.name.localeCompare(b.name, "tr"))
}
