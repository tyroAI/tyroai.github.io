import { useSyncExternalStore } from "react"
import {
  DEFAULT_MASCOT_SETTINGS,
  DEFAULT_ORB_STYLE,
  readMascotSettings,
  readOrbStyle,
  subscribeMascotSettings,
  subscribeOrbStyle,
} from "@/lib/orbStyle"

/** Seçili orb görünümünün kimliği (`sphere` · `mascot`); depo değişince yeniden çizer. */
export function useOrbStyle() {
  return useSyncExternalStore(subscribeOrbStyle, readOrbStyle, () => DEFAULT_ORB_STYLE)
}

/**
 * Maskotun kayıtlı görünüş ayarları.
 *
 * ⚠️ Okuyucu AYNI nesneyi döndürmek zorunda (ham dize değişmedikçe) —
 * `readMascotSettings` bunu önbellekle garanti ediyor; her çağrıda taze bir
 * `JSON.parse` döndürseydi `useSyncExternalStore` sonsuz render'a girerdi.
 */
export function useMascotSettings() {
  return useSyncExternalStore(
    subscribeMascotSettings,
    readMascotSettings,
    () => DEFAULT_MASCOT_SETTINGS,
  )
}
