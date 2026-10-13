// TYRO Sales — huni, tahmin, riskler, ekip. Müşteriye özel işler (brifing,
// takip e-postası, QBR, teklif, iskonto) `salesAccounts.js`te.
//
// Tablolar grafik çizilebilir biçimde yazılır (bkz. lib/markdownTable.js):
// tam tutar + ₺, "Toplam" satırı, karşılaştırmada "Hedef"/"Gerçekleşen"/"Fark".
import {
  COMMIT,
  DEALS,
  FORECAST_BEST,
  FORECAST_COMMIT,
  MANAGER_NAME,
  MONTHLY_WON,
  NEXT_STEP,
  OPS,
  OWNER_OF,
  PIPELINE_COUNT,
  PIPELINE_TOTAL,
  PIPELINE_WEIGHTED,
  REPS,
  RISK_TEXT,
  STAGES,
  STAGE_OF,
  TEAM_TARGET,
  WON_DEALS,
  WON_QTD,
  closeDate,
} from "../salesData"
import { fmtDate, fold, money, moneyShort, monthShort, pct, pick, quarterInfo } from "../util"
import { MANAGER } from "@/demo/persona"
import { draftPlan } from "./common"
import { ACCOUNT_INTENTS, accountIn, salesOnAction } from "./salesAccounts"

const T = (L, row) => (L === "tr" ? row.tr : row.en)
const first = (p) => p.displayName.split(" ")[0]

function pipeline({ L }) {
  const q = quarterInfo()
  const rows = STAGES.map(
    (s) => `| ${T(L, s)} | ${s.count} | ${money(L, s.value)} | ${pct(L, s.prob)} |`,
  ).join("\n")
  const negotiation = STAGES[3]
  return {
    steps: [{ tool: "crm_list_opportunities" }, { tool: "crm_pipeline_by_stage", ms: 420 }],
    text: pick(
      L,
      `**${q.label} açık huni:** ${PIPELINE_COUNT} fırsat, toplam **${moneyShort(L, PIPELINE_TOTAL)}** (olasılıkla ağırlıklı **${moneyShort(L, PIPELINE_WEIGHTED)}**).\n\nAşamalara göre dağılım:\n\n| Aşama | Fırsat | Tutar | Olasılık |\n|---|---:|---:|---:|\n${rows}\n| Toplam | ${PIPELINE_COUNT} | ${money(L, PIPELINE_TOTAL)} | |\n\n**Öne çıkanlar**\n- Pazarlık aşamasındaki ${negotiation.count} fırsat (${moneyShort(L, negotiation.value)}) çeyreğin kaderini belirliyor; en büyüğü **Altay Perakende** (${moneyShort(L, DEALS[0].value)}).\n- Huni hedefin **${(PIPELINE_TOTAL / TEAM_TARGET).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} katı** — sağlıklı eşik 3x'in biraz altında; keşif aşamasını beslemek gerekiyor.\n- Çözüm & Demo aşaması en kalabalık; iki fırsat 30 gündür aşama değiştirmedi.`,
      `**${q.label} open pipeline:** ${PIPELINE_COUNT} opportunities, **${moneyShort(L, PIPELINE_TOTAL)}** in total (**${moneyShort(L, PIPELINE_WEIGHTED)}** probability-weighted).\n\nBreakdown by stage:\n\n| Stage | Deals | Value | Probability |\n|---|---:|---:|---:|\n${rows}\n| Total | ${PIPELINE_COUNT} | ${money(L, PIPELINE_TOTAL)} | |\n\n**Highlights**\n- The ${negotiation.count} deals in negotiation (${moneyShort(L, negotiation.value)}) decide the quarter; the biggest is **Altay Perakende** (${moneyShort(L, DEALS[0].value)}).\n- Pipeline coverage is **${(PIPELINE_TOTAL / TEAM_TARGET).toFixed(1)}x** target — just under the healthy 3x; discovery needs feeding.\n- Solution & Demo is the busiest stage; two deals haven't moved in 30 days.`,
    ),
    suggested: [
      pick(L, "Riskli fırsatları listele", "List the deals at risk"),
      pick(L, "Çeyrek tahmini hedefin neresinde?", "Where is the quarter forecast vs target?"),
      pick(L, "Son 6 ayın satış trendi", "Sales trend for the last 6 months"),
    ],
  }
}

