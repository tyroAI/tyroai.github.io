// TYRO HR — izin, masraf, avans, politikalar ve yönetici işleri. Bakiye ve
// kayıtlar Self Servis sayfasının okuduğu demo İK uçlarından gelir (live.js).
import { MANAGER, ME, TEAM } from "@/demo/persona"
import { upcomingHolidays } from "@/lib/holidays"
import { leaveConfirmCard, expenseConfirmCard } from "../cards"
import { leaveFormHtml } from "../documents"
import { selfService } from "../live"
import { dayFrom, fmtDate, fmtDay, pick } from "../util"

const LEAVE = {
  annual: ["yıllık izin", "annual leave"],
  excuse: ["mazeret izni", "personal leave"],
  sick: ["hastalık izni", "sick leave"],
  paternity: ["babalık izni", "paternity leave"],
  maternity: ["doğum izni", "maternity leave"],
  marriage: ["evlilik izni", "marriage leave"],
  bereavement: ["vefat izni", "bereavement leave"],
  unpaid: ["ücretsiz izin", "unpaid leave"],
}
const HOLIDAY = {
  newYear: ["Yılbaşı", "New Year's Day"],
  sovereignty: ["Ulusal Egemenlik ve Çocuk Bayramı", "National Sovereignty and Children's Day"],
  labour: ["Emek ve Dayanışma Günü", "Labour Day"],
  youth: ["Atatürk'ü Anma, Gençlik ve Spor Bayramı", "Youth and Sports Day"],
  democracy: ["Demokrasi ve Millî Birlik Günü", "Democracy and National Unity Day"],
  victory: ["Zafer Bayramı", "Victory Day"],
  republic: ["Cumhuriyet Bayramı", "Republic Day"],
  ramadan: ["Ramazan Bayramı", "Eid al-Fitr"],
  sacrifice: ["Kurban Bayramı", "Eid al-Adha"],
}
const L2 = (L, pair) => (L === "tr" ? pair[0] : pair[1])
const FALLBACK_BALANCE = { claim: 14, used: 5, remain: 9 }
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6
const holidayKeys = () => new Set(upcomingHolidays(dayFrom(-400)).flatMap((h) => Array.from({ length: h.days }, (_, i) => dayFrom(i, h.from).toDateString())))

function workdays(start, end) {
  const hol = holidayKeys()
  let n = 0
  for (let d = new Date(start); d <= end; d = dayFrom(1, d)) if (!isWeekend(d) && !hol.has(d.toDateString())) n += 1
  return n
}

const TR_MONTHS = ["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik"]
const EN_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]

/** Metindeki tarihler: "6 Ekim 2026", "October 6, 2026", "06.10.2026". */
function datesIn(f) {
  const out = []
  for (const m of f.matchAll(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/g)) {
    const i = TR_MONTHS.indexOf(m[2])
    if (i >= 0) out.push({ at: m.index, d: new Date(+m[3], i, +m[1]) })
  }
  for (const m of f.matchAll(/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/g)) {
    const i = EN_MONTHS.indexOf(m[1])
    if (i >= 0) out.push({ at: m.index, d: new Date(+m[3], i, +m[2]) })
  }
  for (const m of f.matchAll(/(\d{1,2})[./](\d{1,2})[./](\d{4})/g)) out.push({ at: m.index, d: new Date(+m[3], +m[2] - 1, +m[1]) })
  return out.sort((a, b) => a.at - b.at).map((x) => x.d)
}

const kindIn = (f) =>
  Object.entries(LEAVE).find(([, [tr, en]]) => f.includes(tr.replace("ı", "i").replace("ü", "u").replace("ğ", "g").replace("ö", "o")) || f.includes(en))?.[0] ??
  (/mazeret|personal/.test(f) ? "excuse" : /hastalik|sick/.test(f) ? "sick" : "annual")

async function balanceOf() {
  const data = await selfService()
  return { data, balance: data?.balance ?? FALLBACK_BALANCE }
}

