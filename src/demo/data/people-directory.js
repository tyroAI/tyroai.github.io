// Demo dizini — oturumdaki kişinin (persona.js) çevresine, şirket yönetimi, ekip
// arkadaşları ve yeni katılanlar eklenir. TÜMÜ KURGUSAL; telefonlar "000" santralli
// (atanmamış) numaralar, adresler `.example` alanında.
import { COLLEAGUES, COMPANY, CUSTOMERS, DEMO_DOMAIN, MANAGER, ME, TEAM } from "../persona"

const ascii = (s) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/\s+/g, ".")

function mk(id, displayName, jobTitle, department, extra = {}) {
  const [givenName, ...rest] = displayName.split(" ")
  const address = `${ascii(displayName)}@${DEMO_DOMAIN}`
  return {
    id,
    displayName,
    givenName,
    surname: rest.join(" "),
    jobTitle,
    department,
    mail: address,
    userPrincipalName: address,
    officeLocation: "İstanbul — Levent",
    city: "İstanbul",
    country: "Türkiye",
    companyName: COMPANY.name,
    businessPhones: [],
    mobilePhone: null,
    ...extra,
  }
}

/** Yönetim ve ekip dışı kişiler (persona'da olmayanlar). */
const EXTRA = [
  mk("u-levent", "Levent Akın", "Chief Executive Officer", "Executive Management", {
    employeeHireDate: "2012-02-01T00:00:00Z",
  }),
  mk("u-nilgun", "Nilgün Kaplan", "Chief Commercial Officer", "Executive Management", {
    employeeHireDate: "2015-05-11T00:00:00Z",
  }),
  mk("u-oya", "Oya Gürsoy", "Chief Financial Officer", "Finance", {
    employeeHireDate: "2016-09-05T00:00:00Z",
  }),
  mk("u-banu", "Banu Tekeli", "Chief Human Resources Officer", "Human Resources", {
    employeeHireDate: "2017-03-20T00:00:00Z",
  }),
  mk("u-kaan", "Kaan Yurt", "Chief Technology Officer", "Technology", {
    employeeHireDate: "2018-01-15T00:00:00Z",
  }),
  // Kerem Öztürk'e bağlı diğer satış yöneticileri (Doğukan'ın ekip arkadaşları).
  // Ad ve unvan İK kütüğüyle (hr-people.js · COMPANY_STAFF) aynı: kişi kartı ile tebrik
  // şeridi aynı kişiyi aynı unvanla anlatsın.
  mk("u-volkan", "Volkan Şimşek", "Bölge Satış Müdürü", "Sales", {
    officeLocation: "Ankara — Çankaya",
    city: "Ankara",
    employeeHireDate: "2017-06-12T00:00:00Z",
  }),
  mk("u-pelin", "Pelin Avcı", "Export Sales Manager", "Sales", {
    employeeHireDate: "2019-11-04T00:00:00Z",
  }),
  mk("u-serkan", "Serkan Ateş", "Channel Sales Manager", "Sales", {
    officeLocation: "İzmir — Bayraklı",
    city: "İzmir",
    employeeHireDate: "2020-02-17T00:00:00Z",
  }),
  mk("u-sena", "Sena Uğur", "Sales Enablement Lead", "Sales", {
    employeeHireDate: "2021-03-01T00:00:00Z",
  }),
  // Keşfet'teki "aramıza katılanlar" duyurusundaki kişiler.
  mk("u-irmak", "Irmak Sezer", "Sales Executive", "Sales", {
    employeeHireDate: null,
  }),
  mk("u-tuna", "Tuna Kocaman", "Digital Marketing Specialist", "Marketing", {
    employeeHireDate: null,
  }),
  mk("u-derya", "Derya Önal", "Inside Sales Representative", "Sales", {
    employeeHireDate: null,
  }),
]

/** Kim kime bağlı (çalışan → yönetici kimliği). */
const MANAGER_OF = {
  [ME.id]: MANAGER.id,
  [MANAGER.id]: "u-nilgun",
  "u-nilgun": "u-levent",
  "u-oya": "u-levent",
  "u-banu": "u-levent",
  "u-kaan": "u-levent",
  "u-volkan": MANAGER.id,
  "u-pelin": MANAGER.id,
  "u-serkan": MANAGER.id,
  "u-sena": MANAGER.id,
  "u-irmak": "u-volkan",
  "u-derya": "u-pelin",
  "u-tuna": "u-ayse",
  "u-ayse": "u-nilgun",
  "u-onur": "u-nilgun",
  "u-can": "u-oya",
  "u-leyla": "u-banu",
  "u-elif": "u-kaan",
  "u-baris": "u-levent",
}
for (const p of TEAM) MANAGER_OF[p.id] = ME.id

