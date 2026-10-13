import { useEffect, useRef, useState } from "react"
import { STATUS } from "@/lib/graph"
import { showResultToast } from "@/lib/refreshToast"
import { NO_KEYS, rowKey } from "./filesShared"

/** Yenile düğmesi: yeniden sor, yeni/değişen satırları kısa süre ışıklandır, sonucu söyle. */
export function useFilesRefresh({ active, nonce, setNonce, t }) {
  // Yenilemenin iki sonucu tek durumda: dönüyor mu · hangi satırlar yeni/değişti (kısa marka ışığı).
  const [rf, setRf] = useState({ refreshing: false, fresh: NO_KEYS })
  const beforeRef = useRef(null)
  function onRefresh() {
    if (rf.refreshing || !active) return
    beforeRef.current = new Map((active.items ?? []).map((it) => [rowKey(it), it.modified]))
    setRf((s) => ({ ...s, refreshing: true }))
    setNonce((n) => n + 1)
  }
  useEffect(() => {
    if (!rf.refreshing || !active || active.nonce !== nonce || active.status === "loading") return
    const before = beforeRef.current ?? new Map()
    const changed = (active.items ?? []).filter((it) => {
      const k = rowKey(it)
      return !before.has(k) || before.get(k) !== it.modified
    })
    const ok = active.status === STATUS.ready
    setRf({
      refreshing: false,
      fresh: ok && before.size ? new Set(changed.map(rowKey)) : NO_KEYS,
    })
    if (!ok)
      showResultToast({
        state: "error",
        title: t("myfiles.refreshFailed"),
        detail: t("myfiles.refreshFailedBody"),
      })
    else
      showResultToast({
        state: "success",
        title: t("myfiles.refreshed"),
        detail: changed.length
          ? t("myfiles.refreshedNew", { count: changed.length })
          : t("myfiles.refreshedSame"),
      })
  }, [rf.refreshing, active, nonce, t])
  useEffect(() => {
    if (!rf.fresh.size) return undefined
    const id = setTimeout(() => setRf((s) => ({ ...s, fresh: NO_KEYS })), 1800)
    return () => clearTimeout(id)
  }, [rf.fresh])

  return { rf, onRefresh }
}
