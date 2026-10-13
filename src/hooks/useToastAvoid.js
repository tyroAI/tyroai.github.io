import { useEffect } from "react"
import { registerToastAvoid } from "@/lib/toastAvoid"

/**
 * Öğe bağlı kaldıkça sağ alttaki bildirim yığını ona binmez: `"right"` sağ panel sütunu
 * (yığın soluna geçer), `"bottom"` besteci (yığın üstüne çıkar). Gizli öğe (sıfır boy)
 * hesaba girmez. Geometri: `lib/toastAvoid.js`.
 */
export function useToastAvoid(ref, side) {
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    return registerToastAvoid(el, side)
  }, [ref, side])
}