/** Sicil ve işe giriş: persona'da olmayan alanlar demo için tamamlanır. */
function enrich(p, i) {
  const ext = String(1100 + i * 7).padStart(4, "0")
  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10) + "T00:00:00Z"
  const joinerHire = { "u-irmak": 9, "u-tuna": 6, "u-derya": 4 }[p.id]
  const hire = joinerHire ? daysAgo(joinerHire) : (p.employeeHireDate ?? "2021-06-01T00:00:00Z")
  return {
    ...p,
    employeeId: p.employeeId ?? `VG-${ext}`,
    employeeType: "Employee",
    employeeHireDate: hire,
    accountEnabled: true,
    usageLocation: "TR",
    preferredLanguage: p.preferredLanguage ?? "tr-TR",
    businessPhones: p.businessPhones?.length ? p.businessPhones : [`+90 212 000 ${ext.slice(0, 2)} ${ext.slice(2)}`],
    mobilePhone: p.mobilePhone ?? null,
    createdDateTime: hire,
    "@odata.type": "#microsoft.graph.user",
  }
}

/** Şirket dizini: oturumdaki kişi, yöneticisi, ekibi, iş arkadaşları ve ek kişiler. */
export const DIRECTORY = [ME, MANAGER, ...TEAM, ...COLLEAGUES, ...EXTRA].map(enrich)

const byKey = new Map()
for (const u of DIRECTORY) {
  byKey.set(u.id, u)
  byKey.set(u.mail.toLowerCase(), u)
  byKey.set(u.userPrincipalName.toLowerCase(), u)
}

/** Kimlik, posta ya da UPN ile dizin kaydı (şirket dışı adres → null). */
export function lookupUser(idOrMail) {
  if (!idOrMail) return null
  const raw = String(idOrMail).trim()
  return byKey.get(raw) ?? byKey.get(raw.toLowerCase()) ?? null
}

export const ME_USER = lookupUser(ME.id)

export function managerOf(user) {
  const id = MANAGER_OF[user?.id]
  return id ? lookupUser(id) : null
}

export function reportsOf(user) {
  if (!user) return []
  return DIRECTORY.filter((u) => MANAGER_OF[u.id] === user.id)
}

/**
 * Canlı durum — kişi başına sabit, saate göre biraz oynar (öğle arası, mesai dışı).
 * Graph `availability` + `activity` biçiminde.
 */
const PRESENCE = {
  "u-dogukan": ["Available", "Available"],
  "u-kerem": ["Busy", "InAMeeting"],
  "u-ece": ["Available", "Available"],
  "u-mert": ["Away", "Away"],
  "u-selin": ["Available", "Available"],
  "u-burak": ["Busy", "InACall"],
  "u-zeynep": ["Offline", "OffWork"],
  "u-ayse": ["Available", "Available"],
  "u-can": ["BeRightBack", "BeRightBack"],
  "u-leyla": ["Available", "Available"],
  "u-onur": ["Busy", "InAMeeting"],
  "u-elif": ["DoNotDisturb", "Presenting"],
  "u-baris": ["Away", "Away"],
  "u-nilgun": ["Busy", "InAMeeting"],
  "u-volkan": ["Available", "Available"],
  "u-pelin": ["Busy", "InACall"],
  "u-serkan": ["Away", "Away"],
}

export function presenceOf(user) {
  if (!user) return null
  const hour = new Date().getHours()
  let [availability, activity] = PRESENCE[user.id] ?? ["Available", "Available"]
  // Mesai dışında (20:00–07:00) herkes çevrimdışı görünür — oturumdaki kişi hariç.
  if ((hour >= 20 || hour < 7) && user.id !== ME.id) [availability, activity] = ["Offline", "OffWork"]
  return {
    "@odata.type": "#microsoft.graph.presence",
    id: user.id,
    availability,
    activity,
  }
}

/** Otomatik yanıtı açık olanlar (izin). */
export const AUTO_REPLIES = {
  "u-zeynep":
    "Merhaba, yıllık izindeyim ve pazartesi ofisteyim. Acil konular için Ece Yıldız'a (ece.yildiz@midea.com) yazabilirsiniz.",
}

/** Şirket dışı kişiler (müşteriler) — People API ve posta için. */
export const CONTACTS = CUSTOMERS.map((c) => ({
  displayName: c.contact,
  mail: c.mail,
  companyName: c.account,
  jobTitle: c.title,
}))

/**
 * Graph kullanıcı nesnesi `$select`e göre. Seçim yoksa tüm alanlar.
 * Graph seçilmeyen alanı göndermez; seçilip değeri olmayan alan `null` gelir.
 */
export function shapeUser(user, select) {
  if (!user) return null
  const fields = String(select ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (!fields.length) {
    const all = { ...user }
    delete all["@odata.type"]
    return all
  }
  const out = {}
  for (const f of fields) out[f] = user[f] === undefined ? null : user[f]
  return out
}
