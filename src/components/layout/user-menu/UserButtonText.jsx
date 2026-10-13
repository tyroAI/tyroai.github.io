import { useRef, useState } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Kullanıcı düğmesinin ad + ünvan satırları. Kenar çubuğu dar: uzun ünvan kırpılır; imleç
 * üstüne gelince tam hâli ipucunda. Yalnız gerçekten kırpıldıysa ve menü kapalıyken açılır.
 * Tetik düğmenin kendisi değil metin kutusu: düğmenin `data-state`i menüye ait kalsın.
 */
export function UserButtonText({ name, subtitle, menuOpen }) {
  const [tip, setTip] = useState(false)
  const nameRef = useRef(null)
  const subRef = useRef(null)
  // Kesirli ölçüm: `scrollWidth`/`clientWidth` tam sayıya yuvarlanır ve 0,25 px'lik taşmayı
  // (üç nokta göründüğü hâlde) kaçırıyordu.
  const clipped = () =>
    [nameRef.current, subRef.current].some((el) => {
      if (!el) return false
      const range = document.createRange()
      range.selectNodeContents(el)
      return range.getBoundingClientRect().width > el.getBoundingClientRect().width + 0.01
    })

  return (
    <Tooltip open={tip && !menuOpen} onOpenChange={(next) => setTip(next && clipped())}>
      <TooltipTrigger asChild>
        <div className="grid min-w-0 flex-1 gap-0.5 text-start leading-tight group-data-[collapsible=icon]:hidden">
          <span ref={nameRef} className="truncate text-[0.8125rem] font-medium">
            {name}
          </span>
          <span ref={subRef} className="truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        sideOffset={14}
        className="max-w-64 flex-col items-start gap-0.5 text-start"
      >
        <span className="font-medium">{name}</span>
        <span className="opacity-80">{subtitle}</span>
      </TooltipContent>
    </Tooltip>
  )
}
