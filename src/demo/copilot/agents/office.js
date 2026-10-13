// TYRO Office — gün özeti, toplantılar, posta, görevler ve gün/hafta planı.
// Veri demo Graph uçlarından okunur (live.js); yazışma işleri officeWriting.js'te.
import { ME } from "@/demo/persona"
import { FORECAST_COMMIT, TEAM_TARGET, WON_QTD } from "../salesData"
import { eventsOn, lastSent, openTasks, unreadMail } from "../live"
import { dayFrom, fmtDate, fmtDay, fmtTime, moneyShort, pct, pick, quarterInfo } from "../util"
import { WRITING_INTENTS } from "./officeWriting"

const MAX = 5

function meetingLine(L, e) {
  const when = e.allDay ? pick(L, "Tüm gün", "All day") : `${fmtTime(L, e.start)}–${fmtTime(L, e.end)}`
  const where = e.online ? "Teams" : e.location
  const who = e.organizer && e.organizer !== ME.displayName ? ` · ${e.organizer}` : ""
  return `- **${when}** · ${e.subject}${where ? ` _(${where})_` : ""}${who}`
}

function meetingsBlock(L, events, { empty }) {
  if (events == null) return pick(L, "_Takvim şu an okunamadı._", "_Couldn't read the calendar just now._")
  if (!events.length) return empty
  const shown = events.slice(0, 6).map((e) => meetingLine(L, e))
  if (events.length > 6) shown.push(pick(L, `- …ve ${events.length - 6} toplantı daha`, `- …and ${events.length - 6} more`))
  return shown.join("\n")
}

function mailBlock(L, mails) {
  if (mails == null) return pick(L, "_Gelen kutusu şu an okunamadı._", "_Couldn't read the inbox just now._")
  if (!mails.length) return pick(L, "Okunmamış posta yok. 🎉", "No unread mail. 🎉")
  return mails
    .slice(0, 4)
    .map((m) => `- ${m.important ? "❗ " : ""}**${m.from}** — ${m.subject}`)
    .join("\n")
}

function taskBlock(L, tasks) {
  if (tasks == null) return pick(L, "_Görevler şu an okunamadı._", "_Couldn't read your tasks just now._")
  if (!tasks.length) return pick(L, "Açık görev yok.", "No open tasks.")
  return tasks
    .slice(0, 3)
    .map((t) => {
      const due = t.due ? pick(L, ` · son tarih ${fmtDate(L, t.due)}`, ` · due ${fmtDate(L, t.due)}`) : ""
      const late = t.due && t.due < dayFrom(0) ? pick(L, " ⏰ gecikmiş", " ⏰ overdue") : ""
      return `- ${t.important ? "⭐ " : ""}${t.title}${due}${late}`
    })
    .join("\n")
}

function kpiLine(L) {
  const q = quarterInfo()
  return pick(
    L,
    `📈 **Satış (${q.label}):** kapanan ${moneyShort(L, WON_QTD)} / hedef ${moneyShort(L, TEAM_TARGET)} (${pct(L, (WON_QTD / TEAM_TARGET) * 100)}) · commit tahmini ${pct(L, (FORECAST_COMMIT / TEAM_TARGET) * 100)} · bugünün odağı: Altay Perakende iskonto onayı`,
    `📈 **Sales (${q.label}):** closed ${moneyShort(L, WON_QTD)} of ${moneyShort(L, TEAM_TARGET)} target (${pct(L, (WON_QTD / TEAM_TARGET) * 100)}) · commit forecast ${pct(L, (FORECAST_COMMIT / TEAM_TARGET) * 100)} · today's focus: Altay Perakende discount approval`,
  )
}

const BRIEF_STEPS = [
  { tool: "calendar_list_events", ms: 420 },
  { tool: "mail_list_unread", ms: 460 },
  { tool: "todo_list_tasks", ms: 360 },
  { tool: "forecast_calculate", ms: 300 },
]

