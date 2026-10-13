// Microsoft dışı dış servisler — hava durumu, konum, piyasa. Hiçbiri ağa çıkmaz;
// yanıtlar `data/external-*.js`teki kurgusal üreticilerden, gerçek API'lerle AYNI şekilde.
import { external, notFound } from "../router"
import { ISTANBUL, metForecast, reverseGeocode } from "../data/external-weather"
import { frankfurterLatest, truncgilToday } from "../data/external-market"

const num = (v) => {
  const n = Number(v)
  return v != null && v !== "" && Number.isFinite(n) ? n : undefined
}

// MET Norway — `lib/weather.js` › fetchForecast
external(
  "GET",
  /^api\.met\.no\/weatherapi\/locationforecast\/2\.0\/(compact|complete)$/,
  ({ query }) =>
    metForecast({
      lat: num(query.get("lat")) ?? ISTANBUL.lat,
      lon: num(query.get("lon")) ?? ISTANBUL.lon,
    }),
)

// BigDataCloud — `lib/weather.js` › lookupPlace (koordinatla ya da "IP'den")
external("GET", "api.bigdatacloud.net/data/reverse-geocode-client", ({ query }) =>
  reverseGeocode({
    lat: num(query.get("latitude")),
    lon: num(query.get("longitude")),
    lang: query.get("localityLanguage") || "tr",
  }),
)

// Truncgil Finans — `lib/market.js` (birincil)
external("GET", /^finans\.truncgil\.com\/(v4\/)?today\.json$/, () => truncgilToday())

// Frankfurter (ECB) — `lib/market.js` (yedek)
external("GET", /^api\.frankfurter\.(dev|app)\/(v1\/)?latest$/, ({ query }) => {
  const out = frankfurterLatest({
    base: query.get("base") || query.get("from") || "EUR",
    symbols: query.get("symbols") || query.get("to") || undefined,
    amount: num(query.get("amount")) ?? 1,
  })
  return out ?? notFound("currency not found")
})
