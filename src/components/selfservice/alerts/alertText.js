import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import Beach02Icon from "@hugeicons/core-free-icons/Beach02Icon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import Invoice03Icon from "@hugeicons/core-free-icons/Invoice03Icon"
import MoneyReceive01Icon from "@hugeicons/core-free-icons/MoneyReceive01Icon"
import { number } from "../kinds"

/**
 * Uyarının görünüşü: ikon ve ton. `warning` iş bekleyen (düzeltme, gönderme, kapatma),
 * `info` hatırlatma (sıradaki izin, yıl sonu) — renkler sayfanın durum dilinden.
 */
export const ALERT_LOOK = {
  returned: { icon: Alert02Icon, tone: "warning" },
  unsubmitted: { icon: Invoice03Icon, tone: "warning" },
  unsettledAdvance: { icon: MoneyReceive01Icon, tone: "warning" },
  nextLeave: { icon: Beach02Icon, tone: "info" },
  yearEnd: { icon: Calendar03Icon, tone: "info" },
}

/** Sohbete giden işi olan uyarılar (cümlede kayıt numaraları). */
export const ASKABLE = new Set(["returned", "unsubmitted", "unsettledAdvance"])

/**
 * Uyarının cümlesi. t() çoğul ayırmıyor: sayılı cümlenin tekili ayrı anahtarda (`.one`);
 * sıradaki izinde `.one` "yarın".
 */
export function alertSentence(alert, t, locale) {
  if (alert.id === "yearEnd")
    return t("selfService.alert.yearEnd", { n: number(alert.remain, locale) })
  const n = alert.id === "nextLeave" ? alert.inDays : alert.count
  return t(`selfService.alert.${alert.id}.${n === 1 ? "one" : "other"}`, { n: number(n, locale) })
}

/** İK asistanına giden soru: uyarının kayıt numaralarıyla ("HRMS-062410 numaralı …"). */
export function alertQuestion(alert, t) {
  const list = (alert.numbers ?? []).filter(Boolean)
  return t(`selfService.alert.ask.${alert.id}.${list.length === 1 ? "one" : "other"}`, {
    numbers: list.join(", "),
  })
}
