import { getNumberFormat } from "@/lib/intl-cache"
import { day, money, number } from "../kinds"

/** Ek alanın görünen değeri (`selfServiceFields` › `extrasOf` öğesi). */
export function extraText(item, t, locale) {
  switch (item.kind) {
    case "enum":
      return item.i18n ? t(item.i18n) : String(item.value)
    case "bool":
      return t(item.value ? "selfService.value.yes" : "selfService.value.no")
    case "date":
      return day(item.value, locale)
    case "money":
      return money(item.value, item.currency || "TRY", locale)
    case "number":
      return item.key === "exchangeRate"
        ? getNumberFormat(locale, { maximumFractionDigits: 6 }).format(item.value)
        : number(item.value, locale)
    default:
      return String(item.value)
  }
}
