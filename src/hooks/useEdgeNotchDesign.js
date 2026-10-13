import { useSyncExternalStore } from "react"
import {
  DEFAULT_EDGE_NOTCH_DESIGN,
  readEdgeNotchDesign,
  subscribeEdgeNotchDesign,
} from "@/lib/edgeNotchDesign"

/** Seçili çentik kabuğunun kimliği; depo değişince yeniden çizer. */
export function useEdgeNotchDesign() {
  return useSyncExternalStore(
    subscribeEdgeNotchDesign,
    readEdgeNotchDesign,
    () => DEFAULT_EDGE_NOTCH_DESIGN,
  )
}
