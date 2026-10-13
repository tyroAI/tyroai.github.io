import { toBalance, toLeave } from "@/lib/selfServiceModel"
import { NOT_ABSENCE_CODES } from "@/lib/selfServiceNames"
import { anyOf, chunks, quote } from "@/lib/selfServiceOdata"
import { leaveIssue } from "@/lib/selfServiceSanity"
import { visibleLeaves } from "@/lib/selfServiceTeamPrivacy"
import { isReport, relationOf } from "@/lib/teamCircle"

/**
 * Ekibim — ERP sorgularının SAF kurucuları ve cevap eşlemesi (istek yok; istekler
 * `selfServiceTeamApi.js`te). Kimlik Graph'tan gelir (`lib/teamCircle.js`: yönetici, ekip
 * arkadaşları, bana bağlılar); ERP'den YALNIZ izin bakiyesi ve izinler okunur, kişinin kendi
 * oturumuyla ve 20'lik `or` öbekleriyle (üye başına istek yok):
 *
 *   adres → sicil   `mserp_tryaiworkersentities` (UPN ve posta ikisi de; çoğu kişide farklı)
 *   izin bakiyesi   `mserp_tryaiallowancesummaryentities` (networkalias) — YALNIZ bana bağlılar
 *   izinler         `mserp_boraxallowancetransselfserviceentities` (sicil; bitiş ≥ yılbaşı ya da
 *                   bu haftanın Pazartesi'si, hangisi önceyse) — bütün ekip
 *
 * Seçimler tyraHR akışlarında birebir görülen kolonlar; izin açıklaması bilerek yok (gizlilik).
 * Bana bağlı olmayanın bakiyesi sorulmaz, izni eşlenirken türsüzleşir
 * (`lib/selfServiceTeamPrivacy.js`).
 */

export const WORKERS = "mserp_tryaiworkersentities"
export const BALANCES = "mserp_tryaiallowancesummaryentities"
export const LEAVES = "mserp_boraxallowancetransselfserviceentities"
const WORKER_SELECT = "mserp_userinfo_networkalias,mserp_borax_oldemplid"
export const LEAVE_SELECT =
  "mserp_boraxoldemplid,mserp_emplname,mserp_allowancetypeid,mserp_startdate,mserp_enddate,mserp_noofdays,mserp_noofhours"
export const LEAVE_TOP = 2000
// Bana bağlı olmayanın (yönetici, ekip arkadaşı) izni: tür ve saat kolonu HİÇ istenmez;
// devamsızlık olmayan türler ve gün altı kayıtlar ERP'de süzülür. Böylece izin türü (ör. sağlık
// verisi sayılan "Rapor") tarayıcıya hiç inmez — ağ cevabında da yok.
export const NEUTRAL_LEAVE_SELECT =
  "mserp_boraxoldemplid,mserp_startdate,mserp_enddate,mserp_noofdays"
const NEUTRAL_ONLY = [
  "mserp_noofdays ge 1",
  ...NOT_ABSENCE_CODES.map((code) => `mserp_allowancetypeid ne ${quote(code)}`),
].join(" and ")
// Bakiyeden yalnız eşleme adresi ve üç sayı: başkasının satırının öteki kolonları inmez.
export const BALANCE_SELECT =
  "mserp_networkalias,mserp_allowanceyearlyclaimday,mserp_allowanceyearlyusedday,mserp_allowanceyearlyremainday"

const text = (s) => String(s ?? "").trim()
const lower = (s) => text(s).toLowerCase()

/** Ekip üyesinin anahtarı: Graph nesne kimliği, yoksa adresi. */
export const memberKey = (person) => text(person?.id) || lower(person?.address)

/**
 * Graph üyeleri (`memberFromGraph` + `relation`) ya da `{ key, addresses, relation }` → ERP
 * girdisi `[{ key, addresses, employeeId, relation }]` (adresler küçük harf ve tekil; adressiz
 * üye çıkar; ilişkisi bilinmeyen en kısıtlısı, "peer").
 */
export function teamPeople(people) {
  return (people ?? [])
    .map((p) => ({
      key: p.key ?? memberKey(p),
      addresses: [...new Set([...(p.addresses ?? []), p.address, p.upn].map(lower))].filter(
        Boolean,
      ),
      employeeId: text(p.employeeId),
      relation: relationOf(p),
    }))
    .filter((p) => p.key && p.addresses.length)
}

/** Adres → sicil sorguları. */
export function workerQueries(people) {
  const addresses = [...new Set(people.flatMap((p) => p.addresses))]
  return chunks(addresses).map((part) => ({
    entity: WORKERS,
    params: { $select: WORKER_SELECT, $filter: anyOf("mserp_userinfo_networkalias", part) },
  }))
}

/**
 * Çalışan satırları → üyeler `{ [key]: { alias, personnel, relation, balance, leaves } }`.
 * Eşleşmeyen üyede `personnel: null`. Aynı adresle birden çok satır dönebilir: Graph'taki sicile
 * eşit olan, yoksa ilki.
 */
