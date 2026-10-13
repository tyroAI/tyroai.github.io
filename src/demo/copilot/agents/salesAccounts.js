// TYRO Sales — müşteriye özel işler: brifing, takip e-postası, QBR, teklif ve
// iskonto onayı (kart + gönderim).
import { htmlDataUrl } from "@/lib/botFiles"
import {
  ACCOUNTS,
  DEALS,
  DISCOUNT_POLICY,
  FINANCE_BP,
  MANAGER_NAME,
  MARGIN_FLOOR,
  NEXT_STEP,
  OWNER_OF,
  RISK_TEXT,
  STAGE_OF,
  WON_DEALS,
  closeDate,
  CUSTOMERS,
} from "../salesData"
import { discountCard } from "../cards"
import { qbrBriefHtml, quoteHtml } from "../documents"
import { fmtDate, money, moneyShort, pct, pick, quarterInfo } from "../util"
import { draftPlan } from "./common"

const T = (L, row) => (L === "tr" ? row.tr : row.en)
const KEYS = [
  ["Altay Perakende", /\baltay\b/],
  ["Nordis Lojistik", /\bnordis\b/],
  ["Ekinoks Enerji", /\bekinoks\b/],
  ["Pera Otelcilik", /\bpera\b/],
  ["Toros Tekstil", /\btoros\b/],
  ["Orion Medikal", /\borion\b/],
]
const FEMALE = new Set(["Hande", "Sevgi", "Aslı"])

/** Metinde geçen müşteri (katlanmış metin üzerinde). */
export function accountIn(f) {
  return KEYS.find(([, rx]) => rx.test(f))?.[0] ?? null
}

const dealOf = (account) => DEALS.find((d) => d.account === account) ?? null
const contactOf = (account) => CUSTOMERS.find((c) => c.account === account)
const firstName = (c) => c.contact.replace(/^Dr\.\s*/, "").split(" ")[0]
const surname = (c) => c.contact.split(" ").at(-1)

/** Satış marjı, iskontoya göre: %10'da %34, %14'te ~%31, %18'de ~%27,6. */
const marginAt = (disc) => (1 - 0.594 / (1 - disc / 100)) * 100

function brief({ L, f, conv }) {
  const account = accountIn(f) ?? conv.account ?? "Altay Perakende"
  conv.account = account
  const a = ACCOUNTS[account]
  const c = contactOf(account)
  const d = dealOf(account)
  const won = WON_DEALS.filter((w) => w.account === account)
  const dealLine = d
    ? pick(
        L,
        `- **Açık fırsat:** ${d.id} ${d.product} — ${d.tr}, **${moneyShort(L, d.value)}**, ${T(L, STAGE_OF(d))} aşamasında, beklenen kapanış ${fmtDate(L, closeDate(d))} · sorumlu ${OWNER_OF(d).displayName}`,
        `- **Open deal:** ${d.id} ${d.product} — ${d.en}, **${moneyShort(L, d.value)}**, in ${T(L, STAGE_OF(d))}, expected close ${fmtDate(L, closeDate(d))} · owner ${OWNER_OF(d).displayName}`,
      )
    : ""
  const risk = d?.risk
    ? `\n- ⚠️ ${T(L, RISK_TEXT[d.risk])}\n- ➜ ${T(L, NEXT_STEP[d.risk])}`
    : ""
  const since = a.since
    ? pick(L, `${a.since}'den beri müşterimiz`, `customer since ${a.since}`)
    : pick(L, "yeni potansiyel müşteri", "new prospect")
  return {
    steps: [{ tool: "crm_account_360" }, { tool: "erp_invoice_history", ms: 540 }],
    text: pick(
      L,
      `**${account}** — ${T(L, a.sector)} · ${since}\n\n- **Kontak:** ${c.contact} (${c.title}) · ${c.mail}\n- **Yıllık gelir (ARR):** ${a.arr ? moneyShort(L, a.arr) : "—"} · **Sağlık:** ${T(L, a.health)}${a.nps != null ? ` · NPS ${a.nps}` : ""}\n${dealLine}${risk}\n${won.length ? `- **Bu çeyrek kazanılan:** ${won.map((w) => `${w.name} (${moneyShort(L, w.value)})`).join(", ")}\n` : ""}\n**Bilmen gereken:** ${T(L, a.note)}`,
      `**${account}** — ${T(L, a.sector)} · ${since}\n\n- **Contact:** ${c.contact} (${c.title}) · ${c.mail}\n- **Annual revenue (ARR):** ${a.arr ? moneyShort(L, a.arr) : "—"} · **Health:** ${T(L, a.health)}${a.nps != null ? ` · NPS ${a.nps}` : ""}\n${dealLine}${risk}\n${won.length ? `- **Won this quarter:** ${won.map((w) => `${w.name} (${moneyShort(L, w.value)})`).join(", ")}\n` : ""}\n**Worth knowing:** ${T(L, a.note)}`,
    ),
    suggested: [
      pick(L, `${account} için takip e-postası yaz`, `Draft a follow-up email to ${account}`),
      pick(L, `${account} QBR hazırlığı`, `Prepare the ${account} QBR`),
      pick(L, `${account} için teklif taslağı hazırla`, `Draft a quote for ${account}`),
    ],
  }
}

