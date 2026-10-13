import { hrRequest, HR_DATAVERSE_URL, msalInstance } from "@/lib/msal"

/**
 * Self Servis — ERP'nin Dataverse'üne tarayıcıdan istek (kişinin KENDİ oturumuyla, `hrRequest`
 * kapsamı). Kişisel ve ekip sorguları (`selfServiceApi.js`, `selfServiceTeamApi.js`) bunu
 * paylaşır. Belirteç ve yanıt loglanmaz.
 */

const API = `${HR_DATAVERSE_URL}/api/data/v9.2`

// Süzgeç parçaları saf modülde (sorgu kurucuları MSAL'siz test edilsin); eski çağıranlar için buradan da.
export { anyOf, CHUNK, chunks, quote } from "@/lib/selfServiceOdata"

export class SelfServiceError extends Error {
  constructor(kind, detail) {
    super(detail || kind)
    this.kind = kind // "denied" | "error"
  }
}

export async function token(interactive = false) {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) throw new SelfServiceError("denied", "no account")
  try {
    return (await msalInstance.acquireTokenSilent({ ...hrRequest, account })).accessToken
  } catch (err) {
    if (!interactive) throw new SelfServiceError("denied", err?.errorCode)
    return (await msalInstance.acquireTokenPopup({ ...hrRequest, account })).accessToken
  }
}

const query = (params) =>
  Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&")

async function page(auth, url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${auth}`,
      Accept: "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
    },
  })
  if (res.status === 401 || res.status === 403)
    throw new SelfServiceError("denied", `HTTP ${res.status}`)
  if (!res.ok) throw new SelfServiceError("error", `HTTP ${res.status}`)
  return res.json()
}

/** Tablonun satırları; 401/403 → `denied`, öteki hatalar → `error`. */
export async function list(auth, entity, params) {
  return (await page(auth, `${API}/${entity}?${query(params)}`)).value ?? []
}

/**
 * En çok `max` satır, sunucu sayfalarsa `@odata.nextLink` izlenerek → `{ rows, more }`.
 * `more`: sınıra varıldı, daha eski satır olabilir — çağıran bölümü "kesik" diye işaretler.
 */
export async function listAll(auth, entity, params, max) {
  const rows = []
  let url = `${API}/${entity}?${query({ ...params, $top: max })}`
  while (url && rows.length < max) {
    const body = await page(auth, url)
    rows.push(...(body.value ?? []))
    url = body["@odata.nextLink"] ?? null
  }
  return { rows: rows.slice(0, max), more: Boolean(url) || rows.length >= max }
}

/**
 * Önce `params` ile; izin dışı bir hatada `fallback` parametreleriyle bir kez daha (ör.
 * doğrulanmış `$select`). Bilinmeyen kolon adı Dataverse'te 400 verir: ekran bugünkünden
 * geriye gitmesin. `read`: okuyucu (`list` ya da sayfalı `listAll`'ın sarmalı).
 */
export async function listSafe(auth, entity, params, fallback, read = list) {
  try {
    return await read(auth, entity, params)
  } catch (err) {
    if (err?.kind === "denied" || !fallback) throw err
    return read(auth, entity, { ...params, ...fallback })
  }
}
