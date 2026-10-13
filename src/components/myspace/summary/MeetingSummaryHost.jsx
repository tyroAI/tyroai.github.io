import { lazy, Suspense, useEffect, useState } from "react"
import { onMeetingSummary } from "@/lib/summaryBus"

const MeetingSummaryDialog = lazy(() =>
  import("./MeetingSummaryDialog").then((m) => ({ default: m.MeetingSummaryDialog })),
)

/**
 * Özet penceresinin tek evi (App'te). `openMeetingSummary(event)` ile açılır;
 * pencerenin kodu ilk istekte yüklenir — özeti hiç açmayan kişi indirmez.
 */
export function MeetingSummaryHost() {
  const [event, setEvent] = useState(null)
  const [used, setUsed] = useState(false)

  useEffect(
    () =>
      onMeetingSummary((next) => {
        setUsed(true)
        setEvent(next)
      }),
    [],
  )

  if (!used) return null
  return (
    <Suspense fallback={null}>
      <MeetingSummaryDialog event={event} onClose={() => setEvent(null)} />
    </Suspense>
  )
}
