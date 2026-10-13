import { kqlPhrase, pathKql } from "@/lib/filesQuery"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  DOSYALARIM — "BEN KİMİM?" KİMLİK BASAMAĞI (spec §7.4)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * "Son çalıştıkların" listesi ve "Kişi = Sen" süzgeci aynı soruyu soruyor:
 * kiracının arama dizini BU kişiyi hangi adla tanıyor? `EditorOWSUSER` /
 * `AuthorOWSUSER` bir ADRES taşıyor ve hangisi olduğu (giriş adı mı posta
 * mı) CANLI KİRACIDA ÖLÇÜLMEDİ — kiracıda 801 kişinin 237'sinde ikisi
 * farklı, yani yanlış adres o kişilerde SESSİZCE sıfır sonuç demek.
 *
 *   upn       MSAL `username` (giriş adı)
 *   mail      Graph `/me.mail` — YALNIZ UPN'den farklıysa (büyük/küçük harf
 *             duyarsız); aynıysa aynı sorgu iki kez sorulmaz
 *   onedrive  `path:"<kişinin OneDrive kökü>"` — kimlik değil KONUM: son
 *             liste "OneDrive'ında son değişenler" olur (başlık bunu söyler),
 *             "Sen" yalnız OneDrive'ı kapsar (`notice.personOneDrive`) ve
 *             "Başkaları" SORULAMAZ (`othersAvailable` → false)
 *
 * ⚠️ **BASAMAK İNME ŞARTI İKİ TANE.** (1) İlk sayfa HAZIR ama BOŞ: çözülemeyen
 * bir kişi kısıtı hata değil sıfır döndürüyor ve o sıfır bir yalan olurdu.
 * (2) Sorgu yetenek basamağından sonra da REDDEDİLDİ (`rejected`,
 * `lib/filesLadder.js`): kısıtın özelliği sorgulanamıyor — bir YETENEK
 * suçlanmaz, kimlik bir alt basamağa iner. OneDrive basamağının sıfırı
 * GERÇEK sıfırdır (son basamak). İzin (`denied`), sunucu ya da ağ hatası
 * basamak İNDİRMEZ: soramadık ≠ yok.
 *
 * ⚠️ **HESAP BAŞINA, OTURUM BOYUNCA, YALNIZ BELLEKTE.** Bulunan basamak ve
 * elenenler `homeAccountId` anahtarlı; çıkışta düşer (`resetRecentFilesRung`,
 * msal.js). Bir sonraki açılış basamağı yeniden aramaz.
 *
 * ⚠️ **POSTA ADRESİ TEMBEL.** Çağıran vermezse (`ids.mail === undefined`)
 * `/me` YALNIZ upn basamağı düştüğünde bir kez sorulur — upn'in tuttuğu
 * yaygın durumda açılışa istek eklenmesin (§7.6: Home ≤ 4 istek).
 *
 * Saf modül (ağ yok): denemeyi (`attempt`) ve posta okumayı (`fetchMail`)
 * çağıran veriyor — Node'da sınanabilsin.
 */

const READY = "ready"
export const MINE_RUNGS = ["upn", "mail", "onedrive"]

/** homeAccountId → { rung, failed: Set, values: {}, mail: undefined | string } */
const state = new Map()
/** homeAccountId → yolda olan yoklama (aynı anda iki yoklama açılmasın) */
const probes = new Map()
const listeners = new Set()
/** Çıkışta artar: yolda olan bir yürüyüş çıkıştan SONRA eski hesaba yazamasın. */
let epoch = 0

function entry(accountKey) {
  let e = state.get(accountKey)
  if (!e) {
    e = { rung: null, failed: new Set(), values: {}, mail: undefined }
    state.set(accountKey, e)
  }
  return e
}

function emit() {
  for (const fn of [...listeners]) fn()
}

