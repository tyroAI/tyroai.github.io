import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import { BottomSheet } from "@/components/common/BottomSheet"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { GHOST } from "../chips"
import { AskTyro } from "./AskTyro"

/**
 * Dar kabın "Sor" düğmesi: liste başlığında "Rapor"un yanında, yer kaplamadan. Basınca alttan
 * çekmecede "TYRO'ya sor" kutusu (yazı alanı + hazır sorular). Soru gidince çekmece kapanır ve
 * odak düğmeye dönmez — sohbet rıhtımı açılıyor, odak orada.
 */
export function AskSheet({ tab, facts, onAsk, className }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const sent = useRef(false)
  const ask = (question, context) => {
    sent.current = true
    setOpen(false)
    onAsk(question, context)
  }
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={t("selfService.askBox.title")}
        onClick={() => {
          sent.current = false
          setOpen(true)
        }}
        className={cn(
          GHOST,
          "bg-brand/[0.09] px-3 text-brand-ink hover:bg-brand/[0.15] hover:text-brand-ink",
          className,
        )}
      >
        <HugeiconsIcon icon={AiChat02Icon} aria-hidden="true" strokeWidth={1.9} />
        {t("selfService.askBox.short")}
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={t("selfService.askBox.title")}
        description={t("selfService.askBox.hint")}
        onCloseAutoFocus={(e) => sent.current && e.preventDefault()}
        closeOnBack
      >
        <p className="-mt-1 mb-3 text-[0.75rem] text-muted-foreground">
          {t("selfService.askBox.hint")}
        </p>
        <AskTyro tab={tab} facts={facts} variant="sheet" onAsk={ask} className="pb-2" />
      </BottomSheet>
    </>
  )
}
