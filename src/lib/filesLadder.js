/**
 * ═══════════════════════════════════════════════════════════════════════
 *  DOSYALARIM — TEK-YETENEK ELEME BASAMAĞI (spec §7.3) + yetenek hafızası
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Arama isteğinin (`sortProperties` · `aggregations` · `fields` ·
 * `queryTemplate`) ve klasör listesinin (`$orderby` · geniş `$select`)
 * şekilleri kiracının şemasına bağlı ve CANLI KİRACIDA ÖLÇÜLMEDİ. Biri 400
 * ile reddedilince ne olacağı burada.
 *
 * ```
 * res = send(tam)            200 → bitti · 400 dışı → hata (basamak YOK)
 * her kullanılan yetenek c için, SABİT sırayla:
 *     send(tam − c)          200 → c=false KALICI (hesap başına, oturum) → bitti
 * send(tam − kullanılanların hepsi)   200 → hepsi=false KALICI → bitti
 * → sorgunun KENDİSİ reddediliyor: HİÇBİR ŞEY kalıcı yazılmaz,
 *   { status:"error", httpStatus:400, code, error, call, rejected:true }
 * ```
 *
 * ⚠️ **BİR ADIM, ONU KANITLAYAN İSTEK BAŞARMADAN YAZILMAZ.** Eski basamak
 * 400'ü görür görmez istekte kullanılan İLK yeteneği oturum boyunca
 * kapatıyor, sonra tekrar deniyordu: 400'ü SORGU üretiyorsa (ör. kiracının
 * sorgulanamayan bir `OWSUSER` kısıtı) ya da başka bir yetenek üretiyorsa,
 * masum sıralama/şablon oturumun geri kalanında kapalı kalıyordu — Keşfet'in
 * `QUERY_VARIANTS` dersinin aynısı. Burada her deneme tam isteğin YALNIZ BİR
 * farkla tekrarı ve suç ancak o fark 200 getirince yazılıyor.
 *
 * ⚠️ **YALNIZ 400 BASAMAK İNDİRİR.** 401/403 izin, 429/5xx sunucu, ağ hatası
 * bağlantının derdi — isteğin şekliyle ilgisi yok. Deneme ortasında 400
 * DIŞI bir cevap gelirse teşhis yarıda kalır: o cevap döner, hiçbir şey
 * yazılmaz (bir sonraki istek basamağı baştan kurar).
 *
 * Maliyet: en çok 2 + |kullanılan| (+1 sıralama adı denemesi) istek, oturumda
 * bir kez — kanıtlanan adım hatırlandığı için ikinci kez ödenmez. Reddedilen
 * SORGU hatırlanmaz ("kanıt yok"); kimlik basamağı (`lib/filesIdentity.js`)
 * onu bir yetenek suçu değil bir BASAMAK sebebi sayıyor.
 *
 * Saf modül: ağ, React, `graph.js` YOK (Node'da sınanabilsin) — istek
 * kurma (`build`), gönderme (`send`) ve denemeler (`trials`) çağırandan.
 * Durum dizgeleri `graph.js` › `STATUS` ile aynı ("ready", "error").
 */

const READY = "ready"

/** `${domain}::${hesap}` → oturumun yetenekleri (kapalı olan `false`). Yalnız bellekte. */
const store = new Map()
/** Çıkışta artar: yolda olan bir basamak eski hesaba ÇIKIŞTAN SONRA yazamasın. */
let epoch = 0

const EMPTY = Object.freeze({})

/**
 * Bir alanın (ör. `"search"`, `"children"`, `"teams"`) bu hesaptaki
 * yetenekleri. Dönen nesne DONDURULMUŞ — değiştirmek yerine `runLadder`.
 */
export function capsFor(domain, accountKey) {
  return store.get(`${domain}::${accountKey}`) ?? EMPTY
}