const EMAIL = {
  discount: {
    tr: ["yaygınlaştırma teklifimiz için ticari koşulları revize ettik", "İskontoyu %14'e çekip üç yıllık sözleşme ve birinci yıl premium desteği pakete dahil eden bir alternatif hazırladık; toplam sahip olma maliyetinde talep ettiğiniz seviyeye çok yakın.", "Bu hafta 30 dakikalık bir görüşmede detayları birlikte üzerinden geçebilir miyiz?"],
    en: ["we've revised the commercial terms for the rollout proposal", "We've put together an alternative at 14% with a three-year agreement and first-year premium support included; in total cost of ownership it lands very close to the level you asked for.", "Could we walk through the details in a 30-minute call this week?"],
    subject: { tr: "Yaygınlaştırma teklifi — revize ticari koşullar", en: "Rollout proposal — revised commercial terms" },
  },
  stale: {
    tr: ["Midea WMS teklifimizle ilgili durumu sormak istedim", "Değerlendirme sürecinizde açık kalan bir soru varsa yanıtlamaktan memnuniyet duyarız; dilerseniz depolarınızdan birinde kısa bir canlı demo da ayarlayabiliriz.", "Önümüzdeki hafta 20 dakikalık bir değerlendirme görüşmesi için uygun olduğunuz bir saat var mı?"],
    en: ["I wanted to check in on our Midea WMS proposal", "If there are open questions in your evaluation we'd be glad to answer them, and we can also arrange a short live demo at one of your warehouses.", "Would you have 20 minutes next week for a quick review call?"],
    subject: { tr: "Midea WMS teklifi — kısa bir değerlendirme görüşmesi?", en: "Midea WMS proposal — a quick review call?" },
  },
  terms: {
    tr: ["ödeme koşullarıyla ilgili talebinizi değerlendirdik", "120 gün yerine 90 gün vade ve 30 gün içinde ödemede %2 erken ödeme indirimi içeren bir alternatif sunabiliriz; nakit akışınıza yük getirmeden projeyi bu çeyrek başlatmamızı sağlar.", "Finans ekibimizle birlikte kısa bir görüşmede netleştirebiliriz."],
    en: ["we've reviewed your request on payment terms", "Instead of 120 days we can offer 90-day terms with a 2% discount for payment within 30 days; that lets us start the project this quarter without straining your cash flow.", "We can finalise it in a short call together with our finance team."],
    subject: { tr: "Midea Planning — ödeme koşulları için alternatif", en: "Midea Planning — an alternative on payment terms" },
  },
  budget: {
    tr: ["Midea Guest projesi için bütçe planlamanızı göz önünde bulundurarak bir öneriyle yazıyorum", "Sözleşmenin bu ay imzalanması durumunda ilk üç ay premium desteği ücretsiz sunabiliriz; böylece sezon öncesi tüm otellerde canlıya geçmek mümkün olur.", "Uygun görürseniz imza takvimini bu hafta netleştirelim."],
    en: ["I'm writing with an offer that takes your budget planning for Midea Guest into account", "If the agreement is signed this month we can include the first three months of premium support free of charge, so all hotels can go live before the season.", "If that works for you, let's confirm the signing timeline this week."],
    subject: { tr: "Midea Guest — bu ay imzaya özel avantaj", en: "Midea Guest — an incentive for signing this month" },
  },
  poc: {
    tr: ["pilot çalışmasının ilk sonuçlarını paylaşmak istedim", "İki santralde arıza tespiti ortalama %23 hızlandı ve planlı olmayan duruşlar azaldı. Başarı kriterlerini birlikte teyit edip kapanış toplantısını planlamak isteriz.", "Önümüzdeki hafta IT ekibinizle birlikte 45 dakika ayırabilir misiniz?"],
    en: ["I wanted to share the first results of the pilot", "Fault detection got 23% faster on average across the two plants, and unplanned downtime dropped. We'd like to confirm the success criteria together and schedule the wrap-up.", "Could you and your IT team spare 45 minutes next week?"],
    subject: { tr: "Pilot sonuçları ve kapanış toplantısı", en: "Pilot results and wrap-up meeting" },
  },
  intro: {
    tr: ["geçen haftaki tanışma görüşmemiz için teşekkür ederim", "Konuştuğumuz izlenebilirlik gereksinimleri için Midea Track'in mevzuat uyumu ve entegrasyon yaklaşımını özetleyen kısa bir doküman hazırladık.", "Uygun olursanız ekibinizle bir keşif atölyesi planlayalım."],
    en: ["thank you for our introductory meeting last week", "We've prepared a short document on how Midea Track handles regulatory traceability and integration for the requirements we discussed.", "If convenient, let's plan a discovery workshop with your team."],
    subject: { tr: "Tanışma görüşmemizin ardından — Midea Track", en: "Following up on our intro — Midea Track" },
  },
}

