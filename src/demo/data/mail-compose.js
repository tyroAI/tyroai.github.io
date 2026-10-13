// Posta verisinin ortak parçaları: göreli zaman, Outlook benzeri HTML gövde ve imza.
import { COMPANY } from "../persona"

/**
 * `daysAgo` gün önce, yerel `HH:MM`. Geçmiş günler hafta sonuna düşerse cumaya
 * çekilir (iş postası). Bugünün henüz gelmemiş saati (demo sabah erken açıldıysa)
 * "birkaç dakika önce"ye iner — gelecekte tarihli posta olmaz.
 */
export function at(now, daysAgo, hhmm, fallbackMin = 5) {
  const [h, m] = hhmm.split(":").map(Number)
  const d = new Date(now)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(h, m, Math.floor((h * 7 + m * 13) % 60), 0)
  if (daysAgo > 0) {
    const day = d.getDay()
    if (day === 0) d.setDate(d.getDate() - 2)
    else if (day === 6) d.setDate(d.getDate() - 1)
  }
  if (d.getTime() > now.getTime()) return new Date(now.getTime() - fallbackMin * 60_000)
  return d
}

/** Gün adı ("Perşembe") — gövdede göreli tarih yazmak için. */
export function dayName(date, locale = "tr-TR") {
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date)
}

/** "24 Ekim" biçiminde kısa tarih. */
export function shortDate(date, locale = "tr-TR") {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(date)
}

/** `now`dan `n` iş günü sonrası. */
export function workdaysAhead(now, n) {
  const d = new Date(now)
  let left = n
  while (left > 0) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) left--
  }
  return d
}

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

const FONT = "font-family:'Segoe UI',Calibri,Arial,sans-serif;font-size:14px;line-height:1.55;color:#1f2933"

/** Kişinin imzası (şirket içi ya da müşteri). */
export function signature({ name, title, company = COMPANY.name, phone, mail, lang = "tr" }) {
  const lines = [
    `<b style="color:#0f172a">${esc(name)}</b>`,
    title ? `<span style="color:#52606d">${esc(title)}</span>` : "",
    `<span style="color:#52606d">${esc(company)}</span>`,
    phone ? `<span style="color:#7b8794">${lang === "en" ? "T" : "Tel"}: ${esc(phone)}</span>` : "",
    mail ? `<a href="mailto:${esc(mail)}" style="color:#2563eb;text-decoration:none">${esc(mail)}</a>` : "",
  ].filter(Boolean)
  return `<div style="margin-top:18px;padding-top:10px;border-top:1px solid #e4e7eb;font-size:12.5px;line-height:1.5">${lines.join("<br>")}</div>`
}

/** Paragraf listesi; dizi öğeleri `<li>` olur, `{table}` öğeleri tablo. */
function block(part) {
  if (Array.isArray(part)) {
    return `<ul style="margin:6px 0 12px;padding-left:20px">${part.map((li) => `<li style="margin:3px 0">${li}</li>`).join("")}</ul>`
  }
  if (part && typeof part === "object" && part.table) {
    const [head, ...rows] = part.table
    const th = head
      .map(
        (c, i) =>
          `<th style="text-align:${i ? "right" : "left"};padding:7px 10px;background:#f1f5f9;border-bottom:1px solid #d9e2ec;font-weight:600;font-size:13px">${c}</th>`,
      )
      .join("")
    const tr = rows
      .map(
        (r) =>
          `<tr>${r
            .map(
              (c, i) =>
                `<td style="text-align:${i ? "right" : "left"};padding:7px 10px;border-bottom:1px solid #eef2f6;font-size:13px">${c}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("")
    return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 14px;min-width:360px"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`
  }
  if (part && typeof part === "object" && part.html) return part.html
  return `<p style="margin:0 0 12px">${part}</p>`
}

/** Outlook'tan çıkmış gibi duran sade bir posta gövdesi. */
export function mailHtml({ greeting, parts = [], closing, sign, quote }) {
  const body = [
    greeting ? `<p style="margin:0 0 12px">${greeting}</p>` : "",
    ...parts.map(block),
    closing ? `<p style="margin:0 0 4px">${closing}</p>` : "",
    sign ? signature(sign) : "",
    quote
      ? `<div style="margin-top:18px;padding:10px 0 0 12px;border-left:3px solid #d9e2ec;color:#52606d;font-size:13px"><b>${esc(quote.from)}</b> · ${esc(quote.when)}<br><br>${quote.text}</div>`
      : "",
  ].join("")
  return `<html><head><meta charset="utf-8"></head><body><div style="${FONT}">${body}</div></body></html>`
}

/**
 * Kurumsal bülten gövdesi (Keşfet gönderileri): üstte kapak görseli (`cid:`),
 * başlık, paragraflar, isteğe bağlı eylem düğmesi ve alt bilgi.
 */
export function bulletinHtml({ cid, eyebrow, title, parts = [], cta, footer, accent = "#2563eb" }) {
  const hero = cid
    ? `<tr><td style="padding:0"><img src="cid:${cid}" width="640" height="336" alt="" style="display:block;width:100%;height:auto;border:0;border-radius:10px 10px 0 0"></td></tr>`
    : ""
  const button = cta
    ? `<p style="margin:18px 0 6px"><a href="${esc(cta.href)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px">${esc(cta.label)}</a></p>`
    : ""
  return `<html><head><meta charset="utf-8"></head><body style="margin:0;background:#f4f6f8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:18px 0"><tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:10px;border:1px solid #e4e7eb">
${hero}
<tr><td style="padding:22px 28px 26px;${FONT}">
${eyebrow ? `<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${accent};font-weight:700;margin-bottom:6px">${esc(eyebrow)}</div>` : ""}
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#0f172a">${esc(title)}</h1>
${parts.map(block).join("")}
${button}
</td></tr>
<tr><td style="padding:14px 28px;border-top:1px solid #eef2f6;font-family:'Segoe UI',Arial,sans-serif;font-size:11.5px;color:#7b8794">${footer ?? `${esc(COMPANY.legalName)} · Bu ileti şirket içi bilgilendirme amaçlıdır.`}</td></tr>
</table></td></tr></table></body></html>`
}

/** HTML → Graph `bodyPreview` (ilk 255 karakter düz metin). */
export function previewOf(html) {
  return String(html ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\r\n")
    .trim()
    .slice(0, 255)
}

/** HTML → düz metin gövde (`Prefer: outlook.body-content-type="text"`). */
export function textOf(html) {
  return String(html ?? "")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