function repForecast(r) {
  const commit = DEALS.filter((d) => d.commit && d.owner === r.person.id).reduce((a, d) => a + d.value, 0)
  const best = r.person.id === "u-zeynep" ? 3_750_000 : r.person.id === "u-selin" ? 1_850_000 : 0
  return { commit: r.won + commit, best: r.won + commit + best }
}

function forecast({ L }) {
  const q = quarterInfo()
  const gapCommit = TEAM_TARGET - FORECAST_COMMIT
  const gapBest = TEAM_TARGET - FORECAST_BEST
  const rows = REPS.map((r) => {
    const f = repForecast(r)
    return `| ${r.person.displayName} | ${money(L, r.target)} | ${money(L, f.commit)} | ${money(L, f.best)} |`
  }).join("\n")
  return {
    steps: [{ tool: "crm_list_opportunities" }, { tool: "forecast_calculate", ms: 760 }],
    text: pick(
      L,
      `**${q.label} tahmini** — çeyreğin %${Math.round(q.elapsed * 100)}'i geride, ${q.daysLeft} gün kaldı.\n\n- 🎯 Ekip hedefi: **${moneyShort(L, TEAM_TARGET)}**\n- ✅ Kapanan: **${moneyShort(L, WON_QTD)}** (${pct(L, (WON_QTD / TEAM_TARGET) * 100)})\n- 📌 Commit tahmini: **${moneyShort(L, FORECAST_COMMIT)}** (${pct(L, (FORECAST_COMMIT / TEAM_TARGET) * 100)}) — hedefe **${moneyShort(L, gapCommit)}** kalıyor\n- 🌤️ Best case: **${moneyShort(L, FORECAST_BEST)}** (${pct(L, (FORECAST_BEST / TEAM_TARGET) * 100)}) — açık **${moneyShort(L, gapBest)}**\n\nTemsilci bazında:\n\n| Temsilci | Hedef | Commit tahmini | Best case |\n|---|---:|---:|---:|\n${rows}\n| Toplam | ${money(L, TEAM_TARGET)} | ${money(L, FORECAST_COMMIT)} | ${money(L, FORECAST_BEST)} |\n\n**Değerlendirme:** Commit'teki ${moneyShort(L, COMMIT)}'nin %36'sı tek fırsatta (Altay Perakende). Hedefi kapatmak için Ekinoks'u best case'den commit'e taşımak ve Pera Otelcilik'in bu ay kapanmasını garantiye almak yeterli olur; Zeynep ve Selin'in açığı ekip ortalamasının belirgin üzerinde.`,
      `**${q.label} forecast** — ${Math.round(q.elapsed * 100)}% of the quarter is behind us, ${q.daysLeft} days to go.\n\n- 🎯 Team target: **${moneyShort(L, TEAM_TARGET)}**\n- ✅ Closed won: **${moneyShort(L, WON_QTD)}** (${pct(L, (WON_QTD / TEAM_TARGET) * 100)})\n- 📌 Commit forecast: **${moneyShort(L, FORECAST_COMMIT)}** (${pct(L, (FORECAST_COMMIT / TEAM_TARGET) * 100)}) — **${moneyShort(L, gapCommit)}** short of target\n- 🌤️ Best case: **${moneyShort(L, FORECAST_BEST)}** (${pct(L, (FORECAST_BEST / TEAM_TARGET) * 100)}) — gap **${moneyShort(L, gapBest)}**\n\nBy rep:\n\n| Rep | Target | Commit forecast | Best case |\n|---|---:|---:|---:|\n${rows}\n| Total | ${money(L, TEAM_TARGET)} | ${money(L, FORECAST_COMMIT)} | ${money(L, FORECAST_BEST)} |\n\n**Assessment:** 36% of the ${moneyShort(L, COMMIT)} commit sits in a single deal (Altay Perakende). Moving Ekinoks from best case to commit and making sure Pera Otelcilik closes this month would close most of the gap; Zeynep and Selin are well behind the team average.`,
    ),
    suggested: [
      pick(L, "Riskli fırsatları listele", "List the deals at risk"),
      pick(L, "Ekip performansını göster", "Show team performance"),
      pick(L, "Yöneticime tahmin notu yaz", "Write a forecast note to my manager"),
    ],
  }
}

