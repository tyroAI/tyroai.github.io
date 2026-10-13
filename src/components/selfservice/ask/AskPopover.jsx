import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import { BottomSheet } from "@/components/common/BottomSheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLocale } from "@/hooks/useLocale"
import { AskTyro } from "./AskTyro"

const SOFT =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-brand/[0.09] px-3 text-[0.75rem] font-semibold text-brand-ink transition hover:bg-brand/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:h-11 [&_svg]:size-4"

/**
 * Başlıktaki "TYRO'ya sor" düğmesi ve açılan kutu (Ekibim): masaüstünde düğmenin altında küçük
 * pencere (odak yazı alanında), telefonda alttan çekmece. İçerik `AskTyro` — yazı alanı +
 * sekmenin (`tab`, ör. `team`) hazır soruları. Soru gidince kutu kapanır ve odak düğmeye
 * dönmez: sohbet rıhtımı açılıyor.
 */
export function AskPopover({ tab, onAsk }) {
  const { t } = useLocale()
  const mobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const sent = useRef(false)
  const toggle = (next) => {
    if (next) sent.current = false
    setOpen(next)
  }
  const ask = (question, context) => {
    sent.current = true
    setOpen(false)
    onAsk(question, context)
  }
  const keepFocus = (e) => sent.current && e.preventDefault()
  const label = (
    <>
      <HugeiconsIcon icon={AiChat02Icon} strokeWidth={1.9} aria-hidden="true" />
      {t("selfService.askTyro")}
    </>
  )

  if (mobile) {
    return (
      <>
        <button type="button" aria-haspopup="dialog" onClick={() => toggle(true)} className={SOFT}>
          {label}
        </button>
        <BottomSheet
          open={open}
          onOpenChange={toggle}
          title={t("selfService.askBox.title")}
          description={t("selfService.askBox.hint")}
          onCloseAutoFocus={keepFocus}
        >
          <p className="-mt-1 mb-3 text-[0.75rem] text-muted-foreground">
            {t("selfService.askBox.hint")}
          </p>
          <AskTyro tab={tab} variant="sheet" onAsk={ask} className="pb-2" />
        </BottomSheet>
      </>
    )
  }
  return (
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <button type="button" className={SOFT}>
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={t("selfService.askBox.title")}
        onCloseAutoFocus={keepFocus}
        className="w-[min(22rem,calc(100vw-2rem))] gap-0 p-2.5"
      >
        <p className="mb-2 px-1 text-[0.6875rem] text-muted-foreground">
          {t("selfService.askBox.hint")}
        </p>
        <AskTyro tab={tab} variant="sheet" onAsk={ask} />
      </PopoverContent>
    </Popover>
  )
}