function followUpEmail(ctx) {
  const { f, conv } = ctx
  const account = accountIn(f) ?? conv.account ?? "Nordis Lojistik"
  conv.account = account
  const c = contactOf(account)
  const d = dealOf(account)
  const e = EMAIL[d?.risk ?? "intro"]
  const build = (L, { formal, short }) => {
    const [open, mid, close] = L === "tr" ? e.tr : e.en
    const fn = firstName(c)
    const hon = FEMALE.has(fn) ? "Hanım" : "Bey"
    const salute =
      L === "tr"
        ? formal
          ? `Sayın ${c.contact},`
          : `Merhaba ${fn} ${hon},`
        : formal
          ? `Dear ${FEMALE.has(fn) ? "Ms" : "Mr"} ${surname(c)},`
          : `Hi ${fn},`
    const lead = L === "tr" ? `${open.charAt(0).toUpperCase()}${open.slice(1)}.` : `${open.charAt(0).toUpperCase()}${open.slice(1)}.`
    const body = short ? `${salute}\n\n${lead} ${close}` : `${salute}\n\n${lead}\n\n${mid}\n\n${close}`
    return { to: `${c.contact} <${c.mail}>`, subject: T(L, e.subject), body }
  }
  return draftPlan(ctx, build, [{ tool: "crm_account_360" }, { tool: "mail_get_thread", ms: 420 }])
}

