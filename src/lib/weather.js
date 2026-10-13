/**
 * HAVA DURUMU — veri ve konum (2026-10-01, istek: *"İyi geceler yazısının
 * üstünde giriş yapan kullanıcının konumu ile hava durumu pilini göster;
 * üstüne gelince detay, tıklayınca günü, tüm haftayı ve gelecek haftayı
 * göster — ücretsiz, güvenilir, popüler yerler vardır"*).
 *
 * ⚠️ **SAĞLAYICI MET NORWAY** (Norveç Meteoroloji Enstitüsü, yr.no'nun
 * verisi), Open-Meteo DEĞİL. İkisi de anahtarsız ve CORS açık (canlı
 * ölçüldü), ama Open-Meteo'nun ücretsiz katmanı yalnız TİCARİ OLMAYAN kullanım
 * için ("You may only use the free API services for non-commercial
 * purposes") — bir şirketin iç aracı bunun dışında. MET Norway ticari
 * kullanıma açık; karşılığı CC BY 4.0 atfı (pencerenin altında yazılı) ve
 * kimlik: tarayıcı `User-Agent` koyamaz, düşük hacimli sitelerde `Origin`
 * başlığı yeterli (koşullarında yazılı). Bedeli ufuk: ~9,5 gün (saatlik ilk
 * ~2,5 gün, sonra 6 saatlik). Gelecek haftanın ufku aşan günleri UYDURULMAZ,
 * "tahmin henüz yok" yazılır. Sağlayıcı `lib/weatherPolicy.js`te tek satır.
 *
 * ⚠️ **KONUM SIRASI** (`resolvePlace`): (1) tarayıcının konum izni ZATEN
 * verilmişse sormadan tam konum, (2) yoksa ağ bağlantısından (IP) şehir —
 * BigDataCloud'un istemci ucu, anahtarsız, CORS açık; şirket VPN'inde çıkış
 * noktasının şehri olabilir, bu yüzden "tahmini" diye SÖYLENİR. İzin istemi
 * YALNIZ "Konumumu kullan"a basınca açılır — açılışta kendiliğinden soran bir
 * sayfa reddedilir ve bir daha sorulamaz. Hiçbir şey diske yazılmaz: izni
 * tarayıcı hatırlıyor, sonraki açılış (1)'den gider.
 */
import { WEATHER } from "@/lib/weatherPolicy"
import { isSunDown } from "@/lib/sun"

const MET_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact"
const BDC_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client"

/** Hava durumu türleri — şiddet sırasıyla (günün sembolü en şiddetlisi). */
export const KINDS = [
  "clear",
  "partly",
  "cloudy",
  "fog",
  "lightRain",
  "showers",
  "rain",
  "sleet",
  "snow",
  "heavyRain",
  "thunder",
]
const SEVERITY = new Map(KINDS.map((k, i) => [k, i]))

/**
 * MET sembol kodu (`rainshowers_day`) → `{ kind, night, phase }`.
 * `phase` sembolün KENDİ eki ("day" · "night" · "polartwilight") ya da "":
 * `rain`, `cloudy`, `fog`, `heavyrain`, `snow`, `*andthunder` eksiz gelir ve
 * gece/gündüzü `parseForecast` güneşin yüksekliğinden çözer (`lib/sun.js`).
 */
export function classifySymbol(code) {
  const raw = String(code ?? "")
  const phase = raw.match(/_(day|night|polartwilight)$/)?.[1] ?? ""
  const night = phase === "night"
  const base = raw.replace(/_(day|night|polartwilight)$/, "")
  let kind = "cloudy"
  if (!base) kind = "cloudy"
  else if (base.includes("thunder")) kind = "thunder"
  else if (base.includes("sleet")) kind = "sleet"
  else if (base.includes("snow")) kind = "snow"
  else if (base.includes("rain")) {
    if (base.startsWith("heavy")) kind = "heavyRain"
    else if (base.includes("showers")) kind = "showers"
    else if (base.startsWith("light")) kind = "lightRain"
    else kind = "rain"
  } else if (base === "fog") kind = "fog"
  else if (base === "cloudy") kind = "cloudy"
  else if (base === "partlycloudy" || base === "fair") kind = "partly"
  else if (base === "clearsky") kind = "clear"
  return { kind, night, phase }
}