const RISKY = () => DEALS.filter((d) => d.risk)

function risks({ L, conv }) {
  const list = RISKY()
  const rows = list
    .map(
      (d) =>
        `| ${d.account} | ${money(L, d.value)} | ${T(L, STAGE_OF(d))} | ${fmtDate(L, closeDate(d), { day: "numeric", month: "short" })} | ${first(OWNER_OF(d))} |`,
    )
    .join("\n")
  const total = list.reduce((a, d) => a + d.value, 0)
  const notes = list
    .map((d) => `- **${d.account}** — ${T(L, RISK_TEXT[d.risk])}\n  ➜ ${T(L, NEXT_STEP[d.risk])}`)
    .join("\n")
  conv.account = list[0].account
  return {
    steps: [{ tool: "crm_list_opportunities" }, { tool: "crm_deal_risk_scan", ms: 680 }],
    text: pick(
      L,
      `Risk sinyali taşıyan **${list.length} fırsat** var, toplam **${moneyShort(L, total)}** — commit tahmininin büyük bölümü.\n\n| Müşteri | Tutar | Aşama | Kapanış | Sorumlu |\n|---|---:|---|---|---|\n${rows}\n| Toplam | ${money(L, total)} | | | |\n\n**Neden riskli, ne yapmalı?**\n${notes}`,
      `**${list.length} deals** carry risk signals, **${moneyShort(L, total)}** in total — most of the commit forecast.\n\n| Customer | Value | Stage | Close | Owner |\n|---|---:|---|---|---|\n${rows}\n| Total | ${money(L, total)} | | | |\n\n**Why they're at risk, and what to do**\n${notes}`,
    ),
    suggested: [
      pick(L, "Altay Perakende için iskonto onayı iste", "Request discount approval for Altay Perakende"),
      pick(L, "Nordis Lojistik'e takip e-postası yaz", "Draft a follow-up to Nordis Lojistik"),
      pick(L, "Pera Otelcilik brifingi", "Brief me on Pera Otelcilik"),
    ],
  }
}

function team({ L }) {
  const rows = REPS.map(
    (r) =>
      `| ${r.person.displayName} | ${money(L, r.target)} | ${money(L, r.won)} | ${money(L, r.won - r.target)} | ${pct(L, r.winRate)} |`,
  ).join("\n")
  const sorted = [...REPS].sort((a, b) => b.won / b.target - a.won / a.target)
  const top = sorted[0]
  return {
    steps: [{ tool: "crm_rep_performance", ms: 640 }],
    text: pick(
      L,
      `**Ekip performansı — ${quarterInfo().label}** (kapanan satışa göre)\n\n| Temsilci | Hedef | Gerçekleşen | Fark | Kazanma oranı |\n|---|---:|---:|---:|---:|\n${rows}\n| Toplam | ${money(L, TEAM_TARGET)} | ${money(L, WON_QTD)} | ${money(L, WON_QTD - TEAM_TARGET)} | ${pct(L, 30)} |\n\n**Koçluk notları**\n- **${first(top.person)}** hedefe oranla önde (${pct(L, (top.won / top.target) * 100)}); Kuzey Gıda yenilemesini erken kapattı.\n- **Mert** iki büyük teklifi yürütüyor (Nordis, Toros); Nordis'te 16 gündür temas yok — birlikte bir yönetici görüşmesi planlayın.\n- **Selin** bu çeyrek henüz kapanış yapmadı ama Pera Otelcilik bu ay kapanabilir; pazarlık provası için 30 dk ayırmak iyi olur.\n- **Zeynep**'in Ekinoks pilotu olumlu; PoC kapanışı ile best case'den commit'e geçebilir.\n- ${OPS.displayName} (satış operasyonu) CRM hijyeninde iyi iş çıkarıyor: kapanış tarihi geçmiş fırsat yok.`,
      `**Team performance — ${quarterInfo().label}** (closed won)\n\n| Rep | Target | Actual | Variance | Win rate |\n|---|---:|---:|---:|---:|\n${rows}\n| Total | ${money(L, TEAM_TARGET)} | ${money(L, WON_QTD)} | ${money(L, WON_QTD - TEAM_TARGET)} | ${pct(L, 30)} |\n\n**Coaching notes**\n- **${first(top.person)}** leads against target (${pct(L, (top.won / top.target) * 100)}); closed the Kuzey Gıda renewal early.\n- **Mert** runs two large proposals (Nordis, Toros); Nordis has gone quiet for 16 days — plan an executive call together.\n- **Selin** hasn't closed yet this quarter, but Pera Otelcilik can close this month; a 30-minute negotiation rehearsal would help.\n- **Zeynep**'s Ekinoks pilot looks good; a PoC wrap-up can move it from best case to commit.\n- ${OPS.displayName} (sales ops) keeps CRM hygiene tight: no deals with past close dates.`,
    ),
    suggested: [
      pick(L, "Selin ile birebir görüşmeye hazırlan", "Prep my 1:1 with Selin"),
      pick(L, "Çeyrek tahmini hedefin neresinde?", "Where is the quarter forecast vs target?"),
      pick(L, "Riskli fırsatları listele", "List the deals at risk"),
    ],
  }
}