function qbr({ L, f, conv }) {
  const account = accountIn(f) ?? conv.account ?? "Altay Perakende"
  conv.account = account
  const a = ACCOUNTS[account]
  const c = contactOf(account)
  const d = dealOf(account)
  const q = quarterInfo().label
  const agenda = pick(
    L,
    ["Geçen dönemin özeti ve kazanımlar (10 dk)", "Kullanım ve performans göstergeleri (15 dk)", "Yol haritası: önümüzdeki iki çeyrek (15 dk)", "Ticari konular ve sonraki adımlar (10 dk)"],
    ["Recap and wins of the last period (10 min)", "Adoption and performance metrics (15 min)", "Roadmap: the next two quarters (15 min)", "Commercial topics and next steps (10 min)"],
  )
  const metrics = [
    [pick(L, "Yıllık gelir (ARR)", "Annual revenue (ARR)"), moneyShort(L, a.arr || 0), pick(L, "Bir önceki yıla göre +%12", "+12% year on year")],
    [pick(L, "Aktif kullanıcı oranı", "Active user rate"), pct(L, 87), pick(L, "Hedef %85", "Target 85%")],
    [pick(L, "Destek talebi (çeyrek)", "Support tickets (quarter)"), "14", pick(L, "SLA uyumu %96", "SLA compliance 96%")],
    ["NPS", a.nps != null ? String(a.nps) : "—", pick(L, "Sektör ortalaması 41", "Industry average 41")],
  ]
  const wins = pick(
    L,
    ["Mağaza içi stok doğruluğu %92'den %97'ye çıktı", "Kasa işlem süresi ortalama 11 saniye kısaldı", "Pilot bölgede kampanya analizi haftalıktan günlüğe indi"],
    ["In-store stock accuracy rose from 92% to 97%", "Checkout time dropped by 11 seconds on average", "Campaign analysis in the pilot region went from weekly to daily"],
  )
  const risks = d?.risk ? [T(L, RISK_TEXT[d.risk])] : []
  risks.push(pick(L, "Bölge müdürleri eğitimi iki bölgede tamamlanmadı", "Regional manager training isn't complete in two regions"))
  const asks = pick(
    L,
    [`${d ? `${d.product} yaygınlaştırması için karar takvimi` : "Genişleme için karar takvimi"}`, "Referans vaka çalışması için onay", "Yönetici sponsor ile çeyreklik görüşme"],
    [`${d ? `A decision timeline for the ${d.product} rollout` : "A decision timeline for expansion"}`, "Approval for a reference case study", "A quarterly meeting with the executive sponsor"],
  )
  const html = qbrBriefHtml(L, { account, contact: `${c.contact} · ${c.title}`, quarter: q, metrics, wins, risks, asks, agenda })
  const name = `QBR_${account.replace(/\s+/g, "_")}_${q.replace(" ", "_")}.html`
  return {
    steps: [{ tool: "crm_account_360" }, { tool: "erp_invoice_history", ms: 560 }, { tool: "doc_generate", ms: 700 }],
    text: pick(
      L,
      `**${account} QBR hazırlığı (${q})** — katılımcı: ${c.contact} (${c.title})\n\n**Gündem**\n${agenda.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n**Öne çıkan rakamlar**\n| Gösterge | Değer |\n|---|---|\n${metrics.map(([k, v]) => `| ${k} | ${v} |`).join("\n")}\n\n**Riskler:** ${risks.join(" · ")}\n\n**Bizim taleplerimiz:** ${asks.join(" · ")}\n\nHazırlık notunu indirilebilir belge olarak ekledim — yazdırıp toplantıya götürebilirsin.`,
      `**${account} QBR prep (${q})** — attendee: ${c.contact} (${c.title})\n\n**Agenda**\n${agenda.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n**Key figures**\n| Metric | Value |\n|---|---|\n${metrics.map(([k, v]) => `| ${k} | ${v} |`).join("\n")}\n\n**Risks:** ${risks.join(" · ")}\n\n**Our asks:** ${asks.join(" · ")}\n\nI've attached the briefing as a downloadable document — print it for the meeting.`,
    ),
    attachments: [{ contentType: "text/html", name, contentUrl: htmlDataUrl(html) }],
    suggested: [pick(L, `${account} için takip e-postası yaz`, `Draft a follow-up email to ${account}`)],
  }
}