/** Sabah / gün sonu özeti — günün özeti de buradan. */
async function brief({ L, f }) {
  const evening = /gun sonu|end.of.day|aksam|evening/.test(f) || (!/sabah|morning/.test(f) && new Date().getHours() >= 16)
  const now = new Date()
  const [today, tomorrow, mails, tasks] = await Promise.all([
    eventsOn(0),
    evening ? eventsOn(1) : Promise.resolve(null),
    unreadMail(),
    openTasks(),
  ])
  const remaining = today?.filter((e) => e.end > now) ?? today
  const head = evening
    ? pick(L, `🌙 **Gün sonu özeti — ${fmtDay(L, now)}**`, `🌙 **End-of-day brief — ${fmtDay(L, now)}**`)
    : pick(L, `☀️ **Günaydın ${ME.givenName}! — ${fmtDay(L, now)}**`, `☀️ **Good morning ${ME.givenName}! — ${fmtDay(L, now)}**`)
  const meetTitle = evening
    ? pick(L, "📅 **Yarının toplantıları**", "📅 **Tomorrow's meetings**")
    : pick(L, `📅 **Bugünkü toplantılar** (${today?.length ?? 0})`, `📅 **Today's meetings** (${today?.length ?? 0})`)
  const meetBody = evening
    ? meetingsBlock(L, tomorrow, { empty: pick(L, "Yarın takvimin boş.", "Your calendar is clear tomorrow.") })
    : meetingsBlock(L, remaining, { empty: pick(L, "Bugün takviminde toplantı yok.", "No meetings on your calendar today.") })
  const unread = mails?.length ?? 0
  const text = [
    head,
    `${meetTitle}\n${meetBody}`,
    `${pick(L, `✉️ **Yanıt bekleyenler** (${unread} okunmamış)`, `✉️ **Waiting for a reply** (${unread} unread)`)}\n${mailBlock(L, mails)}`,
    `${pick(L, "✅ **Öncelikli görevler**", "✅ **Top tasks**")}\n${taskBlock(L, tasks)}`,
    kpiLine(L),
    evening
      ? pick(L, "Yarın güne Altay Perakende onayını takip ederek başlamanı öneririm. İyi akşamlar! 👋", "I'd start tomorrow by chasing the Altay Perakende approval. Have a good evening! 👋")
      : pick(L, "Kolay gelsin! İstersen ilk toplantına hazırlık notu çıkarabilirim.", "Have a great day! I can put together a prep note for your first meeting if you like."),
  ].join("\n\n")
  return {
    steps: BRIEF_STEPS,
    text,
    suggested: evening
      ? [pick(L, "Yarınımı planla", "Plan my tomorrow"), pick(L, "Yöneticime günlük durum notu yaz", "Write a status note to my manager")]
      : [pick(L, "Sıradaki toplantıma hazırlan", "Prep my next meeting"), pick(L, "Okunmamış postalarımı özetle", "Summarise my unread mail"), pick(L, "Günümü planla", "Plan my day")],
  }
}