/** `useSyncExternalStore` aboneliği — basamak bilinince (ya da çıkışta) haber verir. */
export function subscribeMineRung(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Bu hesabın bulunmuş basamağı: `"upn" | "mail" | "onedrive" | null` (henüz bilinmiyor). */
export function mineRungFor(account) {
  const k = account?.homeAccountId
  return k ? (state.get(k)?.rung ?? null) : null
}

/**
 * Bulunmuş basamak ve adresleri: `address` kazanan basamağın değeri (UPN,
 * posta ya da OneDrive kökü), `mail` yürüyüşün öğrendiği posta adresi (yalnız
 * upn düştüyse sorulmuş olur). `isMine`in `me.mail`i için: 237 kişide posta
 * UPN'den farklı ve arama isabetinin kimliği çoğu zaman yalnız adres taşıyor.
 * Tepkisel DEĞİL — basamak bilinince yeniden çizen `useMineRung` ile birlikte okunur.
 */
export function mineAddressesFor(account) {
  const e = account?.homeAccountId ? state.get(account.homeAccountId) : null
  return {
    rung: e?.rung ?? null,
    address: e?.rung ? (e.values[e.rung] ?? "") : "",
    mail: e?.mail || "",
  }
}

/** Çıkış (msal.js LOGOUT_SUCCESS): bütün hesapların basamağı ve yoklamaları. */
export function resetRecentFilesRung() {
  epoch += 1
  state.clear()
  probes.clear()
  emit()
}

/** Teşhis/sınama: bellekte kaç hesap kaydı var (çıkıştan sonra 0 olmalı — U16). */
export function mineRungStateSize() {
  return state.size + probes.size
}

/** "Başkaları" bu basamakta sorulabilir mi? OneDrive basamağında HAYIR — bir yol "ben değil"i söyleyemez. */
export function othersAvailable(rung) {
  return rung !== "onedrive"
}

/** "Benim" kısıtı: son liste ve "Kişi = Sen". */
export function mineKql(rung) {
  const value = String(rung?.value ?? "").trim()
  if (!value) return ""
  if (rung.id === "onedrive") return pathKql(value)
  const who = kqlPhrase(value)
  return `(EditorOWSUSER:${who} OR AuthorOWSUSER:${who})`
}

/** "Başkaları" kısıtı — OneDrive basamağında YOK (`""`). */
export function othersKql(rung) {
  const value = String(rung?.value ?? "").trim()
  if (!value || rung.id === "onedrive") return ""
  return `-EditorOWSUSER:${kqlPhrase(value)}`
}

/**
 * Kişi süzgecinin sunucu kısıtı ve ne olduğu.
 * @returns {{ clause: string, applied: boolean, unavailable: boolean }}
 *   `applied`: kısıt SUNUCUYA gitti (istemci yeniden sınamaz);
 *   `unavailable`: "Başkaları" OneDrive basamağında sorulamadı (süzme yalnız
 *   yüklenenlerde, çağıran `fp=others`ı düşürmeli).
 */
export function personClauseFor(person, rung) {
  if (!person || !rung) return { clause: "", applied: false, unavailable: false }
  const clause = person === "me" ? mineKql(rung) : person === "others" ? othersKql(rung) : ""
  return {
    clause,
    applied: Boolean(clause),
    unavailable: person === "others" && rung.id === "onedrive",
  }
}

function sameAddress(a, b) {
  return (
    String(a ?? "")
      .trim()
      .toLowerCase() ===
    String(b ?? "")
      .trim()
      .toLowerCase()
  )
}

/**
 * Bulunmuş basamak ve ŞU ANKİ değeri (`{ id, value }`); bilinmiyorsa `null`.
 * OneDrive basamağında değer kök adresi — henüz yüklenmediyse `value: ""`.
 */
export function knownRung(accountKey, ids = {}) {
  const e = state.get(accountKey)
  if (!e?.rung) return null
  const value =
    e.rung === "onedrive"
      ? String(ids.myRoot || e.values.onedrive || "")
      : String(e.values[e.rung] || "")
  return { id: e.rung, value }
}

/**
 * OneDrive basamağı kök adresini bekliyor. Sürücü okunuyorsa BEKLE
 * (`waiting: "myDrive"` — kanca kök gelince yeniden sorar); okunamadıysa
 * SÜRÜCÜNÜN durumu döner: sonsuz iskelet yok (§7.1).
 */
export function rootPending(ids = {}) {
  const s = ids.myRootStatus
  if (!s || s === "loading" || s === "idle")
    return { status: "loading", items: [], waiting: "myDrive", mineRung: null }
  if (s === READY)
    return { status: "error", items: [], code: "noDriveUrl", call: "drive", mineRung: null }
  return {
    status: s,
    items: [],
    httpStatus: ids.myRootHttp,
    code: ids.myRootCode,
    call: "drive",
    mineRung: null,
  }
}

const ABORTED = Object.freeze({ status: "unauthenticated", items: [], mineRung: null })

/**
 * Basamakları yürür: bilinen basamak varsa TEK deneme; yoksa upn → mail →
 * onedrive, inme şartlarıyla (dosyanın başı). İlk ≥1 isabet (ya da OneDrive)
 * basamağı KESİNLEŞTİRİR ve abonelere haber verir.
 *
 * @param {object} o
 * @param {string} o.accountKey   MSAL `homeAccountId`
 * @param {{ upn?: string, mail?: string, myRoot?: string, myRootStatus?: string, myRootHttp?: number, myRootCode?: string }} o.ids
 *   `mail: undefined` → gerekirse `fetchMail`; `""` → posta basamağı yok
 * @param {(rung: {id: string, value: string}) => Promise<object>} o.attempt
 *   o basamağın sorgusu — `{ status, items, rejected?, … }` döner
 * @param {() => Promise<string>} [o.fetchMail]  `/me.mail`; okunamazsa `""`
 * @returns {Promise<object>} denemenin sonucu + `mineRung` (sonucu üreten basamak; hata/beklemede `null`)
 */
export async function walkRungs({ accountKey, ids = {}, attempt, fetchMail = async () => "" }) {
  const startedAt = epoch
  const e = entry(accountKey)
  const known = knownRung(accountKey, ids)
  if (known) {
    if (!known.value) return rootPending(ids)
    // Bilinen basamakta sıfır GERÇEK sıfırdır: basamak bir kez kanıtlandı, yeniden aranmaz.
    return { ...(await attempt(known)), mineRung: known.id }
  }
  for (const id of MINE_RUNGS) {
    if (e.failed.has(id)) continue
    let value
    if (id === "upn") value = String(ids.upn ?? "").trim()
    else if (id === "mail") {
      if (e.mail === undefined) {
        const m = typeof ids.mail === "string" ? ids.mail : await fetchMail()
        if (startedAt !== epoch) return ABORTED
        e.mail = String(m ?? "").trim()
      }
      value = e.mail && !sameAddress(e.mail, ids.upn) ? e.mail : ""
    } else value = String(ids.myRoot ?? "").trim()
    if (!value) {
      if (id === "onedrive") return rootPending(ids)
      e.failed.add(id)
      continue
    }
    const res = await attempt({ id, value })
    if (startedAt !== epoch) return ABORTED
    const ready = res.status === READY
    const hits = ready ? (res.items?.length ?? 0) : 0
    if (ready && (hits > 0 || id === "onedrive")) {
      if (!e.rung) {
        e.rung = id
        e.values[id] = value
        emit()
      }
      return { ...res, mineRung: id }
    }
    if ((ready && hits === 0) || res.rejected) {
      e.failed.add(id)
      continue
    }
    return { ...res, mineRung: null }
  }
  return rootPending(ids)
}

/**
 * YOKLAMA (§7.4): "Kişi" Ana sayfanın dışında, basamak henüz bilinmeden
 * kullanılırsa son liste isteği TEK öğelik (`size: 1`) sorulur ve basamak
 * bulunur. Hesap başına aynı anda tek yoklama (StrictMode'un çift efekti ve
 * aynı anda açılan iki arama tek istekle öder).
 *
 * @returns {Promise<{ rung: {id, value}|null, result: object|null }>}
 *   `rung: null` → basamak bulunamadı; `result` sebebi (izin/hata/bekleme)
 */
export function ensureMineRung({ accountKey, ids = {}, attempt, fetchMail }) {
  const known = knownRung(accountKey, ids)
  if (known) return Promise.resolve({ rung: known, result: null })
  const pending = probes.get(accountKey)
  if (pending) return pending
  const run = walkRungs({ accountKey, ids, attempt, fetchMail }).then((result) => ({
    rung: knownRung(accountKey, ids),
    result,
  }))
  probes.set(accountKey, run)
  run
    .finally(() => {
      if (probes.get(accountKey) === run) probes.delete(accountKey)
    })
    .catch(() => {})
  return run
}