export function matchWorkers(people, rows) {
  const byAlias = new Map()
  for (const r of rows ?? []) {
    const alias = lower(r.mserp_userinfo_networkalias)
    const personnel = text(r.mserp_borax_oldemplid)
    if (!alias || !personnel) continue
    const found = byAlias.get(alias) ?? []
    if (!found.includes(personnel)) found.push(personnel)
    byAlias.set(alias, found)
  }
  const members = {}
  for (const p of people) {
    const alias = p.addresses.find((a) => byAlias.has(a)) ?? null
    const found = alias ? byAlias.get(alias) : []
    const personnel = found.includes(p.employeeId) ? p.employeeId : (found[0] ?? null)
    members[p.key] = { alias, personnel, relation: relationOf(p), balance: null, leaves: [] }
  }
  return members
}

const matched = (members) => Object.values(members ?? {}).filter((m) => m.personnel)

/**
 * Bakiye sorguları — YALNIZ bana bağlı, eşleşen üyelerin ERP adresiyle (kolonlar tyraHR akışında
 * doğrulanmış). Yöneticinin ve ekip arkadaşının bakiyesi hiç sorulmaz.
 */
export function balanceQueries(members) {
  const aliases = [
    ...new Set(
      matched(members)
        .filter(isReport)
        .map((m) => m.alias),
    ),
  ]
  return chunks(aliases).map((part) => ({
    entity: BALANCES,
    params: { $select: BALANCE_SELECT, $filter: anyOf("mserp_networkalias", part) },
  }))
}

/**
 * Bir öbek sicilin izin sorgusu: `from` (yerel `YYYY-MM-DD`) gününden bu yana biten ve gelecekteki
 * izinler (yılın türleri, çizelge, yaklaşan izinler). Sıra yeniden eskiye: `LEAVE_TOP` sınırı
 * yalnız en eski kayıtları keser. Tarih süzgeci tarih-saat değeriyle; kolon salt tarihse `fallback`.
 * `neutral`: bana bağlı olmayanlar için türsüz sorgu (`NEUTRAL_LEAVE_SELECT`).
 */
export function leaveQuery(personnels, from, { neutral = false } = {}) {
  const who = `(${anyOf("mserp_boraxoldemplid", personnels)})`
  const only = neutral ? ` and ${NEUTRAL_ONLY}` : ""
  return {
    entity: LEAVES,
    params: {
      $select: neutral ? NEUTRAL_LEAVE_SELECT : LEAVE_SELECT,
      $filter: `${who} and mserp_enddate ge ${from}T00:00:00Z${only}`,
      $orderby: "mserp_startdate desc",
      $top: LEAVE_TOP,
    },
    fallback: { $filter: `${who} and mserp_enddate ge ${from}${only}` },
  }
}

/**
 * Eşleşen üyelerin sicilleri, 20'lik öbekler — bana bağlılar (`neutral: false`) ve öteki üyeler
 * (`neutral: true`, türsüz sorgu) ayrı öbeklerde. Aynı sicil iki grupta olamaz; bana bağlı önce.
 */
export function leaveChunks(members) {
  const list = matched(members)
  const reports = [...new Set(list.filter(isReport).map((m) => m.personnel))]
  const others = [...new Set(list.filter((m) => !isReport(m)).map((m) => m.personnel))].filter(
    (p) => !reports.includes(p),
  )
  return [
    ...chunks(reports).map((part) => ({ part, neutral: false })),
    ...chunks(others).map((part) => ({ part, neutral: true })),
  ]
}

/** Bütün öbeklerin izin sorguları. */
export const leaveQueries = (members, from) =>
  leaveChunks(members).map(({ part, neutral }) => leaveQuery(part, from, { neutral }))

const copy = (members) =>
  Object.fromEntries(Object.entries(members ?? {}).map(([k, m]) => [k, { ...m }]))

/** Bakiye satırlarını bana bağlı üyelere ekler (yeni nesne; üye başına ilk satır). */
export function withBalances(members, rows) {
  const out = copy(members)
  const byAlias = new Map(
    matched(out)
      .filter(isReport)
      .map((m) => [m.alias, m]),
  )
  for (const r of rows ?? []) {
    const m = byAlias.get(lower(r.mserp_networkalias))
    if (m && !m.balance) m.balance = toBalance(r)
  }
  return out
}

/**
 * İzin satırlarını üyelere ekler (yeni nesne; `toLeave`, başlangıca göre). GİZLİLİK: bana bağlı
 * olmayanın kaydı burada türsüzleşir (`visibleLeaves`) — önbelleğe ve ekrana tür, saat gitmez.
 */
export function withLeaves(members, rows) {
  const out = copy(members)
  const byPersonnel = new Map(matched(out).map((m) => [m.personnel, m]))
  const raw = new Map([...byPersonnel].map(([p, m]) => [p, [...(m.leaves ?? [])]]))
  for (const r of rows ?? []) {
    const leave = toLeave(r)
    // Tutarsız kayıt (ör. tek güne 50 gün) ekibin görünümüne de girmez.
    if (!leaveIssue(leave)) raw.get(text(r.mserp_boraxoldemplid))?.push(leave)
  }
  for (const [personnel, list] of raw) {
    const m = byPersonnel.get(personnel)
    m.leaves = visibleLeaves(m, list).sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
  }
  return out
}
