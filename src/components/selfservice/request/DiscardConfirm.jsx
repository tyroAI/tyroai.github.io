import { useRef } from "react"
import { AlertDialog } from "radix-ui"
import { useLocale } from "@/hooks/useLocale"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import { cn } from "@/lib/utils"

// Sohbet rıhtımı Escape'i pencerede dinliyor: onayı kapatan Escape rıhtımı kapatmasın.
const keepEscape = (e) => e.stopPropagation()
const BUTTON =
  "inline-flex h-10 items-center justify-center rounded-xl px-4 text-[0.8125rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:h-11"

/**
 * "Girdiklerin silinsin mi?" — dolu talep formu Escape, ×, Vazgeç ya da Geri ile kapatılmak
 * istenince. İlk odak "Forma dön"de (yıkıcı olmayan seçenek); Escape de forma döner ve odak
 * onayı açan öğeye geri gelir. "Sil ve kapat" formu kapatır (odağı form geri verir).
 */
export function DiscardConfirm({ open, onKeep, onDiscard, fallback }) {
  const { t } = useLocale()
  const discarded = useRef(false)
  const back = useReturnFocus(null, fallback)
  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && onKeep()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/25 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <AlertDialog.Content
          onEscapeKeyDown={keepEscape}
          onOpenAutoFocus={() => {
            discarded.current = false
            back.onOpenAutoFocus()
          }}
          onCloseAutoFocus={(e) => {
            if (discarded.current) e.preventDefault()
            back.onCloseAutoFocus(e)
          }}
          className="fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] max-w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-[1.25rem] bg-popover p-5 text-popover-foreground shadow-xl ring-1 ring-foreground/10 duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <AlertDialog.Title className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
            {t("selfService.form.discard.title")}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
            {t("selfService.form.discard.body")}
          </AlertDialog.Description>
          <div className="mt-5 flex flex-col-reverse gap-2 min-[400px]:flex-row min-[400px]:justify-end">
            <AlertDialog.Cancel
              className={cn(
                BUTTON,
                "text-foreground/80 hover:bg-foreground/[0.05] hover:text-foreground",
              )}
            >
              {t("selfService.form.discard.keep")}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={() => {
                discarded.current = true
                onDiscard()
              }}
              className={cn(
                BUTTON,
                "bg-destructive/10 text-red-700 hover:bg-destructive/15 dark:text-red-300",
              )}
            >
              {t("selfService.form.discard.confirm")}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