async function leaveBalance({ L }) {
  const { balance: b } = await balanceOf()
  const next = upcomingHolidays(new Date()).slice(0, 1)[0]
  return {
    steps: [{ tool: "hr_get_leave_balance", ms: 520 }],
    text: pick(
      L,
      `🌴 **Yıllık izin bakiyen (${new Date().getFullYear()})**\n\n- Hak edilen: **${b.claim} gün**\n- Kullanılan: **${b.used} gün**\n- Kalan: **${b.remain} gün**\n\n${next ? `Sıradaki resmi tatil **${L2(L, HOLIDAY[next.key] ?? [next.key, next.key])}** (${fmtDay(L, next.from)}). Köprü günlerini birleştirerek kalan iznini verimli kullanabilirsin.` : ""}`,
      `🌴 **Your annual leave balance (${new Date().getFullYear()})**\n\n- Entitlement: **${b.claim} days**\n- Used: **${b.used} days**\n- Remaining: **${b.remain} days**\n\n${next ? `The next public holiday is **${L2(L, HOLIDAY[next.key] ?? [next.key, next.key])}** (${fmtDay(L, next.from)}) — pairing it with a bridge day makes your remaining leave go further.` : ""}`,
    ),
    suggested: [pick(L, "İzin talebi oluştur", "Request leave"), pick(L, "Son izinlerimi listele", "List my recent leave"), pick(L, "Yaklaşan resmi tatiller", "Upcoming public holidays")],
  }
}

async function leaveHistory({ L }) {
  const { data } = await balanceOf()
  const leaves = (data?.leaves ?? []).slice().sort((a, b) => (b.start ?? 0) - (a.start ?? 0)).slice(0, 5)
  const rows = leaves.map((l) => `| ${l.type || "—"} | ${l.start ? fmtDate(L, l.start, { day: "numeric", month: "short", year: "numeric" }) : ""} | ${l.end ? fmtDate(L, l.end, { day: "numeric", month: "short", year: "numeric" }) : ""} | ${l.days ?? ""} |`)
  return {
    steps: [{ tool: "hr_list_leaves", ms: 540 }],
    text: rows.length
      ? pick(L, `Son ${rows.length} iznin:\n\n| Tür | Başlangıç | Bitiş | Gün |\n|---|---|---|---:|\n${rows.join("\n")}`, `Your last ${rows.length} leave records:\n\n| Type | Start | End | Days |\n|---|---|---|---:|\n${rows.join("\n")}`)
      : pick(L, "Kayıtlı izin bulamadım.", "I couldn't find any leave records."),
    suggested: [pick(L, "Son iznimin izin formunu hazırla", "Prepare the leave form for my latest leave")],
  }
}

const numberOf = () => `IZN-${new Date().getFullYear()}-${String(400 + new Date().getDate() * 3).padStart(4, "0")}`

function leaveDoc(L, req) {
  const html = leaveFormHtml(L, { ...req, kind: L2(L, LEAVE[req.kind]) })
  return { tool: "get_leave_form", server: "vega-hr", name: `${pick(L, "Izin_Formu", "Leave_Form")}_${req.number}.html`, html }
}

