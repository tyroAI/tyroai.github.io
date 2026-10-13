import { leaveReport } from "@/lib/selfServiceReport"
import { isAbsence, leaveTypeName } from "@/lib/selfServiceNames"
import { countsInTotals } from "@/lib/selfServiceStatus"
import { isPartial, visibleLeaves } from "@/lib/selfServiceTeamPrivacy"
import { memberKey } from "@/lib/selfServiceTeamQuery"
import { isReport, RELATION, relationOf } from "@/lib/teamCircle"

/**
 * Ekibim — ekibin izin görünümü için saf hesaplar. Üye: `{ key, leaves }` (Graph üyesi +
 * `fetchTeamLeave`in izinleri). "İzinde" yalnız tam günlük gerçek devamsızlık: Dış Görev, Kart
 * Unutuldu ve Evden Çalışma sayılmaz (`isAbsence`), saatlik kayıt (vizite gibi) da sayılmaz;
 * bana bağlılarda çizelgede ve yaklaşan izinlerde yine görünürler (`absence`, `partial`).
 * Yöneticinin ve ekip arkadaşlarının izinleri türsüz gelir (`neutral`).
 */

const DAY = 86400000
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const endOf = (r) => r.end ?? r.start
const valid = (leaves) => (leaves ?? []).filter((r) => r.start && countsInTotals(r))

// Gün altı kayıt: çizelgede çubuk değil nokta, "izinde" sayılmaz (kural gizlilik modülünde).
export { isPartial }

const absences = (leaves) => valid(leaves).filter((r) => isAbsence(r) && !isPartial(r))

/** İzin `[from, to]` günleriyle kesişiyor mu. */
export const overlaps = (r, from, to) => r.start <= to && endOf(r) >= from

/** Haftanın başı (Pazartesi). */
export function weekStart(date) {
  const day = startOfDay(date)
  return addDays(day, -((day.getDay() + 6) % 7))
}

/**
 * İzin sorgusunun alt sınırı (yerel `YYYY-MM-DD`): yılbaşı ya da bu haftanın Pazartesi'si, hangisi
 * önceyse — Ocak'ın ilk günlerinde çizelgenin ve "bu hafta"nın Aralık günleri de gelsin.
 */