function trend({ L }) {
  const rows = MONTHLY_WON.map((v, i) => `| ${monthShort(L, i - 6)} | ${money(L, v)} |`).join("\n")
  const avg = MONTHLY_WON.reduce((a, b) => a + b, 0) / MONTHLY_WON.length
  return {
    steps: [{ tool: "erp_invoice_history", ms: 720 }],
    text: pick(
      L,
      `Son 6 ayda kapanan satışlar (aylık):\n\n| Ay | Kapanan satış |\n|---|---:|\n${rows}\n\nAylık ortalama **${moneyShort(L, avg)}**. Çeyrek sonu ayları belirgin şekilde yüksek — kapanışların son aya yığılması tahmin riskini artırıyor. Bu çeyrekte Pera Otelcilik ve Altay'ı ay ortasına çekebilirsek ritim dengelenir.`,
      `Closed-won sales over the last 6 months:\n\n| Month | Closed won |\n|---|---:|\n${rows}\n\nMonthly average **${moneyShort(L, avg)}**. Quarter-end months spike clearly — bunching closes into the last month raises forecast risk. Pulling Pera Otelcilik and Altay into mid-month this quarter would smooth the rhythm.`,
    ),
    suggested: [pick(L, "Pipeline özetini aşamalara göre göster", "Show the pipeline by stage")],
  }
}

function topDeals({ L }) {
  const rows = DEALS.map(
    (d) =>
      `| ${d.id} | ${d.account} — ${d.product} | ${money(L, d.value)} | ${T(L, STAGE_OF(d))} | ${first(OWNER_OF(d))} |`,
  ).join("\n")
  const won = WON_DEALS.map((d) => `${d.account} (${moneyShort(L, d.value)})`).join(", ")
  return {
    steps: [{ tool: "crm_list_opportunities" }],
    text: pick(
      L,
      `En büyük açık fırsatlar:\n\n| No | Fırsat | Tutar | Aşama | Sorumlu |\n|---|---|---:|---|---|\n${rows}\n\nBu çeyrek kazanılanlar: ${won}.`,
      `Largest open opportunities:\n\n| ID | Opportunity | Value | Stage | Owner |\n|---|---|---:|---|---|\n${rows}\n\nWon this quarter: ${won}.`,
    ),
    suggested: [
      pick(L, "Riskli fırsatları listele", "List the deals at risk"),
      pick(L, "Altay Perakende brifingi", "Brief me on Altay Perakende"),
    ],
  }
}

