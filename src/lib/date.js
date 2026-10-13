import { getDateTimeFormat } from "./intl-cache"

const FORMATS = {
  tr: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  en: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
}

const RELATIVE = {
  tr: {
    now: "az önce",
    minute: "dakika önce",
    hour: "saat önce",
    day: "gün önce",
    week: "hafta önce",
    month: "ay önce",
    year: "yıl önce",
    new: "Yeni",
  },
  en: {
    now: "just now",
    minute: "min ago",
    hour: "h ago",
    day: "d ago",
    week: "w ago",
    month: "mo ago",
    year: "y ago",
    new: "New",
  },
}

export function formatLongDate(date, locale = "tr") {
  const opts = FORMATS[locale] ?? FORMATS.tr
  return getDateTimeFormat(locale, opts).format(date)
}

export function formatRelative(date, locale = "tr") {
  const t = RELATIVE[locale] ?? RELATIVE.tr
  if (date === "new") return t.new
  const d = date instanceof Date ? date : new Date(date)
  const diffMs = Date.now() - d.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return t.now
  if (min < 60) return `${min} ${t.minute}`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ${t.hour}`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} ${t.day}`
  const wk = Math.floor(day / 7)
  if (wk < 5) return `${wk} ${t.week}`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo} ${t.month}`
  const yr = Math.floor(day / 365)
  return `${yr} ${t.year}`
}

/**
 * `dd.MM.yyyy HH:mm` — yetki taleplerinin tek tarih düzeni.
 *
 * ⚠️ DİLE GÖRE DEĞİŞMEZ, ve bu bilinçli: `04/25` ile `25/04` arasındaki
 * ayrım okuyucuya bırakılamaz ve bu damgalar bir denetim izinin parçası
 * (kim ne zaman istedi). Uygulamanın geri kalanı `Intl` kullanıyor çünkü
 * orada tarih bir sunum öğesi; burada bir kayıt.
 *
 * `AuthorizationsPage` ile kilitli kartın talep dökümü AYNI fonksiyonu
 * okur — iki ekranın aynı satırı farklı biçimde göstermesi, "bu o talep mi"
 * sorusunu doğururdu.
 */
export function formatStamp(iso) {
  if (!iso) return "—"
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const p = (n) => String(n).padStart(2, "0")
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * "2 gün önce" — dört dilde, `Intl.RelativeTimeFormat` ile.
 *
 * ⚠️ `formatRelative` (bu dosyanın üstünde) KULLANILMAZ: onun sözlüğü elle
 * yazılmış ve yalnız tr/en taşıyor, yani ru/ar sessizce Türkçe okurdu.
 * `Intl` dördünü de biliyor ve çekim kurallarını (ru'nun "2 дня / 5 дней"
 * ayrımı gibi) bizden iyi biliyor.
 *
 * Bir kuyruğun okunması gereken şey "ne kadar bekledi"dir; kesin damga
 * denetim bilgisidir ve `formatStamp` ile bir tık ötede durur.
 */
export function formatAgo(iso, locale = "tr") {
  if (!iso) return "—"
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const diffMin = Math.round((d.getTime() - Date.now()) / 60000)
  const abs = Math.abs(diffMin)
  if (abs < 60) return rtf.format(diffMin, "minute")
  if (abs < 60 * 24) return rtf.format(Math.round(diffMin / 60), "hour")
  if (abs < 60 * 24 * 30) return rtf.format(Math.round(diffMin / 1440), "day")
  if (abs < 60 * 24 * 365) return rtf.format(Math.round(diffMin / 43200), "month")
  return rtf.format(Math.round(diffMin / 525600), "year")
}

/** Kaç gündür bekliyor — yaşlanma uyarısı bunu okur. */
export function daysSince(iso) {
  if (!iso) return 0
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return 0
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}
