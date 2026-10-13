import { InteractionRequiredAuthError } from "@azure/msal-browser"
import { msalInstance, dataverseRequest, DATAVERSE_URL } from "./msal"

const API_BASE = `${DATAVERSE_URL}/api/data/v9.2`

/**
 * Hatanın KULLANICIYA ne dediğini ayıran kod.
 *
 *   session-expired  çözüm KULLANICIDA: çıkış yap, tekrar gir
 *   forbidden        çözüm YÖNETİCİDE: Dataverse yetkisi
 *   (kodsuz)         ağ/bilinmeyen — liste son bilinen hâlinde kalır
 */
export const DV_SESSION_EXPIRED = "session-expired"
export const DV_FORBIDDEN = "forbidden"
const TABLE = "tyro_launcherapps" // entity-set name (plural)

// tyro_type choice values — match scripts/import_seed_data.py
export const TYPE_AGENT = 100000000
export const TYPE_AI_APP = 100000001
export const TYPE_BUSINESS_APP = 100000002

const COLLECTION_TO_TYPE = {
  agents: TYPE_AGENT,
  aiApps: TYPE_AI_APP,
  businessApps: TYPE_BUSINESS_APP,
}

// Dataverse record ids are GUIDs. Client-generated fallback ids (makeId) and the
// static seed ids are NOT — using one as an OData key (PATCH/DELETE) returns 400.
// Used to decide create-vs-update and to skip remote calls on local-only rows.
export function isGuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value ?? ""))
}

async function getToken() {
  const account = msalInstance.getActiveAccount()
  if (!account) throw new Error("No active MSAL account")
  try {
    const result = await msalInstance.acquireTokenSilent({
      ...dataverseRequest,
      account,
    })
    return result.accessToken
  } catch (err) {
    // Silent renewal failed (refresh token expired or Dataverse consent missing).
    // We deliberately do NOT auto-trigger an interactive redirect from a background
    // data call — that would yank the whole page to AAD without user action. Surface
    // a clear error so ConfigProvider falls back to cached/seed and CRUD shows a real
    // failure; reconnecting requires an explicit sign-out / sign-in.
    if (err instanceof InteractionRequiredAuthError) {
      const wrapped = new Error(
        "Dataverse session expired — sign out and sign in again to reconnect.",
        { cause: err },
      )
      // ⚠️ MESAJ TEŞHİSTİR, ARAYÜZ METNİ DEĞİL. Bu cümle İngilizce ve dört
      // dilde de aynı; ekranda olduğu gibi basmak kullanıcıya ne olduğunu da
      // ne yapacağını da söylemez — oysa çözüm tamamen KENDİ elinde (çıkış →
      // giriş). Kod, arayüzün doğru cümleyi ve doğru DÜĞMEYİ seçmesi için
      // var; ham mesaj yalnız "teknik ayrıntı" bloğunda kalır.
      wrapped.code = DV_SESSION_EXPIRED
      throw wrapped
    }
    throw err
  }
}

