import { useEffect, useRef } from "react"
import { BottomSheet } from "@/components/common/BottomSheet"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLocale } from "@/hooks/useLocale"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import { onOpenChat } from "@/lib/chatBus"
import { recordKey } from "@/lib/selfServiceModel"
import { describe } from "../recordText"
import { DetailBody } from "./DetailBody"

/**
 * Kaydın ayrıntısı: masaüstünde sağdan bölme, telefonda alttan çekmece. Gövde kayda göre
 * yeniden kurulur (kalemlerin "Tümünü göster"i bir kayıttan ötekine taşınmaz). Sohbeti açan
 * her istek ("TYRO'ya sor") bölmeyi kapatır: rıhtım modal bölmenin arkasında açılmasın; odak
 * satıra dönmez, sohbete bırakılır (`MemberSheet`le aynı kural). Öteki kapanışta odak açan
 * satıra döner (`useReturnFocus`; telefonda `BottomSheet` kendisi yapar).
 */
export function RecordSheet({ record, facet, context, onOpenChange, onAsk }) {
  const { t, locale } = useLocale()
  const mobile = useIsMobile()
  const open = Boolean(record)
  const key = record ? recordKey(record) : "none"
  const asked = useRef(false)
  const back = useReturnFocus()
  useEffect(() => {
    if (!open) return undefined
    return onOpenChat(() => {
      asked.current = true
      onOpenChange(false)
    })
  }, [open, onOpenChange])
  // Sohbet rıhtımı pencerede Escape dinliyor: bölmeyi kapatan Escape rıhtımı kapatmasın.
  const onEscapeKeyDown = (e) => e.stopPropagation()
  const onCloseAutoFocus = (event) => {
    if (asked.current) event.preventDefault()
    asked.current = false
  }
  if (mobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={onEscapeKeyDown}
        // Başlık kaydın adı (izinde tür adı, masrafta kategoriler, avansta amaç); gövde tekrarlamaz.
        title={record ? describe(record, t, locale).title : ""}
      >
        {record && (
          <DetailBody
            key={key}
            record={record}
            facet={facet}
            context={context}
            onAsk={onAsk}
            showTitle={false}
          />
        )}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        onOpenAutoFocus={back.onOpenAutoFocus}
        onCloseAutoFocus={(e) => {
          onCloseAutoFocus(e)
          back.onCloseAutoFocus(e)
        }}
        onEscapeKeyDown={onEscapeKeyDown}
        className="flex w-full flex-col overflow-y-auto overscroll-contain p-6 data-[side=right]:w-full data-[side=right]:sm:max-w-[30rem]"
      >
        <SheetTitle className="sr-only">
          {record ? describe(record, t, locale).title : ""}
        </SheetTitle>
        <SheetDescription className="sr-only">{t("selfService.detail.aria")}</SheetDescription>
        {record && (
          <DetailBody
            key={key}
            record={record}
            facet={facet}
            context={context}
            onAsk={onAsk}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
