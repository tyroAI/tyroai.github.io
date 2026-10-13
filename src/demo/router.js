// Demo ağ katmanı: tarayıcının `fetch`i SARILIR ve aynı köken dışındaki HER
// istek burada cevaplanır. Hiçbir istek dışarı çıkmaz — eşleşmeyen bir adres
// 404 ile döner (gerçek ağa düşmez). Kayıtlar `src/demo/handlers/*` altında.

const routes = []

/**
 * Bir sahte uç kaydeder.
 * @param {"graph"|"dataverse"|"hr"|"external"} service
 * @param {string} method  "GET" | "POST" | "PATCH" | "DELETE" | "PUT" | "*"
 * @param {RegExp|string} pattern  servis yoluna (sürüm öneki atılmış, decode edilmiş) karşı
 * @param {(ctx) => any} handler  düz nesne → 200 JSON; `reply(...)` → özel yanıt
 */
export function mock(service, method, pattern, handler) {
  routes.push({ service, method: method.toUpperCase(), pattern, handler })
}

export const graph = (method, pattern, handler) => mock("graph", method, pattern, handler)
export const dataverse = (method, pattern, handler) => mock("dataverse", method, pattern, handler)
export const hr = (method, pattern, handler) => mock("hr", method, pattern, handler)
export const external = (method, pattern, handler) => mock("external", method, pattern, handler)

/** Özel durum kodu / gövde / başlık için. */
export function reply(body, { status = 200, headers = {} } = {}) {
  return { __reply: true, body, status, headers }
}
export const noContent = () => reply(null, { status: 204 })
export const accepted = () => reply(null, { status: 202 })
export const notFound = (message = "Not found in demo data") =>
  reply({ error: { code: "itemNotFound", message } }, { status: 404 })

/** Hangi servis? Adres → servis adı + servis içi yol. */
function classify(url) {
  const host = url.hostname
  if (host === "graph.microsoft.com") {
    // /v1.0/me/... ya da /beta/me/...
    const path = url.pathname.replace(/^\/(v1\.0|beta)/, "")
    return { service: "graph", path }
  }
  if (host === "dataverse.tyro.invalid") {
    return { service: "dataverse", path: url.pathname.replace(/^\/api\/data\/v9\.\d/, "") }
  }
  if (host === "hr.tyro.invalid") {
    return { service: "hr", path: url.pathname.replace(/^\/api\/data\/v9\.\d/, "") }
  }
  return { service: "external", path: `${host}${url.pathname}` }
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

async function readBody(init, request) {
  const raw = init?.body ?? (request ? await request.clone().text() : null)
  if (raw == null) return null
  if (typeof raw !== "string") return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function toResponse(result) {
  if (result instanceof Response) return result
  const r = result?.__reply ? result : { body: result, status: 200, headers: {} }
  const { body, status, headers } = r
  if (body == null || status === 204 || status === 202) {
    return new Response(null, { status, headers })
  }
  if (body instanceof Blob) {
    return new Response(body, {
      status,
      headers: { "Content-Type": body.type || "application/octet-stream", ...headers },
    })
  }
  if (typeof body === "string") {
    return new Response(body, { status, headers: { "Content-Type": "text/plain", ...headers } })
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  })
}

/** Bir isteği kayıtlı uçlardan cevaplar. `$batch` alt istekleri de buradan geçer. */
export async function dispatch({ url, method, body, headers }) {
  const { service, path } = classify(url)
  const decoded = safeDecode(path)
  for (const r of routes) {
    if (r.service !== service) continue
    if (r.method !== "*" && r.method !== method) continue
    const match =
      typeof r.pattern === "string" ? (decoded === r.pattern ? [decoded] : null) : r.pattern.exec(decoded)
    if (!match) continue
    const ctx = {
      url,
      service,
      method,
      path: decoded,
      match,
      query: url.searchParams,
      body,
      headers: headers ?? {},
    }
    const result = await r.handler(ctx)
    if (result === undefined) continue // işleyici "benim değil" dedi
    return toResponse(result)
  }
  if (import.meta.env.DEV) console.warn(`[demo] karşılığı yok: ${method} ${service} ${decoded}`)
  return toResponse(notFound(`${method} ${decoded}`))
}

function headersToObject(h) {
  if (!h) return {}
  if (h instanceof Headers) return Object.fromEntries(h.entries())
  if (Array.isArray(h)) return Object.fromEntries(h)
  return { ...h }
}

/** Gerçekçi hissettirsin diye kısa, rastgele bir gecikme. */
const latency = () => new Promise((r) => setTimeout(r, 60 + Math.random() * 180))

export function installFetch() {
  if (typeof window === "undefined" || window.__TYRO_DEMO_FETCH__) return
  const realFetch = window.fetch.bind(window)
  window.__TYRO_DEMO_FETCH__ = true
  window.fetch = async (input, init = {}) => {
    const request = input instanceof Request ? input : null
    const href = request ? request.url : String(input)
    let url
    try {
      url = new URL(href, window.location.href)
    } catch {
      return realFetch(input, init)
    }
    // Aynı köken (uygulamanın kendi dosyaları), data: ve blob: olduğu gibi geçer.
    if (url.origin === window.location.origin || url.protocol === "data:" || url.protocol === "blob:") {
      return realFetch(input, init)
    }
    const method = (init.method || request?.method || "GET").toUpperCase()
    const body = await readBody(init, request)
    await latency()
    return dispatch({ url, method, body, headers: headersToObject(init.headers ?? request?.headers) })
  }
}