async function api(path, init = {}) {
  const token = await getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    const err = new Error(`Dataverse ${res.status}: ${text || res.statusText}`)
    // 401 burada da oturum sorunudur: belirteç alınabildi ama Dataverse
    // kabul etmedi (iptal, parola değişimi, kaldırılan onay). Çaresi yine
    // çıkış-giriş, yani kullanıcının kendi elinde.
    if (res.status === 401) err.code = DV_SESSION_EXPIRED
    else if (res.status === 403) err.code = DV_FORBIDDEN
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  SAYFALI OKUMA — `@odata.nextLink` takip edilir
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **SESSİZ KIRPILMA VARDI.** `api()` yanıtın yalnız ilk sayfasını
 * döndürüyor; Dataverse varsayılan olarak 5000 satır veriyor ve fazlasını
 * `@odata.nextLink` arkasına koyuyor. Bugünkü yetki tablosu (~800 satır)
 * tek sayfaya sığdığı için sorun görünmüyordu — ama bir yetki listesinin
 * 5001'inci satırdan sonrasını SESSİZCE yutması, bu ekranın en kötü
 * arızası olurdu: yönetici eksik bir listeye bakıp "bu kişinin kaydı yok"
 * diye ikinci bir kayıt açardı ve alternate key onu 412 ile reddederdi.
 *
 * Tek bir sayfa dönen sorgular için maliyet sıfır: `nextLink` yoksa döngü
 * hiç dönmez. Tavan (`MAX_PAGES`) bir kaçak döngüye karşı — sonsuza kadar
 * çekmektense eksik çekip bunu DEV'de söylemek yeğdir.
 */
const MAX_PAGES = 20

export async function apiAll(path) {
  const first = await api(path)
  let value = first?.value ?? []
  let next = first?.["@odata.nextLink"]
  let pages = 1
  while (next && pages < MAX_PAGES) {
    // nextLink MUTLAK bir adres; `API_BASE` yeniden eklenmemeli.
    const token = await getToken()
    const res = await fetch(next, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
    })
    if (!res.ok) break // Elde olan kadarı, yarım bir listeden iyidir.
    const page = await res.json()
    value = value.concat(page?.value ?? [])
    next = page?.["@odata.nextLink"]
    pages += 1
  }
  if (import.meta.env?.DEV && next) {
    console.warn(`[Dataverse] ${MAX_PAGES} sayfa tavanına gelindi, liste EKSİK: ${path}`)
  }
  return { ...first, value }
}

// ---- row ↔ UI item mapping ----

function rowToAgent(r) {
  return {
    id: r.tyro_launcherappid,
    name: r.tyro_name ?? "",
    description: r.tyro_description ?? "",
    tenantId: r.tyro_tenantid ?? "",
    clientId: r.tyro_clientid ?? "",
    agentId: r.tyro_agentid ?? "",
    iconName: r.tyro_iconname ?? "",
    // Display order, as stored. Read so a reorder can PATCH only the rows
    // whose position actually changed, and so an edit round-trip doesn't lose
    // the value from local state.
    sortOrder: typeof r.tyro_sortorder === "number" ? r.tyro_sortorder : null,
    // Shown or switched off. `!== false` rather than `=== true`: a row created
    // before this column was populated comes back null, and a null must read
    // as VISIBLE — the alternative is a catalog that silently empties itself.
    isActive: r.tyro_isactive !== false,
    logo: null,
  }
}

function rowToApp(r) {
  return {
    id: r.tyro_launcherappid,
    name: r.tyro_name ?? "",
    description: r.tyro_description ?? "",
    url: r.tyro_url ?? "#",
    iconName: r.tyro_iconname ?? "",
    sortOrder: typeof r.tyro_sortorder === "number" ? r.tyro_sortorder : null,
    isActive: r.tyro_isactive !== false,
    logo: null,
  }
}

// `tyro_sortorder` is written ONLY when the item carries a number, and is
// left out of the payload otherwise. That absence is load-bearing: an edit
// PATCHes the whole row, so a hardcoded `?? 0` here would silently reset the
// order every time someone fixed a typo in a description.
function agentToRow(item) {
  return {
    tyro_name: item.name ?? "",
    tyro_type: TYPE_AGENT,
    tyro_description: item.description ?? "",
    tyro_tenantid: item.tenantId ?? "",
    tyro_clientid: item.clientId ?? "",
    tyro_agentid: item.agentId ?? "",
    tyro_iconname: item.iconName ?? "",
    ...(Number.isFinite(item.sortOrder) ? { tyro_sortorder: item.sortOrder } : {}),
    // NOT a hardcoded `true`. An edit PATCHes the whole row, so pinning this
    // would switch a hidden entry back on the next time someone corrected its
    // description. New items carry no flag and default to visible.
    tyro_isactive: item.isActive !== false,
  }
}

