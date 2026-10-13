// TYRO Office — yazışma işleri: yanıt taslağı, toplantı hazırlığı, doküman
// özeti, kişi özeti, tebrik/teşekkür mesajı, yöneticiye durum notu ve postaları
// önceliklendirme. Uygulamanın başka yüzeylerinden park edilen sorular
// (posta kartı, takvim, dosya paneli, kişi kartı, Keşfet) bu kalıpları taşır.
import { MANAGER, ME } from "@/demo/persona"
import { ACCOUNTS, DEALS, FORECAST_COMMIT, NEXT_STEP, RISK_TEXT, TEAM_TARGET, WON_QTD } from "../salesData"
import { eventsOn, unreadMail } from "../live"
import { fmtTime, moneyShort, pct, pick } from "../util"
import { draftPlan } from "./common"

const T = (L, row) => (L === "tr" ? row.tr : row.en)
const quoted = (text) => text.match(/["“]([^"”]+)["”]/)?.[1] ?? ""
const field = (text, ...keys) => {
  for (const k of keys) {
    const m = text.match(new RegExp(`${k}\\s*:\\s*([^,.\\n]+)`, "i"))
    if (m) return m[1].trim()
  }
  return ""
}
const accountOf = (s) => Object.keys(ACCOUNTS).find((a) => s.toLowerCase().includes(a.split(" ")[0].toLowerCase())) ?? null

/** Park edilmiş "yanıt taslağı hazırla — Gönderen: X, Konu: "Y". Özet: Z" */
function replyDraft(ctx) {
  const { text } = ctx
  const from = field(text, "Gönderen", "From") || field(text, "kişisinin", "from") || "—"
  const subject = quoted(text) || field(text, "Konu", "Subject") || ""
  const preview = text.split(/E-posta özeti:|Preview:/i)[1]?.trim() ?? ""
  const p = preview.toLowerCase()
  const topic = /toplant|meeting|görüş|call/.test(p)
    ? "meeting"
    : /teklif|quote|fiyat|price|iskonto|discount/.test(p)
      ? "quote"
      : /fatura|ödeme|invoice|payment/.test(p)
        ? "finance"
        : "generic"
  const firstName = from.split(/[\s<]/)[0]
  const build = (L, { formal, short }) => {
    const salute = pick(L, formal ? `Sayın ${from},` : `Merhaba ${firstName},`, formal ? `Dear ${from},` : `Hi ${firstName},`)
    const thanks = pick(L, "Mesajın için teşekkürler.", "Thanks for your message.")
    const mid = {
      meeting: pick(L, "Görüşme için çarşamba 14:00 ya da perşembe 10:30 bana uyuyor; hangisi sana uygunsa davetiyeyi gönderiyorum.", "Wednesday 14:00 or Thursday 10:30 both work for me — whichever suits you, I'll send the invite."),
      quote: pick(L, "Teklif ve ticari koşullar tarafını ekiple birlikte gözden geçirip en geç yarın gün sonuna kadar güncel hâlini ileteceğim.", "I'll review the quote and commercial terms with the team and send the updated version by end of day tomorrow."),
      finance: pick(L, "Fatura ve ödeme detayını Finans'tan Can Şahin'le kontrol edip bugün içinde dönüş yapacağım.", "I'll check the invoice and payment details with Can Şahin in Finance and get back to you today."),
      generic: pick(L, "Konuyu inceleyip yarın öğlene kadar sana net bir dönüş yapacağım.", "I'll look into it and come back to you with a clear answer by tomorrow noon."),
    }[topic]
    const extra = pick(L, "Bu arada eklemek istediğin bir şey olursa bana doğrudan yazabilirsin.", "Meanwhile, feel free to reach out directly if there's anything to add.")
    return {
      to: from,
      subject: subject ? `Re: ${subject}` : pick(L, "Re: mesajınız", "Re: your message"),
      body: short ? `${salute}\n\n${thanks} ${mid}` : `${salute}\n\n${thanks} ${mid}\n\n${extra}`,
    }
  }
  return draftPlan(ctx, build, [{ tool: "mail_get_thread", ms: 520 }])
}

/** Park edilmiş toplantı hazırlığı: `"Başlık" toplantısına hazırlanmama yardım et. Tarih: …, saat: …, düzenleyen: …` */
function meetingPrep({ L, text, conv }) {
  const title = quoted(text) || pick(L, "Toplantı", "Meeting")
  const time = field(text, "saat", "time")
  const organizer = field(text, "düzenleyen", "organizer")
  const account = accountOf(title)
  const deal = account ? DEALS.find((d) => d.account === account) : null
  const steps = [{ tool: "calendar_get_event", ms: 360 }, { tool: "mail_get_thread", ms: 520 }]
  if (account) {
    conv.account = account
    steps.push({ tool: "crm_account_360", ms: 480 })
  }
  const isForecast = /forecast|tahmin/i.test(title)
  const isOneOnOne = /^1:1|birebir/i.test(title)
  const ctxLines = deal
    ? pick(
        L,
        `- **Fırsat:** ${deal.id} ${deal.product} — ${moneyShort(L, deal.value)}\n- **Durum:** ${T(L, RISK_TEXT[deal.risk] ?? { tr: "Plana göre ilerliyor.", en: "On track." })}\n- **Hedef çıktı:** ${T(L, NEXT_STEP[deal.risk] ?? { tr: "Bir sonraki adımı tarihli olarak netleştir.", en: "Agree a dated next step." })}`,
        `- **Deal:** ${deal.id} ${deal.product} — ${moneyShort(L, deal.value)}\n- **Status:** ${T(L, RISK_TEXT[deal.risk] ?? { tr: "", en: "On track." })}\n- **Target outcome:** ${T(L, NEXT_STEP[deal.risk] ?? { tr: "", en: "Agree a dated next step." })}`,
      )
    : isForecast
      ? pick(
          L,
          `- Kapanan ${moneyShort(L, WON_QTD)}, commit ${moneyShort(L, FORECAST_COMMIT)} (${pct(L, (FORECAST_COMMIT / TEAM_TARGET) * 100)}), hedef ${moneyShort(L, TEAM_TARGET)}\n- Kayma riski: Pera Otelcilik (bütçe), Nordis (16 gündür temas yok)\n- Karar gereken: Altay Perakende %18 iskonto talebi`,
          `- Closed ${moneyShort(L, WON_QTD)}, commit ${moneyShort(L, FORECAST_COMMIT)} (${pct(L, (FORECAST_COMMIT / TEAM_TARGET) * 100)}), target ${moneyShort(L, TEAM_TARGET)}\n- Slip risk: Pera Otelcilik (budget), Nordis (no contact for 16 days)\n- Decision needed: Altay Perakende's 18% discount ask`,
        )
      : isOneOnOne
        ? pick(L, "- Hedefe göre ilerleme ve açık fırsatlar\n- İhtiyaç duyulan destek\n- Gelişim alanı ve bir sonraki adım", "- Progress vs target and open deals\n- Support needed\n- A growth area and next step")
        : pick(L, "- Gündemi ve beklenen kararı toplantı başında teyit et\n- Son yazışmalardaki açık soruları listele", "- Confirm the agenda and the expected decision at the start\n- List open questions from the latest emails")
  return {
    steps,
    text: pick(
      L,
      `**Hazırlık notu — ${title}**${time ? ` · ${time}` : ""}${organizer && organizer !== "—" ? ` · düzenleyen ${organizer}` : ""}\n\n**Bağlam**\n${ctxLines}\n\n**Konuşma planı**\n1. Açılış: amacı ve süreyi teyit et (2 dk)\n2. Durum ve rakamlar (10 dk)\n3. Açık konular ve itirazlar (10 dk)\n4. Karar ve sonraki adım — sorumlu + tarih (5 dk)\n\n**Sorulacak üç soru**\n- Karar sürecinde başka kim var, takvim ne?\n- Başarıyı neyle ölçeceğiz?\n- Bu hafta bizden beklenen tek şey ne?`,
      `**Prep note — ${title}**${time ? ` · ${time}` : ""}${organizer && organizer !== "—" ? ` · organised by ${organizer}` : ""}\n\n**Context**\n${ctxLines}\n\n**Run of show**\n1. Open: confirm purpose and time (2 min)\n2. Status and numbers (10 min)\n3. Open issues and objections (10 min)\n4. Decision and next step — owner + date (5 min)\n\n**Three questions to ask**\n- Who else is in the decision, and what's the timeline?\n- How will we measure success?\n- What's the one thing you need from us this week?`,
    ),
    suggested: account
      ? [pick(L, `${account} brifingi`, `Brief me on ${account}`), pick(L, `${account} için takip e-postası yaz`, `Draft a follow-up email to ${account}`)]
      : [pick(L, "Toplantı sonrası özet e-postası yaz", "Draft a post-meeting recap email")],
  }
}

/** Dosya paneli: `Şu dokümanı aç ve özetle: "ad" — url` */
function docSummary({ L, text }) {
  const name = quoted(text) || pick(L, "doküman", "document")
  const n = name.toLowerCase()
  const kind = /teklif|quote|proposal/.test(n)
    ? "quote"
    : /sözleşme|sozlesme|contract|nda/.test(n)
      ? "contract"
      : /forecast|tahmin|pipeline|satış|sales|rapor|report/.test(n)
        ? "report"
        : /sunum|deck|ppt|qbr/.test(n)
          ? "deck"
          : "generic"
  const points = {
    quote: pick(L, ["Kapsam: lisans, kurulum, eğitim ve 1. yıl destek", "Ticari koşullar: %10 iskonto, 60 gün vade, fiyatlar ilk yıl sabit", "Açık konu: müşteri iskontonun artırılmasını istiyor"], ["Scope: licences, implementation, training and year-1 support", "Commercial terms: 10% discount, 60-day payment, prices fixed for year one", "Open item: the customer wants a larger discount"]),
    contract: pick(L, ["Süre 3 yıl, otomatik yenileme 12 ay önceden fesih bildirimiyle", "Sorumluluk sınırı yıllık sözleşme bedeli kadar", "Dikkat: KVKK eki ve veri işleme sözleşmesi imzalanmamış görünüyor"], ["Term 3 years, auto-renews unless cancelled 12 months ahead", "Liability capped at the annual contract value", "Watch out: the data-processing annex appears unsigned"]),
    report: pick(L, [`Kapanan ${moneyShort(L, WON_QTD)}, commit ${pct(L, (FORECAST_COMMIT / TEAM_TARGET) * 100)}`, "En büyük risk tek fırsata bağımlılık (Altay Perakende)", "Önerilen aksiyon: best case fırsatlarını commit'e taşımak"], [`Closed ${moneyShort(L, WON_QTD)}, commit ${pct(L, (FORECAST_COMMIT / TEAM_TARGET) * 100)}`, "Biggest risk: dependence on a single deal (Altay Perakende)", "Suggested action: move best-case deals into commit"]),
    deck: pick(L, ["Akış: problem → çözüm → referanslar → ticari öneri", "Güçlü yan: müşteri vaka rakamları net", "Eksik: rakip karşılaştırması ve uygulama takvimi slaytı"], ["Flow: problem → solution → references → commercial proposal", "Strength: the customer case numbers are clear", "Missing: a competitor comparison and an implementation timeline slide"]),
    generic: pick(L, ["Belgenin amacı ve kapsamı ilk bölümde net tanımlanmış", "Üç ana başlık: mevcut durum, öneriler, sonraki adımlar", "Karar gerektiren iki madde var; sorumlu ve tarih atanmamış"], ["The purpose and scope are clearly set out up front", "Three main sections: current state, recommendations, next steps", "Two items need a decision; no owner or date assigned yet"]),
  }[kind]
  return {
    steps: [{ tool: "sharepoint_read_document", ms: 780 }],
    text: pick(
      L,
      `**${name}** — özet\n\n${points.map((p) => `- ${p}`).join("\n")}\n\nİstersen aksiyon maddelerini çıkarıp ilgili kişilere bir takip e-postası hazırlayabilirim.`,
      `**${name}** — summary\n\n${points.map((p) => `- ${p}`).join("\n")}\n\nI can pull out the action items and draft a follow-up to the people involved if you like.`,
    ),
    suggested: [pick(L, "Aksiyon maddelerini çıkar", "Pull out the action items"), pick(L, "Bunu yöneticime özetle", "Summarise this for my manager")],
  }
}

/** Kişi kartı: `X ile son yazışmalarımı ve yaklaşan toplantılarımızı özetle.` */
async function personSummary({ L, text }) {
  const raw =
    text.match(/^(.+?) (?:ile son|kişisinden)/i)?.[1] ??
    text.match(/(?:emails with|mail from|email from) (.+?)(?: and our|[.]?$)/i)?.[1] ??
    text
  const who = raw.replace(/[[\]]/g, "").replace(/\s*\(.*\)\s*$/, "").replace(/<.*>/, "").trim()
  const firstName = who.split(" ")[0].toLowerCase()
  const [mails, events] = await Promise.all([unreadMail(40), eventsOn(0, 7)])
  const theirs = (mails ?? []).filter((m) => m.from.toLowerCase().includes(firstName)).slice(0, 3)
  const meets = (events ?? []).filter((e) => e.attendees.some((a) => a.toLowerCase().includes(firstName)) || e.organizer.toLowerCase().includes(firstName)).slice(0, 3)
  const mailLines = theirs.map((m) => `- “${m.subject}”${m.preview ? ` — ${m.preview.slice(0, 90)}…` : ""}`).join("\n")
  const meetLines = meets.map((e) => `- ${e.subject} · ${e.start.toLocaleDateString(L === "tr" ? "tr-TR" : "en-US", { weekday: "short", day: "numeric", month: "short" })} ${fmtTime(L, e.start)}`).join("\n")
  return {
    steps: [{ tool: "mail_search", ms: 480 }, { tool: "calendar_list_events", ms: 380 }],
    text: pick(
      L,
      `**${who}** ile ilgili özet\n\n**Son yazışmalar**\n${mailLines || "- Okunmamış posta yok; son yazışmanız birkaç gün önce."}\n\n**Yaklaşan toplantılar (7 gün)**\n${meetLines || "- Planlı ortak toplantı yok."}`,
      `Summary for **${who}**\n\n**Recent emails**\n${mailLines || "- No unread emails; your last exchange was a few days ago."}\n\n**Upcoming meetings (7 days)**\n${meetLines || "- No shared meetings planned."}`,
    ),
    suggested: [pick(L, `${who.split(" ")[0]} ile toplantı ayarla`, `Set up a meeting with ${who.split(" ")[0]}`)],
  }
}

function celebration({ L, f, text }) {
  const colleague = text.match(/arkadaşım ([^ ]+ [^ ]+)|colleague ([^ ;,]+ [^ ;,]+)/)
  const name = colleague?.[1] ?? colleague?.[2]
  if (name) {
    const years = text.match(/(\d+)\./)?.[1] ?? text.match(/marking (\d+)/)?.[1]
    const first = name.split(" ")[0]
    return {
      text: years
        ? pick(L, `İki seçenek:\n\n1. “${first}, ${years}. yılın kutlu olsun! 🎉 Ekibin ritmini sen tutuyorsun; birlikte nice yıllara.”\n2. “Tebrikler ${first}! ${years} yıldır katkın ve enerjin için teşekkürler. 🙌”`, `Two options:\n\n1. “Happy ${years}-year anniversary, ${first}! 🎉 You keep the team's rhythm — here's to many more.”\n2. “Congratulations ${first}! Thank you for ${years} years of energy and impact. 🙌”`)
        : pick(L, `İki seçenek:\n\n1. “Doğum günün kutlu olsun ${first}! 🎂 Yeni yaşın bol kazanımlı geçsin.”\n2. “İyi ki doğdun ${first}! 🎉 Ekibe kattığın enerji için teşekkürler, harika bir yıl dilerim.”`, `Two options:\n\n1. “Happy birthday ${first}! 🎂 Wishing you a year full of wins.”\n2. “Happy birthday ${first}! 🎉 Thanks for the energy you bring to the team — have a great year.”`),
    }
  }
  const anniversary = /yil donum|anniversary/.test(f)
  return {
    text: pick(
      L,
      `Kısa ve samimi bir teşekkür:\n\n> “Güzel dilekleriniz için hepinize çok teşekkür ederim! ${anniversary ? "Bu yolculukta sizinle çalışmak büyük keyif — nice yıllara, birlikte." : "Günümü güzelleştirdiniz."} 🙏”\n\nDaha resmi bir alternatif:\n\n> “Nazik tebrikleriniz için teşekkür ederim. ${anniversary ? "Vega Global'deki bu yolculukta katkılarınız için minnettarım." : "İyi dilekleriniz için minnettarım."}”`,
      `A short, warm thank-you:\n\n> “Thank you all so much for the kind wishes! ${anniversary ? "Working with you on this journey is a real pleasure — here's to many more years together." : "You made my day."} 🙏”\n\nA more formal option:\n\n> “Thank you for your kind congratulations. ${anniversary ? "I'm grateful for your support throughout my time at Vega Global." : "I truly appreciate your good wishes."}”`,
    ),
  }
}

function statusNote(ctx) {
  const build = (L, { formal, short }) => {
    const first = MANAGER.givenName
    const items = pick(
      L,
      [`**Rakamlar:** kapanan ${moneyShort(L, WON_QTD)}, commit tahmini ${pct(L, (FORECAST_COMMIT / TEAM_TARGET) * 100)}`, "**Bu hafta:** Altay iskonto onayı, Nordis yönetici görüşmesi, Pera imza takvimi", "**Destek:** Altay için %14 iskontoya onayın gerekiyor"],
      [`**Numbers:** closed ${moneyShort(L, WON_QTD)}, commit forecast ${pct(L, (FORECAST_COMMIT / TEAM_TARGET) * 100)}`, "**This week:** Altay discount approval, Nordis executive call, Pera signing timeline", "**Help needed:** your approval for 14% on Altay"],
    )
    return {
      to: `${MANAGER.displayName} <${MANAGER.mail}>`,
      subject: pick(L, "Haftalık durum notu — Satış", "Weekly status note — Sales"),
      body: `${pick(L, formal ? `Sayın ${MANAGER.displayName},` : `Merhaba ${first},`, formal ? `Dear ${first},` : `Hi ${first},`)}\n\n${pick(L, "Bu haftanın kısa özeti:", "Here's a quick summary of the week:")}\n\n${(short ? items.slice(0, 2) : items).map((i) => `- ${i}`).join("\n")}`,
    }
  }
  return draftPlan(ctx, build, [{ tool: "calendar_list_events", ms: 360 }, { tool: "forecast_calculate", ms: 420 }])
}

/** Keşfet: işaretli postaları önceliklendir (bağlam satırları metnin içinde). */
function prioritize({ L, text }) {
  const lines = text.split("\n").map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter((l) => l && !/önceliklendir|prioriti[sz]e|işaretli postalarım|flagged/i.test(l))
  const scored = lines.map((l) => ({ l, s: /müşteri|teklif|onay|acil|urgent|approval|quote|altay|nordis|pera|toros/i.test(l) ? 2 : /toplant|meeting|rapor|report/i.test(l) ? 1 : 0 })).sort((a, b) => b.s - a.s)
  const today = scored.filter((x) => x.s === 2).slice(0, 3)
  const later = scored.filter((x) => x.s < 2).slice(0, 4)
  return {
    steps: [{ tool: "mail_get_thread", ms: 520 }],
    text: pick(
      L,
      `**Bugün dön:**\n${today.map((x) => `- ${x.l} — _müşteri/onay bekliyor_`).join("\n") || "- Acil görünen yok"}\n\n**Bekleyebilir:**\n${later.map((x) => `- ${x.l}`).join("\n") || "- —"}`,
      `**Reply today:**\n${today.map((x) => `- ${x.l} — _customer/approval waiting_`).join("\n") || "- Nothing looks urgent"}\n\n**Can wait:**\n${later.map((x) => `- ${x.l}`).join("\n") || "- —"}`,
    ),
  }
}

/** Keşfet / posta: `Şu postayı özetle … Gönderen: X. Konu: Y. Başlangıç: Z` */
function feedSummary({ L, text }) {
  const from = field(text, "Gönderen", "From") || "—"
  const subject = field(text, "Konu", "Subject") || ""
  const opening = (text.split(/Başlangıç:|Opening:/i)[1] ?? "").trim()
  return {
    steps: [{ tool: "mail_get_thread", ms: 460 }],
    text: pick(
      L,
      `**${subject || "Posta"}** — ${from}\n\n- **Özet:** ${opening ? opening.slice(0, 200) : "Kısa bir bilgilendirme."}\n- **Senin için önemli olan:** ${/onay|approval|imza|sign/i.test(text) ? "Senden onay/imza bekleniyor." : /toplant|meeting/i.test(text) ? "Takvimine eklenmesi gereken bir toplantı var." : "Doğrudan bir aksiyon beklenmiyor; bilgi amaçlı."}`,
      `**${subject || "Email"}** — ${from}\n\n- **Summary:** ${opening ? opening.slice(0, 200) : "A short update."}\n- **What matters for you:** ${/onay|approval|imza|sign/i.test(text) ? "Your approval/signature is expected." : /toplant|meeting/i.test(text) ? "There's a meeting to add to your calendar." : "No direct action needed; it's for information."}`,
    ),
  }
}

const re = (...ps) => (ctx) => ps.some((p) => p.test(ctx.f))

export const WRITING_INTENTS = [
  { id: "reply", match: re(/yanit taslagi|draft a reply|reply to|son postasina|yanit yaz/), run: replyDraft },
  { id: "prep", match: re(/hazirlanmama yardim|help me prepare for|toplantiya hazirlan|toplantisina hazirlan|prep (my|for)|hazirlik notu/), run: meetingPrep },
  { id: "doc", match: re(/dokumani ac|summari[sz]e this document|open and summari|dokuman uzerinde|working on this document/), run: docSummary },
  { id: "person", match: re(/ile son yazisma|recent emails with|kisisinden gelen son|latest (mail|email) from/), run: personSummary },
  { id: "celebrate", match: re(/tesekkur mesaji|thank-you message|tebrik mesaji|congratulations|birthday message|dogum gunu/), run: celebration },
  { id: "status", match: re(/yonetici(me|ye) .*(not|durum)|durum notu|status note|status update/), run: statusNote },
  { id: "prioritize", match: re(/onceliklendir|prioriti[sz]e my flagged/), run: prioritize },
  { id: "feed", match: re(/bildirimi ozetle|postayi ozetle|summari[sz]e this (notification|email)/), run: feedSummary },
]

export { ME }
