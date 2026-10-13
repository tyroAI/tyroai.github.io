// Her asistanın ortak davranışları: selam/teşekkür, "neler yapabilirsin",
// e-posta taslağı ve onun düzenlemeleri (daha resmi, kısalt, çevir), ek dosya
// karşılama ve yardımcı yedek cevap.
import { ME } from "@/demo/persona"
import { pick } from "../util"

const SIGN = `${ME.displayName}\n${ME.jobTitle} · ${ME.companyName}`

/** Asistan başına önerilen ilk adımlar — yedek cevabın ve selamın düğmeleri. */
export function starters(agent, L) {
  const s = {
    office: [
      pick(L, "Sabah özetimi hazırla", "Prepare my morning brief"),
      pick(L, "Bugünkü toplantılarım", "Today's meetings"),
      pick(L, "Okunmamış postalarımı özetle", "Summarise my unread mail"),
    ],
    sales: [
      pick(L, "Pipeline özetini aşamalara göre göster", "Show the pipeline by stage"),
      pick(L, "Çeyrek tahmini hedefin neresinde?", "Where is the quarter forecast vs target?"),
      pick(L, "Riskli fırsatları listele", "List the deals at risk"),
    ],
    hr: [
      pick(L, "İzin bakiyemi göster", "Show my leave balance"),
      pick(L, "Masraf politikası limitleri neler?", "What are the expense policy limits?"),
      pick(L, "Ekibimde bu ay kim izinde?", "Who on my team is off this month?"),
    ],
  }
  return s[agent] ?? s.office
}

export function capabilities(agent, L) {
  const body = {
    office: pick(
      L,
      `Ben **TYRO Office**. Microsoft 365 verilerin üzerinde çalışırım:\n\n- 📅 **Takvim** — günün/haftanın toplantıları, sıradaki toplantı, toplantı hazırlık notu\n- ✉️ **Posta** — okunmamışların özeti, öncelik sırası, yanıt taslakları\n- ✅ **Görevler** — To Do listendeki açık işler, gün ve hafta planı\n- 📄 **Belgeler** — OneDrive/SharePoint dosyalarını özetleme\n- ✍️ **Yazışma** — yöneticine durum notu, müşteriye takip, çeviri\n\nSabah ve akşam için hazır bir **gün özeti** de çıkarabilirim.`,
      `I'm **TYRO Office**. I work on your Microsoft 365 data:\n\n- 📅 **Calendar** — today's/this week's meetings, your next meeting, meeting prep notes\n- ✉️ **Mail** — unread summary, priorities, reply drafts\n- ✅ **Tasks** — open items in To Do, day and week plans\n- 📄 **Documents** — summaries of OneDrive/SharePoint files\n- ✍️ **Writing** — status notes to your manager, follow-ups, translation\n\nI can also put together a ready-made **daily brief** in the morning and evening.`,
    ),
    sales: pick(
      L,
      `Ben **TYRO Sales**. CRM ve ERP verisiyle satış yönetiminde yanındayım:\n\n- 📊 **Huni** — aşamalara göre pipeline, ağırlıklı tutar, son 6 ayın trendi\n- 🎯 **Tahmin** — çeyrek hedefi, commit ve best case, hedefe kalan\n- ⚠️ **Riskler** — kayma ihtimali olan, temas almayan, iskonto bekleyen fırsatlar\n- 👥 **Ekip** — temsilci bazında hedef/gerçekleşen, kazanma oranı, koçluk notları\n- 🏢 **Müşteriler** — 360° brifing, QBR hazırlığı, takip e-postası\n- 🧾 **Teklif & iskonto** — teklif taslağı ve yetki matrisine göre onay talebi`,
      `I'm **TYRO Sales**. I help you run sales with CRM and ERP data:\n\n- 📊 **Pipeline** — by stage, weighted value, six-month trend\n- 🎯 **Forecast** — quarter target, commit and best case, gap to target\n- ⚠️ **Risks** — deals that may slip, go quiet or wait on a discount\n- 👥 **Team** — target vs actual by rep, win rate, coaching notes\n- 🏢 **Customers** — 360° briefs, QBR prep, follow-up emails\n- 🧾 **Quotes & discounts** — draft quotes and approval requests per the authority matrix`,
    ),
    hr: pick(
      L,
      `Ben **TYRO HR**. İK işlerini sohbetten halletmeni sağlarım:\n\n- 🌴 **İzin** — bakiye, geçmiş, yeni talep ve imzalanabilir izin formu\n- 🧾 **Masraf & avans** — masraf girişi (fiş ekleyebilirsin), durum takibi, avans talebi\n- 📘 **Politikalar** — masraf limitleri, seyahat, hibrit çalışma, eğitim bütçesi\n- 👥 **Yönetici işleri** — ekibinin izin planı, onay bekleyen talepler\n- 📅 **Resmi tatiller** — yaklaşan tatiller ve köprü günleri`,
      `I'm **TYRO HR**. I let you handle HR tasks right from the chat:\n\n- 🌴 **Leave** — balance, history, new requests and a signable leave form\n- 🧾 **Expenses & advances** — file expenses (attach receipts), track status, request advances\n- 📘 **Policies** — expense limits, travel, hybrid work, training budget\n- 👥 **Manager tasks** — your team's leave plan, requests awaiting your approval\n- 📅 **Public holidays** — upcoming holidays and bridge days`,
    ),
  }
  return {
    text: body[agent] ?? body.office,
    suggested: starters(agent, L),
  }
}

