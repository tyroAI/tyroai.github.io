// Work IQ (ve benzeri) MCP bağlantı onay kartları.
// Bot izin isterken içinde "Allow" / "Cancel" Action.Submit'leri olan bir Adaptive Card
// gönderir; kartlar SIRAYLA gelir. Sohbet bunları tek bir özet onay kutusunda toplar.

// Kart ağacındaki tüm Action.Submit'ler (ActionSet, sütunlar, iç içe öğeler).
export function extractSubmitActions(items) {
  if (!Array.isArray(items)) return []
  const actions = []
  for (const item of items) {
    if (item.type === "ActionSet" && item.actions)
      actions.push(...item.actions.filter((a) => a.type === "Action.Submit"))
    if (item.body) actions.push(...extractSubmitActions(item.body))
    if (item.columns)
      for (const col of item.columns) actions.push(...extractSubmitActions(col.items || []))
    if (item.items) actions.push(...extractSubmitActions(item.items))
  }
  return actions
}

// attachments içinde bir consent adaptive-card varsa content'ini döndürür.
export function findConsentCard(attachments) {
  for (const a of attachments || []) {
    if (a?.contentType !== "application/vnd.microsoft.card.adaptive") continue
    const actions = extractSubmitActions(a.content?.body || [])
    if (actions.some((x) => x?.data?.action === "Allow" || x?.data?.actionSubmitId === "Allow")) {
      return a.content
    }
  }
  return null
}

// Karttaki "Allow" / "Cancel" Action.Submit'inin data payload'unu döndürür
// (bota bu value ile message atınca butona basılmış gibi olur).
export function consentActionData(cardContent, which) {
  const actions = extractSubmitActions(cardContent?.body || [])
  const a = actions.find((x) => x?.data?.action === which || x?.data?.actionSubmitId === which)
  return a?.data ?? {}
}

// Kart gövdesinden okunur bir bağlantı adı çıkarır ("Work IQ Mail MCP" gibi
// koyu başlık; yoksa "- Work IQ … (Preview)" satırı).
export function consentName(cardContent) {
  const texts = []
  const walk = (items) => {
    for (const it of items || []) {
      if (it?.type === "TextBlock" && it.text) texts.push(String(it.text).trim())
      if (it?.body) walk(it.body)
      if (it?.columns) for (const c of it.columns) walk(c.items || [])
      if (it?.items) walk(it.items)
    }
  }
  walk(cardContent?.body || [])
  const mcp = texts.find((x) => /MCP\b/i.test(x))
  const line = texts.find((x) => /^-\s/.test(x))
  return mcp || (line ? line.replace(/^-\s*/, "").trim() : "Work IQ bağlantısı")
}
