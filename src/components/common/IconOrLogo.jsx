import { useEffect, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { getIconByName, loadIcon } from "@/lib/iconRegistry"
import { cn } from "@/lib/utils"

export function IconOrLogo({ iconName, logo, className, size, strokeWidth = 1.6, alt = "" }) {
  const icon = useCatalogueIcon(iconName)
  if (logo) {
    // Logo fills the parent container fully — ignore the size className that's intended for icon sizing
    return <img src={logo} alt={alt} className="size-full object-cover" draggable={false} />
  }
  if (!icon) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center text-[0.625rem] font-semibold opacity-60",
          className,
        )}
      >
        ?
      </span>
    )
  }
  return <HugeiconsIcon icon={icon} className={className} size={size} strokeWidth={strokeWidth} />
}

/**
 * Katalog ikonunu ADIYLA çözer. Ad kayıtta yoksa tam set bir kez tembel
 * yüklenir ve gelince yeniden çizilir — bkz. `iconRegistry`.
 *
 * ⚠️ Kanca `logo` dalından ÖNCE çağrılır: erken dönüşün ardına konsa React
 * kancalarının sırası satırdan satıra değişirdi (logo taşıyan kayıtta bir,
 * taşımayanda iki kanca).
 */
function useCatalogueIcon(iconName) {
  const [, bump] = useState(0)
  const icon = getIconByName(iconName)
  useEffect(() => {
    if (!iconName || icon) return
    let alive = true
    loadIcon(iconName)
      .then(() => {
        if (alive) bump((n) => n + 1)
      })
      .catch(() => {
        // İkon çizilemezse "?" kalır — bu zaten bilinmeyen adın davranışı.
      })
    return () => {
      alive = false
    }
  }, [iconName, icon])
  return icon
}
