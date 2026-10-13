// Demo — İK ortamının (`hr.tyro.invalid`) çalışan kütüğü. TÜMÜ KURGUSAL.
//
// TEK KAYNAK: şirket dizini (`people-directory.js` — Graph'ın da okuduğu liste). Sicil
// numarası (`employeeId`) ve işe giriş tarihi oradan alınır; böylece profil kartında
// görünen sicil ile ERP satırındaki sicil, Graph'taki işe giriş ile İK'daki kıdem
// tarihi AYNI olur. Dizin okunamazsa persona listesine düşülür.
//
// Dizinde olmayan bir şirket adresi sorulursa (ör. sonradan beliren bir ekip
// arkadaşı) kayıt ADRESTEN KARARLI biçimde türetilir — ekran o kişiyi de "ERP'de kayıt
// yok" yerine gerçek bir çalışan gibi görür.
import { DEMO_DOMAIN, ME, PEOPLE, TEAM } from "@/demo/persona"
import * as directory from "./people-directory"
import { stableGuid } from "./dataverse-odata"

export const LEGAL_ENTITY = "VGTR"

/** ERP'nin unvan kodu (BÜYÜK harf, ASCII) — profil başlığı Graph boşsa kullanır. */
const TITLE_CODE = {
  "Sales Manager": "SATIS MUDURU",
  "Sales Director": "SATIS DIREKTORU",
  "Key Account Manager": "KILIT MUSTERI YONETICISI",
  "Senior Sales Executive": "KIDEMLI SATIS UZMANI",
  "Sales Executive": "SATIS UZMANI",
  "Sales Operations Specialist": "SATIS OPERASYON UZMANI",
  "Business Development Specialist": "IS GELISTIRME UZMANI",
}

/** Doğum tarihi dizinde yok — kişi başına sabit (ekip üyeleri persona'dan gelir). */
const BIRTH = {
  "u-kerem": "1979-04-27",
  "u-ayse": "1986-06-09",
  "u-can": "1990-01-30",
  "u-leyla": "1984-08-22",
  "u-onur": "1991-03-18",
  "u-elif": "1993-05-05",
  "u-baris": "1985-12-29",
}

const upperTr = (s) => String(s ?? "").toLocaleUpperCase("tr")
const dateOnly = (iso) => (iso ? String(iso).slice(0, 10) : null)
const pad = (n) => String(n).padStart(2, "0")
const localIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  return h
}

/** Kararlı sahte doğum tarihi (gün-ay adresten). */
function hashedBirth(seed) {
  const h = hash(seed)
  return `${1978 + (h % 20)}-${pad(1 + ((h >> 6) % 12))}-${pad(1 + ((h >> 10) % 28))}`
}

/** Yerel gün + `days` (gece yarısı). */
export function dayFrom(now, days) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
}

/**
 * Ekibimden en az birinin doğum günü bu hafta (bugün dahil 7 gün) içinde olsun:
 * persona tarihleri sabit, demo ise her gün açılıyor. Hiçbiri pencerede değilse
 * ilk ekip üyesinin doğum günü (gün-ay) BUGÜN + 3'e kaydırılır.
 */
function teamBirthdays(now) {
  const today = dayFrom(now, 0)
  const within = (iso) => {
    const [, m, d] = String(iso).slice(0, 10).split("-").map(Number)
    for (const y of [now.getFullYear(), now.getFullYear() + 1]) {
      const diff = Math.round((new Date(y, m - 1, d) - today) / 86400000)
      if (diff >= 0) return diff <= 6
    }
    return false
  }
  const map = Object.fromEntries(TEAM.map((p) => [p.id, dateOnly(p.birthday)]))
  if (!TEAM.some((p) => p.birthday && within(p.birthday))) {
    const first = TEAM[0]
    const shifted = dayFrom(now, 3)
    map[first.id] = `${String(first.birthday).slice(0, 4)}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`
  }
  return map
}

/** Dizin (yoksa persona) kişileri. */
function directoryPeople() {
  const dir = Array.isArray(directory.DIRECTORY) ? directory.DIRECTORY : []
  return dir.length ? dir : PEOPLE
}

/** Dizindeki bir kişinin İK kaydı. */
function personRecord(p, teamBirth) {
  const alias = String(p.userPrincipalName ?? p.mail).toLowerCase()
  return {
    id: p.id,
    personnel: String(p.employeeId ?? `VG-2${String(hash(alias) % 1000).padStart(3, "0")}`).toUpperCase(),
    alias,
    name: p.displayName,
    title: p.jobTitle,
    birth: teamBirth[p.id] ?? dateOnly(p.birthday) ?? BIRTH[p.id] ?? hashedBirth(alias),
    since: dateOnly(p.employeeHireDate),
  }
}

/** Dizinde olmayan bir şirket adresi için kararlı sahte kayıt. */
function syntheticRecord(alias) {
  const h = hash(alias)
  const local = alias.split("@")[0]
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr") + w.slice(1))
    .join(" ")
  return {
    id: `x-${local}`,
    personnel: `VG-2${String(h % 1000).padStart(3, "0")}`,
    alias,
    name: name || "Çalışan",
    title: "Uzman",
    birth: hashedBirth(alias),
    since: `${2013 + ((h >> 3) % 11)}-${pad(1 + ((h >> 13) % 12))}-${pad(1 + ((h >> 17) % 28))}`,
  }
}