async function meetings({ L, f }) {
  if (/bu hafta|this week|haftalik|weekly|kimlerle|who am i meeting/.test(f)) return week({ L, f })
  const tomorrow = /yarin|tomorrow/.test(f)
  const events = await eventsOn(tomorrow ? 1 : 0)
  const now = new Date()
  if (/siradaki|next meeting|bir sonraki|next one/.test(f)) {
    const next = (events ?? []).find((e) => e.start > now) ?? null
    if (!next)
      return {
        steps: [{ tool: "calendar_list_events" }],
        text: pick(L, "Bugün başka toplantın kalmadı. 🙌", "No more meetings today. 🙌"),
        suggested: [pick(L, "Yarınki toplantılarım", "Tomorrow's meetings")],
      }
    const mins = Math.round((next.start - now) / 60000)
    const others = next.attendees.filter((a) => a !== ME.displayName)
    return {
      steps: [{ tool: "calendar_list_events" }],
      text: pick(
        L,
        `Sıradaki toplantın **${next.subject}** — ${fmtTime(L, next.start)}'de (${mins} dk sonra), ${next.online ? "Teams'te" : next.location || "ofiste"}.\n\n${others.length ? `**Katılımcılar:** ${others.join(", ")}` : "Katılımcı listesi boş."}${next.organizer ? `\n**Düzenleyen:** ${next.organizer}` : ""}`,
        `Your next meeting is **${next.subject}** at ${fmtTime(L, next.start)} (in ${mins} min), ${next.online ? "on Teams" : next.location || "in the office"}.\n\n${others.length ? `**Attendees:** ${others.join(", ")}` : "No attendees listed."}${next.organizer ? `\n**Organizer:** ${next.organizer}` : ""}`,
      ),
      suggested: [pick(L, `"${next.subject}" toplantısına hazırlan`, `Prep for "${next.subject}"`)],
    }
  }
  const day = tomorrow ? dayFrom(1) : now
  return {
    steps: [{ tool: "calendar_list_events" }],
    text: `${pick(L, `📅 **${fmtDay(L, day)} — ${events?.length ?? 0} toplantı**`, `📅 **${fmtDay(L, day)} — ${events?.length ?? 0} meetings**`)}\n\n${meetingsBlock(L, events, { empty: pick(L, "Takviminde toplantı yok.", "Nothing on your calendar.") })}`,
    suggested: [
      pick(L, "Sıradaki toplantıma hazırlan", "Prep my next meeting"),
      tomorrow ? pick(L, "Yarınımı planla", "Plan my tomorrow") : pick(L, "Günümü planla", "Plan my day"),
    ],
  }
}

