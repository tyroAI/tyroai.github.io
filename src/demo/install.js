// Demo kurulumu — main.jsx'in İLK importu. Üç şey yapar:
//   1. `fetch`i sarar: aynı köken dışındaki her istek demo verisinden cevaplanır.
//   2. Konum iznini sormaz: hava durumu sabit bir şehir (İstanbul) görür.
//   3. `handlers/` altındaki her dosyayı yükler (her biri kendi uçlarını kaydeder).
import { installFetch, graph, dispatch, reply } from "./router"

installFetch()

// Konum: tarayıcı izin penceresi açılmasın; demo kişisi İstanbul'da.
if (typeof navigator !== "undefined") {
  const fakeGeo = {
    getCurrentPosition(success) {
      setTimeout(
        () =>
          success({
            coords: { latitude: 41.0814, longitude: 29.0094, accuracy: 50 },
            timestamp: Date.now(),
          }),
        30,
      )
    },
    watchPosition(success) {
      this.getCurrentPosition(success)
      return 1
    },
    clearWatch() {},
  }
  try {
    Object.defineProperty(navigator, "geolocation", { configurable: true, get: () => fakeGeo })
  } catch {
    /* salt okunur tarayıcı — hava durumu kendi yedek şehrine düşer */
  }
  if (navigator.permissions?.query) {
    const realQuery = navigator.permissions.query.bind(navigator.permissions)
    navigator.permissions.query = (desc) =>
      desc?.name === "geolocation"
        ? Promise.resolve({ state: "granted", onchange: null, addEventListener() {}, removeEventListener() {} })
        : realQuery(desc)
  }
}

// Graph $batch: her alt istek aynı demo uçlarından geçer.
graph("POST", "/$batch", async ({ body }) => {
  const requests = Array.isArray(body?.requests) ? body.requests : []
  const responses = await Promise.all(
    requests.map(async (r) => {
      const url = new URL(`https://graph.microsoft.com/v1.0${r.url.startsWith("/") ? "" : "/"}${r.url}`)
      const res = await dispatch({
        url,
        method: (r.method || "GET").toUpperCase(),
        body: r.body ?? null,
        headers: r.headers ?? {},
      })
      const type = res.headers.get("Content-Type") || ""
      let out = null
      if (res.status !== 204) {
        if (type.includes("json")) out = await res.json()
        else if (type.startsWith("image/")) {
          const buf = await res.arrayBuffer()
          out = btoa(String.fromCharCode(...new Uint8Array(buf)))
        } else out = await res.text()
      }
      return { id: r.id, status: res.status, headers: { "Content-Type": type }, body: out }
    }),
  )
  return reply({ responses })
})

// Her işleyici dosyası kendi uçlarını kaydeder. Tek tek yüklenir: biri
// bozulursa ötekiler (ve uygulama) yine açılır. main.jsx çizimden önce bekler.
const modules = import.meta.glob("./handlers/**/*.js")
export const demoReady = Promise.allSettled(
  Object.entries(modules).map(([path, load]) =>
    load().catch((err) => console.error(`[demo] ${path} yüklenemedi:`, err)),
  ),
)
