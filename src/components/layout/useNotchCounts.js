import { useEffect, useMemo, useState } from "react"
import { useCalendarEvents, groupEventsByDay } from "@/hooks/useCalendarEvents"
import { useDriveItems, RECENT_LITE } from "@/hooks/useDriveItems"
import { useMailMessages } from "@/hooks/useMailMessages"
import { defaultCalendarRange, startOfDay } from "@/lib/calendarRange"
import { STATUS } from "@/lib/graph"
import { readSharedCalendars } from "@/lib/sharedCalendars"

/**
 * Çentiğin üç sayısı (yan ray ve telefon şeridi ortak): okunmamış posta, bugün kalan
 * toplantı, bugün dokunulan dosya. Veri hazır değilse `null` (halka çizilmez).
 *
 * ⚠️ Önbellek anahtarları HEADER'LA AYNI (`useMailMessages(12)`, varsayılan takvim
 * aralığı + paylaşılan takvimler); dosyalar için hafif `RECENT_LITE`.
 */
export function useNotchCounts() {
  // "Şimdi" dakikada bir ilerler: biten toplantı sayısı sekme açık kaldıkça bayatlamasın.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  const [today] = useState(() => startOfDay(new Date()))
  const { rangeStart, rangeEnd } = useMemo(() => defaultCalendarRange(today), [today])
  const [people] = useState(readSharedCalendars)

  const mail = useMailMessages(12)
  const cal = useCalendarEvents(rangeStart, rangeEnd, true, people)
  const drive = useDriveItems(RECENT_LITE)

  const calReady = cal.status === STATUS.ready
  const todayEvents = useMemo(
    () => (calReady ? (groupEventsByDay(cal.events, today, 1)[0]?.events ?? []) : []),
    [calReady, cal.events, today],
  )
  const done = todayEvents.filter((e) => e.end && e.end.getTime() <= now).length
  const touchedToday = drive.items.filter((f) => f.modified && new Date(f.modified) >= today).length

  return {
    mail: mail.status === STATUS.ready ? mail.unread : null,
    calendar: calReady ? todayEvents.length - done : null,
    files: drive.status === STATUS.ready ? touchedToday : null,
  }
}
