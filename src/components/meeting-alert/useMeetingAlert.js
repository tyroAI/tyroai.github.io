import { useEffect, useMemo, useState } from "react"
import { useCalendarEvents } from "@/hooks/useCalendarEvents"
import { useIsInGroup } from "@/hooks/useIsInGroup"
import { defaultCalendarRange, startOfDay } from "@/lib/calendarRange"
import { ADMIN_GROUP_ID } from "@/lib/constants"
import {
  STARTED_GRACE_MS,
  alertKey,
  alertPhase,
  hasNearAlert,
  nextAlert,
  previewEvent,
  readDismissed,
  writeDismissed,
} from "@/lib/meetingAlert"
import { readSharedCalendars } from "@/lib/sharedCalendars"

// Önizleme `?countdown=saniye` (boşsa 75 sn): yüklemede bir kez okunur.
const readPreviewAt = () => {
  const raw = new URLSearchParams(window.location.search).get("countdown")
  return raw == null ? null : Date.now() + (Number(raw) > 0 ? Number(raw) : 75) * 1000
}

/**
 * Sıradaki toplantının geri sayımı. Takvim çentik/Anasayfa ile AYNI aralık ve
 * kişi listesiyle okunur (önbellek ortak, ek Graph çağrısı yok). Saat yalnız
 * bir toplantı yaklaşırken saniyede bir atar, yoksa 20 sn'de bir.
 *
 * Küçültme `{ key, phase }`: aşama değişince (son dakika, başladı) kart
 * kendiliğinden yeniden açılır.
 */
export function useMeetingAlert() {
  const [today] = useState(() => startOfDay(new Date()))
  const { rangeStart, rangeEnd } = useMemo(() => defaultCalendarRange(today), [today])
  const [people] = useState(readSharedCalendars)
  const cal = useCalendarEvents(rangeStart, rangeEnd, true, people)

  const isAdmin = useIsInGroup(ADMIN_GROUP_ID) === true
  const [previewAt] = useState(readPreviewAt)
  const [now, setNow] = useState(() => Date.now())
  // Takvim okununca önizleme gerçek sıradaki toplantıyı kullanır.
  const preview =
    previewAt && (import.meta.env.DEV || isAdmin) && cal.status !== "loading"
      ? previewEvent(previewAt, cal.events, now)
      : null

  const near = Boolean(preview) || hasNearAlert(cal.events, now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), near ? 1000 : 20000)
    return () => clearInterval(id)
  }, [near])

  const [dismissed, setDismissed] = useState(readDismissed)
  const [minimized, setMinimized] = useState(null)

  const event =
    preview && now < +preview.start + STARTED_GRACE_MS
      ? preview
      : nextAlert(cal.events, now, dismissed)
  if (!event) return { event: null }

  const key = alertKey(event)
  const msLeft = +event.start - now
  const phase = alertPhase(msLeft)
  const cardOpen = !(minimized?.key === key && minimized.phase === phase)

  return {
    event,
    msLeft,
    phase,
    cardOpen,
    minimize: () => setMinimized({ key, phase }),
    expand: () => setMinimized(null),
    dismiss: () => {
      writeDismissed(key, +event.end + STARTED_GRACE_MS)
      setDismissed((d) => new Set([...d, key]))
    },
  }
}
