import { firstDayOfWeek } from "@/lib/weekStart"

/** Bu haftanın kalan günleri + gelecek haftanın yedi günü (dilin hafta başına göre). */
export function weekKeys(locale, now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const back = (start.getDay() - firstDayOfWeek(locale) + 7) % 7
  const weekStart = new Date(start)
  weekStart.setDate(start.getDate() - back)
  const day = (offset) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + offset)
    return d
  }
  const thisWeek = []
  for (let i = back; i < 7; i++) thisWeek.push(day(i))
  const nextWeek = []
  for (let i = 7; i < 14; i++) nextWeek.push(day(i))
  return { thisWeek, nextWeek }
}

/** Gün anahtarı ("YYYY-AA-GG") → o günün yerel öğlesi (gün adı ve tarih biçimi için). */
export const dateOfKey = (key) => new Date(`${key}T12:00`)

/**
 * Yayın iki ucunun etiketleri — sol uç evrenin başı, sağ uç sonu: gündüz
 * "Gün doğumu · Gün batımı", gece "Gün batımı (son) · Gün doğumu (sıradaki)". Yay yoksa (kutup günü/gecesi, koordinat yok, seçilen gün) o
 * yerel günün doğuşu ve batışı — `sunTimes`.
 */
export function arcEnds(arc, sun, t) {
  const rise = (at) => ({ key: "rise", label: t("myspace.weather.sunrise"), at })
  const set = (at) => ({ key: "set", label: t("myspace.weather.sunset"), at })
  if (arc) return arc.night ? [set(arc.from), rise(arc.to)] : [rise(arc.from), set(arc.to)]
  if (!sun) return null
  return [rise(sun.rise), set(sun.set)]
}