export const COMMON = {
  meta: [
    {
      id: "hello",
      match: ({ f }) =>
        /^(merhaba|selam|selamlar|hi|hello|hey|gunaydin|iyi gunler|iyi aksamlar|good morning)[\s!.,]*$/.test(
          f.trim(),
        ),
      run: ({ agent, L }) => ({
        text: pick(
          L,
          `Merhaba ${ME.givenName}! 👋 Bugün neyle başlayalım?`,
          `Hi ${ME.givenName}! 👋 What shall we start with today?`,
        ),
        suggested: starters(agent, L),
      }),
    },
    {
      id: "thanks",
      match: ({ f }) => /^(tesekkur|tesekkurler|sagol|sag ol|eyvallah|thanks|thank you|thx|super|harika)/.test(f.trim()),
      run: ({ L }) => ({
        text: pick(
          L,
          "Rica ederim! Başka bir şey olursa buradayım. 🙌",
          "You're welcome! I'm here if you need anything else. 🙌",
        ),
      }),
    },
  ],
  writing: [
    {
      id: "draft-edit",
      match: ({ f, conv }) =>
        !!conv.draft &&
        /daha resmi|resmilestir|kisalt|daha kisa|ingilizce|turkce|cevir|more formal|shorter|shorten|translate|in english|in turkish|samimi|friendlier/.test(f),
      run: (ctx) => editDraft(ctx),
    },
    {
      id: "translate",
      match: ({ f }) => /(ingilizceye|turkceye|translate|cevir)/.test(f),
      run: ({ text, L }) => {
        const body = text.split(/[:：]/).slice(1).join(":").trim()
        if (!body)
          return {
            text: pick(
              L,
              "Çevirmemi istediğin metni `Çevir: …` diye yazarsan hemen çeviririm. Son taslağın varsa \"İngilizceye çevir\" demen yeterli.",
              "Paste the text as `Translate: …` and I'll translate it right away. If you have a recent draft, just say \"translate to Turkish\".",
            ),
          }
        return {
          text: pick(
            L,
            `Çeviri (iş yazışması tonunda):\n\n> ${body}\n\n_Demo: bu ortamda çeviri motoru bağlı değil; gerçek kurulumda metnin tamamı hedef dile çevrilir._`,
            `Translation (business tone):\n\n> ${body}\n\n_Demo: no translation engine is connected here; in a real setup the full text is translated._`,
          ),
        }
      },
    },
  ],
}

/**
 * E-posta taslağı. `build(L, { formal, short })` aynı içeriği istenen dil ve
 * tonda üretir; düzenleme düğmeleri ("Daha resmi yap", "Kısalt", "Çevir") onu
 * yeniden çağırır. Konuşmada son taslak saklanır.
 */
export function draftPlan(ctx, build, steps = []) {
  const { conv, L } = ctx
  conv.draft = { build, L, formal: false, short: false }
  return renderDraft(conv.draft, steps)
}

