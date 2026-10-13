import { getDateTimeFormat, pluralKey } from "@/lib/intl-cache"
import { countText, number } from "../kinds"

const SHORT = { day: "numeric", month: "short" }

/** "12–16 Eki" (yılsız, kısa); tek günse tek tarih. */
export function shortRange(start, end, locale) {
  if (!start) return "—"
  const fmt = getDateTimeFormat(locale, SHORT)
  if (!end || end.getTime() === start.getTime()) return fmt.format(start)
  return typeof fmt.formatRange === "function"
    ? fmt.formatRange(start, end)
    : `${fmt.format(start)} – ${fmt.format(end)}`
}

/** "12 Eki" */
export const shortDay = (date, locale) =>
  date ? getDateTimeFormat(locale, SHORT).format(date) : ""

/** İzin süresi: gün ("5 gün"), gün yoksa saat ("2 saat"); ikisi de yoksa "". */
export function leaveAmount(record, t, locale) {
  if (record?.days) return countText(t, locale, "selfService.days", record.days)
  if (record?.hours) return t("selfService.hours", { n: number(record.hours, locale) })
  return ""
}

/**
 * İznin adı: bana bağlıda türü ("Yıllık İzin"), yöneticide ve ekip arkadaşında türsüz "İzinde"
 * (kayıt `neutral` — tür veri katmanında düştü).
 */
export const leaveLabel = (record, t) =>
  record?.neutral ? t("selfService.team.away") : record?.typeName || record?.type || ""

/** "Yıllık İzin · 12–16 Eki · 5 gün" (ekip arkadaşında "İzinde · …") — çizelge ipucu ve okunur metin. */
export function leaveLine(record, t, locale) {
  return [
    leaveLabel(record, t) || t("selfService.leave.untitled"),
    shortRange(record.start, record.end, locale),
    leaveAmount(record, t, locale),
  ]
    .filter(Boolean)
    .join(" · ")
}

/** Kişi bölmesinin başlığı ilişkiye göre: "Ekip üyesi" (bana bağlı) · "Yöneticim" · "Ekip arkadaşım". */
export function relationTitle(relation, t) {
  if (relation === "manager") return t("selfService.team.managerTag")
  if (relation === "peer") return t("selfService.team.pane.peer")
  return t("selfService.team.pane.title")
}

/**
 * Ekibin bileşimine göre seçim (metin anahtarı ya da soru sekmesi): yalnız bana bağlılar
 * (bugünkü), yalnız yönetici ve ekip arkadaşları ya da ikisi. `counts` = `{ reports, teammates }`;
 * seçenekler `[bağlılar, arkadaşlar, karışık]`.
 */
export function byComposition(counts, [reports, teammates, mixed]) {
  if (!counts?.teammates) return reports
  return counts.reports ? mixed : teammates
}

/**
 * Üyenin şu anki durumu: "Bugün izinde · son gün 16 Eki" / "Sıradaki izin 3 Kas"; `null` =
 * bilinmiyor ya da planlı izin yok. `tone`: "away" (izinde) · "next".
 */
export function statusLine(status, t, locale) {
  if (status?.current) {
    const until = status.until
    const sameDay = until && until.getTime() === status.current.start?.getTime()
    return {
      tone: "away",
      text:
        sameDay || !until
          ? t("selfService.team.status.today")
          : t("selfService.team.status.onLeave", { date: shortDay(until, locale) }),
    }
  }
  if (status?.next)
    return {
      tone: "next",
      text: t("selfService.team.status.next", { date: shortDay(status.next.start, locale) }),
    }
  return null
}

/** Kalan / hak ("9 / 26 gün"); bakiye yoksa "". */
export function balanceText(balance, t, locale) {
  if (balance?.remain == null) return ""
  return t("selfService.team.balance", {
    remain: number(balance.remain, locale),
    claim: number(balance.claim ?? 0, locale),
  })
}

/** Kişi sayısı ("1 kişi" · "1 person" · "شخصان" · "5 чел."): dilin çoğul kuralıyla (`pluralKey`). */
export function peopleText(n, t, locale) {
  return t(pluralKey("selfService.team.people", locale, n), { n: number(n, locale) })
}

/** "Bugün" · "Yarın" · "21 gün sonra" (dilin çoğul kuralıyla). */
export function inDaysText(n, t, locale) {
  if (n <= 0) return t("selfService.team.soon.today")
  if (n === 1) return t("selfService.team.soon.tomorrow")
  return t(pluralKey("selfService.team.soon.inDays", locale, n), { n: number(n, locale) })
}

/** Doğum günü ya da iş yıl dönümünün adı: "Doğum günü" · "İş yıldönümü · 5. yıl". */
export function occasionLabel(o, t, locale) {
  if (o.kind === "birthday") return t("selfService.team.soon.birthday")
  const years = t("selfService.team.soon.years", { n: number(o.years, locale) })
  return `${t("selfService.team.soon.anniversary")} · ${years}`
}

/** Çizelge ipucu ve okunur metin: "Doğum günü · 12 Kas" · "İş yıldönümü · 5. yıl · 3 Kas". */
export const occasionLine = (o, t, locale) =>
  `${occasionLabel(o, t, locale)} · ${shortDay(o.date, locale)}`
