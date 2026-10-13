import { getNumberFormat } from "@/lib/intl-cache"
import { tenureOf } from "@/lib/selfServiceProfile"

/**
 * Hizmet süresi metni: bir yıldan kısaysa ay ("4 ay"), değilse bir ondalıklı yıl ("1,8 yıl" ·
 * "1.8 yrs"). Bilinmeyen ya da gelecekteki tarihte null.
 */
export function tenureText(hireDate, t, locale, now = new Date()) {
  const tenure = tenureOf(hireDate, now)
  if (!tenure) return null
  if (tenure.years < 1) return t("selfService.profile.months", { n: Math.max(1, tenure.months) })
  const n = getNumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    tenure.years,
  )
  return t("selfService.profile.years", { n })
}