function renderDraft(d, steps = [], lead) {
  const { L } = d
  const m = d.build(L, { formal: d.formal, short: d.short })
  const intro =
    lead ??
    pick(L, "İşte bir taslak — göndermeden önce düzenleyebilirsin:", "Here's a draft — edit it before you send:")
  const text = `${intro}\n\n---\n\n**${pick(L, "Kime", "To")}:** ${m.to}\n**${pick(L, "Konu", "Subject")}:** ${m.subject}\n\n${m.body.trim()}\n\n${m.closing ?? pick(L, d.formal ? "Saygılarımla," : "Sevgiler,", d.formal ? "Kind regards," : "Best,")}\n${SIGN}\n\n---`
  return {
    steps,
    text,
    suggested: [
      d.formal ? pick(L, "Daha samimi yap", "Make it friendlier") : pick(L, "Daha resmi yap", "Make it more formal"),
      pick(L, "Kısalt", "Shorten it"),
      L === "tr" ? "İngilizceye çevir" : "Translate to Turkish",
    ],
  }
}

function editDraft({ f, conv }) {
  const d = conv.draft
  if (/ingilizce|in english/.test(f)) d.L = "en"
  else if (/turkce|in turkish/.test(f)) d.L = "tr"
  else if (/samimi|friendl/.test(f)) d.formal = false
  else if (/resmi|formal/.test(f)) d.formal = true
  else if (/kisa|kisalt|short/.test(f)) d.short = true
  return renderDraft(d, [], pick(d.L, "Güncellenmiş taslak:", "Updated draft:"))
}

/** Ek dosya: adlarını söyle, türüne göre ne yapılabileceğini öner. */
export function attachmentReply({ attachments, L }) {
  const names = attachments.map((a) => a.name).filter(Boolean)
  const list = names.map((n) => `- 📎 **${n}**`).join("\n")
  const isImg = attachments.every((a) => /^image\//.test(a.contentType || ""))
  return {
    steps: [{ tool: "sharepoint_read_document" }],
    text: pick(
      L,
      `Dosyaları aldım:\n\n${list}\n\n${isImg ? "Görseli inceledim. Bir fiş ya da fatura ise **TYRO HR** ile tek adımda masraf kaydına dönüştürebilirim; ekran görüntüsüyse içindeki tabloyu ya da metni özetleyebilirim." : "Belgeyi okudum. Ne yapmamı istersin?"}`,
      `Got your files:\n\n${list}\n\n${isImg ? "I've looked at the image. If it's a receipt or invoice, **TYRO HR** can turn it into an expense in one step; if it's a screenshot I can summarise the table or text in it." : "I've read the document. What would you like me to do with it?"}`,
    ),
    suggested: isImg
      ? [pick(L, "Bunu masraf olarak gir", "File this as an expense"), pick(L, "İçeriği özetle", "Summarise the content")]
      : [pick(L, "Yarım sayfada özetle", "Summarise in half a page"), pick(L, "Aksiyon maddelerini çıkar", "Pull out the action items")],
  }
}

export function fallback(agent, { L, text }) {
  const short = text.length > 90 ? `${text.slice(0, 90)}…` : text
  return {
    text: pick(
      L,
      `“${short}” için elimdeki demo verisinde doğrudan bir karşılık bulamadım. Bu demoda şunları gerçek gibi deneyebilirsin:\n\n- **TYRO Sales** — pipeline, tahmin, riskli fırsatlar, ekip performansı, müşteri brifingi, teklif ve iskonto onayı\n- **TYRO Office** — gün özeti, toplantılar, okunmamış postalar, yanıt taslağı, toplantı hazırlığı\n- **TYRO HR** — izin bakiyesi ve talebi, masraf girişi, politikalar, ekibin izin planı\n\nAşağıdakilerden biriyle başlamak ister misin?`,
      `I couldn't find a direct match for “${short}” in the demo data. Here's what you can try in this demo:\n\n- **TYRO Sales** — pipeline, forecast, deals at risk, team performance, customer briefs, quotes and discount approvals\n- **TYRO Office** — daily brief, meetings, unread mail, reply drafts, meeting prep\n- **TYRO HR** — leave balance and requests, expenses, policies, your team's leave plan\n\nWant to start with one of these?`,
    ),
    suggested: starters(agent, L),
  }
}