const synthetic = new Map() // adres → kayıt (bir kez türetilir, sicilden de bulunur)

/** Bugünün dizin kayıtları. */
export function personaRecords(now = new Date()) {
  const teamBirth = teamBirthdays(now)
  return directoryPeople().map((p) => personRecord(p, teamBirth))
}

/** Adres → kayıt (dizindeki ya da şirket alanındaki herhangi bir adres). */
export function recordForAlias(alias, now = new Date()) {
  const key = String(alias ?? "").trim().toLowerCase()
  if (!key) return null
  const known = personaRecords(now).find((r) => r.alias === key)
  if (known) return known
  if (!key.endsWith(`@${DEMO_DOMAIN}`)) return null
  if (!synthetic.has(key)) synthetic.set(key, syntheticRecord(key))
  return synthetic.get(key)
}

/** Sicil → kayıt. */
export function recordForPersonnel(personnel, now = new Date()) {
  const key = String(personnel ?? "").trim().toUpperCase()
  return (
    personaRecords(now).find((r) => r.personnel === key) ??
    [...synthetic.values()].find((r) => r.personnel === key) ??
    null
  )
}

/** Bütün bilinen kayıtlar (dizin + şimdiye dek türetilenler). */
export function allRecords(now = new Date()) {
  return [...personaRecords(now), ...synthetic.values()]
}

/** Oturumdaki kişinin sicili (dizinden; yoksa persona). */
export function mePersonnel(now = new Date()) {
  return personaRecords(now).find((r) => r.id === ME.id)?.personnel ?? ME.employeeId
}

/** `mserp_tryaiworkersentities` satırı. */
export function workerRow(rec) {
  return {
    mserp_tryaiworkersentityid: stableGuid(`worker:${rec.alias}`),
    mserp_userinfo_networkalias: rec.alias,
    mserp_borax_oldemplid: rec.personnel,
    mserp_hcmworker_personnelnumber: rec.personnel,
    mserp_dirperson_name: upperTr(rec.name),
    mserp_hcm_titleid: TITLE_CODE[rec.title] ?? upperTr(rec.title),
    mserp_position_description: rec.title,
  }
}

// ── Şirket geneli tebrik kütüğü ─────────────────────────────────────────
// Anasayfa'nın "Tebrikler" şeridi için dizin dışında da çalışanlar: doğum günü ve
// iş yıl dönümleri BUGÜNE göre dağıtılır ki şerit her gün dolu görünsün.
// [ad, unvan, doğum günü (gün farkı), { kıdem gün farkı, dolan yıl }]
const COMPANY_STAFF = [
  ["Orhan Ceylan", "Finans Müdürü", 0, { s: 41, y: 6 }],
  ["Melis Arıkan", "Pazarlama Uzmanı", 1, { s: 120, y: 3 }],
  ["Arda Yavuz", "Lojistik Planlama Uzmanı", 3, { s: 2, y: 4 }],
  ["Duygu Erol", "Muhasebe Uzmanı", 5, { s: 200, y: 2 }],
  ["Tuncay Bilgin", "Depo Operasyon Şefi", 8, { s: 6, y: 10 }],
  ["Ebru Kılınç", "İK Uzmanı", 10, { s: 90, y: 7 }],
  ["Erkan Özkan", "Satın Alma Müdürü", 13, { s: 11, y: 15 }],
  ["Gamze Yücel", "Ürün Uzmanı", 47, { s: 0, y: 1 }],
  ["Hasan Uçar", "BT Destek Uzmanı", 70, { s: 9, y: 2 }],
  ["Volkan Şimşek", "Bölge Satış Müdürü", 210, { s: 13, y: 8 }],
  ["Nihan Yalın", "Kurumsal İletişim Uzmanı", 260, { s: 300, y: 5 }],
]

function staffAlias(name) {
  const local = name
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/\s+/g, ".")
  return `${local}@${DEMO_DOMAIN}`
}

/** `mserp_tryhcmemploymentdetaildomesticactiveviewentities` satırları. */
export function hrViewRows(now = new Date()) {
  const view = (key, personnel, name, mail, birth, since, title) => ({
    mserp_tryhcmemploymentdetaildomesticactiveviewentityid: stableGuid(`hv:${key}`),
    mserp_personnelnumber: personnel,
    mserp_name: upperTr(name),
    mserp_mail: mail,
    mserp_birthdate: birth ? `${birth}T00:00:00Z` : null,
    mserp_senioritydate: since ? `${since}T00:00:00Z` : null,
    mserp_positiondescription: title,
    mserp_boraxrank: 200000001,
    mserp_workerstatus: 200000001,
  })
  const rows = allRecords(now).map((r) =>
    view(r.alias, r.personnel, r.name, r.alias, r.birth, r.since, r.title),
  )
  COMPANY_STAFF.forEach(([name, title, birthIn, sen], i) => {
    const birthDay = dayFrom(now, birthIn)
    const senDay = dayFrom(now, sen.s)
    rows.push(
      view(
        `staff:${i}`,
        `VG-3${100 + i}`,
        name,
        staffAlias(name),
        `${1982 + ((i * 3) % 16)}-${localIso(birthDay).slice(5)}`,
        `${senDay.getFullYear() - sen.y}-${localIso(senDay).slice(5)}`,
        title,
      ),
    )
  })
  return rows
}