/** Çıkış (`clearFilesSearchCache` / `clearFilesListingCache`): bir alan ya da hepsi. */
export function resetCaps(domain) {
  epoch += 1
  if (!domain) {
    store.clear()
    return
  }
  for (const k of [...store.keys()]) if (k.startsWith(`${domain}::`)) store.delete(k)
}

/** Teşhis/sınama: kaç (alan, hesap) çifti kayıtlı (çıkıştan sonra 0 olmalı — U16). */
export function capsStoreSize() {
  return store.size
}

function persist(domain, accountKey, patch, startedAt) {
  if (startedAt !== epoch) return
  const k = `${domain}::${accountKey}`
  store.set(k, Object.freeze({ ...(store.get(k) ?? {}), ...patch }))
}

/**
 * @param {object} o
 * @param {string} o.domain        yetenek alanı ("search" · "children" · "teams")
 * @param {string} o.accountKey    MSAL `homeAccountId`
 * @param {string} o.call          teşhis etiketi — konsolda ve hata satırında ("search")
 * @param {(caps: object) => any} o.build  bu yeteneklerle istek (gövde ya da yol)
 * @param {(req: any) => Promise<{status: string, httpStatus?: number, code?: string, error?: string}>} o.send
 * @param {(req: any, caps: object) => Array<{cap: string, patch: object, variant?: boolean, label?: string}>} o.trials
 *   TAM isteğin denemeleri, sabit sırayla. `variant`: yeteneği kapatmayan bir
 *   ad değişikliği (sıralama adı) — "hepsi birden" denemesine girmez.
 * @param {(line: string) => void} [o.log]
 * @returns {Promise<{ res: object, req: any, caps: object, stepped: string[]|null }>}
 *   `res` cevabı veren isteğin sonucu (ya da ret), `req` o istek, `caps` onun
 *   yetenekleri, `stepped` kalıcı yazılan adım(lar).
 */
export async function runLadder({
  domain,
  accountKey,
  call,
  build,
  send,
  trials,
  log = defaultLog,
}) {
  const startedAt = epoch
  const caps = capsFor(domain, accountKey)
  const req = build(caps)
  const res = await send(req)
  if (res.status === READY || res.httpStatus !== 400) return { res, req, caps, stepped: null }

  const code = res.code || "?"
  const list = trials(req, caps) ?? []
  for (const t of list) {
    const trialCaps = { ...caps, ...t.patch }
    const trialReq = build(trialCaps)
    const r = await send(trialReq)
    if (r.status === READY) {
      persist(domain, accountKey, t.patch, startedAt)
      log(`[files] ${call} HTTP 400 · ${code} — ${t.label ?? `${t.cap} kapatıldı`}`)
      return { res: r, req: trialReq, caps: trialCaps, stepped: [t.cap] }
    }
    if (r.httpStatus !== 400) return { res: r, req: trialReq, caps, stepped: null }
  }

  const offs = list.filter((t) => !t.variant)
  if (offs.length > 1) {
    const patch = Object.assign({}, ...offs.map((t) => t.patch))
    const allCaps = { ...caps, ...patch }
    const allReq = build(allCaps)
    const r = await send(allReq)
    if (r.status === READY) {
      persist(domain, accountKey, patch, startedAt)
      const dropped = offs.map((t) => t.cap)
      log(`[files] ${call} HTTP 400 · ${code} — ${dropped.join(" + ")} kapatıldı`)
      return { res: r, req: allReq, caps: allCaps, stepped: dropped }
    }
    if (r.httpStatus !== 400) return { res: r, req: allReq, caps, stepped: null }
  }

  log(`[files] ${call} HTTP 400 · ${code} — sorgu reddedildi; hiçbir yetenek kapatılmadı`)
  return {
    res: {
      status: "error",
      httpStatus: 400,
      code: res.code ?? "",
      error: res.error ?? "",
      call,
      rejected: true,
    },
    req,
    caps,
    stepped: null,
  }
}

function defaultLog(line) {
  console.warn(line)
}