async function leaveRequest({ L, f, conv }) {
  const dates = datesIn(f)
  if (!dates.length)
    return {
      text: pick(L, "Hangi tarihler arasında izin almak istiyorsun? Örneğin: “20 Kasım – 24 Kasım yıllık izin talebi oluştur”.", "Which dates would you like off? For example: “Request annual leave from November 20 to November 24”."),
      suggested: [pick(L, "Gelecek cuma için mazeret izni", "Personal leave next Friday"), pick(L, "İzin bakiyemi göster", "Show my leave balance")],
    }
  const [start, end = start] = dates
  const kind = kindIn(f)
  const days = Math.max(1, workdays(start, end))
  const { balance: b } = await balanceOf()
  const after = kind === "annual" ? b.remain - days : b.remain
  const payload = { kind, start: start.toISOString(), end: end.toISOString(), days }
  conv.pending = { kind: "leave", payload }
  const d = (x) => fmtDate(L, x, { day: "numeric", month: "long", year: "numeric" })
  return {
    steps: [{ tool: "hr_get_leave_balance", ms: 420 }, { tool: "hr_validate_leave", ms: 380 }],
    text: pick(
      L,
      `${d(start)} – ${d(end)} için **${L2(L, LEAVE[kind])}** talebini hazırladım: **${days} iş günü** (hafta sonu ve resmi tatiller sayılmadı).${after < 0 ? "\n\n⚠️ Bakiyen yetmiyor; fark ücretsiz izin olarak işlenir." : ""} Kontrol edip gönder:`,
      `I've prepared your **${L2(L, LEAVE[kind])}** request for ${d(start)} – ${d(end)}: **${days} working day${days === 1 ? "" : "s"}** (weekends and public holidays excluded).${after < 0 ? "\n\n⚠️ Your balance isn't enough; the difference is booked as unpaid leave." : ""} Check it and submit:`,
    ),
    attachments: [
      leaveConfirmCard(L, {
        kindLabel: L2(L, LEAVE[kind]),
        startLabel: d(start),
        endLabel: d(end),
        daysLabel: pick(L, `${days} iş günü`, `${days} working day(s)`),
        balanceLabel: pick(L, `${Math.max(0, after)} gün`, `${Math.max(0, after)} days`),
        approver: MANAGER.displayName,
        payload,
      }),
    ],
  }
}

function submitLeave({ L, value }) {
  const p = value.req ?? {}
  const req = { number: numberOf(L), kind: p.kind ?? "annual", start: new Date(p.start ?? Date.now()), end: new Date(p.end ?? Date.now()), days: p.days ?? 1, note: value.note || "" }
  return {
    steps: [{ tool: "hr_create_leave_request", server: "vega-hr", ms: 620 }, { tool: "get_leave_form", server: "vega-hr", ms: 540 }],
    document: leaveDoc(L, req),
    text: pick(
      L,
      `✅ **İzin talebin oluşturuldu — ${req.number}**\n\n${MANAGER.displayName} onayına gönderildi; onaylanınca Self Servis'te ve takviminde görünecek. İzin formunu aşağıya ekledim — **İmzala ve gönder** ile imzalı PDF'i İK'ya iletebilirsin.`,
      `✅ **Your leave request is in — ${req.number}**\n\nIt's with ${MANAGER.displayName} for approval and will show up in Self Service and your calendar once approved. The leave form is attached below — use **Sign and send** to send the signed PDF to HR.`,
    ),
    suggested: [pick(L, "Otomatik yanıt mesajı yaz", "Write an out-of-office message"), pick(L, "İzin bakiyemi göster", "Show my leave balance")],
  }
}

async function leaveForm({ L }) {
  const { data } = await balanceOf()
  const l = (data?.leaves ?? []).slice().sort((a, b) => (b.start ?? 0) - (a.start ?? 0))[0]
  const req = { number: numberOf(L), kind: /mazeret/i.test(l?.type ?? "") ? "excuse" : "annual", start: l?.start ?? dayFrom(-20), end: l?.end ?? dayFrom(-18), days: l?.days ?? 3, note: l?.description || "" }
  return {
    steps: [{ tool: "hr_list_leaves", ms: 400 }, { tool: "get_leave_form", server: "vega-hr", ms: 560 }],
    document: leaveDoc(L, req),
    text: pick(L, `Son izninin (${fmtDate(L, req.start)} – ${fmtDate(L, req.end)}) formu hazır; indirip yazdırabilir ya da imzalayıp gönderebilirsin.`, `The form for your latest leave (${fmtDate(L, req.start)} – ${fmtDate(L, req.end)}) is ready — download, print, or sign and send it.`),
  }
}

const LIMITS = [
  ["Konaklama (yurtiçi, gece)", "Hotel (domestic, per night)", "₺4.500", "İstanbul, Ankara, İzmir için ₺6.000"],
  ["Yemek (seyahatte, günlük)", "Meals (travelling, per day)", "₺1.200", "Fiş zorunlu"],
  ["Müşteri ağırlama (kişi başı)", "Client entertainment (per head)", "₺2.000", "Katılımcı listesi eklenir"],
  ["Taksi / ulaşım", "Taxi / local transport", "Gerçekleşen", "İş amacı açıklamada yazılır"],
  ["Yurtdışı harcırah (günlük)", "Per diem abroad (daily)", "€80", "Ülke grubuna göre değişir"],
]

