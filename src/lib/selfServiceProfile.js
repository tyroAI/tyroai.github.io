/**
 * Self Servis — profil başlığının verisi (saf). KAYNAK KURALI: kişi, yönetici ve ekip
 * bilgisi Graph'tan (birincil); ERP çalışan kaydı YALNIZ Graph'ta boş kalan alanı tamamlar
 * (sicil, görev, işe giriş). Her alanın kaynağı `sources`ta: "graph" · "erp" · "account"
 * (MSAL oturumu). Kişi kartıyla (PersonPopover) aynı veri dili. Ayrıntı:
 * docs/features/self-servis.md › Profil başlığı.
 */

import { tidyCompanyName } from "./companyName"

const DAY = 86400000
const YEAR = 365.2425 * DAY
// F&O'nun şirket saat dilimi İstanbul (UTC+3, yaz saati yok).
const COMPANY_OFFSET_MS = 3 * 3600000

const text = (v) => String(v ?? "").trim()

// Başlığın çipleri, gösterim sırasıyla: uzun şirket adı başta; telefonda kısalar alt sırayı
// paylaşır.
const CHIPS = ["company", "department", "office", "employeeType"]

/**
 * İşe giriş gibi tarih-saat alanı → yerel takvim günü. F&O ve Entra bu alanı yerel gece
 * yarısının UTC karşılığıyla yazabiliyor ("2024-12-17T21:00:00Z" = 18.12.2024): saat varsa
 * İstanbul saatine çevrilip günü okunur, yalnız tarihse olduğu gibi. Tarayıcının saat
 * diliminden bağımsız.
 */
export function hireDayOf(value) {
  const s = text(value)
  const m =
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?/.exec(
      s,
    )
  // "Boş tarih" (F&O 1900-01-01, .NET 0001-01-01): `Date.UTC` 0–99 yıllarını 1900'e kaydırır.
  if (!m || +m[1] <= 1900) return null
  let [y, mo, d] = [+m[1], +m[2], +m[3]]
  if (m[4] != null) {
    const zone = m[7] ?? "Z"
    let offset = 0
    if (zone !== "Z") {
      const z = /([+-])(\d{2}):?(\d{2})/.exec(zone)
      offset = (z[1] === "-" ? -1 : 1) * (+z[2] * 60 + +z[3]) * 60000
    }
    const utc = Date.UTC(y, mo - 1, d, +m[4], +m[5], +(m[6] ?? 0)) - offset
    const local = new Date(utc + COMPANY_OFFSET_MS)
    ;[y, mo, d] = [local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate()]
  }
  const out = new Date(y, mo - 1, d)
  return out.getMonth() === mo - 1 ? out : null
}

/**
 * Hizmet süresi: `{ years, months }` — `years` bir ondalıkla AŞAĞI yuvarlanmış (dolmamış yıl
 * sayılmaz: 1,96 → 1,9), `months` tam ay. Gelecekteki ya da bilinmeyen tarihte null.
 */
export function tenureOf(hireDate, now = new Date()) {
  if (!(hireDate instanceof Date) || Number.isNaN(hireDate.getTime())) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const ms = today - hireDate
  if (ms < 0) return null
  let months =
    (today.getFullYear() - hireDate.getFullYear()) * 12 + today.getMonth() - hireDate.getMonth()
  if (today.getDate() < hireDate.getDate()) months -= 1
  return { years: Math.floor((ms / YEAR) * 10) / 10, months: Math.max(0, months) }
}

