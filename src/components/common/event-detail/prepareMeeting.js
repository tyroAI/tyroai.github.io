import { requestOpenChat, setPendingAsk } from "@/lib/chatBus"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { OPTS_DAY_FULL, OPTS_TIME } from "./eventFormat"

/** Toplantıya asistanla hazırlan: soruyu sohbete bırakır ve sohbeti açar. */
export function prepareMeeting(event, t, locale) {
  const time = getDateTimeFormat(locale, OPTS_TIME)
  setPendingAsk({
    question: t("calendar.preparePrompt", {
      title: event.subject || t("calendar.noSubject"),
      date: getDateTimeFormat(locale, OPTS_DAY_FULL).format(event.start),
      time: event.isAllDay
        ? t("calendar.allDay")
        : `${time.format(event.start)} - ${time.format(event.end)}`,
      organizer: event.organizer || "—",
    }),
    // Toplantı hazırlığı ofis işi: posta taslağıyla aynı asistana gider.
    agent: "tyro office",
  })
  requestOpenChat({ focusComposer: true })
}