function expensePolicy({ L }) {
  const rows = LIMITS.map((r) => `| ${L === "tr" ? r[0] : r[1]} | ${r[2]} |`).join("\n")
  return {
    steps: [{ tool: "hr_policy_search", ms: 560 }],
    text: pick(
      L,
      `📘 **Masraf politikası — özet**\n\n| Kalem | Limit |\n|---|---|\n${rows}\n\n- Masraflar harcamadan sonraki **30 gün** içinde girilir; fiş ya da e-fatura eklenmesi zorunlu.\n- Limit aşımları yöneticinin (${MANAGER.displayName}) ve Finans'ın onayına düşer.\n- Uçak ve otel rezervasyonları seyahat portalı üzerinden yapılır; kişisel kartla ödenirse masraf olarak girilir.`,
      `📘 **Expense policy — summary**\n\n| Item | Limit |\n|---|---|\n${rows}\n\n- File expenses within **30 days** of spending; a receipt or e-invoice is required.\n- Anything over the limit goes to your manager (${MANAGER.displayName}) and Finance for approval.\n- Book flights and hotels through the travel portal; if paid by personal card, file them as expenses.`,
    ),
    suggested: [pick(L, "Masraf gir", "File an expense"), pick(L, "Son masraflarımı göster", "Show my recent expenses")],
  }
}

async function myExpenses({ L }) {
  const { data } = await balanceOf()
  const list = (data?.expenses ?? []).slice().sort((a, b) => (b.date ?? 0) - (a.date ?? 0)).slice(0, 6)
  const amount = (e) => Object.entries(e.totals ?? {}).map(([c, v]) => `${Math.round(v).toLocaleString(L === "tr" ? "tr-TR" : "en-US")} ${c}`).join(" + ")
  const rows = list.map((e) => `| ${e.number} | ${e.date ? fmtDate(L, e.date, { day: "numeric", month: "short" }) : ""} | ${(e.categoryNames ?? e.categories ?? []).join(", ")} | ${amount(e)} | ${e.status || "—"} |`)
  return {
    steps: [{ tool: "hr_list_expenses", ms: 560 }],
    text: rows.length
      ? pick(L, `Son masraf raporların:\n\n| No | Tarih | Kategori | Tutar | Durum |\n|---|---|---|---|---|\n${rows.join("\n")}`, `Your recent expense reports:\n\n| No. | Date | Category | Amount | Status |\n|---|---|---|---|---|\n${rows.join("\n")}`)
      : pick(L, "Kayıtlı masraf raporun yok.", "You have no expense reports on file."),
    suggested: [pick(L, "Masraf gir", "File an expense"), pick(L, "Masraf politikası limitleri neler?", "What are the expense policy limits?")],
  }
}