function quoteLines(L, account) {
  if (account === "Altay Perakende")
    return [
      { name: pick(L, "Midea Retail Suite lisansı (mağaza başına)", "Midea Retail Suite licence (per store)"), qty: 120, unit: 42_000 },
      { name: pick(L, "Merkez analitik modülü", "Central analytics module"), qty: 1, unit: 640_000 },
      { name: pick(L, "Kurulum ve ERP entegrasyonu", "Implementation and ERP integration"), qty: 1, unit: 980_000 },
      { name: pick(L, "Bölge müdürü eğitimi", "Regional manager training"), qty: 12, unit: 25_000 },
      { name: pick(L, "1. yıl premium destek", "Year-1 premium support"), qty: 1, unit: 600_000 },
    ]
  const d = dealOf(account)
  const list = Math.round((d?.value ?? 2_000_000) / 0.9 / 1000) * 1000
  return [
    { name: `${d?.product ?? "Midea"} ${pick(L, "lisansı", "licence")}`, qty: 1, unit: Math.round(list * 0.7) },
    { name: pick(L, "Kurulum ve entegrasyon", "Implementation and integration"), qty: 1, unit: Math.round(list * 0.15) },
    { name: pick(L, "Eğitim", "Training"), qty: 1, unit: Math.round(list * 0.05) },
    { name: pick(L, "1. yıl destek", "Year-1 support"), qty: 1, unit: Math.round(list * 0.1) },
  ]
}

function quote({ L, f, conv }) {
  const account = accountIn(f) ?? conv.account ?? "Altay Perakende"
  conv.account = account
  const c = contactOf(account)
  const lines = quoteLines(L, account)
  const list = lines.reduce((a, l) => a + l.qty * l.unit, 0)
  const discount = account === "Altay Perakende" ? 14 : 10
  const number = `TKL-${new Date().getFullYear()}-${account === "Altay Perakende" ? "0418" : "0421"}`
  const terms = pick(
    L,
    ["Ödeme: %40 sipariş, %60 kurulum tamamlandığında · vade 60 gün", "Sözleşme süresi 3 yıl; fiyatlar ilk yıl sabit", "Teslim: siparişten itibaren 8 hafta"],
    ["Payment: 40% on order, 60% on go-live · 60-day terms", "3-year agreement; prices fixed for year one", "Delivery: 8 weeks from order"],
  )
  const html = quoteHtml(L, { number, account, contact: `${c.contact} (${c.title})`, lines, discount, validDays: 30, terms })
  const rows = lines.map((l) => `| ${l.name} | ${l.qty} | ${money(L, l.qty * l.unit)} |`).join("\n")
  const net = Math.round(list * (1 - discount / 100))
  return {
    steps: [{ tool: "crm_account_360" }, { tool: "pricing_check_discount", ms: 460 }, { tool: "quote_build", ms: 720 }],
    text: pick(
      L,
      `**${number}** teklif taslağı — ${account}\n\n| Kalem | Adet | Tutar |\n|---|---:|---:|\n${rows}\n| Toplam | | ${money(L, list)} |\n\n${pct(L, discount)} iskonto ile net **${money(L, net)}** (KDV hariç), brüt marj **${pct(L, marginAt(discount))}** — taban (${pct(L, MARGIN_FLOOR)}) üzerinde. ${discount > 10 ? `%10 üstü olduğu için **senin onayın** yeterli; %15'i geçerse ${MANAGER_NAME}'e gider.` : "Temsilci yetkisinde."}\n\nTaslağı belge olarak ekledim.`,
      `Draft quote **${number}** — ${account}\n\n| Item | Qty | Amount |\n|---|---:|---:|\n${rows}\n| Total | | ${money(L, list)} |\n\nAt ${pct(L, discount)} discount the net is **${money(L, net)}** (excl. VAT), gross margin **${pct(L, marginAt(discount))}** — above the ${pct(L, MARGIN_FLOOR)} floor. ${discount > 10 ? `Above 10%, so **your approval** is enough; beyond 15% it goes to ${MANAGER_NAME}.` : "Within the rep's authority."}\n\nThe draft is attached as a document.`,
    ),
    attachments: [{ contentType: "text/html", name: `${number}.html`, contentUrl: htmlDataUrl(html) }],
    suggested: [
      pick(L, `${account} için iskonto onayı iste`, `Request discount approval for ${account}`),
      pick(L, `${account} için takip e-postası yaz`, `Draft a follow-up email to ${account}`),
    ],
  }
}

