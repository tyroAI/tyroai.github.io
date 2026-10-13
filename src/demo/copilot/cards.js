// Asistanın gönderdiği Adaptive Card'lar. Düğmeler `Action.Submit` ve verileri
// `action` alanı taşır; tıklanınca `sendAction` aynı veriyle geri gelir ve
// `respond.js` onu ilgili senaryoya yönlendirir.
//
// ⚠️ "icon:" şemalı ikon YOK: AdaptiveCardView onları dış bir CDN adresine
// çeviriyor, demo ise hiçbir dış kaynağa gitmemeli.
// ⚠️ Selamlamaya kart konmaz: ChatScreen selamlamadaki ilk Submit'e kendisi basar.
import { pick } from "./util"

const CARD = "application/vnd.microsoft.card.adaptive"

const card = (body) => ({
  contentType: CARD,
  content: { type: "AdaptiveCard", $schema: "http://adaptivecards.io/schemas/adaptive-card.json", version: "1.5", body },
})

const title = (text, sub) => [
  { type: "TextBlock", text, weight: "Bolder", size: "Medium", wrap: true },
  ...(sub ? [{ type: "TextBlock", text: sub, isSubtle: true, wrap: true, spacing: "None" }] : []),
]

const facts = (pairs) => ({
  type: "FactSet",
  facts: pairs.map(([t, v]) => ({ title: t, value: v })),
})

const actions = (list) => ({
  type: "ActionSet",
  actions: list.map((a) => ({
    type: "Action.Submit",
    title: a.title,
    ...(a.positive ? { style: "positive" } : {}),
    data: a.data,
  })),
})

/** İskonto onay talebi. */
export function discountCard(L, { deal, account, listPrice, options, approver, marginNow }) {
  return card([
    ...title(pick(L, "İskonto onay talebi", "Discount approval request"), `${deal} · ${account}`),
    facts([
      [pick(L, "Liste fiyatı", "List price"), listPrice],
      [pick(L, "Mevcut teklif", "Current offer"), marginNow],
      [pick(L, "Onaylayacak", "Approver"), approver],
    ]),
    {
      type: "Input.ChoiceSet",
      id: "discount",
      label: pick(L, "Talep edilecek iskonto", "Discount to request"),
      style: "expanded",
      value: options[0].value,
      choices: options.map((o) => ({ title: o.title, value: o.value })),
    },
    {
      type: "Input.Text",
      id: "note",
      label: pick(L, "Onaylayana not", "Note to approver"),
      placeholder: pick(L, "İsteğe bağlı", "Optional"),
      isMultiline: true,
    },
    actions([
      {
        title: pick(L, "Onaya gönder", "Send for approval"),
        positive: true,
        data: { action: "discountApproval", deal },
      },
      { title: pick(L, "Vazgeç", "Cancel"), data: { action: "cancel", topic: "discount" } },
    ]),
  ])
}

/** İzin talebi onayı — talep kartta kontrol edilip tek tıkla gönderilir. */
export function leaveConfirmCard(L, req) {
  return card([
    ...title(pick(L, "İzin talebini kontrol et", "Check your leave request"), req.kindLabel),
    facts([
      [pick(L, "Başlangıç", "Start"), req.startLabel],
      [pick(L, "Bitiş", "End"), req.endLabel],
      [pick(L, "Süre", "Duration"), req.daysLabel],
      [pick(L, "Kalan bakiye (sonra)", "Balance after"), req.balanceLabel],
      [pick(L, "Onaylayacak", "Approver"), req.approver],
    ]),
    {
      type: "Input.Text",
      id: "note",
      label: pick(L, "Açıklama", "Note"),
      placeholder: pick(L, "İsteğe bağlı", "Optional"),
    },
    actions([
      {
        title: pick(L, "Talebi gönder", "Submit request"),
        positive: true,
        data: { action: "submitLeave", req: req.payload },
      },
      { title: pick(L, "Vazgeç", "Cancel"), data: { action: "cancel", topic: "leave" } },
    ]),
  ])
}

/** Masraf kaydı onayı. */
export function expenseConfirmCard(L, exp) {
  return card([
    ...title(pick(L, "Masraf kaydını kontrol et", "Check your expense"), exp.category),
    facts([
      [pick(L, "Tarih", "Date"), exp.dateLabel],
      [pick(L, "Tutar", "Amount"), exp.amountLabel],
      [pick(L, "Fiş", "Receipt"), exp.receiptLabel],
      [pick(L, "Politika kontrolü", "Policy check"), exp.policyLabel],
    ]),
    actions([
      {
        title: pick(L, "Masrafı kaydet", "Save expense"),
        positive: true,
        data: { action: "submitExpense", exp: exp.payload },
      },
      { title: pick(L, "Vazgeç", "Cancel"), data: { action: "cancel", topic: "expense" } },
    ]),
  ])
}