function expense({ L, text, f, conv, attachments }) {
  const amount = text.match(/(\d[\d.,]*)\s*(TRY|USD|EUR|GBP|TL|₺)?/i)
  const hasAmount = amount && !/^\d{1,2}$/.test(amount[1]) && /tutar|amount|expense of|masraf/i.test(text)
  const receipt = (attachments ?? []).map((a) => a.name).filter(Boolean)
  if (!hasAmount && !receipt.length)
    return {
      text: pick(L, "Masrafı girelim: tarih, tutar ve kategoriyi yaz (ör. “dün 1.850 TL müşteri yemeği”) ya da fişin fotoğrafını ekle, gerisini ben doldurayım.", "Let's file it: tell me the date, amount and category (e.g. “yesterday 1,850 TRY client dinner”) or attach a photo of the receipt and I'll fill in the rest."),
      suggested: [pick(L, "Masraf politikası limitleri neler?", "What are the expense policy limits?")],
    }
  const value = hasAmount ? amount[1] : "1.850"
  const currency = (amount?.[2] || "TRY").toUpperCase().replace("TL", "TRY").replace("₺", "TRY")
  const category =
    text.match(/tutarında (.+?) masraf/i)?.[1] ?? text.match(/log an? (.+?) expense/i)?.[1] ?? pick(L, "Temsil ağırlama yemek", "Client entertainment")
  const date = datesIn(f)[0] ?? new Date()
  const payload = { amount: value, currency, category, date: date.toISOString(), receipt }
  conv.pending = { kind: "expense", payload }
  return {
    steps: [{ tool: "hr_policy_search", ms: 360 }, { tool: "hr_validate_expense", ms: 420 }],
    text: pick(L, `${receipt.length ? `Fişi okudum (${receipt.join(", ")}). ` : ""}Masrafı hazırladım — kaydetmeden önce kontrol et:`, `${receipt.length ? `I've read the receipt (${receipt.join(", ")}). ` : ""}Your expense is ready — check it before saving:`),
    attachments: [
      expenseConfirmCard(L, {
        category,
        dateLabel: fmtDate(L, date, { day: "numeric", month: "long", year: "numeric" }),
        amountLabel: `${value} ${currency}`,
        receiptLabel: receipt.length ? receipt.join(", ") : pick(L, "Eklenmedi — kaydettikten sonra ekleyebilirsin", "Not attached — you can add it later"),
        policyLabel: pick(L, "✓ Limit içinde", "✓ Within limits"),
        payload,
      }),
    ],
  }
}

function submitExpense({ L, value }) {
  const p = value.exp ?? {}
  const no = `EXP-${new Date().getFullYear()}-${String(1200 + new Date().getDate()).padStart(5, "0")}`
  return {
    steps: [{ tool: "hr_create_expense", server: "vega-hr", ms: 640 }, ...(p.receipt?.length ? [{ tool: "hr_attach_receipt", server: "vega-hr", ms: 420 }] : [])],
    text: pick(
      L,
      `✅ **Masraf kaydı oluşturuldu — ${no}**\n\n${p.amount} ${p.currency} · ${p.category}${p.receipt?.length ? ` · fiş eklendi (${p.receipt.join(", ")})` : ""}\n\nRapor ${MANAGER.displayName} onayına gitti; ödeme onaydan sonraki ilk bordro döneminde hesabına geçer.`,
      `✅ **Expense filed — ${no}**\n\n${p.amount} ${p.currency} · ${p.category}${p.receipt?.length ? ` · receipt attached (${p.receipt.join(", ")})` : ""}\n\nThe report is with ${MANAGER.displayName} for approval; it's reimbursed in the first payroll after approval.`,
    ),
    suggested: [pick(L, "Son masraflarımı göster", "Show my recent expenses")],
  }
}

function advance({ L, text }) {
  const amount = text.match(/(\d[\d.,]*)\s*(TRY|USD|EUR|GBP)/i)
  if (amount) {
    const no = `AVN-${new Date().getFullYear()}-${String(300 + new Date().getDate()).padStart(4, "0")}`
    return {
      steps: [{ tool: "hr_create_advance", server: "vega-hr", ms: 620 }],
      text: pick(L, `✅ **Avans talebin oluşturuldu — ${no}** · ${amount[1]} ${amount[2].toUpperCase()}\n\n${MANAGER.displayName} ve Finans onayından sonra 2 iş günü içinde hesabına geçer. Seyahat dönüşünde 15 gün içinde masraflarla kapatman gerekir.`, `✅ **Advance requested — ${no}** · ${amount[1]} ${amount[2].toUpperCase()}\n\nAfter ${MANAGER.displayName} and Finance approve, it's paid within 2 working days. Close it with your expenses within 15 days of returning.`),
    }
  }
  return {
    steps: [{ tool: "hr_policy_search", ms: 420 }],
    text: pick(L, "İş avansı seyahat, fuar ve müşteri ziyaretleri için alınabilir: tutar, tarih, amaç ve gidilecek yer yeterli. Avans dönüşten sonraki 15 gün içinde masraflarla kapatılır. Örnek: “3 Kasım tarihli 15.000 TRY iş avansı, Ankara müşteri ziyareti”.", "Business advances cover travel, trade fairs and customer visits: amount, date, purpose and destination are enough. Close the advance with your expenses within 15 days of returning. Example: “15,000 TRY business advance dated November 3, customer visit in Ankara”."),
  }
}

function teamLeave({ L }) {
  const first = (() => {
    for (let i = 1; i < 10; i += 1) if (!isWeekend(dayFrom(i))) return dayFrom(i)
    return dayFrom(1)
  })()
  const rows = [
    [TEAM[0], first, first, 1, LEAVE.annual],
    [TEAM[2], dayFrom(8), dayFrom(8), 0.5, LEAVE.excuse],
    [TEAM[1], dayFrom(16), dayFrom(17), 2, LEAVE.annual],
    [TEAM[4], dayFrom(23), dayFrom(25), 3, LEAVE.annual],
  ].map(([p, s, e, n, k]) => `| ${p.displayName} | ${L2(L, k)} | ${fmtDate(L, s, { day: "numeric", month: "short" })}${e > s ? ` – ${fmtDate(L, e, { day: "numeric", month: "short" })}` : ""} | ${n} |`)
  return {
    steps: [{ tool: "hr_team_calendar", ms: 560 }],
    text: pick(L, `👥 **Ekibinin önümüzdeki 30 günlük izin planı**\n\n| Kişi | Tür | Tarih | Gün |\n|---|---|---|---:|\n${rows.join("\n")}\n\nAynı gün iki kişinin izinli olduğu bir çakışma yok. Ece'nin izni Altay Perakende görüşmelerine denk geliyor; o gün yerine Mert'in bakmasını önerebilirim.`, `👥 **Your team's leave over the next 30 days**\n\n| Person | Type | Dates | Days |\n|---|---|---|---:|\n${rows.join("\n")}\n\nNo two people are off on the same day. Ece's day off overlaps with the Altay Perakende talks — I'd suggest Mert covers that day.`),
    suggested: [pick(L, "Onay bekleyen taleplerim", "Requests awaiting my approval")],
  }
}

function approvals({ L }) {
  return {
    steps: [{ tool: "hr_pending_approvals", ms: 520 }],
    text: pick(
      L,
      `📝 **Onayını bekleyen 3 talep**\n\n| Kişi | Talep | Ayrıntı |\n|---|---|---|\n| ${TEAM[2].displayName} | Mazeret izni | ${fmtDate(L, dayFrom(8))}, yarım gün |\n| ${TEAM[1].displayName} | Masraf | ₺4.850 müşteri yemeği (Toros Tekstil) |\n| ${TEAM[4].displayName} | İş avansı | ₺12.000 fuar katılımı |\n\nÜçü de politika sınırları içinde. Self Servis'teki **Ekibim** sekmesinden tek tek onaylayabilirsin.`,
      `📝 **3 requests awaiting your approval**\n\n| Person | Request | Details |\n|---|---|---|\n| ${TEAM[2].displayName} | Personal leave | ${fmtDate(L, dayFrom(8))}, half day |\n| ${TEAM[1].displayName} | Expense | ₺4,850 client dinner (Toros Tekstil) |\n| ${TEAM[4].displayName} | Business advance | ₺12,000 trade fair |\n\nAll three are within policy. Approve them one by one from the **My team** tab in Self Service.`,
    ),
  }
}

function holidays({ L }) {
  const list = upcomingHolidays(new Date()).slice(0, 5)
  const rows = list.map((h) => `| ${L2(L, HOLIDAY[h.key] ?? [h.key, h.key])} | ${fmtDate(L, h.from, { weekday: "short", day: "numeric", month: "long", year: "numeric" })} | ${h.days} |`)
  return {
    steps: [{ tool: "hr_policy_search", ms: 360 }],
    text: pick(L, `📅 **Yaklaşan resmi tatiller**\n\n| Tatil | Başlangıç | Gün |\n|---|---|---:|\n${rows.join("\n")}\n\nArife günleri öğleden sonra yarım gün tatildir.`, `📅 **Upcoming public holidays**\n\n| Holiday | Starts | Days |\n|---|---|---:|\n${rows.join("\n")}\n\nThe eve of each religious holiday is a half day off.`),
  }
}

function policies({ L, f }) {
  const topic = /egitim|training/.test(f) ? "training" : /saglik|health|sigorta|insurance/.test(f) ? "health" : "hybrid"
  const text = {
    hybrid: pick(L, "🏠 **Hibrit çalışma:** haftada 2 gün uzaktan çalışılabilir; salı ve perşembe ofis günleridir. Uzaktan çalışma günleri takvimde “Uzaktan” olarak işaretlenir, müşteri toplantıları önceliklidir.", "🏠 **Hybrid work:** up to 2 remote days a week; Tuesdays and Thursdays are office days. Mark remote days in your calendar as “Remote”; customer meetings take priority."),
    training: pick(L, `🎓 **Eğitim bütçesi:** kişi başı yıllık ₺25.000. Yönetici onayıyla (${MANAGER.displayName}) kullanılır; sertifika programları için Finans'tan ek bütçe istenebilir.`, `🎓 **Training budget:** ₺25,000 per person per year, used with your manager's approval (${MANAGER.displayName}); certification programmes can get extra budget from Finance.`),
    health: pick(L, "🩺 **Özel sağlık sigortası:** çalışan ve eş/çocuklar için kapsamlı plan; yatarak tedavi %100, ayakta tedavi %80 karşılanır. Anlaşmalı kurum listesi İK portalında.", "🩺 **Private health insurance:** a comprehensive plan for employees and their spouse/children; inpatient 100%, outpatient 80% covered. The network list is on the HR portal."),
  }[topic]
  return { steps: [{ tool: "hr_policy_search", ms: 480 }], text }
}

export function hrOnAction(ctx) {
  const { value, L } = ctx
  if (value.action === "submitLeave") return submitLeave(ctx)
  if (value.action === "submitExpense") return submitExpense(ctx)
  if (value.action === "cancel" && (value.topic === "leave" || value.topic === "expense"))
    return { text: pick(L, "Tamam, göndermedim. İstediğin zaman yeniden başlatabiliriz.", "OK, nothing was sent. We can start again any time.") }
  return null
}

const re = (...ps) => (ctx) => ps.some((p) => p.test(ctx.f))

export const HR = {
  intents: [
    { id: "teamLeave", match: re(/ekibim.*izin|kim izinde|who('s| is) (off|on leave)|team.*(leave|off)|ekibin izin/), run: teamLeave },
    { id: "approvals", match: re(/onay bekleyen|onayimi bekleyen|awaiting my approval|pending approval|onaylamam gereken/), run: approvals },
    { id: "leaveForm", match: re(/izin formu|leave form/), run: leaveForm },
    { id: "leaveRequest", match: re(/izin talebi|talebi olustur|izin almak|izin istiyorum|request .*leave|leave request|izin al\b/), run: leaveRequest },
    { id: "leaveBalance", match: re(/izin bakiye|kalan izin|leave balance|kac gun izin|remaining .*leave|izin hakk|bakiyem/), run: leaveBalance },
    { id: "leaveHistory", match: re(/son izin|izinlerim|leave (history|records)|recent leave|izin gecmis/), run: leaveHistory },
    { id: "advance", match: re(/avans|advance/), run: advance },
    { id: "expensePolicy", match: re(/politika|policy|limit|harcirah|per diem/), run: expensePolicy },
    { id: "myExpenses", match: re(/masraflarim|son masraf|my expenses|recent expenses|masraf durumu|expense status/), run: myExpenses },
    { id: "expense", match: (ctx) => /masraf|expense|fis|receipt/.test(ctx.f) || ctx.attachments?.length > 0, run: expense },
    { id: "holidays", match: re(/resmi tatil|bayram|public holiday|holidays?\b/), run: holidays },
    { id: "policies", match: re(/hibrit|hybrid|uzaktan|remote|egitim butce|training budget|saglik sigorta|health insurance|yan hak|benefit/), run: policies },
  ],
  onAction: hrOnAction,
}

export { ME }
