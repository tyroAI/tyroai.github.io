import { useMemo } from "react"
import { STATUS, useCelebrations } from "@/hooks/useCelebrations"
import { useMyCircle } from "@/hooks/useMyCircle"
import { useMyIdentity } from "@/hooks/useMyCelebration"
import { isMine } from "@/lib/myCelebration"
import { circleCelebrations } from "@/lib/myCircle"

/**
 * Bugün doğum günü ya da iş yıl dönümü olan ekip ve departman arkadaşları
 * (ekip önce, kişinin kendisi hariç). Çevre bilinmiyorsa boş liste.
 */
export function useCircleCelebrations() {
  const celebrations = useCelebrations()
  const ready = celebrations.status === STATUS.ready
  const circle = useMyCircle(ready)
  const ids = useMyIdentity()
  return useMemo(
    () => circleCelebrations(ready ? celebrations : null, circle, (mail) => isMine(ids, mail)),
    [ready, celebrations, circle, ids],
  )
}