function appToRow(item, type) {
  return {
    tyro_name: item.name ?? "",
    tyro_type: type,
    tyro_description: item.description ?? "",
    tyro_url: item.url ?? "#",
    tyro_iconname: item.iconName ?? "",
    ...(Number.isFinite(item.sortOrder) ? { tyro_sortorder: item.sortOrder } : {}),
    tyro_isactive: item.isActive !== false,
  }
}

// ---- public API ----

export async function fetchAllItems() {
  const select = [
    "tyro_launcherappid",
    "tyro_name",
    "tyro_type",
    "tyro_description",
    "tyro_url",
    "tyro_tenantid",
    "tyro_clientid",
    "tyro_agentid",
    "tyro_iconname",
    "tyro_sortorder",
    "tyro_isactive",
  ].join(",")
  // Switched-off rows are fetched too, NOT filtered server-side: Settings has
  // to draw them (unchecked) or there would be no way to switch one back on.
  // Consumers get the filtered list from ConfigProvider instead.
  const data = await api(`/${TABLE}?$select=${select}&$orderby=tyro_sortorder`)
  const rows = data.value || []
  return {
    agents: rows.filter((r) => r.tyro_type === TYPE_AGENT).map(rowToAgent),
    aiApps: rows.filter((r) => r.tyro_type === TYPE_AI_APP).map(rowToApp),
    businessApps: rows.filter((r) => r.tyro_type === TYPE_BUSINESS_APP).map(rowToApp),
  }
}

// Copilot Studio agent'larının gerçek ikonu konuşma SDK'sında YOKTUR; agent'lar
// Dataverse'te `bot` tablosunda (entity set: bots) durur ve ikon orada bir image
// kolonunda saklanır. ÖNEMLİ: bu bot'lar app'in launcher Dataverse'inden
// (katalog ortamı) FARKLI bir ortamda olabilir. Bu yüzden Global Discovery ile
// kullanıcının eriştiği tüm ortamları bulup her birinde schemaName'leri arıyoruz.
const DISCO_URL = "https://globaldisco.crm.dynamics.com"

// Verilen Dataverse org URL'i için kaynağa özel (audience = o org) bir token al.
// "Dynamics CRM user_impersonation" delegated izni tüm org'lar için geçerlidir;
// scope'u org URL'ine göre isteyince token o org'a göre düzenlenir.
async function getTokenForResource(resourceUrl) {
  const account = msalInstance.getActiveAccount()
  if (!account) throw new Error("No active MSAL account")
  const result = await msalInstance.acquireTokenSilent({
    scopes: [`${String(resourceUrl).replace(/\/$/, "")}/user_impersonation`],
    account,
  })
  return result.accessToken
}

// Keyfi bir org URL'ine karşı GET (cross-env).
async function dvGet(baseUrl, path) {
  const token = await getTokenForResource(baseUrl)
  const res = await fetch(`${baseUrl}/api/data/v9.2${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
  })
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`)
  return res.json()
}

// Global Discovery: kullanıcının eriştiği tüm Dataverse ortamlarının API URL'leri.
async function discoverOrgUrls() {
  const token = await getTokenForResource(DISCO_URL)
  const res = await fetch(`${DISCO_URL}/api/discovery/v2.0/Instances`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`discovery ${res.status}`)
  const data = await res.json()
  return [...new Set((data.value || []).map((i) => i.ApiUrl).filter(Boolean))]
}

