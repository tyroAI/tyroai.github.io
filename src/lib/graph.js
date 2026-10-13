import { ensureMsalInitialized } from "@/lib/msal"

/**
 * Microsoft Graph reads for the header panels.
 *
 * Two rules this module exists to enforce:
 *
 * 1. **Silent or nothing.** Tokens come from `acquireTokenSilent` and a
 *    failure is reported, never escalated. A header widget mounts on every
 *    route, so an automatic `acquireTokenRedirect` would bounce people out of
 *    the app mid-task — and the panel it serves is never what the user was
 *    doing. The only interactive escalation here comes from a click (see
 *    `requestGraphScopes`).
 *
 * 2. **"Couldn't ask" is not "no data".** Callers get a status, so a missing
 *    consent renders an explanation rather than an empty inbox. Collapsing
 *    the two is the exact bug that hid the settings admin tabs from everyone
 *    (see useIsInGroup's UNKNOWN sentinel).
 *
 * `Calendars.Read` and `Mail.Read` DO ride the login request (see msal.js) —
 * safe only because both are granted tenant-wide and neither needs admin
 * consent, so they add no prompt. That is what makes the silent path below
 * work at all: a scope the session never carried can only be renewed through
 * a hidden iframe, which third-party-cookie rules block. Any scope that is
 * NOT already granted must stay out of the login request, or sign-in turns
 * into an "Approval required" wall for everyone.
 */

export const GRAPH_BASE = "https://graph.microsoft.com/v1.0"

export const STATUS = {
  ready: "ready",
  denied: "denied",
  error: "error",
  unauthenticated: "unauthenticated",
}

/** Geçici sayılan HTTP kodları — yeniden denemeye değer. */
const TRANSIENT = new Set([429, 502, 503, 504])
const RETRY_CAP_MS = 8000

/**
 * Graph'ın hata gövdesi: `{ error: { code, message } }`. Okunamazsa boş.
 * Teşhisin tek kaynağı bu — "HTTP 400" tek başına NEYİN reddedildiğini
 * söylemiyor, `invalidRequest: Invalid filter clause` söylüyor.
 */
async function readGraphError(res) {
  try {
    const j = await res.json()
    return { code: j?.error?.code ?? "", message: j?.error?.message ?? "" }
  } catch {
    return { code: "", message: "" }
  }
}

/**
 * Yeniden denemeden önce beklenecek süre. Graph 429'da `Retry-After`
 * (saniye) gönderiyor; tarayıcı onu CORS yüzünden okuyamayabilir, o zaman
 * artan bekleme (1 sn, 2 sn…) + biraz rastgelelik — aynı anda düşen iki
 * isteğin aynı anda yeniden çarpışmaması için.
 */
