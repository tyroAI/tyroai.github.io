import { useCallback, useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { calendarChanged } from "@/hooks/useCalendarEvents"
import { useLocale } from "@/hooks/useLocale"
import { respondToInvite } from "@/lib/calendarInvites"
import { STATUS } from "@/lib/graph"
import { showResultToast } from "@/lib/refreshToast"

/**
 * Davete yanıt (Kabul et · Belki · Reddet). Yanıt düzenleyiciye gider, sonuç
 * toast'la söylenir ve takvimi okuyan her yer (header, çentik, Anasayfa)
 * yeniden okur. Tekrarlayan davette yanıt serinin tamamına gider (`respondId`).
 *
 * `busy`: etkinlik kimliği → gönderilmekte olan yanıt (düğmede dönen simge).
 * `answer` başarıda `true` döner.
 */
export function useRsvp() {
  const { t } = useLocale()
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const [busy, setBusy] = useState({})
  // Çift tıklamada ikinci istek gitmesin: durum bir sonraki çizime kadar eski.
  const inFlight = useRef(new Set())

  const answer = useCallback(
    async (event, action) => {
      if (inFlight.current.has(event.id)) return false
      inFlight.current.add(event.id)
      setBusy((b) => ({ ...b, [event.id]: action }))
      const res = await respondToInvite(instance, account, event.respondId ?? event.id, action)
      inFlight.current.delete(event.id)
      setBusy((b) => {
        const next = { ...b }
        delete next[event.id]
        return next
      })
      const subject = event.subject || t("calendar.noSubject")
      if (res.status !== STATUS.ready) {
        showResultToast({
          state: "error",
          title: t("myspace.invite.failed"),
          detail: t("myspace.invite.failedBody"),
        })
        return false
      }
      showResultToast({ title: t(`myspace.invite.sent.${action}`), detail: subject })
      calendarChanged()
      return true
    },
    [instance, account, t],
  )

  return { busy, answer }
}