// `+ 0`: −0,4 °C `Math.round` ile −0 olur ve Intl onu "-0°" yazıyordu (ölçüldü).
const round = (n) => (Number.isFinite(n) ? Math.round(n) + 0 : null)
const kmh = (ms) => (Number.isFinite(ms) ? Math.round(ms * 3.6) : null)
const pad = (n) => String(n).padStart(2, "0")
/**
 * BİTMEMİŞ saatler: başlangıcı + 1 saat şimdiden sonra olanlar. Tahmin 30 dk
 * önbellekte; saat dönünce listenin ilk girdisi geçen saati anlatıyordu ve
 * "Şimdi" damgası bitmiş bir saatin üstüne düşüyordu.
 */
export function upcomingHours(hourly, now = Date.now()) {
  return (hourly ?? []).filter((h) => h.at.getTime() + 60 * 60 * 1000 > now)
}

/** Yerel gün anahtarı (`YYYY-MM-DD`) — `toISOString()` DEĞİL (UTC günü verir). */
export function localDayKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function summaryOf(entry) {
  const d = entry.data ?? {}
  return (
    d.next_1_hours?.summary?.symbol_code ??
    d.next_6_hours?.summary?.symbol_code ??
    d.next_12_hours?.summary?.symbol_code ??
    ""
  )
}

/**
 * HİSSEDİLEN SICAKLIK — Avustralya Meteoroloji Bürosu'nun görünür sıcaklık
 * formülü (Steadman 1994; Open-Meteo'nun `apparent_temperature`ı da bu
 * aileden): AT = T + 0,33·e − 0,70·v − 4,00, `e` su buharı basıncı (hPa),
 * `v` 10 m rüzgârı (m/s). MET hissedileni VERMİYOR; uydurmuyoruz, ölçülen üç
 * değerden HESAPLIYORUZ — biri yoksa `null` ve gösterge hiç çizilmez.
 */
export function apparentTemp(t, rh, windMs) {
  if (![t, rh, windMs].every(Number.isFinite)) return null
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * t) / (237.7 + t))
  return t + 0.33 * e - 0.7 * windMs - 4.0
}

/**
 * MET `compact` yanıtı → `{ current, range24, hourly, days, coords, horizonKey }`.
 * Gün gruplaması TARAYICININ yerel saatine göre.
 *
 * ⚠️ **YAĞIŞ ZAMANA GÖRE TOPLANIR, SAATE GÖRE DEĞİL.** Gerçek yanıt (ölçüldü,
 * 2026-10-01): ilk ~60 girdi saatlik ve `next_1_hours` taşıyor, sonrası UTC
 * 00/06/12/18'de 6 saatlik. İlk sürüm 6 saatlik girdiyi "yerel saat 6'nın
 * katıysa" sayıyordu — İstanbul'da o girdiler 03/09/15/21'e düşüyor, yani
 * üçüncü günden sonraki yağış HİÇ sayılmıyordu. Artık her girdi kendi
 * aralığını kapatıyor (`covered`) ve kapalı aralığa düşen girdi atlanıyor:
 * hiçbir saat iki kez sayılmaz, saat dilimi ne olursa olsun.
 *
 * ⚠️ **GÜN, ÖĞLEDEN SONRASI VE SABAHI YOKSA ÇİZİLMEZ** (`complete`). Ufkun son
 * günü çoğu zaman birkaç örnekten ibaret; sabahsız bir gün en düşüğü,
 * öğleden sonrasız bir gün en yükseği eksik söyler. Böyle bir gün "tahmin
 * henüz yok" olur. Bugün bu kuralın dışında — kalan saatleri gösterilir.
 *
 * ⚠️ **"BUGÜNÜN EN YÜKSEĞİ" YOK, "ÖNÜMÜZDEKİ 24 SAAT" VAR** (`range24`). MET
 * geçmiş saatleri vermiyor: akşam bakan birine "bugün en yüksek 16°" demek,
 * öğlen 22° olmuşken yalan olurdu.
 *
 * Her gün ayrıca kendi DİLİMLERİNİ taşır (`slots`, pencerede güne basınca):
 * yanıt saatlikken saatlik, sonra 6 saatlik — yağışla AYNI `covered` kuralı,
 * yani bir saat iki dilimde görünmez. `step` dilimin kaç saat olduğu; `windMax`
 * (km/sa) ve `humidity` (ortalama %) o günün anlık değerlerinden.
 */