// Tek bir org'da schemaName'leri arayıp ikon thumbnail'lerini döndürür.
async function fetchBotIconsFromOrg(baseUrl, names) {
  const filter = names.map((s) => `schemaname eq '${String(s).replace(/'/g, "''")}'`).join(" or ")
  const data = await dvGet(
    baseUrl,
    `/bots?$select=botid,schemaname,name&$filter=${encodeURIComponent(filter)}`,
  )
  const bots = data.value || []
  if (!bots.length) return {}

  // İkon kolonunu keşfet: `bot` tablosunda image-tipi kolon yok; Copilot Studio
  // ikonu `iconbase64` (Memo) gibi base64 metin kolonunda durur. Adında
  // icon/image/logo/avatar/picture geçen kolonları aday alıyoruz (kolon adını
  // sabitlemeyip ortamlar arası farklara dayanıklı kalmak için).
  let cols = []
  try {
    const md = await dvGet(
      baseUrl,
      `/EntityDefinitions(LogicalName='bot')/Attributes?$select=LogicalName`,
    )
    cols = (md.value || [])
      .map((a) => a.LogicalName)
      .filter((n) => /icon|image|logo|avatar|picture/i.test(n))
  } catch {
    /* metadata okunamadı */
  }
  if (!cols.length) return {}

  const map = {}
  await Promise.all(
    bots.map(async (bot) => {
      if (!bot.schemaname) return
      try {
        const row = await dvGet(baseUrl, `/bots(${bot.botid})?$select=${cols.join(",")}`)
        const raw = cols.map((c) => row[c]).find((v) => typeof v === "string" && v.length > 0)
        const uri = base64ToDataUri(raw)
        if (uri) map[bot.schemaname] = uri
      } catch {
        /* tek bot ikonu çekilemedi — atla */
      }
    }),
  )
  return map
}

// Ham base64'ü (veya hazır data-URI'yi) bir <img> kaynağına çevirir. Mime'ı
// base64 imza ön-ekinden tespit eder ki yanlış tip yüzünden kırık görünmesin.
function base64ToDataUri(raw) {
  if (typeof raw !== "string" || !raw) return null
  if (raw.startsWith("data:")) return raw
  let mime = "image/png"
  if (raw.startsWith("/9j/")) mime = "image/jpeg"
  else if (raw.startsWith("R0lGOD")) mime = "image/gif"
  else if (raw.startsWith("UklGR")) mime = "image/webp"
  else if (raw.startsWith("PHN2Zy") || raw.startsWith("PD94bWw") || raw.startsWith("PHN2ZyA"))
    mime = "image/svg+xml"
  return `data:${mime};base64,${raw}`
}

// Verilen schemaName'ler (agent.agentId) için { schemaName → dataURI } haritası.
// Önce app'in kendi ortamı, sonra (opsiyonel) VITE_COPILOT_DATAVERSE_URL override,
// sonra Global Discovery ile bulunan tüm ortamlar denenir; ilk eşleşen kazanır.
// Tamamen best-effort: hiçbir ortamda bulunamaz/erişilemezse {} döner.
/**
 * ARTIK ÇAĞRILMIYOR (2026-08-21). Agent avatarları Copilot Studio'nun `bot`
 * tablosundan çekilmiyor; gösterilen şey katalogda seçilmiş ikon. Kod duruyor
 * çünkü keşif + ikon okuma yolu (birden çok ortamda schemaName arama, image
 * kolonunu bulma) yeniden yazılması pahalı bir bilgi; geri istenirse
 * ConfigProvider'daki tek çağrıyı geri koymak yeterli. Silmeden önce
 * tyroTrade'de de aynı fonksiyonun aynı gerekçeyle durduğunu bil.
 */
export async function fetchBotIcons(schemaNames) {
  const names = [...new Set((schemaNames || []).filter((s) => s && s !== "agent-id"))]
  if (!names.length) return {}

  const candidates = [DATAVERSE_URL]
  const override = import.meta.env.VITE_COPILOT_DATAVERSE_URL
  if (override) candidates.push(override)
  try {
    candidates.push(...(await discoverOrgUrls()))
  } catch (err) {
    console.warn("[Dataverse] ortam keşfi (global discovery) başarısız:", err.message)
  }

  // Tüm ortamlarda ara, sonuçları birleştir: agent'lar farklı ortamlarda olabilir.
  // Her ortamda yalnızca HÂLÂ eksik olan schemaName'leri sorgula; hepsi bulununca dur.
  const found = {}
  const seen = new Set()
  for (const raw of candidates) {
    const baseUrl = String(raw || "").replace(/\/$/, "")
    if (!baseUrl || seen.has(baseUrl)) continue
    seen.add(baseUrl)
    const remaining = names.filter((n) => !found[n])
    if (!remaining.length) break
    try {
      Object.assign(found, await fetchBotIconsFromOrg(baseUrl, remaining))
    } catch (err) {
      console.warn(`[Dataverse] ${baseUrl} sorgulanamadı:`, err.message)
    }
  }
  const missing = names.filter((n) => !found[n])
  if (missing.length) {
    console.info(
      "[Dataverse] ikonu bulunamayan agent'lar (agentId hiçbir bot.schemaname ile eşleşmiyor):",
      missing,
    )
  }
  return found
}

