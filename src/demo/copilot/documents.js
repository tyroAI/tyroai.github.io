// Asistanın ürettiği indirilebilir belgeler — kendi içinde, dış kaynaksız HTML
// (yazdırılabilir; bkz. lib/botFiles.js). TÜMÜ KURGUSAL.
//
// İzin formunun "Personel İmzası" satırı `lib/signedForm.js`in aradığı biçimde:
// `<div><b>{tarih}</b><span>Personel İmzası</span></div>` — sohbetteki
// "İmzala ve gönder" düğmesi bu satırı bulursa çizilir.
import { COMPANY, ME, MANAGER } from "@/demo/persona"
import { fmtDate, money, pct, pick } from "./util"

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  )

const CSS = `
*{box-sizing:border-box}body{margin:0;background:#eef1f5;font:13px/1.5 "Segoe UI",Arial,sans-serif;color:#1f2937}
.sheet{width:273mm;max-width:100%;margin:12px auto;background:#fff;border-radius:10px;padding:14mm 14mm 10mm;box-shadow:0 6px 24px rgba(15,23,42,.08)}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #0e7490;padding-bottom:8px;margin-bottom:14px}
header .brand{font-weight:700;font-size:18px;color:#0e7490;letter-spacing:.02em}
header .meta{text-align:right;color:#64748b;font-size:12px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#0e7490;margin:18px 0 6px}
table{width:100%;border-collapse:collapse;margin:4px 0}th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#f1f5f9;font-weight:600;width:28%}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
ul{margin:4px 0 0 18px;padding:0}li{margin:2px 0}
.note{color:#64748b;font-size:11.5px;margin-top:14px}
.sig{display:flex;gap:40px;margin-top:26px}.sig>div{flex:1;border-top:1px solid #94a3b8;padding-top:4px;margin-top:13mm;display:flex;justify-content:space-between;color:#475569;font-size:12px}
.pill{display:inline-block;padding:1px 8px;border-radius:999px;background:#ecfeff;color:#0e7490;font-size:11px;font-weight:600}
@media print{body{background:#fff}.sheet{box-shadow:none;margin:0;border-radius:0}}`

