// Gelen mesajı ilgili asistanın senaryosuna yönlendirir.
//
// Sıra: kart düğmesi → kısa sohbet (selam, teşekkür, "neler yapabilirsin") →
// asistanın kendi senaryoları → ortak yazı işleri (çeviri, ek dosya) → BAŞKA bir
// asistanın senaryosu (cevap + "şu asistan daha uygun" notu) → yardımcı bir yedek.
// Demo'da hiçbir soru boş dönmez: en kötü ihtimalle ne yapılabileceğini anlatır.
import { promptKeyForAgent } from "@/data/prompts"
import { COMMON, capabilities, fallback, attachmentReply } from "./agents/common"
import { OFFICE } from "./agents/office"
import { SALES } from "./agents/sales"
import { HR } from "./agents/hr"
import { fold, pick } from "./util"

const AGENTS = { office: OFFICE, sales: SALES, hr: HR }
const AGENT_LABEL = { office: "TYRO Office", sales: "TYRO Sales", hr: "TYRO HR" }

/** Şema adı (`tyro_sales`) → senaryo anahtarı. Bilinmeyen ad genel asistana düşer. */
export function agentKeyOf(schemaName) {
  const key = promptKeyForAgent(String(schemaName ?? "").replace(/[_-]+/g, " "))
  return AGENTS[key] ? key : "general"
}

/**
 * Selamlama YOK, bilerek: içerikli bir selamlama sohbeti karşılama ekranından
 * (küre + hazır öneri çipleri) doğrudan döküm görünümüne atlatıyor; demoda o
 * ekran asistanın ne yapabildiğini en iyi anlatan yüzey.
 */
export function greet() {
  return { text: "" }
}

function firstMatch(intents, ctx) {
  return intents.find((it) => it.match(ctx)) ?? null
}

export async function respond({ agent, text, value, attachments, L, conv }) {
  const ctx = { agent, text, f: fold(text), L, conv, value, attachments }
  const own = AGENTS[agent]

  // 1. Kart düğmesi: hangi asistanın kartıysa o karşılar.
  if (value && typeof value === "object") {
    for (const a of [own, ...Object.values(AGENTS)].filter(Boolean)) {
      const plan = await a.onAction?.(ctx)
      if (plan) return plan
    }
  }

  // 2. Kısa sohbet.
  const meta = firstMatch(COMMON.meta, ctx)
  if (meta) return meta.run(ctx)
  if (/neler yapabilir|ne yapabilir|hangi arac|what can you do|which tools|how can you help|yardim eder misin|^yardim$|^help$/.test(ctx.f))
    return capabilities(agent, L)

  // 3. Asistanın kendi senaryoları.
  const hit = own ? firstMatch(own.intents, ctx) : null
  if (hit) return remember(conv, hit, await hit.run(ctx))

  // 4. Ek dosya, çeviri, yazı.
  if (attachments?.length) return attachmentReply(ctx)
  const writing = firstMatch(COMMON.writing, ctx)
  if (writing) return writing.run(ctx)

  // 5. Başka bir asistanın alanı: cevabı ver, doğru asistanı söyle.
  for (const [key, a] of Object.entries(AGENTS)) {
    if (key === agent) continue
    const other = firstMatch(a.intents, ctx)
    if (!other) continue
    const plan = await other.run(ctx)
    const hint = pick(
      L,
      `\n\n> 💡 Bu tür sorular **${AGENT_LABEL[key]}**'in alanı — sohbetin üstündeki asistan seçiciden ona geçebilirsin.`,
      `\n\n> 💡 Questions like this are **${AGENT_LABEL[key]}**'s specialty — switch to it from the assistant picker above the chat.`,
    )
    return { ...plan, text: `${plan.text}${hint}` }
  }

  // 6. Konuşmanın son konusu: "peki ya Mert?" gibi kısa devam soruları.
  const follow = own?.followUp?.(ctx)
  if (follow) return follow

  return fallback(agent, ctx)
}

function remember(conv, intent, plan) {
  conv.topic = intent.id
  return plan
}
