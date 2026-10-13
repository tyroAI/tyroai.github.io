import { getDateTimeFormat } from "@/lib/intl-cache"

// 24-hour throughout, same reasoning as the calendar rows.
const OPTS_TIME = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
const OPTS_DATE_SHORT = { day: "numeric", month: "short" }
export const OPTS_DAY_LONG = { weekday: "long", day: "numeric", month: "long" }
export const OPTS_FULL_STAMP = {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
}

export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Messages in received order, split into day sections. */
export function groupByDay(messages) {
  const out = []
  for (const m of messages) {
    const key = m.received ? startOfDay(m.received).getTime() : 0
    const last = out[out.length - 1]
    if (last && last.key === key) last.items.push(m)
    else out.push({ key, day: m.received ? startOfDay(m.received) : null, items: [m] })
  }
  return out
}

/** Today → clock, otherwise a short date. Avoids src/lib/date.js's
 *  formatRelative, whose tables only cover tr/en and fall back to Turkish
 *  for ru/ar. */
export function stamp(date, locale) {
  if (!date) return ""
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  return getDateTimeFormat(locale, sameDay ? OPTS_TIME : OPTS_DATE_SHORT).format(date)
}

/**
 * Postanın HTML'ini iframe için paketler. Asıl güvenlik sandbox'ta; buradaki
 * içerik politikası uzaktaki kaynakları (takip pikselleri) keser, gömülü
 * (data:) görseller geçer. Punto `zoom` ile küçülür, düzleştirilmez: postanın
 * kendi başlık/gövde/alıntı hiyerarşisi kalır (`zoom` burada meşru — ölçen bir
 * şey yok). Genişlik klempi 600px'lik şablonları kartta tutar; `break-all`
 * yalnız bağlantılarda. Ölçümler: docs/features/header-panelleri.md.
 */
export function mailFrameDoc(html) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:">
<base target="_blank">
<style>
  html{-webkit-text-size-adjust:100%}
  html,body{margin:0;background:#fff}
  body{padding:10px 12px;color:#1f2328;zoom:.82;
    font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    overflow-wrap:break-word;word-break:normal}
  /* Kart dar; postanın sabit genişlikleri kabın içinde kalmak zorunda. */
  body *{max-width:100%!important}
  table{border-collapse:collapse!important}
  table,thead,tbody,tfoot,tr,td,th,col,colgroup{width:auto!important;min-width:0!important;height:auto!important}
  img{max-width:100%!important;height:auto!important;border:0}
  p{margin:0 0 .5em}
  a{color:#0b5cab;word-break:break-all}
  blockquote{margin:0 0 0 8px;padding-left:10px;border-left:2px solid #e5e7eb;color:#6b7280}
  pre{white-space:pre-wrap}
</style></head><body>${html}</body></html>`
}
