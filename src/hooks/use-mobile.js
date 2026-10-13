import * as React from "react"

const MOBILE_BREAKPOINT = 768
// Yatay telefon da mobildir: genişlik 768'i geçer (844×390) ama yükseklik kısa ve işaretçi
// kaba. Yalnız genişliğe bakınca kenar çubuğu açık masaüstü düzeni geliyor, içerik
// ekranın dörtte üçüne sıkışıyordu. Tabletler (yükseklik > 500) etkilenmez.
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px), (max-height: 500px) and (pointer: coarse)`

function readIsMobile() {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(readIsMobile)

  React.useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
