import { useEffect, useRef, useState } from "react"
import { BottomSheet } from "@/components/common/BottomSheet"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLocale } from "@/hooks/useLocale"
import { onOpenChat } from "@/lib/chatBus"
import { MemberBody } from "./MemberBody"
import { relationTitle } from "./teamText"

/**
 * KİŞİ BÖLMESİ — masaüstünde sağdan bölme (30rem), telefonda alttan çekmece. Gövde kişiye göre
 * yeniden kurulur. "TYRO'ya sor" önce bölmeyi kapatır: sohbet rıhtımı modal bölmenin arkasında
 * açılmasın. Tetik bir `SheetTrigger` değil: kapanınca odak `returnTo`ya (bölmeyi açan düğme)
 * döner; soru sorulduysa dönmez, sohbete bırakılır. `onSwitch(key)`: bölme açıkken başka bir
 * üyeye geçer (yönetici satırı); odak yeni kişinin başına, kapanınca yine ilk düğmeye döner.
 */
export function MemberSheet({ row, rows, today, status, onOpenChange, onAsk, onSwitch, returnTo }) {
  const { t } = useLocale()
  const mobile = useIsMobile()
  const open = Boolean(row)
  const asked = useRef(false)
  // Yönetici satırıyla geçilen üye: gövdesi açılınca odağı ve kaydırmayı başa alır.
  const [switched, setSwitched] = useState(null)
  const change = (next) => {
    if (!next) setSwitched(null)
    onOpenChange(next)
  }
  const switchTo = (key) => {
    setSwitched(key)
    onSwitch(key)
  }
  const ask = (question) => {
    asked.current = true
    change(false)
    onAsk(question)
  }
  // Sohbeti açan her istek (ör. kişi kartının "TYRO'ya sor"u) bölmeyi kapatır: rıhtım modal
  // bölmenin arkasında açılmasın; odak satıra dönmez, yazma alanına kalır.
  useEffect(() => {
    if (!open) return undefined
    return onOpenChat(() => {
      asked.current = true
      setSwitched(null)
      onOpenChange(false)
    })
  }, [open, onOpenChange])
  // Sohbet rıhtımı pencerede Escape dinliyor: bölmeyi kapatan Escape rıhtımı kapatmasın.
  const onEscapeKeyDown = (e) => e.stopPropagation()
  const onCloseAutoFocus = (event) => {
    event.preventDefault()
    const el = returnTo?.current
    if (!asked.current && el?.isConnected) el.focus({ preventScroll: true })
    asked.current = false
  }
  const body = (onClose) =>
    row && (
      <MemberBody
        key={row.key}
        row={row}
        rows={rows}
        today={today}
        status={status}
        onAsk={ask}
        onClose={onClose}
        onSwitch={onSwitch && switchTo}
        focusOnMount={switched === row.key}
      />
    )
  if (mobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={change}
        title={relationTitle(row?.relation, t)}
        description={t("selfService.team.pane.aria")}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={onEscapeKeyDown}
      >
        {body()}
      </BottomSheet>
    )
  }
  return (
    <Sheet open={open} onOpenChange={change}>
      <SheetContent
        side="right"
        showCloseButton={false}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={onEscapeKeyDown}
        className="flex w-full flex-col overflow-y-auto overscroll-contain p-5 data-[side=right]:w-full data-[side=right]:sm:max-w-[30rem]"
      >
        <SheetTitle className="sr-only">{row?.person.name ?? ""}</SheetTitle>
        <SheetDescription className="sr-only">{t("selfService.team.pane.aria")}</SheetDescription>
        {body(() => change(false))}
      </SheetContent>
    </Sheet>
  )
}
