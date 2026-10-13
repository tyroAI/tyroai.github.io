import { useCallback, useRef, useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ACTION, ICON_ONLY } from "./actionStyles"

/**
 * Eylem satırının tek düğmesi: ikon + etiket. Etiket gizliyken (`showLabel` false) ad
 * `aria-label`da kalır, görünen ad ipucuna geçer — ipucu yalnız o zaman açılır. Kalan
 * özellikler (ref dahil) düğmeye geçer: menü tetiği (`asChild`) olarak da kullanılır.
 */
export function ActionButton({ ref, icon, label, tip, showLabel, className, children, ...rest }) {
  const [tipOpen, setTipOpen] = useState(false)
  const self = useRef(null)
  const setRef = useCallback(
    (el) => {
      self.current = el
      if (typeof ref === "function") ref(el)
      else if (ref) ref.current = el
    },
    [ref],
  )
  // Menü ya da pencere kapanınca odak düğmeye programla döner; fareyle çalışan kişiye o an
  // ipucu açılmasın. Yalnız üstüne gelinince ya da klavyeyle odaklanınca.
  const onTip = (open) =>
    setTipOpen(open && (self.current?.matches(":hover, :focus-visible") ?? true))

  return (
    <Tooltip open={tipOpen && !showLabel} onOpenChange={onTip}>
      <TooltipTrigger asChild>
        <button
          ref={setRef}
          type="button"
          {...rest}
          className={cn(ACTION, !showLabel && !children && ICON_ONLY, className)}
        >
          {icon}
          {showLabel && <span>{label}</span>}
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tip ?? label}</TooltipContent>
    </Tooltip>
  )
}