function retryDelayMs(res, attempt) {
  const header = Number(res?.headers?.get?.("Retry-After"))
  const base = Number.isFinite(header) && header > 0 ? header * 1000 : 1000 * 2 ** attempt
  return Math.min(base + Math.random() * 250, RETRY_CAP_MS)
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * GET a Graph resource.
 *
 * `retry` (varsayılan 0): geçici hatada (429 · 502 · 503 · 504 ve ağ
 * hatası) kaç kez yeniden denensin. Varsayılan KAPALI — bugünkü panellerin
 * davranışı değişmesin; isteyen çağıran açar (To Do: posta kutusunun
 * eşzamanlılık sınırı 429 döndürüyor).
 *
 * @returns {Promise<{status: string, data?: object, httpStatus?: number, code?: string, error?: string}>}
 *   never throws — every failure is a status. HTTP hatalarında `code` ve
 *   `error` Graph'ın kendi hata kodu ve cümlesi.
 */
export async function graphGet(instance, account, { path, scopes, headers = {}, retry = 0 }) {
  if (!instance || !account) return { status: STATUS.unauthenticated }

  let token
  try {
    await ensureMsalInitialized()
    const resp = await instance.acquireTokenSilent({ scopes, account })
    token = resp.accessToken
  } catch (err) {
    const code = err?.errorCode ?? err?.name ?? "interaction_required"
    // Logged, not swallowed: "denied" has two very different causes and the
    // panel text can't tell them apart. `consent_required` means nobody has
    // approved the permission. `interaction_required` / `login_required` /
    // `invalid_grant` usually mean the permission IS approved but this
    // browser's session predates it — the cached refresh token was issued
    // without the scope, and silent renewal through a hidden iframe is
    // blocked by third-party-cookie rules, so only a fresh sign-in fixes it.
    console.warn(
      `[graph] silent token for ${scopes.join(", ")} failed: ${code}`,
      err?.message ?? "",
    )
    return { status: STATUS.denied, error: code }
  }

  // `path` mutlak olabilir: `@odata.nextLink` tam URL döner ve onu tekrar
  // GRAPH_BASE'e eklemek bozuk bir adres üretirdi.
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`
  for (let attempt = 0; ; attempt += 1) {
    let res
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, ...headers },
      })
    } catch (err) {
      // CORS başlığı taşımayan bir kısıtlama cevabı da buraya düşüyor
      // (tarayıcı onu `TypeError: Failed to fetch` olarak veriyor).
      if (attempt < retry) {
        await wait(retryDelayMs(null, attempt))
        continue
      }
      return { status: STATUS.error, error: err?.message ?? "network" }
    }

    if (res.status === 401 || res.status === 403) {
      // A token was issued but Graph still refused — the scope is present on
      // the token yet the resource is off limits. Same user-facing meaning.
      return { status: STATUS.denied, httpStatus: res.status }
    }
    if (!res.ok) {
      if (attempt < retry && TRANSIENT.has(res.status)) {
        await wait(retryDelayMs(res, attempt))
        continue
      }
      const { code, message } = await readGraphError(res)
      return { status: STATUS.error, httpStatus: res.status, code, error: message }
    }

    try {
      return { status: STATUS.ready, data: await res.json() }
    } catch {
      return { status: STATUS.error, error: "parse" }
    }
  }
}

/**
 * Ham bayt (`/$value`) — postanın EKİNİ indirmek için (2026-10-02, okuma
 * penceresinin ek kartları). `graphGet` gövdeyi JSON okuyor; ek ise dosyanın
 * kendisi. Belirteç yine yalnız SESSİZCE alınır, sonuç yine `STATUS` taşır.
 * ⚠️ Blob bellekte kalır ve çağıran onu hemen bir `blob:` adresine çevirip
 * bırakır — kalıcı bir önbelleğe GİRMEZ (başkasının eki, paylaşılan tarayıcı).
 */
export async function graphGetBlob(instance, account, { path, scopes }) {
  if (!instance || !account) return { status: STATUS.unauthenticated }
  let token
  try {
    await ensureMsalInitialized()
    const resp = await instance.acquireTokenSilent({ scopes, account })
    token = resp.accessToken
  } catch (err) {
    const code = err?.errorCode ?? err?.name ?? "interaction_required"
    console.warn(
      `[graph] silent token for ${scopes.join(", ")} failed: ${code}`,
      err?.message ?? "",
    )
    return { status: STATUS.denied, error: code }
  }
  let res
  try {
    res = await fetch(`${GRAPH_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  } catch (err) {
    return { status: STATUS.error, error: err?.message ?? "network" }
  }
  if (res.status === 401 || res.status === 403)
    return { status: STATUS.denied, httpStatus: res.status }
  if (!res.ok) {
    const { code, message } = await readGraphError(res)
    return { status: STATUS.error, httpStatus: res.status, code, error: message }
  }
  try {
    return { status: STATUS.ready, blob: await res.blob() }
  } catch {
    return { status: STATUS.error, error: "read" }
  }
}

/**
 * POST — yalnızca Graph'ın arama ucu için. `/search/query` GET kabul etmiyor,
 * sorgu gövdede gidiyor.
 */
export async function graphPost(instance, account, { path, scopes, body, retry = 0 }) {
  if (!instance || !account) return { status: STATUS.unauthenticated }
  let token
  try {
    await ensureMsalInitialized()
    const resp = await instance.acquireTokenSilent({ scopes, account })
    token = resp.accessToken
  } catch (err) {
    const code = err?.errorCode ?? err?.name ?? "interaction_required"
    console.warn(
      `[graph] silent token for ${scopes.join(", ")} failed: ${code}`,
      err?.message ?? "",
    )
    return { status: STATUS.denied, error: code }
  }
  // Yeniden deneme YALNIZ 429'da: kısıtlama cevabı isteğin işlenmediğini
  // söylüyor. 503/504'te sunucu işi yapmış olabilir ve bir POST'u tekrarlamak
  // aynı kaydı iki kez yaratırdı (ör. To Do'da çift görev).
  for (let attempt = 0; ; attempt += 1) {
    let res
    try {
      res = await fetch(`${GRAPH_BASE}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    } catch (err) {
      return { status: STATUS.error, error: err?.message ?? "network" }
    }
    if (res.status === 401 || res.status === 403)
      return { status: STATUS.denied, httpStatus: res.status }
    if (!res.ok) {
      if (attempt < retry && res.status === 429) {
        await wait(retryDelayMs(res, attempt))
        continue
      }
      const { code, message } = await readGraphError(res)
      return { status: STATUS.error, httpStatus: res.status, code, error: message }
    }
    try {
      return { status: STATUS.ready, data: await res.json() }
    } catch {
      return { status: STATUS.error, error: "parse" }
    }
  }
}

/**
 * Gövdesiz cevap bekleyen POST.
 *
 * `/me/sendMail` 202 Accepted döner ve gövdesi BOŞTUR; `graphPost` cevabı
 * JSON'a çevirmeye çalıştığı için başarılı bir gönderimi "parse hatası" diye
 * raporlardı. Ayrı fonksiyon, çünkü fark cevabın ŞEKLİNDE — ikisini
 * birleştirmek gerçek bir ayrıştırma hatasını da sessizce başarı sayardı.
 *
 * Hata gövdesi OLDUĞU GİBİ yüzeye çıkar: Graph'ın kendi cümlesi (izin yok,
 * alıcı çözülemedi, ek çok büyük) teşhis için tek kaynaktır.
 */
export async function graphPostNoContent(instance, account, { path, scopes, body }) {
  if (!instance || !account) return { status: STATUS.unauthenticated }
  let token
  try {
    await ensureMsalInitialized()
    const resp = await instance.acquireTokenSilent({ scopes, account })
    token = resp.accessToken
  } catch (err) {
    const code = err?.errorCode ?? err?.name ?? "interaction_required"
    console.warn(
      `[graph] silent token for ${scopes.join(", ")} failed: ${code}`,
      err?.message ?? "",
    )
    return { status: STATUS.denied, error: code }
  }
  let res
  try {
    res = await fetch(`${GRAPH_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch (err) {
    return { status: STATUS.error, error: err?.message ?? "network" }
  }
  if (res.status === 401 || res.status === 403)
    return { status: STATUS.denied, httpStatus: res.status }
  if (!res.ok) {
    let detail = ""
    try {
      const j = await res.json()
      detail = j?.error?.message ?? ""
    } catch {
      /* gövdesiz hata — kod tek başına kalır */
    }
    return { status: STATUS.error, httpStatus: res.status, error: detail }
  }
  return { status: STATUS.ready }
}

/**
 * PATCH — Microsoft To Do görevini güncellemek için (tamamla, teslim
 * tarihini kaldır). Graph bazı uçlarda 200 + gövde, bazılarında 204 döner;
 * ikisi de başarı. Hata gövdesinin cümlesi `graphPostNoContent`teki gibi
 * yüzeye çıkar.
 */
export async function graphPatch(instance, account, { path, scopes, body, retry = 0 }) {
  if (!instance || !account) return { status: STATUS.unauthenticated }
  let token
  try {
    await ensureMsalInitialized()
    const resp = await instance.acquireTokenSilent({ scopes, account })
    token = resp.accessToken
  } catch (err) {
    const code = err?.errorCode ?? err?.name ?? "interaction_required"
    console.warn(
      `[graph] silent token for ${scopes.join(", ")} failed: ${code}`,
      err?.message ?? "",
    )
    return { status: STATUS.denied, error: code }
  }
  // PATCH aynı gövdeyle tekrarlanınca aynı sonucu verir (idempotent), yani
  // geçici hataların hepsinde yeniden denemek güvenli.
  for (let attempt = 0; ; attempt += 1) {
    let res
    try {
      res = await fetch(`${GRAPH_BASE}${path}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    } catch (err) {
      if (attempt < retry) {
        await wait(retryDelayMs(null, attempt))
        continue
      }
      return { status: STATUS.error, error: err?.message ?? "network" }
    }
    if (res.status === 401 || res.status === 403)
      return { status: STATUS.denied, httpStatus: res.status }
    if (!res.ok) {
      if (attempt < retry && TRANSIENT.has(res.status)) {
        await wait(retryDelayMs(res, attempt))
        continue
      }
      const { code, message } = await readGraphError(res)
      return { status: STATUS.error, httpStatus: res.status, code, error: message }
    }
    if (res.status === 204) return { status: STATUS.ready, data: null }
    try {
      return { status: STATUS.ready, data: await res.json() }
    } catch {
      return { status: STATUS.ready, data: null }
    }
  }
}

/**
 * DELETE — To-Do sayfası (görev, adım, liste silme). Graph 204 döner.
 *
 * ⚠️ **YENİDEN DENEME YALNIZ 429'DA.** Bir silme ikinci kez gönderildiğinde
 * ikinci cevap 404 olur ve ekrana "silinemedi" düşer — oysa ilk istek işini
 * yapmıştır. 429'da sunucu isteği HİÇ işlemediğini söylüyor; 502/503'te
 * işlenmiş olabilir, orada tekrar yok (`graphPost`un aynı kuralı). 404 de
 * başarı sayılır: silinmek istenen şey zaten yok.
 */
export async function graphDelete(instance, account, { path, scopes, retry = 0 }) {
  if (!instance || !account) return { status: STATUS.unauthenticated }
  let token
  try {
    await ensureMsalInitialized()
    const resp = await instance.acquireTokenSilent({ scopes, account })
    token = resp.accessToken
  } catch (err) {
    const code = err?.errorCode ?? err?.name ?? "interaction_required"
    console.warn(
      `[graph] silent token for ${scopes.join(", ")} failed: ${code}`,
      err?.message ?? "",
    )
    return { status: STATUS.denied, error: code }
  }
  for (let attempt = 0; ; attempt += 1) {
    let res
    try {
      res = await fetch(`${GRAPH_BASE}${path}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      return { status: STATUS.error, error: err?.message ?? "network" }
    }
    if (res.status === 401 || res.status === 403)
      return { status: STATUS.denied, httpStatus: res.status }
    if (res.ok || res.status === 404) return { status: STATUS.ready, data: null }
    if (attempt < retry && res.status === 429) {
      await wait(retryDelayMs(res, attempt))
      continue
    }
    const { code, message } = await readGraphError(res)
    return { status: STATUS.error, httpStatus: res.status, code, error: message }
  }
}

/** Dosyanın İKİLİ içeriği. JSON uçlarından ayrı: `res.json()` burada patlar. */
export async function graphGetBinary(instance, account, { path, scopes }) {
  if (!instance || !account) return { status: STATUS.unauthenticated }
  let token
  try {
    await ensureMsalInitialized()
    const resp = await instance.acquireTokenSilent({ scopes, account })
    token = resp.accessToken
  } catch (err) {
    return { status: STATUS.denied, error: err?.errorCode ?? "interaction_required" }
  }
  try {
    const res = await fetch(`${GRAPH_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 401 || res.status === 403)
      return { status: STATUS.denied, httpStatus: res.status }
    if (!res.ok) return { status: STATUS.error, httpStatus: res.status }
    return { status: STATUS.ready, data: await res.arrayBuffer() }
  } catch (err) {
    return { status: STATUS.error, error: err?.message ?? "network" }
  }
}

/**
 * Ask for a scope interactively, from a click.
 *
 * Needed when a session predates a permission grant: silent acquisition for a
 * scope the session never carried is renewed through a hidden iframe, which
 * third-party-cookie rules block. A popup is user-initiated, so it is exempt —
 * and unlike acquireTokenRedirect it doesn't throw the user out of whatever
 * they were doing. Returns true if a token was obtained.
 */
export async function requestGraphScopes(instance, account, scopes) {
  try {
    await ensureMsalInitialized()
    await instance.acquireTokenPopup({ scopes, account })
    return true
  } catch (err) {
    const code = err?.errorCode ?? ""
    // Açılır pencere ENGELLENDİYSE yönlendirmeye düşülür. Bu, modülün
    // "sessiz ya da hiç" kuralını ÇİĞNEMEZ: o kural otomatik yükseltmeyi
    // yasaklar, çünkü header her rotada mount oluyor ve kullanıcıyı işinin
    // ortasında atardı. Buradaki yönlendirme kullanıcının bastığı "Bağlan"
    // düğmesinden geliyor, yani kullanıcının işini kesmiyor.
    // Telefonda gerekli: iOS'ta açılır pencere sıklıkla engelleniyor
    // ve engellendiğinde düğme sessizce hiçbir şey yapmıyordu (ölçüldü
    // 2026-08-19), yani kullanıcı için izin verilemez bir duvar oluyordu.
    //
    // `user_cancelled` HARİÇ: vazgeçen kullanıcıyı tam sayfa bir yönlendirmeye
    // sokmak, vazgeçmesini yok saymak olurdu.
    if (code === "popup_window_error" || code === "empty_window_error") {
      try {
        await instance.acquireTokenRedirect({ scopes, account })
        return false // buraya dönülmez; sayfa zaten ayrıldı
      } catch (redirectErr) {
        console.warn(
          "[graph] redirect consent failed:",
          redirectErr?.errorCode ?? redirectErr?.message,
        )
        return false
      }
    }
    console.warn(
      `[graph] interactive consent for ${scopes.join(", ")} failed:`,
      code || err?.message,
    )
    return false
  }
}

/**
 * The browser's IANA zone, sent to Graph so event times come back as local
 * wall-clock. Without it Graph answers in UTC and all-day events land on the
 * wrong day — the classic bug in this feature.
 */
export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

/**
 * Turns Graph's dateTimeTimeZone into a real Date.
 *
 * `dateTime` has no offset and no trailing Z — it is wall-clock in the zone
 * named alongside it. If Graph honoured our Prefer header that zone is the
 * browser's, so plain parsing is correct; if it did not (some zone names are
 * rejected) the payload says UTC and we must say so explicitly, or every time
 * shifts by the local offset.
 */
export function parseGraphDateTime(value) {
  if (!value?.dateTime) return null
  const raw = value.dateTime
  const isUtc = (value.timeZone ?? "").toUpperCase() === "UTC"
  const d = new Date(isUtc && !/[zZ]|[+-]\d{2}:\d{2}$/.test(raw) ? `${raw}Z` : raw)
  return Number.isNaN(d.getTime()) ? null : d
}