/** Ad soyadın baş harfleri (Türkçe büyük harf kuralıyla), en çok iki. */
export function initialsOf(name) {
  return text(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr"))
    .join("")
}

/**
 * ERP kodu BÜYÜK harfle gelir ("YONETICI"): baş harf büyük. Kod ASCII ise düz küçültme (Türkçe
 * kural "I"yı "ı" yapıp "Yonetıcı" yazardı); Türkçe harf taşıyorsa Türkçe kural.
 */
function titleCase(raw) {
  const lower = (w) => (/^[\x20-\x7e]*$/.test(w) ? w.toLowerCase() : w.toLocaleLowerCase("tr"))
  return text(raw)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr") + lower(w.slice(1)))
    .join(" ")
}

/** İlk dolu aday `[değer, kaynak]`; hiçbiri doluysa `["", null]`. */
function first(...candidates) {
  for (const [value, source] of candidates) {
    if (value instanceof Date) return [value, source]
    if (text(value)) return [text(value), source]
  }
  return ["", null]
}

/**
 * ERP istihdam satırları (`mserp_hcmemploymententities`) → `{ start, company, count }`. Kişi
 * şirket başına bir satır taşır (ör. VGTR ve VGLJ farklı tarihlerle); hizmet süresi ERP'nin
 * kendi başlığındaki gibi ana şirketin (VGTR) satırından, yoksa en eski başlangıçtan.
 */
export function toEmployment(rows) {
  const list = (rows ?? [])
    .map((r) => ({
      company: text(r.mserp_legalentityid).toUpperCase(),
      start: hireDayOf(r.mserp_employmentstartdate),
    }))
    .filter((r) => r.start)
    .sort((a, b) => a.start - b.start)
  if (!list.length) return null
  const main = list.find((r) => r.company === "VGTR") ?? list[0]
  return { start: main.start, company: main.company, count: list.length }
}

/**
 * Başlığın verisi. Girdiler: `graph` (`useMyProfileDetails().details` ya da ekip üyesinin
 * dizin kaydı — `memberFromGraph` biçimi de olur), `account` (`{ name, username }`),
 * `worker` (ERP çalışanı, `toWorker`), `employment` (`toEmployment`), `manager`, `reports`.
 */
export function buildProfile({
  graph,
  account,
  worker,
  employment,
  manager = null,
  reports = null,
  photo = null,
} = {}) {
  const g = graph ?? {}
  const sources = {}
  const set = (key, ...candidates) => {
    const [value, source] = first(...candidates)
    if (source) sources[key] = source
    return value
  }
  const name = set(
    "name",
    [g.displayName ?? g.name, "graph"],
    [worker?.name, "erp"],
    [account?.name, "account"],
  )
  const address = text(g.mail || g.address || g.upn || account?.username).toLowerCase()
  const hireDate =
    set("hireDate", [hireDayOf(g.employeeHireDate), "graph"], [employment?.start ?? null, "erp"]) ||
    null
  if (manager) sources.manager = "graph"
  if (reports != null) sources.reports = "graph"
  return {
    name,
    initials: initialsOf(name),
    address,
    upn: text(g.upn || g.userPrincipalName || account?.username).toLowerCase() || address,
    photo,
    personnel: set("personnel", [g.employeeId, "graph"], [worker?.personnel, "erp"]),
    title: set(
      "title",
      [g.jobTitle ?? g.title, "graph"],
      [worker?.position, "erp"],
      [titleCase(worker?.title), "erp"],
    ),
    employeeType: set("employeeType", [g.employeeType, "graph"]),
    department: set("department", [g.department, "graph"]),
    office: set("office", [g.officeLocation ?? g.office, "graph"]),
    company: set("company", [g.companyName ?? g.company, "graph"], [employment?.company, "erp"]),
    hireDate,
    manager,
    reports,
    sources,
  }
}

/**
 * Başlığın bilgileri: `title` (unvan, adın altında kendi satırında) ve etiketli çipler —
 * şirket, departman, ofis, çalışan tipi. Boşlar ve tekrar edenler düşer (unvan önce gelir). Şirket
 * adının yasal ekleri düzgün yazılır; düzeltildiyse kayıttaki hâli `raw`da.
 * @returns {{ title: string, chips: { key: string, value: string, raw?: string }[] }}
 */
export function metaOf(profile) {
  const seen = new Set()
  const fresh = (v) => {
    const k = text(v).toLocaleLowerCase("tr")
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  }
  const title = fresh(profile?.title) ? text(profile.title) : ""
  const chips = CHIPS.filter((key) => fresh(profile?.[key])).map((key) => {
    const raw = text(profile[key])
    const value = key === "company" ? tidyCompanyName(raw) : raw
    return value === raw ? { key, value } : { key, value, raw }
  })
  return { title, chips }
}