export function parseForecast(json, now = new Date()) {
  const series = json?.properties?.timeseries ?? []
  if (!series.length) return null
  const entries = series
    .map((e) => ({ at: new Date(e.time), e }))
    .filter((x) => !Number.isNaN(x.at.getTime()))
  const first = entries.find((x) => x.at.getTime() >= now.getTime() - 60 * 60 * 1000) ?? entries[0]
  const inst = first.e.data?.instant?.details ?? {}
  // ⚠️ GECE = sembolün eki, ek YOKSA güneş (saatin ortasında). Eksiz semboller
  // (yağmur, bulut, sis, kar, fırtına) eskiden hep "gündüz" sayılıyordu ve gece
  // 23:00'te yağmurlu bir şehirde gündüz gökyüzü çizilirdi. Koordinat yanıtın
  // kendisinden (`geometry.coordinates` = [boylam, enlem, yükseklik]).
  const [lon, lat] = json?.geometry?.coordinates ?? []
  const symbolAt = (x) => {
    const s = classifySymbol(summaryOf(x.e))
    const night = s.phase ? s.night : isSunDown(lat, lon, new Date(x.at.getTime() + 30 * 60 * 1000))
    return { kind: s.kind, night }
  }
  const current = {
    at: first.at,
    temp: round(inst.air_temperature),
    feels: round(apparentTemp(inst.air_temperature, inst.relative_humidity, inst.wind_speed)),
    humidity: round(inst.relative_humidity),
    wind: kmh(inst.wind_speed),
    precip6h: first.e.data?.next_6_hours?.details?.precipitation_amount ?? null,
    ...symbolAt(first),
  }

  const limit = now.getTime() + 24 * 60 * 60 * 1000
  const next24 = entries
    .filter((x) => x.at.getTime() >= first.at.getTime() && x.at.getTime() <= limit)
    .map((x) => x.e.data?.instant?.details?.air_temperature)
    .filter(Number.isFinite)
  const range24 = next24.length
    ? { min: round(Math.min(...next24)), max: round(Math.max(...next24)) }
    : null
  const hourly = entries
    .filter(
      (x) =>
        x.at.getTime() >= first.at.getTime() && x.at.getTime() <= limit && x.e.data?.next_1_hours,
    )
    .map((x) => ({
      at: x.at,
      temp: round(x.e.data.instant?.details?.air_temperature),
      precip: x.e.data.next_1_hours?.details?.precipitation_amount ?? 0,
      ...symbolAt(x),
    }))

  const HOUR = 60 * 60 * 1000
  const byDay = new Map()
  let covered = -Infinity // yağışı sayılmış aralığın sonu
  for (const x of entries) {
    const key = localDayKey(x.at)
    if (!byDay.has(key))
      byDay.set(key, {
        key,
        min: Infinity,
        max: -Infinity,
        precip: 0,
        kinds: [],
        dayKinds: [],
        morning: false,
        afternoon: false,
        slots: [],
        wind: [],
        hum: [],
      })
    const day = byDay.get(key)
    const t = x.at.getTime()
    const det = x.e.data?.instant?.details ?? {}
    const temp = det.air_temperature
    const h = x.at.getHours()
    if (Number.isFinite(det.wind_speed)) day.wind.push(det.wind_speed)
    if (Number.isFinite(det.relative_humidity)) day.hum.push(det.relative_humidity)
    if (Number.isFinite(temp)) {
      day.min = Math.min(day.min, temp)
      day.max = Math.max(day.max, temp)
      if (h <= 9) day.morning = true
      if (h >= 12 && h <= 18) day.afternoon = true
    }
    const d = x.e.data ?? {}
    if (t >= covered) {
      const step = d.next_1_hours ? 1 : d.next_6_hours ? 6 : 0
      if (step) {
        const mm = (step === 1 ? d.next_1_hours : d.next_6_hours).details?.precipitation_amount ?? 0
        day.precip += mm
        covered = t + step * HOUR
        day.slots.push({ at: x.at, step, temp: round(temp), precip: mm, ...symbolAt(x) })
      }
    }
    const code = summaryOf(x.e)
    if (!code) continue // ufkun son girdisi yalnız anlık değer taşıyor
    const k = classifySymbol(code).kind
    day.kinds.push(k)
    if (h >= 8 && h <= 18) day.dayKinds.push(k)
  }
  const worst = (list) =>
    list.reduce((a, b) => ((SEVERITY.get(b) ?? 0) > (SEVERITY.get(a) ?? 0) ? b : a), list[0])
  const todayKey = localDayKey(now)
  const days = [...byDay.values()]
    .filter(
      (d) =>
        Number.isFinite(d.min) &&
        d.kinds.length &&
        (d.key === todayKey || (d.morning && d.afternoon)),
    )
    .map((d) => ({
      key: d.key,
      min: round(d.min),
      max: round(d.max),
      precip: Math.round(d.precip * 10) / 10,
      kind: worst(d.dayKinds.length ? d.dayKinds : d.kinds),
      slots: d.slots,
      windMax: d.wind.length ? kmh(Math.max(...d.wind)) : null,
      humidity: d.hum.length ? round(d.hum.reduce((a, b) => a + b, 0) / d.hum.length) : null,
    }))
  const coords = Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null
  return {
    current,
    range24,
    hourly,
    days,
    coords,
    horizonKey: days.length ? days[days.length - 1].key : null,
  }
}