function discount({ L, f, conv }) {
  const account = accountIn(f) ?? conv.account ?? "Altay Perakende"
  conv.account = account
  const d = dealOf(account) ?? DEALS[0]
  const policy = DISCOUNT_POLICY.map((p, i) => {
    const from = i ? DISCOUNT_POLICY[i - 1].upTo : 0
    const band = p.upTo >= 100 ? pick(L, `%${from} üzeri`, `over ${from}%`) : pick(L, `%${from}–${p.upTo}`, `${from}–${p.upTo}%`)
    return `| ${band} | ${T(L, p)} |`
  }).join("\n")
  const isAltay = d.account === "Altay Perakende"
  const list = Math.round(d.value / 0.9)
  const options = isAltay
    ? [
        { value: "14", title: pick(L, `%14 + 3 yıllık sözleşme (marj %${marginAt(14).toFixed(1)})`, `14% + 3-year term (margin ${marginAt(14).toFixed(1)}%)`) },
        { value: "18", title: pick(L, `%18 — müşterinin talebi (marj %${marginAt(18).toFixed(1)})`, `18% — customer's ask (margin ${marginAt(18).toFixed(1)}%)`) },
      ]
    : [
        { value: "12", title: pick(L, `%12 (marj %${marginAt(12).toFixed(1)})`, `12% (margin ${marginAt(12).toFixed(1)}%)`) },
        { value: "15", title: pick(L, `%15 (marj %${marginAt(15).toFixed(1)})`, `15% (margin ${marginAt(15).toFixed(1)}%)`) },
      ]
  conv.pending = { kind: "discount", deal: d.id }
  return {
    steps: [{ tool: "crm_account_360" }, { tool: "pricing_check_discount", ms: 520 }],
    text: pick(
      L,
      `**İskonto yetki matrisi**\n\n| İskonto | Onaylayan |\n|---|---|\n${policy}\n\nEk kural: brüt marj ${pct(L, MARGIN_FLOOR)}'in altına düşüyorsa iskonto oranından bağımsız olarak Finans (${FINANCE_BP.displayName}) da onaylar.\n\n${isAltay ? `**${d.account}** %18 istiyor: bu hem ${MANAGER_NAME}'in yetkisine giriyor hem de marjı ${pct(L, marginAt(18), 1)}'e indirerek tabanın altına düşürüyor. Önerim **%14 + 3 yıllık sözleşme** — marj ${pct(L, marginAt(14), 1)}, yıllık bazda müşterinin hedeflediği maliyete çok yakın.` : `**${d.account}** için ${pct(L, 15)}'e kadar senin onayın yeterli.`} Talebi aşağıdaki karttan gönderebilirsin.`,
      `**Discount authority matrix**\n\n| Discount | Approver |\n|---|---|\n${policy}\n\nExtra rule: if gross margin falls below ${pct(L, MARGIN_FLOOR)}, Finance (${FINANCE_BP.displayName}) approves too, whatever the discount.\n\n${isAltay ? `**${d.account}** is asking for 18%: that needs ${MANAGER_NAME} and pushes margin down to ${pct(L, marginAt(18), 1)}, below the floor. My recommendation is **14% + a 3-year term** — ${pct(L, marginAt(14), 1)} margin, and on an annual basis very close to the cost the customer is targeting.` : `For **${d.account}**, up to ${pct(L, 15)} is within your authority.`} You can send the request from the card below.`,
    ),
    attachments: [
      discountCard(L, {
        deal: d.id,
        account: `${d.account} — ${d.product}`,
        listPrice: money(L, list),
        marginNow: `${money(L, d.value)} · ${pct(L, 10)} · ${pick(L, "marj", "margin")} ${pct(L, marginAt(10))}`,
        approver: isAltay ? `${MANAGER_NAME} · ${pick(L, "Satış Direktörü", "Sales Director")}` : pick(L, "Sen (Satış Müdürü)", "You (Sales Manager)"),
        options,
      }),
    ],
  }
}