function focus({ L }) {
  return {
    steps: [{ tool: "crm_deal_risk_scan" }, { tool: "forecast_calculate", ms: 500 }],
    text: pick(
      L,
      `Bugün hedefe en çok etki edecek üç iş:\n\n1. **Altay Perakende iskontosu** — %18 talebini %14 + 3 yıl ile karşıla, onayı bugün ${MANAGER_NAME}'e gönder (${moneyShort(L, DEALS[0].value)}, commit'in en büyüğü).\n2. **Nordis Lojistik'i canlandır** — 16 gündür sessiz; Mert'le birlikte Hande Polat'a yönetici seviyesinde görüşme teklif et.\n3. **Pera Otelcilik'i bu ay kapat** — bütçe kayma riski var; erken imza için 3 ay ücretsiz destek önerisini Selin'le netleştir.\n\nBu üçü tamamlanırsa commit tahmini ${moneyShort(L, FORECAST_COMMIT)} korunur ve best case'e (${moneyShort(L, FORECAST_BEST)}) giden yol açılır.`,
      `The three things that move the number most today:\n\n1. **Altay Perakende discount** — counter the 18% ask with 14% + a 3-year term and send it to ${MANAGER_NAME} for approval today (${moneyShort(L, DEALS[0].value)}, the biggest commit deal).\n2. **Revive Nordis Lojistik** — quiet for 16 days; offer Hande Polat an executive call together with Mert.\n3. **Close Pera Otelcilik this month** — budget may slip; agree the 3-months-free-support offer with Selin.\n\nDone together, these protect the ${moneyShort(L, FORECAST_COMMIT)} commit and open the road to best case (${moneyShort(L, FORECAST_BEST)}).`,
    ),
    suggested: [
      pick(L, "Altay Perakende için iskonto onayı iste", "Request discount approval for Altay Perakende"),
      pick(L, "Nordis Lojistik'e takip e-postası yaz", "Draft a follow-up to Nordis Lojistik"),
    ],
  }
}

function repOneOnOne({ L, f }) {
  const r = REPS.find((x) => new RegExp(`\\b${fold(first(x.person))}\\b`).test(f)) ?? REPS[3]
  const deals = DEALS.filter((d) => d.owner === r.person.id)
  const lines = deals
    .map((d) => `- ${d.account} — ${moneyShort(L, d.value)}, ${T(L, STAGE_OF(d))}${d.risk ? ` · ⚠️ ${T(L, RISK_TEXT[d.risk])}` : ""}`)
    .join("\n")
  const att = pct(L, (r.won / r.target) * 100)
  return {
    steps: [{ tool: "crm_rep_performance" }, { tool: "crm_list_opportunities", ms: 480 }],
    text: pick(
      L,
      `**${r.person.displayName} ile birebir — hazırlık notu**\n\n- Hedef ${moneyShort(L, r.target)}, gerçekleşen ${moneyShort(L, r.won)} (${att}), kazanma oranı ${pct(L, r.winRate)}\n- Açık huni ${moneyShort(L, r.pipeline)}\n\n**Fırsatları**\n${lines || "- Açık büyük fırsat yok"}\n\n**Konuşma önerileri**\n1. Önce kazanımlar: son ayın en iyi hamlesi neydi?\n2. En büyük fırsatta karar vericiye erişim var mı, bir sonraki adım tarihli mi?\n3. Destek isteği: hangi toplantıya birlikte girelim?\n4. Gelişim: pazarlık ve değer anlatımı için önümüzdeki ay tek bir hedef.`,
      `**1:1 with ${r.person.displayName} — prep note**\n\n- Target ${moneyShort(L, r.target)}, actual ${moneyShort(L, r.won)} (${att}), win rate ${pct(L, r.winRate)}\n- Open pipeline ${moneyShort(L, r.pipeline)}\n\n**Deals**\n${lines || "- No large open deals"}\n\n**Talking points**\n1. Start with wins: what was the best move last month?\n2. On the biggest deal — do we reach the decision maker, is the next step dated?\n3. Support: which meeting should we attend together?\n4. Growth: one goal for negotiation and value selling next month.`,
    ),
    suggested: [pick(L, "Ekip performansını göster", "Show team performance")],
  }
}

