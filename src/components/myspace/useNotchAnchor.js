import { useLayoutEffect } from "react"
import { NOTCH_BLEED_REM, NOTCH_RAIL_H_REM } from "@/lib/edgeNotchGeometry"

/**
 * ⚠️ **ÇENTİK YARDIM KARTINA HİZALANIR.** Ray `fixed` ve kendi kuralı ekranın
 * orta bandı; burada kartın merkezine oturuyor. Değer kökteki
 * `--notch-top-override`a yazılır (`EdgeNotch` onu okuyor) ve sayfadan çıkınca
 * SİLİNİR — öteki sayfalar kendi kuralına döner.
 * ⚠️ İLK GÖRÜNÜM içindir: konum kartın kaydırma 0'daki yerinden hesaplanır,
 * ray sayfayla kaymaz (kayarsa kart ekrandan çıkınca ray da giderdi).
 * ⚠️ Kart ilk ekranda DEĞİLSE (tek kolonlu düzen, kart aşağıda) hizalama
 * yapılmaz: rayı ekranın dibine itmek onu erişilmez kılardı.
 * `useLayoutEffect`: ray önce varsayılan yerinde doğup sonra zıplamasın.
 */
export function useNotchAnchor(ref) {
  useLayoutEffect(() => {
    const root = document.documentElement
    const el = ref.current
    if (!el) return undefined
    const scroller = el.closest("[data-myspace-scroll]")
    const apply = () => {
      const rem = parseFloat(getComputedStyle(root).fontSize) || 16
      const r = el.getBoundingClientRect()
      const top = r.top + (scroller?.scrollTop ?? 0)
      const vh = window.innerHeight
      if (!r.height || top + r.height > vh - rem) {
        root.style.removeProperty("--notch-top-override")
        return
      }
      const rail = NOTCH_RAIL_H_REM * rem
      const ceil = vh - (NOTCH_RAIL_H_REM + NOTCH_BLEED_REM + 1.5) * rem
      const y = Math.max(4 * rem, Math.min(top + r.height / 2 - rail / 2, ceil))
      root.style.setProperty("--notch-top-override", `${Math.round(y)}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)
    window.addEventListener("resize", apply)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", apply)
      root.style.removeProperty("--notch-top-override")
    }
  }, [ref])
}
