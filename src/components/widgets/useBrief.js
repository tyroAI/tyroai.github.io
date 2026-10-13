import { useEffect, useMemo, useState } from "react"
import { useLocale } from "@/hooks/useLocale"
import { briefItems, dayPart, isWeekend, meetingsOn, newSince, nextWorkday } from "@/lib/brief"
import { pendingInvites } from "@/lib/calendarInvites"
import { getDateTimeFormat } from "@/lib/intl-cache"

const VISIT_KEY = "tyro-widgets-last-visit"
const OPTS_TIME = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
const OPTS_DAY = { weekday: "long" }

/** Önceki ziyaretin anı (bu tarayıcıda); okunduktan sonra şimdiyle değişir. */
function useLastVisit() {
  const [since] = useState(() => {
    try {
      const v = Number(localStorage.getItem(VISIT_KEY))
      return v > 0 ? new Date(v) : null
    } catch {
      return null
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(VISIT_KEY, String(Date.now()))
    } catch {
      /* gizli pencere: "son ziyaret" satırı çizilmez */
    }
  }, [])
  return since
}

export const plural = (t, key, n, params = {}) =>
  t(`${key}.${n === 1 ? "one" : "other"}`, { n, ...params })

/**
 * Günün brifinginin verisi — Günün brifingi ve Karşılama kartı ortak: öncelik
 * sırasıyla maddeler (`lib/brief`), bugün kalan ve bir sonraki iş gününün
 * toplantıları, ipuçlarının listeleri, "son girişten beri yeni posta", ve
 * toplantı satırı (hafta sonunda bir sonraki iş günü).
 */
export function useBrief(ctx) {
  const { cal, mail, focus, feedFresh, now, pageAccess } = ctx
  const { t, locale } = useLocale()
  const since = useLastVisit()
  const date = useMemo(() => new Date(now), [now])
  const weekend = isWeekend(date)
  const part = dayPart(date)
  const time = getDateTimeFormat(locale, OPTS_TIME)
  const invites = useMemo(() => pendingInvites(cal.events, now), [cal.events, now])
  const left = useMemo(() => meetingsOn(cal.events, date, date), [cal.events, date])
  const nextDay = useMemo(() => nextWorkday(date), [date])
  const nextMeetings = useMemo(() => meetingsOn(cal.events, nextDay), [cal.events, nextDay])
  const tasks = focus.tasks ?? []
  const important = (mail.messages ?? []).filter((m) => !m.isRead && m.importance === "high").length
  const items = briefItems({
    invites: invites.length,
    unread: mail.unread ?? 0,
    important,
    overdue: tasks.filter((x) => !x.done && x.overdue).length,
    open: tasks.filter((x) => !x.done && !x.overdue).length,
    feed: pageAccess.feed ? (feedFresh.count ?? 0) : 0,
  })
  // Header rozetiyle aynı küme: bugün gelen ve okunmamış (Anasayfa özetinin ipucu da bu).
  const unreadMail = useMemo(() => {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return (mail.messages ?? []).filter(
      (m) => !m.isRead && m.received && m.received.getTime() >= start.getTime(),
    )
  }, [mail.messages, now])
  const dayName = getDateTimeFormat(locale, OPTS_DAY).format(nextDay)
  const meetingLine = weekend
    ? nextMeetings.length
      ? t("widgets.brief.nextFirst", { day: dayName, time: time.format(nextMeetings[0].start) })
      : null
    : left.length
      ? plural(t, "widgets.brief.left", left.length, { time: time.format(left[0].start) })
      : t("widgets.brief.noneLeft")

  return {
    date,
    weekend,
    part,
    items,
    nextMeetings,
    /** Bugünün bitmemiş toplantıları (sıralı). */
    left,
    dayName,
    doneToday: tasks.filter((x) => x.done).length,
    meetingLine,
    fresh: newSince(mail.messages, since),
    loading: cal.status === "loading" || mail.status === "loading" || focus.loading,
    tipData: {
      invites,
      unreadMail,
      tasks,
      feedItems: pageAccess.feed ? (feedFresh.items ?? []) : [],
      todoOpen: pageAccess.todo,
      todoSynced: focus.mode === "todo",
    },
  }
}
