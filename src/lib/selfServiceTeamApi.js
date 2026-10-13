import { list, listSafe, token } from "@/lib/selfServiceHttp"
import { leaveFrom } from "@/lib/selfServiceTeam"
import {
  balanceQueries,
  LEAVE_TOP,
  leaveChunks,
  leaveQuery,
  matchWorkers,
  teamPeople,
  withBalances,
  withLeaves,
  workerQueries,
} from "@/lib/selfServiceTeamQuery"

/**
 * Ekibim — ekibin İZİN bilgisini ERP'den okur (yalnız bakiye ve izinler; masraf, avans ve izin
 * açıklaması okunmaz). Sorgular ve eşleme saf `selfServiceTeamQuery.js`te; burada yalnız istek.
 * Bakiye yalnız bana bağlılar için sorulur; yöneticinin ve ekip arkadaşlarının izni eşlenirken
 * türsüzleşir (`selfServiceTeamPrivacy.js`).
 *
 * ⚠️ Yetki ERP'de: Dataverse rolü "kendi kaydı" kapsamındaysa sorgu 401/403 (`denied`) ya da boş
 * (`empty`) döner; ekran kibarca söyler, ekip listesi Graph'tan yine görünür. Rol kurum
 * genelindeyse tek kapı istemcideki Graph ekip listesi (docs/features/self-servis-ekibim.md).
 */

/**
 * Bir öbeğin izinleri. Cevap `LEAVE_TOP` sınırına değdiyse kayıt kesilmiş olabilir: öbek ikiye
 * bölünüp yeniden sorulur (tek kişide sınır kalırsa yalnız en eski kayıtlar düşer).
 */
async function chunkLeaves(auth, personnels, from, neutral) {
  const q = leaveQuery(personnels, from, { neutral })
  const rows = await listSafe(auth, q.entity, q.params, q.fallback)
  if (rows.length < LEAVE_TOP || personnels.length < 2) return rows
  const mid = Math.ceil(personnels.length / 2)
  const parts = await Promise.all([
    chunkLeaves(auth, personnels.slice(0, mid), from, neutral),
    chunkLeaves(auth, personnels.slice(mid), from, neutral),
  ])
  return parts.flat()
}

/**
 * `people`: Graph üyeleri (`relation` ile) ya da `[{ key, addresses: [posta, UPN], employeeId?,
 * relation? }]`. Dönüş `{ status, members, failed }` — `status`: "ready" ya da "empty" (ERP'de
 * kimse eşleşmedi ya da rol göstermedi); `members[key]` = `{ alias, personnel, relation, balance,
 * leaves }`; `failed`: düşen bölümler ("balance" · "leaves"). Yetki reddi
 * `SelfServiceError("denied")`.
 */
export async function fetchTeamLeave(people, { now = new Date(), interactive = false } = {}) {
  const auth = await token(interactive)
  const input = teamPeople(people)
  const workerRows = await Promise.all(
    workerQueries(input).map((q) => list(auth, q.entity, q.params)),
  )
  const members = matchWorkers(input, workerRows.flat())
  if (!Object.values(members).some((m) => m.personnel))
    return { status: "empty", members, failed: [] }

  const failed = new Set()
  // Bir öbek düşerse öteki bölüm yine gelir; yetki reddi ise bütünüyle `denied`.
  const rowsOf = (name, jobs) =>
    Promise.all(
      jobs.map((job) =>
        job.catch((err) => {
          if (err?.kind === "denied") throw err
          failed.add(name)
          return []
        }),
      ),
    ).then((parts) => parts.flat())

  const [balanceRows, leaveRows] = await Promise.all([
    rowsOf(
      "balance",
      balanceQueries(members).map((q) => list(auth, q.entity, q.params)),
    ),
    rowsOf(
      "leaves",
      leaveChunks(members).map(({ part, neutral }) =>
        chunkLeaves(auth, part, leaveFrom(now), neutral),
      ),
    ),
  ])
  return {
    status: "ready",
    members: withLeaves(withBalances(members, balanceRows), leaveRows),
    failed: [...failed],
  }
}