export function leaveFrom(now = new Date()) {
  const jan1 = new Date(now.getFullYear(), 0, 1)
  const monday = weekStart(now)
  const d = monday < jan1 ? monday : jan1
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Kişinin izin durumu: `current` bugünü kapsayan izin (ve `until` bitişi), `next` bugünden
 * sonra başlayan ilk izin.
 */
export function memberStatus(leaves, now = new Date()) {
  const today = startOfDay(now)
  const list = absences(leaves)
  const current = list.find((r) => overlaps(r, today, today)) ?? null
  const next = list.filter((r) => r.start > today).sort((a, b) => a.start - b.start)[0] ?? null
  return { current, until: current ? endOf(current) : null, next }
}

/**
 * Ekip özeti: `today` bugün izinde, `thisWeek` bu hafta (Pzt–Paz) izni olan kişi sayısı ve
 * anahtarları (`todayKeys`, `weekKeys`), `size`, haftanın sınırları (`week`).
 */
export function teamSummary(members, now = new Date()) {
  const today = startOfDay(now)
  const from = weekStart(today)
  const to = addDays(from, 6)
  const todayKeys = []
  const weekKeys = []
  for (const m of members ?? []) {
    const list = absences(m.leaves)
    if (list.some((r) => overlaps(r, today, today))) todayKeys.push(m.key)
    if (list.some((r) => overlaps(r, from, to))) weekKeys.push(m.key)
  }
  return {
    size: members?.length ?? 0,
    today: todayKeys.length,
    thisWeek: weekKeys.length,
    todayKeys,
    weekKeys,
    week: { from, to },
  }
}

const index = (first, date) => Math.round((startOfDay(date) - first) / DAY)

/**
 * Zaman çizelgesi: `weeks` haftalık gün sütunları (`days[i]` = `{ date, weekend, today, past }`),
 * hafta başları (`weekStarts`: sütun sırası ve tarih) ve her üye için izinler sütun aralığı
 * (`segments` = `[{ from, to, record, absence, partial }]`, uçlar pencereye kırpılmış).
 * `start`: "today" (bugünden) ya da "week" (bu haftanın Pazartesi'sinden; bugün ilk haftada).
 */
export function teamTimeline(members, now = new Date(), { weeks = 6, start = "today" } = {}) {
  const today = startOfDay(now)
  const first = start === "week" ? weekStart(today) : today
  const n = weeks * 7
  const days = Array.from({ length: n }, (_, i) => {
    const date = addDays(first, i)
    return {
      date,
      weekend: date.getDay() === 0 || date.getDay() === 6,
      today: date.getTime() === today.getTime(),
      past: date < today,
    }
  })
  const weekStarts = days
    .map((d, i) => ({ index: i, date: d.date }))
    .filter((d) => d.index === 0 || d.date.getDay() === 1)
  const last = days[n - 1].date
  const rows = (members ?? []).map((m) => ({
    key: m.key,
    segments: valid(m.leaves)
      .filter((r) => overlaps(r, first, last))
      .sort((a, b) => a.start - b.start)
      .map((r) => ({
        from: Math.max(0, index(first, r.start)),
        to: Math.min(n - 1, index(first, endOf(r))),
        record: r,
        absence: isAbsence(r),
        partial: isPartial(r),
      })),
  }))
  return { days, weekStarts, rows }
}

/**
 * Önümüzdeki `weeks` haftadaki izinler (bugünü kapsayanlar dahil), başlangıca göre: telefonun
 * çizelge yerine listesi. `[{ key, record, current, absence, partial }]`.
 */
export function upcomingLeaves(members, now = new Date(), { weeks = 6 } = {}) {
  const today = startOfDay(now)
  const last = addDays(today, weeks * 7 - 1)
  const out = []
  for (const m of members ?? [])
    for (const r of valid(m.leaves))
      if (overlaps(r, today, last))
        out.push({
          key: m.key,
          record: r,
          current: overlaps(r, today, today),
          absence: isAbsence(r),
          partial: isPartial(r),
        })
  return out.sort((a, b) => a.record.start - b.record.start || String(a.key).localeCompare(b.key))
}

/**
 * Üyenin yılı: türe göre kırılım (`leaveReport` — gün, saat, kayıt), devamsızlık günleri ve
 * yaklaşan izinleri (bugünden sonra başlayan, tarih sırasıyla).
 */
export function memberYear(leaves, year, now = new Date()) {
  const today = startOfDay(now)
  const list = valid(leaves)
  const { byType } = leaveReport(list, year)
  const absenceDays = list
    .filter((r) => r.start.getFullYear() === year && isAbsence(r))
    .reduce((n, r) => n + (r.days ?? 0), 0)
  const upcoming = list.filter((r) => r.start > today).sort((a, b) => a.start - b.start)
  return { byType, absenceDays, upcoming }
}

/** Ekibin bölümleri: "reports" (bana bağlı olanlar) ve "teammates" (yönetici + ekip arkadaşları). */
export const groupOf = (row) => (isReport(row) ? "reports" : "teammates")

// Hiyerarşi yukarıdan aşağıya: yönetici, ekip arkadaşları, bana bağlı olanlar; aynı basamakta
// ada göre (Türkçe harf sırası: Ç, Ğ, İ, Ö, Ş, Ü yerinde).
const RANK = { [RELATION.manager]: 0, [RELATION.peer]: 1, [RELATION.report]: 2 }
const byName = new Intl.Collator("tr", { sensitivity: "base" })
const nameOf = (row) => String(row.person?.name ?? row.person?.displayName ?? "")
const ranked = (a, b) => RANK[a.relation] - RANK[b.relation] || byName.compare(nameOf(a), nameOf(b))

/**
 * Ekibim'in görünüm verisi: Graph üyeleri (`people`, `relation` ile) + ERP izin cevabı
 * (`leave.members`) → satırlar (`{ key, person, relation, personnel, matched, balance, leaves,
 * status }`; bana bağlılarda izin türü adı `t` ile), bölümler (`groups`: boş olanı yok), özet
 * (+ ortalama kalan yıllık izin YALNIZ bana bağlılardan; `reports`, `teammates`), haftaya hizalı
 * çizelge (listeyle aynı sıra: hiyerarşi, sonra ad) ve yaklaşan izinler (tarih sırası). Gizlilik kuralı
 * burada da uygulanır: bana bağlı olmayanın bakiyesi yok, izni türsüz.
 */
export function teamOverview(people, leave, { now = new Date(), t } = {}) {
  const members = leave?.members ?? {}
  const rows = (people ?? []).map((person) => {
    const key = memberKey(person)
    const relation = relationOf(person)
    const m = members[key]
    const report = relation === RELATION.report
    const leaves = visibleLeaves({ relation }, m?.leaves).map((r) =>
      report && t ? { ...r, typeName: leaveTypeName(r.type, t) } : r,
    )
    return {
      key,
      person,
      relation,
      personnel: String(person.employeeId ?? "").trim() || m?.personnel || "",
      matched: Boolean(m?.personnel),
      balance: report ? (m?.balance ?? null) : null,
      leaves,
      status: memberStatus(leaves, now),
    }
  })
  const input = rows.map((r) => ({ key: r.key, leaves: r.leaves }))
  const reports = rows.filter(isReport)
  const remains = reports.map((r) => r.balance?.remain).filter((n) => n != null)
  const timeline = teamTimeline(input, now, { start: "week" })
  // Liste ve çizelge aynı sırada: hiyerarşi (yönetici, ekip arkadaşları, bana bağlılar), sonra ad.
  const listed = [...rows].sort(ranked)
  const order = new Map(listed.map((r, i) => [r.key, i]))
  timeline.rows = [...timeline.rows].sort((a, b) => order.get(a.key) - order.get(b.key))
  const groups = ["teammates", "reports"]
    .map((id) => ({ id, rows: listed.filter((r) => groupOf(r) === id) }))
    .filter((g) => g.rows.length)
  return {
    rows: listed,
    groups,
    summary: {
      ...teamSummary(input, now),
      reports: reports.length,
      teammates: rows.length - reports.length,
      avgRemain: remains.length ? remains.reduce((a, b) => a + b, 0) / remains.length : null,
    },
    timeline,
    upcoming: upcomingLeaves(input, now),
  }
}
