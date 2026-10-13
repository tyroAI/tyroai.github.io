import { getDateTimeFormat } from "@/lib/intl-cache"
import { setPendingAsk, requestOpenChat } from "@/lib/chatBus"
import { OPTS_DAY_FULL, OPTS_TIME } from "./cardFormats"

export function duration(event, t) {
  if (event.isAllDay) return t("calendar.allDay")
  const minutes = Math.round((event.end - event.start) / 60000)
  if (minutes < 60) return t("calendar.durationMinutes", { minutes })
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!rest) return t("calendar.durationHours", { hours })
  return t("calendar.durationHoursMinutes", { hours, minutes: rest })
}

/** Canlı ya da 15 dakika içinde — `CalendarEventRow`un eşiğinin aynısı. */
export function isImminent(event, now) {
  return event.start.getTime() - now <= 15 * 60000 && event.end.getTime() > now
}

/* ─── Sıradaki toplantın ────────────────────────────────────────────── */

/** Kartın gezdiği pencere: bugün + önümüzdeki altı gün. Yedinci gün alınmaz —
 *  bugünle aynı hafta gününe düşer ve "Pazartesi" iki ayrı günü anlatırdı. */
export const HORIZON_DAYS = 7
/** Yan yana kaç yüz; artanı "+N". Çentiğin satırı beş çiziyor ama o satır
 *  21rem, bu kartın içi ~160px. */
export const MAX_FACES = 3

export function prepareMeeting(event, t, locale) {
  const timeFmt = getDateTimeFormat(locale, OPTS_TIME)
  // `CalendarEventRow`in AYNI istemi ve AYNI asistanı — bir toplantı hangi
  // yüzeyden hazırlanırsa hazırlansın ajan aynı soruyu görür.
  setPendingAsk({
    question: t("calendar.preparePrompt", {
      title: event.subject || t("calendar.noSubject"),
      date: getDateTimeFormat(locale, OPTS_DAY_FULL).format(event.start),
      time: `${timeFmt.format(event.start)} - ${timeFmt.format(event.end)}`,
      organizer: event.organizer || "—",
    }),
    agent: "tyro office",
  })
  requestOpenChat({ focusComposer: true })
}
