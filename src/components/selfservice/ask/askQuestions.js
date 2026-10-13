import { upcomingLeave } from "@/lib/selfServiceAlerts"
import { statusKind } from "@/lib/selfServiceStatus"

/**
 * "TYRO'ya sor" kutusunun hazır soruları — sekmeye göre üçer (metin
 * `selfService.askBox.q.<id>`, dört dilde). KURAL: yalnız sayfanın CEVAPLAYAMADIĞI soru —
 * kural, nasıl yapılır, işlem ve İK/ERP iş akışında kalan neden. Bakiye, tarih, durum, toplam
 * gibi sayfada görünenler sorulmaz. Ekibim'de sekme ekibin bileşimine göre: `team` (yalnız
 * bana bağlılar), `teammates` (yalnız yönetici ve ekip arkadaşları), `mixed` (ikisi); ekipten
 * kimsenin bakiyesi ya da izin türü sorulmaz (docs/features/self-servis-ekibim.md).
 */
export const ASK_QUESTIONS = {
  leave: ["halfDay", "carryOver", "excuse"],
  expense: ["lostReceipt", "payment", "currency"],
  advance: ["settle", "refund", "deadline"],
  team: ["approve", "overlap", "delegate"],
  teammates: ["overlap", "approver", "handover"],
  mixed: ["approve", "overlap", "delegate"],
}

const kindOf = (r) => r.statusKind ?? statusKind(r.status)
const latest = (list) =>
  [...(list ?? [])].sort((a, b) => (b.date ?? 0) - (a.date ?? 0))[0]?.number ?? null

/**
 * Kayda bağlı ipuçları: `leave` — yaklaşan ya da onaydaki izin var; `expense`/`advance` —
 * düzeltme istenen en yeni kaydın numarası (yoksa null).
 */
export function askFacts(data, now = new Date()) {
  const returned = (list) => latest((list ?? []).filter((r) => kindOf(r) === "returned"))
  return {
    leave:
      Boolean(upcomingLeave(data?.leaves, now)) ||
      (data?.leaves ?? []).some((r) => kindOf(r) === "pending"),
    expense: returned(data?.expenses),
    advance: returned(data?.advances),
  }
}

/**
 * Sekmenin hazır soruları `[{ id, text }]` (bilinmeyen sekmede boş). Kayda bağlı soru
 * (`facts`) varsa başa girer, en genel olan (sondaki) düşer: hep üç soru.
 */
export function askQuestions(tab, t, facts = null) {
  const ids = ASK_QUESTIONS[tab]
  if (!ids) return []
  const list = ids.map((id) => ({ id, text: t(`selfService.askBox.q.${id}`) }))
  const fact = facts?.[tab]
  if (!fact) return list
  const first =
    tab === "leave"
      ? { id: "cancelLeave", text: t("selfService.askBox.q.cancelLeave") }
      : { id: "returned", text: t("selfService.askBox.q.returned", { number: fact }) }
  return [first, ...list.slice(0, 2)]
}
