/**
 * GÜNEŞİN YÜKSEKLİĞİ — saf hesap, ağ yok (NOAA'nın sadeleştirilmiş formülü,
 * ±0,5° doğruluk; gün doğumu/batımı ±2 dk).
 *
 * Neden: MET'in sembol kodlarının yalnız bir kısmı gündüz/gece eki taşıyor
 * (`clearsky_*`, `fair_*`, `partlycloudy_*`, `*showers*`). `rain`, `cloudy`,
 * `fog`, `heavyrain`, `snow`, `*andthunder` EKSİZ geliyor ve `classifySymbol`
 * onları hep gündüz sayıyor: saat 23:00'te yağmurlu bir şehirde pencere GÜNDÜZ
 * gökyüzü çizerdi. Ek varsa MET'in kararı kazanır; yoksa bu hesap.
 */
const RAD = Math.PI / 180

/** Güneşin ufka göre yüksekliği, derece (negatif = ufkun altında). */
export function sunElevation(lat, lon, date) {
  const d = date.getTime() / 86400000 - 10957.5 // J2000.0'dan beri gün (2000-01-01T12:00Z)
  const g = (357.529 + 0.98560028 * d) * RAD // ortalama anomali
  const q = 280.459 + 0.98564736 * d // ortalama boylam (°)
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD // ekliptik boylam
  const e = (23.439 - 0.00000036 * d) * RAD // eğiklik
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))
  const dec = Math.asin(Math.sin(e) * Math.sin(L))
  const gmst = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24 // saat
  const ha = (gmst * 15 + lon) * RAD - ra // saat açısı
  const phi = lat * RAD
  return (
    Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(ha)) / RAD
  )
}

/** Güneş batmış mı — −0,833°: kırılma + güneş diskinin yarıçapı (resmî doğuş/batış tanımı). */
export function isSunDown(lat, lon, date) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false
  return sunElevation(lat, lon, date) < -0.833
}

/**
 * Bir YEREL günün gün doğumu ve batımı (pencerenin "Gün doğumu · batımı ·
 * uzunluğu" kutucukları). Gün 2 dakikalık adımlarla taranır, −0,833°'lik geçiş
 * ikiye bölmeyle saniyeye iner — kapalı formülün kutup ve yaz saati köşeleri
 * yerine tarama, çünkü günün sınırı YEREL gece yarısı (`setDate`, 24 saat değil:
 * yaz saati gününde gün 23 ya da 25 saat). Kutup gününde/gecesinde anlar `null`
 * ve `polar` "day" | "night". Koordinat yoksa `null`.
 * ⚠️ `daylight` (dakika) o yerel günde güneşin ufkun üstünde KALDIĞI toplam süre,
 * `set − rise` DEĞİL: yer tarayıcının saat diliminden uzaksa (VPN'in çıkış
 * noktası) gün o yerin gecesinde başlar, batış doğuştan ÖNCE gelir ve fark
 * negatif çıkıyordu (ölçüldü: "—"). İki yay toplanınca gün uzunluğu doğru.
 */
export function sunTimes(lat, lon, day) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 1)
  const STEP = 2 * 60 * 1000
  const above = (t) => sunElevation(lat, lon, new Date(t)) > -0.833
  let rise = null
  let set = null
  let up = false
  let down = false
  let prev = above(start.getTime())
  let lit = 0 // ms
  let since = prev ? start.getTime() : null // güneşin en son doğduğu an
  for (let t = start.getTime() + STEP; t <= end.getTime(); t += STEP) {
    const now = above(t)
    if (now) up = true
    else down = true
    if (now !== prev) {
      let a = t - STEP
      let b = t
      for (let i = 0; i < 12; i++) {
        const m = (a + b) / 2
        if (above(m) === prev) a = m
        else b = m
      }
      const at = new Date(Math.round((a + b) / 2))
      if (now && !rise) rise = at
      if (!now && !set) set = at
      if (now) since = at.getTime()
      else if (since != null) {
        lit += at.getTime() - since
        since = null
      }
    }
    prev = now
  }
  if (since != null) lit += end.getTime() - since
  if (above(start.getTime())) up = true
  else down = true
  return {
    rise,
    set,
    daylight: Math.round(lit / 60000),
    polar: up && !down ? "day" : down && !up ? "night" : null,
  }
}

