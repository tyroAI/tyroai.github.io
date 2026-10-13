import { getDateTimeFormat } from "@/lib/intl-cache"

const TIME = { hour: "2-digit", minute: "2-digit" }
const DAY_TIME = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }

/** Son okumanın saati ("14:32"; bugün değilse "11 Eki 14:32") — dönem çubuğu ve Ekibim. */
export function updatedText(at, locale) {
  if (!at) return ""
  const d = new Date(at)
  const today = new Date()
  const same = d.toDateString() === today.toDateString()
  return getDateTimeFormat(locale, same ? TIME : DAY_TIME).format(d)
}