/** Yöneticiye (Satış Direktörü) çeyrek tahmini notu — e-posta taslağı. */
function forecastNote(ctx) {
  const q = quarterInfo().label
  const build = (L, { formal, short }) => {
    const pctOf = (n) => pct(L, (n / TEAM_TARGET) * 100)
    const lines = pick(
      L,
      [
        `Kapanan: ${moneyShort(L, WON_QTD)} (${pctOf(WON_QTD)})`,
        `Commit: ${moneyShort(L, FORECAST_COMMIT)} (${pctOf(FORECAST_COMMIT)}) · Best case: ${moneyShort(L, FORECAST_BEST)} (${pctOf(FORECAST_BEST)})`,
        `Riskler: Altay iskontosu (onayına gelecek), Nordis'te sessizlik, Pera'da bütçe kayması`,
      ],
      [
        `Closed won: ${moneyShort(L, WON_QTD)} (${pctOf(WON_QTD)})`,
        `Commit: ${moneyShort(L, FORECAST_COMMIT)} (${pctOf(FORECAST_COMMIT)}) · Best case: ${moneyShort(L, FORECAST_BEST)} (${pctOf(FORECAST_BEST)})`,
        `Risks: Altay discount (coming to you for approval), Nordis gone quiet, Pera budget slip`,
      ],
    )
    const first = MANAGER_NAME.split(" ")[0]
    const salute = pick(L, formal ? `Sayın ${MANAGER_NAME},` : `Merhaba ${first},`, formal ? `Dear ${first},` : `Hi ${first},`)
    const intro = pick(L, `${q} tahmininin kısa özeti:`, `A quick summary of the ${q} forecast:`)
    const close = pick(
      L,
      "Bu hafta Altay ve Pera'yı kapatmaya odaklanıyoruz; perşembe gözden geçirmesinde güncel rakamları paylaşırım.",
      "This week we're focused on closing Altay and Pera; I'll share updated numbers at Thursday's review.",
    )
    const bullets = (short ? lines.slice(0, 2) : lines).map((l) => `- ${l}`).join("\n")
    return {
      to: `${MANAGER_NAME} <${MANAGER.mail}>`,
      subject: pick(L, `${q} satış tahmini — haftalık durum`, `${q} sales forecast — weekly update`),
      body: `${salute}\n\n${intro}\n\n${bullets}\n\n${close}`,
    }
  }
  return draftPlan(ctx, build, [{ tool: "forecast_calculate", ms: 620 }])
}

const re = (...ps) => (ctx) => ps.some((p) => p.test(ctx.f))

export const SALES = {
  intents: [
    ...ACCOUNT_INTENTS,
    { id: "oneonone", match: re(/birebir|1:1|one-on-one|1on1|kocluk|coaching/), run: repOneOnOne },
    {
      id: "forecastNote",
      match: (ctx) => /yonetici|manager/.test(ctx.f) && /tahmin|forecast|not\b|note|durum/.test(ctx.f),
      run: forecastNote,
    },
    { id: "focus", match: re(/odaklan|oncelik|focus|priorit|bugun ne yapmali|what should i do/), run: focus },
    { id: "risk", match: re(/risk|kayma|kayabilir|slip|tehlike|at risk|stuck|takil|sessiz/), run: risks },
    { id: "team", match: re(/ekip|temsilci|team|reps?\b|performans|performance|leaderboard|siralama/), run: team },
    { id: "trend", match: re(/trend|aylik|monthly|son 6 ay|last 6 months|son alti ay/), run: trend },
    { id: "forecast", match: re(/tahmin|forecast|hedef|target|kota|quota|commit|best case|ceyrek|quarter|kapanis/), run: forecast },
    { id: "pipeline", match: re(/pipeline|huni|asama|stage|funnel/), run: pipeline },
    { id: "deals", match: re(/firsat|deal|opportunit|en buyuk|biggest|top \d|largest/), run: topDeals },
  ],
  onAction: salesOnAction,
  followUp: (ctx) => (accountIn(ctx.f) ? ACCOUNT_INTENTS.at(-1).run(ctx) : null),
}