/**
 * Koordinat İKİ ondalığa yuvarlanır (~1 km). MET en çok dört istiyor, ama
 * şehir ölçeğinde bir tahmin için iki fazlasıyla yeterli ve iki üçüncü
 * tarafa (MET · BigDataCloud) kişinin evinin konumunu göndermemek için.
 */
function coord(n) {
  return Math.round(Number(n) * 100) / 100
}

export async function fetchForecast(lat, lon, { signal } = {}) {
  const res = await fetch(`${MET_URL}?lat=${coord(lat)}&lon=${coord(lon)}`, {
    signal,
    headers: { Accept: "application/json" },
  })
  if (!res.ok) throw Object.assign(new Error(`MET ${res.status}`), { http: res.status })
  return res.json()
}

/** BigDataCloud istemci ucu: koordinat verilirse ters coğrafi kod, verilmezse IP'den şehir. */
export async function lookupPlace({ lat, lon, locale = "tr", signal } = {}) {
  const p = new URLSearchParams({ localityLanguage: locale })
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    p.set("latitude", String(coord(lat)))
    p.set("longitude", String(coord(lon)))
  }
  const res = await fetch(`${BDC_URL}?${p.toString()}`, { signal })
  if (!res.ok) throw Object.assign(new Error(`BDC ${res.status}`), { http: res.status })
  const d = await res.json()
  const name = d.city || d.locality || d.principalSubdivision || ""
  return {
    name,
    lat: Number.isFinite(lat) ? lat : Number(d.latitude),
    lon: Number.isFinite(lon) ? lon : Number(d.longitude),
    approx: !(Number.isFinite(lat) && Number.isFinite(lon)),
  }
}

/** Tarayıcının konum izni ZATEN verilmiş mi (istem açmadan sorar). */
export async function geolocationGranted() {
  try {
    const st = await navigator.permissions?.query?.({ name: "geolocation" })
    return st?.state === "granted"
  } catch {
    return false
  }
}

/** Tam konum — yalnız izin verilmişken ya da kullanıcı bastığında çağrılır. */
export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(Object.assign(new Error("geo"), { code: "unsupported" }))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) =>
        reject(Object.assign(new Error("geo"), { code: e?.code === 1 ? "denied" : "unavailable" })),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: WEATHER.ttlMs },
    )
  })
}
