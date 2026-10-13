// Demo sohbet motoru — `@microsoft/agents-copilotstudio-client`in yerine geçer
// (bkz. src/lib/copilot.js › loadSdk). Ağa HİÇ çıkmaz: cevaplar `agents/` altındaki
// senaryolardan, kişiye özel veriler (takvim, posta, görev, İK) demo uçlarından.
//
// Arayüz gerçek SDK'nın kullanılan yüzü kadardır: `ConnectionSettings`,
// `CopilotStudioClient` (`conversationId`, `startConversationStreaming`,
// `sendActivityStreaming`). Aktiviteler Bot Framework biçiminde döner; böylece
// `activityToChunk`, araç izi, akan metin, öneri düğmeleri, kartlar ve belgeler
// gerçek ajandaki yolun aynısından geçer.
import { WARM_START } from "@/lib/warmStartPolicy"
import { respond, greet, agentKeyOf } from "./respond"
import { nextId, playTurn } from "./stream"
import { between, detectLang, sleep, uiLang } from "./util"

export class ConnectionSettings {
  constructor(opts = {}) {
    Object.assign(this, opts)
  }
}

/**
 * Konuşma durumu bellekte, kimliğe göre — `resumeConversation` yeni bir istemciye
 * yalnız kimliği verdiği için istemcide değil burada durur. Sayfa yenilenince
 * gider; o hâlde konuşma yine çalışır, yalnız "az önce ne konuştuk" bağlamı
 * (son konu, son müşteri, bekleyen onay) boş başlar.
 */
const conversations = new Map()

function conversationFor(id, agent) {
  let c = conversations.get(id)
  if (!c) {
    c = { id, agent, turns: 0, topic: null, account: null, pending: null, lang: null }
    conversations.set(id, c)
  }
  return c
}

export class CopilotStudioClient {
  constructor(settings) {
    this.settings = settings ?? {}
    // Gerçek SDK'da da düz bir alan; `resumeConversation` dışarıdan yazar.
    this.conversationId = ""
  }

  get agent() {
    return agentKeyOf(this.settings.schemaName)
  }

  async *startConversationStreaming() {
    this.conversationId = nextId(`demo-${this.agent}`)
    conversationFor(this.conversationId, this.agent)
    await sleep(between(180, 320))
    yield* playTurn(greet(this.agent, uiLang()), this.conversationId, { quick: true })
  }

  async *sendActivityStreaming(activity) {
    if (!this.conversationId) this.conversationId = nextId(`demo-${this.agent}`)
    const conv = conversationFor(this.conversationId, this.agent)
    conv.turns += 1
    const text = String(activity?.text ?? "")
    // Isıtma turu (bkz. warmStartPolicy): cevabı kimse görmüyor, bekletmeyelim.
    const quick = text.trim() === WARM_START.warmPrompt
    if (!quick) await sleep(between(220, 420))
    // Kart düğmesi metin taşımaz: dil konuşmanın son dilinden.
    const L = activity?.value != null && !text ? (conv.lang ?? uiLang()) : detectLang(text)
    conv.lang = L
    let plan
    try {
      plan = await respond({
        agent: this.agent,
        text,
        value: activity?.value ?? null,
        attachments: activity?.attachments ?? [],
        L,
        conv,
      })
    } catch (err) {
      // Senaryo hatası sohbeti düşürmesin; geliştirirken konsolda görünür.
      console.error("[demo copilot] senaryo hatası:", err)
      plan = {
        text:
          L === "tr"
            ? "Bunu şu an hazırlayamadım. Biraz farklı sorabilir misin?"
            : "I couldn't put that together just now. Could you rephrase it?",
      }
    }
    yield* playTurn(plan, this.conversationId, { quick })
  }
}