async function week({ L, f }) {
  const dow = (new Date().getDay() + 6) % 7
  const from = /gelecek hafta|next week|pazartesi|monday/.test(f) ? 7 - dow : -dow
  const events = (await eventsOn(from, 5)) ?? []
  const byDay = new Map()
  for (const e of events) {
    const k = fmtDate(L, e.start, { weekday: "short", day: "numeric", month: "short" })
    byDay.set(k, [...(byDay.get(k) ?? []), e])
  }
  const rows = [...byDay.entries()].map(([d, list]) => `| ${d} | ${list.length} | ${Math.round(list.reduce((a, e) => a + (e.end - e.start) / 3_600_000, 0) * 10) / 10} |`)
  const people = new Map()
  for (const e of events) for (const a of e.attendees) if (a !== ME.displayName) people.set(a, (people.get(a) ?? 0) + 1)
  const top = [...people.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  const customer = events.filter((e) => /altay|nordis|ekinoks|pera|toros|orion/i.test(e.subject))
  return {
    steps: [{ tool: "calendar_list_events", ms: 520 }],
    text: pick(
      L,
      `**Haftanın takvimi — ${events.length} toplantı**\n\n| Gün | Toplantı | Saat |\n|---|---:|---:|\n${rows.join("\n")}\n\n**En çok görüştüğün kişiler:** ${top.map(([n, c]) => `${n} (${c})`).join(", ") || "—"}\n\n${customer.length ? `**Müşteri görüşmeleri:**\n${customer.slice(0, MAX).map((e) => meetingLine(L, e)).join("\n")}` : "Bu hafta müşteri görüşmesi görünmüyor."}`,
      `**This week's calendar — ${events.length} meetings**\n\n| Day | Meetings | Hours |\n|---|---:|---:|\n${rows.join("\n")}\n\n**Who you meet most:** ${top.map(([n, c]) => `${n} (${c})`).join(", ") || "—"}\n\n${customer.length ? `**Customer meetings:**\n${customer.slice(0, MAX).map((e) => meetingLine(L, e)).join("\n")}` : "No customer meetings this week."}`,
    ),
    suggested: [pick(L, "Haftamı planla", "Plan my week"), pick(L, "Haftalık özetimi hazırla", "Prepare my weekly summary")],
  }
}

async function inbox({ L, f }) {
  const mails = await unreadMail(40)
  if (mails == null) return { text: pick(L, "Gelen kutusu şu an okunamadı.", "Couldn't read your inbox just now.") }
  const list = /bugun|today/.test(f)
    ? mails.filter((m) => m.received && m.received >= dayFrom(0))
    : /dun|yesterday/.test(f)
      ? mails.filter((m) => m.received && m.received >= dayFrom(-1) && m.received < dayFrom(0))
      : mails
  const important = list.filter((m) => m.important)
  const rows = list
    .slice(0, 8)
    .map((m) => `| ${m.important ? "❗" : ""} | ${m.from} | ${m.subject} | ${m.received ? fmtTime(L, m.received) : ""} |`)
    .join("\n")
  const newest = list[0]
  return {
    steps: [{ tool: "mail_list_unread", ms: 520 }],
    text: list.length
      ? pick(
          L,
          `**${list.length} okunmamış posta**${important.length ? `, ${important.length} tanesi önemli olarak işaretli` : ""}. En yenisi **${newest.from}**'dan: “${newest.subject}”.\n\n|  | Gönderen | Konu | Saat |\n|---|---|---|---|\n${rows}\n\n${newest.preview ? `**Son posta özeti:** ${newest.preview.slice(0, 220)}${newest.preview.length > 220 ? "…" : ""}` : ""}`,
          `**${list.length} unread emails**${important.length ? `, ${important.length} flagged important` : ""}. The newest is from **${newest.from}**: “${newest.subject}”.\n\n|  | From | Subject | Time |\n|---|---|---|---|\n${rows}\n\n${newest.preview ? `**Latest in short:** ${newest.preview.slice(0, 220)}${newest.preview.length > 220 ? "…" : ""}` : ""}`,
        )
      : pick(L, "Bu aralıkta okunmamış posta yok. 🎉", "No unread mail in that window. 🎉"),
    suggested: newest
      ? [pick(L, `${newest.from} postasına yanıt taslağı yaz`, `Draft a reply to ${newest.from}`), pick(L, "Hangilerine bugün dönmeliyim?", "Which ones need a reply today?")]
      : [],
  }
}

async function sent({ L }) {
  const m = await lastSent()
  if (!m) return { steps: [{ tool: "mail_list_sent" }], text: pick(L, "Gönderilmiş öğelerde posta bulamadım.", "I couldn't find anything in Sent Items.") }
  return {
    steps: [{ tool: "mail_list_sent" }],
    text: pick(
      L,
      `Son gönderdiğin posta: **“${m.subject}”**\n\n- **Kime:** ${m.to.join(", ") || "—"}\n- **Ne zaman:** ${m.sent ? `${fmtDay(L, m.sent)} ${fmtTime(L, m.sent)}` : "—"}\n\n${m.preview ? `> ${m.preview.slice(0, 260)}` : ""}`,
      `The last email you sent: **“${m.subject}”**\n\n- **To:** ${m.to.join(", ") || "—"}\n- **When:** ${m.sent ? `${fmtDay(L, m.sent)} ${fmtTime(L, m.sent)}` : "—"}\n\n${m.preview ? `> ${m.preview.slice(0, 260)}` : ""}`,
    ),
  }
}

/** Gün / yarın / hafta planı ve gecikmiş işler — takvim boşluklarına görev yerleştirir. */
async function plan({ L, f }) {
  const tomorrow = /yarin|tomorrow/.test(f)
  const weekly = /hafta|week|pazartesi|monday/.test(f)
  const [events, tasks] = await Promise.all([eventsOn(tomorrow ? 1 : 0), openTasks()])
  const overdue = (tasks ?? []).filter((t) => t.due && t.due < dayFrom(0))
  const open = (tasks ?? []).slice(0, 4)
  const meet = (events ?? []).filter((e) => !e.allDay).slice(0, 6)
  const blocks = meet.map((e) => `- ${fmtTime(L, e.start)}–${fmtTime(L, e.end)} · ${e.subject}`)
  const focus = open.map((t, i) => `${i + 1}. ${t.title}${t.due ? pick(L, ` _(son tarih ${fmtDate(L, t.due)})_`, ` _(due ${fmtDate(L, t.due)})_`) : ""}`)
  const title = weekly
    ? pick(L, "**Haftanın planı**", "**Plan for the week**")
    : tomorrow
      ? pick(L, `**Yarının planı — ${fmtDay(L, dayFrom(1))}**`, `**Plan for tomorrow — ${fmtDay(L, dayFrom(1))}**`)
      : pick(L, `**Bugünün planı — ${fmtDay(L, new Date())}**`, `**Plan for today — ${fmtDay(L, new Date())}**`)
  return {
    steps: [{ tool: "calendar_list_events" }, { tool: "todo_list_tasks", ms: 420 }],
    text: pick(
      L,
      `${title}\n\n**Sabit bloklar (toplantılar)**\n${blocks.join("\n") || "- Toplantı yok — derin çalışma için harika bir gün."}\n\n**Odak sırası**\n${focus.join("\n") || "1. Açık görev yok"}\n\n${overdue.length ? `⏰ **Gecikmiş ${overdue.length} iş var.** Önce en kısasını (≤30 dk) bitir, büyük olanı için takvimine 90 dakikalık bir odak bloğu koy; birini devredebiliyorsan Burak'a (satış operasyonu) ver.\n\n` : ""}**Öneri:** Toplantı aralarındaki ilk boş 60 dakikayı Altay Perakende onayı ve Nordis takibine ayır — çeyrek tahminine en çok etki eden iki iş bunlar.`,
      `${title}\n\n**Fixed blocks (meetings)**\n${blocks.join("\n") || "- No meetings — a great day for deep work."}\n\n**Focus order**\n${focus.join("\n") || "1. No open tasks"}\n\n${overdue.length ? `⏰ **${overdue.length} overdue item(s).** Finish the shortest (≤30 min) first and block 90 focused minutes for the big one; delegate one to Burak (sales ops) if you can.\n\n` : ""}**Tip:** Use the first free hour between meetings for the Altay Perakende approval and the Nordis follow-up — the two items that move the quarter most.`,
    ),
    suggested: [pick(L, "Bu görevleri To Do'da güncelle", "Update these in To Do"), pick(L, "Sıradaki toplantıma hazırlan", "Prep my next meeting")],
  }
}

/** Haftalık özet: haftanın takvimi + öne çıkan postalar + bu haftanın işleri. */
async function weekSummary(ctx) {
  const { L } = ctx
  const [w, mails, tasks] = await Promise.all([week(ctx), unreadMail(), openTasks()])
  const weekEnd = dayFrom(7 - ((new Date().getDay() + 6) % 7))
  const due = (tasks ?? []).filter((t) => !t.due || t.due < weekEnd)
  return {
    steps: BRIEF_STEPS,
    text: [
      w.text,
      `${pick(L, "✉️ **Öne çıkan postalar**", "✉️ **Emails that stand out**")}\n${mailBlock(L, mails)}`,
      `${pick(L, "✅ **Bu hafta takip etmen gerekenler**", "✅ **To follow up this week**")}\n${taskBlock(L, due)}`,
      kpiLine(L),
    ].join("\n\n"),
    suggested: [pick(L, "Haftamı planla", "Plan my week"), pick(L, "Yöneticime haftalık durum notu yaz", "Write a weekly status note to my manager")],
  }
}

const re = (...ps) => (ctx) => ps.some((p) => p.test(ctx.f))

export const OFFICE = {
  intents: [
    ...WRITING_INTENTS,
    { id: "brief", match: re(/sabah ozet|gun sonu ozet|morning brief|end.of.day brief|gunun ozeti|gunluk ozet|day summary|daily brief|gunun ozetini/), run: brief },
    { id: "weekSummary", match: re(/haftalik ozet|weekly summary|haftanin ozeti|week wrap|this week's summary|haftanin ozetini/), run: weekSummary },
    { id: "plan", match: re(/planla|plan my|gecikmis|overdue|pazartesiye hazirlan|odak zaman|focus time/), run: plan },
    { id: "sent", match: re(/son gonderdigim|last (mail|email) i sent|my last sent/), run: sent },
    { id: "meetings", match: re(/toplanti|meeting|ajanda|agenda|takvim|calendar|kimlerle/), run: meetings },
    { id: "inbox", match: re(/okunmamis|unread|gelen kutu|inbox|postalarim|e-?postalarim|mailler|ne geldi|my mail|my email/), run: inbox },
  ],
}
