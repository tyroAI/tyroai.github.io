import { bcp47 } from "@/lib/intl-cache"

const rtf = new Map()

/** "2 sa önce" · "dün" — kısa göreli zaman (dilin kendi kalıbıyla). */
export function ago(date, locale, now = Date.now()) {
  if (!date) return ""
  const tag = bcp47(locale)
  if (!rtf.has(tag))
    rtf.set(tag, new Intl.RelativeTimeFormat(tag, { numeric: "auto", style: "short" }))
  const f = rtf.get(tag)
  const min = Math.round((date.getTime() - now) / 60_000)
  if (Math.abs(min) < 60) return f.format(min, "minute")
  const h = Math.round(min / 60)
  if (Math.abs(h) < 24) return f.format(h, "hour")
  return f.format(Math.round(h / 24), "day")
}
