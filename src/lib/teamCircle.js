/**
 * Ekibim'in ÇEVRESİ (saf) — Anasayfa'daki "Çevrem"in ekip tanımıyla aynı (`lib/myCircle.js`):
 * yöneticim + aynı yöneticiye bağlı olanlar + bana bağlı olanlar; ben hariç, her kişi bir kez.
 * Üyeler Graph'tan, Self Servis kişi biçiminde (`memberFromGraph`); kişi olmayan nesneler ve
 * kapalı hesaplar Graph eşlemesinde zaten düşer (`isTeamMember`).
 *
 * Her üyede `relation`: "report" (bana bağlı) · "manager" (yöneticim) · "peer" (aynı yöneticiye
 * bağlı). İlişki gizlilik kuralının anahtarı: izin türü ve bakiye YALNIZ "report"ta
 * (`lib/selfServiceTeamPrivacy.js`). Bilinmeyen ilişki en kısıtlısı sayılır ("peer").
 */
export const RELATION = Object.freeze({ report: "report", manager: "manager", peer: "peer" })

/** Üyenin ilişkisi; bilinmeyen ya da boş → "peer" (en kısıtlı). */
export function relationOf(member) {
  const r = member?.relation
  return r === RELATION.report || r === RELATION.manager ? r : RELATION.peer
}

/** Bana bağlı mı — izin türü ve bakiye yalnız bunda. */
export const isReport = (member) => member?.relation === RELATION.report

const lower = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase()

/**
 * Ekibi kurar: `reports` (bana bağlılar), `manager` (yöneticim, yoksa null), `peers`
 * (yöneticimin bağlıları — ben de içindeyim). `self` = `{ ids, addresses }`: dizin kimliğim ve
 * adreslerim, çıkarılır. Aynı kişi iki listede çıkarsa ilk ilişki kalır; öncelik bugünkü
 * davranışı korur: bana bağlı > yönetici > ekip arkadaşı. Sıra: bana bağlılar, yönetici, ekip
 * arkadaşları (listeler kendi içinde geldiği sırada — Graph eşlemesi ada göre dizer).
 */
export function buildTeam({ reports = [], manager = null, peers = [], self = {} } = {}) {
  const myIds = new Set((self.ids ?? []).map(lower).filter(Boolean))
  const myAddresses = new Set((self.addresses ?? []).map(lower).filter(Boolean))
  const seen = new Set()
  const out = []
  const add = (person, relation) => {
    if (!person) return
    const id = lower(person.id)
    const addresses = [person.address, person.upn].map(lower).filter(Boolean)
    if ((id && myIds.has(id)) || addresses.some((a) => myAddresses.has(a))) return
    const keys = [id && `id:${id}`, ...addresses.map((a) => `@${a}`)].filter(Boolean)
    if (!keys.length || keys.some((k) => seen.has(k))) return
    for (const k of keys) seen.add(k)
    out.push({ ...person, relation })
  }
  for (const p of reports ?? []) add(p, RELATION.report)
  add(manager, RELATION.manager)
  for (const p of peers ?? []) add(p, RELATION.peer)
  return out
}

/** Ekibin sayıları: `size` (herkes), `reports` (bana bağlı), `teammates` (yönetici + ekip arkadaşı). */
export function teamCounts(people) {
  const list = people ?? []
  const reports = list.filter(isReport).length
  return { size: list.length, reports, teammates: list.length - reports }
}

// Cevap beklenen, okunan ya da hiç sorulamayan (oturum yok): bunlar "okunamadı" değil.
const NOT_FAILED = new Set(["loading", "ready", "unauthenticated"])

/**
 * Üç Graph parçasının durumu (`{ reports, manager, peers }`) → `{ status, failed }`. Bir parça
 * bekleniyorsa "loading"; en az biri okunduysa "ready" (okunamayan boş sayılır); hiçbiri
 * okunamadıysa bana bağlıların durumu. `failed`: okunamayan parçaların adları (izin · ağ) —
 * ekran eksik listeyi söyler ve yeniden sorar; yönetici okunamazsa ekip arkadaşları da.
 */
export function teamStatus(parts) {
  const entries = Object.entries(parts ?? {})
  const statuses = entries.map(([, s]) => s)
  const status = statuses.includes("loading")
    ? "loading"
    : statuses.includes("ready")
      ? "ready"
      : (parts?.reports ?? statuses[0])
  const failed = entries.filter(([, s]) => !NOT_FAILED.has(s)).map(([name]) => name)
  return { status, failed }
}
