// Bir cevap planını Bot Framework aktivitelerine çevirir — gerçek Copilot Studio
// akışının sırasıyla: "yazıyor" → araç olayları (başladı / bitti) → biriken metinle
// akış parçaları (`streaminfo` streaming) → tek nihai `message`.
//
// SDK akış parçalarında METNİ BİRİKTİRİP verir (her `typing` o ana kadarki tüm
// metni taşır); burada da öyle, çünkü `copilot.js` SDK'nın çıktısını bekliyor.
import { between, sleep } from "./util"

let seq = 0
const nextId = (prefix) => `${prefix}-${Date.now().toString(36)}-${(++seq).toString(36)}`

/** Saat biçimli süre: `00:00:00.612` — `toolDurationSeconds` bu şekli tanıyor. */
function clock(ms) {
  const s = (ms / 1000).toFixed(3).padStart(6, "0")
  return `00:00:${s}`
}

function toolEvent(conv, tool, planId, state, ms, observation) {
  const finished = state === "completed"
  return {
    type: "event",
    name: finished ? "DynamicPlanStepFinished" : "DynamicPlanStepTriggered",
    conversation: conv,
    value: {
      taskDialogId: `MCP:${tool.server ?? "vega"}:${tool.tool}`,
      planIdentifier: planId,
      state,
      ...(finished ? { executionTime: clock(ms) } : {}),
      ...(observation ? { observation } : {}),
    },
  }
}

/**
 * Metni ~28 parçaya böler, kelime sınırından. Daha çok parça her seferinde
 * markdown'ın yeniden ayrıştırılması demek; daha azı akışı kesik gösteriyor.
 */
function chunks(text) {
  const size = Math.max(14, Math.ceil(text.length / 28))
  const out = []
  let i = 0
  while (i < text.length) {
    let j = Math.min(text.length, i + size)
    if (j < text.length) {
      const space = text.indexOf(" ", j)
      const nl = text.indexOf("\n", j)
      const cut = [space, nl].filter((x) => x >= 0 && x - j < 24)
      if (cut.length) j = Math.min(...cut) + 1
    }
    out.push(text.slice(i, j))
    i = j
  }
  return out
}

const suggested = (list) =>
  (list ?? []).map((s) =>
    typeof s === "string"
      ? { type: "imBack", title: s, value: s }
      : { type: "imBack", title: s.title, value: s.value ?? s.title },
  )

/**
 * Plan: `{ steps?, text, suggested?, attachments?, document? }`
 *   steps     `[{ tool, ms?, server? }]` — araç izi
 *   document  `{ tool, name, html }` — araç gözleminden gelen belge (botFiles)
 */
export async function* playTurn(plan, conversationId, { quick = false } = {}) {
  const conv = { id: conversationId }
  const steps = plan.steps ?? []
  for (const [i, step] of steps.entries()) {
    const planId = nextId("plan")
    const ms = step.ms ?? between(380, 820)
    yield toolEvent(conv, step, planId, "inProgress")
    await sleep(quick ? 40 : ms)
    const last = i === steps.length - 1
    const doc = last && plan.document ? documentObservation(plan.document) : null
    yield toolEvent(conv, step, planId, "completed", ms, doc)
  }

  const text = plan.text ?? ""
  const streamId = nextId("stream")
  if (text && !quick) {
    let acc = ""
    let n = 0
    for (const part of chunks(text)) {
      acc += part
      n += 1
      yield {
        type: "typing",
        text: acc,
        conversation: conv,
        entities: [{ type: "streaminfo", streamType: "streaming", streamId, streamSequence: n }],
      }
      await sleep(between(22, 48))
    }
  }

  const actions = suggested(plan.suggested)
  yield {
    type: "message",
    text,
    conversation: conv,
    attachments: plan.attachments ?? [],
    ...(actions.length ? { suggestedActions: { actions } } : {}),
    entities: [{ type: "streaminfo", streamType: "final", streamId }],
  }
}

/**
 * Araç gözlemi, gerçek HR aracının biçiminde: belge `---HTML BAŞI---` ve
 * `---HTML SONU---` arasında, adı ters tırnak içinde (bkz. lib/botFiles.js).
 */
function documentObservation(doc) {
  return {
    content: [
      {
        type: "text",
        text: `Belge hazır: \`${doc.name}\`\n---HTML BAŞI---\n${doc.html}\n---HTML SONU---`,
      },
    ],
  }
}

/** Kullanıcı mesajı gelir gelmez: metinsiz "yazıyor" — ajan isteği aldı. */
export function typingPing(conversationId) {
  return { type: "typing", conversation: { id: conversationId } }
}

export { nextId }
