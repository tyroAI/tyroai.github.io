import { useEffect } from "react"
import { formatCountdown } from "@/lib/meetingAlert"
import { MeetingCountdown } from "./MeetingCountdown"
import { MeetingCountdownPill } from "./MeetingCountdownPill"
import { useMeetingAlert } from "./useMeetingAlert"

// Sekme başlığının öneki: kişi başka sekmedeyken de geri sayımı görür.
const PREFIX = /^⏱ [^·]+· /

/**
 * Sıradaki toplantının geri sayımı — uygulamada tek ev (App). 15 dk kala
 * ortada pencere, küçültülünce sağ altta hap; sekme başlığında da sayar.
 */
export function MeetingAlertHost() {
  const alert = useMeetingAlert()
  const label = alert.event
    ? alert.phase === "started"
      ? "▶"
      : formatCountdown(alert.msLeft)
    : null

  useEffect(() => {
    if (!label) return undefined
    const base = document.title.replace(PREFIX, "")
    document.title = `⏱ ${label} · ${base}`
    return () => {
      document.title = document.title.replace(PREFIX, "")
    }
  }, [label])

  if (!alert.event) return null
  return alert.cardOpen ? (
    <MeetingCountdown alert={alert} />
  ) : (
    <MeetingCountdownPill alert={alert} />
  )
}