export function salesOnAction({ value, L, conv }) {
  if (value.action === "cancel" && value.topic === "discount")
    return { text: pick(L, "Tamam, talebi göndermedim. Teklifi mevcut koşullarla bırakıyorum.", "OK, I didn't send the request. The offer stays on the current terms.") }
  if (value.action !== "discountApproval") return null
  const d = DEALS.find((x) => x.id === value.deal) ?? DEALS[0]
  const disc = Number(value.discount) || 14
  const m = marginAt(disc)
  const below = m < MARGIN_FLOOR
  const ref = `DSC-${new Date().getFullYear()}-${String(400 + disc * 7).padStart(4, "0")}`
  conv.pending = null
  const approvers = disc > 15 ? (below ? `${MANAGER_NAME} + ${FINANCE_BP.displayName}` : MANAGER_NAME) : pick(L, "senin onayın (otomatik)", "your own approval (automatic)")
  return {
    steps: [{ tool: "pricing_check_discount", ms: 380 }, { tool: "crm_submit_approval", ms: 640 }],
    text: pick(
      L,
      `✅ **Onay talebi oluşturuldu — ${ref}**\n\n- Fırsat: ${d.id} · ${d.account}\n- İskonto: ${pct(L, disc)} · brüt marj ${pct(L, m, 1)}${below ? " ⚠️ taban altı" : ""}\n- Onaylayacak: ${approvers}\n${value.note ? `- Not: “${value.note}”\n` : ""}\n${disc > 15 ? "Onaylayanlara Teams ve e-postayla bildirim gitti; bu tutardaki talepler genelde aynı gün sonuçlanıyor. Sonuç gelince sana haber vereceğim." : "Yetkin dahilinde olduğu için talep otomatik onaylandı ve teklif CRM'de güncellendi."}`,
      `✅ **Approval request created — ${ref}**\n\n- Deal: ${d.id} · ${d.account}\n- Discount: ${pct(L, disc)} · gross margin ${pct(L, m, 1)}${below ? " ⚠️ below floor" : ""}\n- Approver: ${approvers}\n${value.note ? `- Note: “${value.note}”\n` : ""}\n${disc > 15 ? "The approvers were notified on Teams and by email; requests of this size are usually decided the same day. I'll let you know when it's done." : "It's within your authority, so it was approved automatically and the quote was updated in CRM."}`,
    ),
    suggested: [
      pick(L, `${d.account} için teklif taslağı hazırla`, `Draft a quote for ${d.account}`),
      pick(L, `${d.account} için takip e-postası yaz`, `Draft a follow-up email to ${d.account}`),
    ],
  }
}

const re = (...ps) => (ctx) => ps.some((p) => p.test(ctx.f))

export const ACCOUNT_INTENTS = [
  { id: "discount", match: re(/iskonto|indirim|discount|marj|margin|yetki matris|approval matrix/), run: discount },
  { id: "qbr", match: re(/\bqbr\b|business review|is degerlendirme|ceyreklik degerlendirme/), run: qbr },
  { id: "quote", match: re(/teklif (taslag|hazirla|olustur|cikar)|quote|draft a proposal|fiyat teklifi/), run: quote },
  {
    id: "followup",
    match: (ctx) =>
      /(e-?posta|\bmail|email|follow.?up|takip)/.test(ctx.f) && /(yaz|draft|hazirla|write|olustur|gonder)/.test(ctx.f) && !/okunmamis|unread|yanit taslagi|reply/.test(ctx.f),
    run: followUpEmail,
  },
  {
    id: "brief",
    match: (ctx) => !!accountIn(ctx.f) || /musteri (brif|ozet|karti)|account (brief|summary)|customer brief/.test(ctx.f),
    run: brief,
  },
]