function shell(lang, title, inner) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body><div class="sheet">${inner}</div></body></html>`
}

function head(L, title, ref) {
  return `<header><div><div class="brand">${esc(COMPANY.name)}</div><h1>${esc(title)}</h1></div><div class="meta">${esc(ref)}<br>${esc(fmtDate(L, new Date(), { day: "numeric", month: "long", year: "numeric" }))}</div></header>`
}

const rows = (pairs) =>
  `<table>${pairs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>`

/** İzin talep formu — imzalanabilir. */
export function leaveFormHtml(L, { number, kind, start, end, days, note }) {
  const d = (x) => fmtDate(L, x, { day: "numeric", month: "long", year: "numeric" })
  const today = new Date()
  const p = (n) => String(n).padStart(2, "0")
  const stamp = `${today.getDate()}.${p(today.getMonth() + 1)}.${today.getFullYear()}`
  const title = pick(L, "İzin Talep Formu", "Leave Request Form")
  const body = `${head(L, title, number)}
<h2>${pick(L, "Personel", "Employee")}</h2>
${rows([
  [pick(L, "Ad Soyad", "Name"), ME.displayName],
  [pick(L, "Sicil no", "Employee no."), ME.employeeId],
  [pick(L, "Unvan / Bölüm", "Title / Department"), `${ME.jobTitle} · ${ME.department}`],
  [pick(L, "Yönetici", "Manager"), MANAGER.displayName],
])}
<h2>${pick(L, "İzin", "Leave")}</h2>
${rows([
  [pick(L, "İzin türü", "Leave type"), kind],
  [pick(L, "Başlangıç", "Start"), d(start)],
  [pick(L, "Bitiş", "End"), d(end)],
  [pick(L, "Süre", "Duration"), pick(L, `${days} iş günü`, `${days} working day${days === 1 ? "" : "s"}`)],
  [pick(L, "Açıklama", "Note"), note || "—"],
])}
<p class="note">${pick(L, "Bu talep yöneticinin onayına gönderilmiştir. İzin dönüşü işe başlama tarihi bitişi izleyen ilk iş günüdür.", "This request has been sent for your manager's approval. You return to work on the first working day after the end date.")}</p>
<div class="sig"><div><b>${stamp}</b><span>Personel İmzası</span></div><div><b></b><span>${pick(L, "Yönetici Onayı", "Manager Approval")}</span></div></div>`
  return shell(L, `${title} — ${ME.displayName}`, body)
}

/** QBR hazırlık notu. */
export function qbrBriefHtml(L, { account, contact, quarter, metrics, wins, risks, asks, agenda }) {
  const title = pick(L, `QBR Hazırlık Notu — ${account}`, `QBR Briefing — ${account}`)
  const body = `${head(L, title, quarter)}
<p><span class="pill">${esc(contact)}</span></p>
<h2>${pick(L, "Gündem", "Agenda")}</h2><ul>${agenda.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<h2>${pick(L, "Temel göstergeler", "Key metrics")}</h2>
<table><tr><th>${pick(L, "Gösterge", "Metric")}</th><th class="num">${pick(L, "Değer", "Value")}</th><th>${pick(L, "Yorum", "Comment")}</th></tr>
${metrics.map(([k, v, c]) => `<tr><td>${esc(k)}</td><td class="num">${esc(v)}</td><td>${esc(c)}</td></tr>`).join("")}</table>
<h2>${pick(L, "Bu dönemin kazanımları", "Wins this period")}</h2><ul>${wins.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<h2>${pick(L, "Riskler ve açık konular", "Risks and open items")}</h2><ul>${risks.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<h2>${pick(L, "Bizim taleplerimiz", "Our asks")}</h2><ul>${asks.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<p class="note">${pick(L, `Hazırlayan: ${ME.displayName} · TYRO Sales ile oluşturuldu. Rakamlar CRM'deki son duruma göredir.`, `Prepared by ${ME.displayName} · generated with TYRO Sales. Figures reflect the latest CRM data.`)}</p>`
  return shell(L, title, body)
}

/** Teklif taslağı. */
export function quoteHtml(L, { number, account, contact, lines, discount, validDays, terms }) {
  const subtotal = lines.reduce((a, l) => a + l.qty * l.unit, 0)
  const disc = Math.round((subtotal * discount) / 100)
  const total = subtotal - disc
  const title = pick(L, `Teklif Taslağı — ${account}`, `Draft Quote — ${account}`)
  const body = `${head(L, title, number)}
${rows([
  [pick(L, "Müşteri", "Customer"), account],
  [pick(L, "İlgili kişi", "Contact"), contact],
  [pick(L, "Hazırlayan", "Prepared by"), `${ME.displayName} · ${ME.mail}`],
  [pick(L, "Geçerlilik", "Valid for"), pick(L, `${validDays} gün`, `${validDays} days`)],
])}
<h2>${pick(L, "Kalemler", "Line items")}</h2>
<table><tr><th>${pick(L, "Ürün / hizmet", "Product / service")}</th><th class="num">${pick(L, "Adet", "Qty")}</th><th class="num">${pick(L, "Birim fiyat", "Unit price")}</th><th class="num">${pick(L, "Tutar", "Amount")}</th></tr>
${lines.map((l) => `<tr><td>${esc(l.name)}</td><td class="num">${l.qty}</td><td class="num">${money(L, l.unit)}</td><td class="num">${money(L, l.qty * l.unit)}</td></tr>`).join("")}
<tr><td colspan="3">${pick(L, "Ara toplam", "Subtotal")}</td><td class="num">${money(L, subtotal)}</td></tr>
<tr><td colspan="3">${pick(L, "İskonto", "Discount")} (${pct(L, discount)})</td><td class="num">−${money(L, disc)}</td></tr>
<tr><th colspan="3">${pick(L, "Genel toplam (KDV hariç)", "Total (excl. VAT)")}</th><th class="num">${money(L, total)}</th></tr></table>
<h2>${pick(L, "Koşullar", "Terms")}</h2><ul>${terms.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
<p class="note">${pick(L, "Taslaktır — iskonto onayı tamamlanmadan müşteriyle paylaşmayın.", "Draft — do not share with the customer until the discount is approved.")}</p>`
  return shell(L, title, body)
}

export { esc }