export async function createItem(collection, item) {
  const type = COLLECTION_TO_TYPE[collection]
  const row = collection === "agents" ? agentToRow(item) : appToRow(item, type)
  const created = await api(`/${TABLE}`, {
    method: "POST",
    body: JSON.stringify(row),
    headers: { Prefer: "return=representation" },
  })
  const mapped = collection === "agents" ? rowToAgent(created) : rowToApp(created)
  // tyro_logo is a Dataverse *file* column and can't be written via the entity JSON,
  // so the server row always comes back with logo:null. Carry the client's uploaded
  // logo forward so it survives in local state + cache (see ConfigProvider merge).
  return { ...mapped, logo: item.logo ?? null }
}

export async function updateItem(collection, item) {
  const type = COLLECTION_TO_TYPE[collection]
  const row = collection === "agents" ? agentToRow(item) : appToRow(item, type)
  const updated = await api(`/${TABLE}(${item.id})`, {
    method: "PATCH",
    body: JSON.stringify(row),
    headers: { Prefer: "return=representation" },
  })
  // Return authoritative server fields when the PATCH echoed the row; fall back to
  // the local item if the server answered 204. Either way preserve the client logo
  // (tyro_logo is a file column the entity JSON can't set — see createItem).
  if (!updated) return { ...item }
  const mapped = collection === "agents" ? rowToAgent(updated) : rowToApp(updated)
  return { ...mapped, logo: item.logo ?? null }
}

/**
 * Writes just the display order of one row.
 *
 * Deliberately NOT `updateItem`: reordering has no business rewriting name,
 * description or the client/agent ids. A full-row PATCH would also overwrite
 * whatever another admin changed in the seconds since this browser last
 * fetched — and a reorder touches every row in the list, so it would do that
 * wholesale.
 */
export async function updateSortOrder(id, sortOrder) {
  await api(`/${TABLE}(${id})`, {
    method: "PATCH",
    body: JSON.stringify({ tyro_sortorder: sortOrder }),
  })
}

/**
 * Switches one catalog row on or off.
 *
 * Same reasoning as updateSortOrder: a full-row PATCH would rewrite fields the
 * toggle has no opinion about. This is NOT a delete — the row, its ids and its
 * logo stay exactly as they are, which is the whole point of having a switch
 * next to the delete button.
 */
export async function updateActive(id, isActive) {
  await api(`/${TABLE}(${id})`, {
    method: "PATCH",
    body: JSON.stringify({ tyro_isactive: Boolean(isActive) }),
  })
}

export async function deleteItem(id) {
  await api(`/${TABLE}(${id})`, { method: "DELETE" })
}

/**
 * Yetki tabloları (`tyro_authorizedapps`, `tyro_requestapps`) bu istemciyi
 * YENİDEN KULLANIR — aynı belirteç, aynı başlıklar, aynı hata kodları
 * (`DV_SESSION_EXPIRED` / `DV_FORBIDDEN`). İkinci bir istemci yazmak, aynı
 * arızaya iki farklı cevap veren iki ayrı sözleşme demekti: oturumu dolan
 * kullanıcı bir ekranda "çıkış yap ve tekrar gir" görürken ötekinde çıplak
 * bir 401 görürdü.
 */
export { api as dvApi }
