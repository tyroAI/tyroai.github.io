import { useSyncExternalStore } from "react"
import { getIsBrave, subscribeBrave } from "@/lib/brave"

/** Brave mi? Cevap gelene kadar `false` (bkz. lib/brave.js). */
export function useIsBrave() {
  return useSyncExternalStore(subscribeBrave, getIsBrave, () => false)
}