/**
 * YAYDAKİ YER — gündüz ve GECE (2026-10-04, istek: *"gün battıktan sonra gün
 * batımını sola, gün doğumunu sağa al ve çizginin başından tekrar başla"*).
 *
 * `now`ın içinde bulunduğu evreyi (güneş gökte mi, ufkun altında mı) bulur ve
 * evrenin iki ucunu `now`dan geriye/ileriye tarayarak çıkarır:
 *   gündüz → `from` son doğuş, `to` sıradaki batış
 *   gece   → `from` son batış, `to` sıradaki doğuş
 * `progress` = geçen sürenin oranı (0..1). 24 saat içinde uç yoksa (kutup
 * günü/gecesi) ya da koordinat yoksa `null`.
 * ⚠️ `sunTimes`ın YEREL gününe bakılmaz (aşağıdaki `daylightProgress`in dersi):
 * gece yarısından sonra "bugünün" batışı henüz gelmemiştir; gecenin batışı
 * DÜNKÜ batış. Tarama gerçek çifti her zaman bulur.
 */
export function sunArc(lat, lon, now = new Date()) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const t0 = now.getTime()
  const above = (t) => sunElevation(lat, lon, new Date(t)) > -0.833
  const day = above(t0)
  const STEP = 2 * 60 * 1000
  const LIMIT = 24 * 60 * 60 * 1000
  const edge = (dir) => {
    for (let d = STEP; d <= LIMIT; d += STEP) {
      if (above(t0 + dir * d) === day) continue
      let a = t0 + dir * (d - STEP) // hâlâ aynı evre
      let b = t0 + dir * d // evre değişti
      for (let i = 0; i < 12; i++) {
        const m = (a + b) / 2
        if (above(m) === day) a = m
        else b = m
      }
      return (a + b) / 2
    }
    return null
  }
  const from = edge(-1)
  const to = edge(1)
  if (from == null || to == null || to <= from) return null
  return {
    night: !day,
    progress: (t0 - from) / (to - from),
    from: new Date(from),
    to: new Date(to),
  }
}

/**
 * GÜNÜN NE KADARI GEÇTİ — pencerenin gün yayındaki güneş (2026-10-02). Güneş
 * gökteyse son doğuşu ve sıradaki batışı `now`dan geriye/ileriye tarayıp
 * aradaki yerini 0..1 olarak verir; batıksa, ya da 24 saat içinde doğuş/batış
 * yoksa (kutup günü/gecesi) `null` ve yayda güneş çizilmez.
 * ⚠️ `sunTimes`ın YEREL gününe bakılmaz: yer tarayıcının saat diliminden
 * uzaksa (VPN çıkışı) o günün "doğuşu" batıştan sonra gelir ve oran eksiye
 * düşerdi. Tarama gerçek doğuş–batış çiftini her zaman bulur.
 */
export function daylightProgress(lat, lon, now = new Date()) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const t0 = now.getTime()
  const above = (t) => sunElevation(lat, lon, new Date(t)) > -0.833
  if (!above(t0)) return null
  const STEP = 2 * 60 * 1000
  const LIMIT = 24 * 60 * 60 * 1000
  const edge = (dir) => {
    for (let d = STEP; d <= LIMIT; d += STEP) {
      if (above(t0 + dir * d)) continue
      let a = t0 + dir * (d - STEP) // hâlâ gökte
      let b = t0 + dir * d // ufkun altında
      for (let i = 0; i < 12; i++) {
        const m = (a + b) / 2
        if (above(m)) a = m
        else b = m
      }
      return (a + b) / 2
    }
    return null
  }
  const rise = edge(-1)
  const set = edge(1)
  if (rise == null || set == null || set <= rise) return null
  return (t0 - rise) / (set - rise)
}
