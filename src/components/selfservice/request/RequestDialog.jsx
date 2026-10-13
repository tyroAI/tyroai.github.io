import { useId, useRef, useState } from "react"
import { MotionConfig } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Loading03Icon from "@hugeicons/core-free-icons/Loading03Icon"
import SentIcon from "@hugeicons/core-free-icons/SentIcon"
import { BottomSheet } from "@/components/common/BottomSheet"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { useBackToClose } from "@/hooks/useBackToClose"
import { useLocale } from "@/hooks/useLocale"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import { cn } from "@/lib/utils"
import { tabOf } from "../kinds"
import { DiscardConfirm } from "./DiscardConfirm"
import { ExpenseForm } from "./ExpenseForm"
import { LeaveForm } from "./LeaveForm"
import { SlotGrid } from "./SlotGrid"
import { useRequestForm } from "./useRequestForm"

// Sohbet rıhtımı Escape'i pencerede dinliyor: formu kapatan Escape rıhtımı kapatmasın.
const keepEscape = (e) => e.stopPropagation()

/**
 * YENİ TALEP FORMU — izin, masraf (çok kalemli, fiş görselli), iş avansı. Masaüstünde ortada
 * pencere, telefonda tam boy alt çekmece. Alanlar sohbetin alanlı şablonundan üretilir;
 * "Sohbette gönder" toplanan veriyi şablonun cümlesiyle İK asistanına yollar (`onSubmit`).
 * `request`: `{ kind, seq, from }` ya da `null`; kapanış animasyonu süresince son form çizilir,
 * her açılış taze bir formla başlar (`seq`). Kapanınca odak açan öğeye (`from`) döner.
 * Dolu form sormadan kapanmaz: Escape, ×, Vazgeç ve Geri tuşu "Girdiklerin silinsin mi?" sorar
 * (`DiscardConfirm`), dışarı dokunuş yok sayılır (klavyeyi kapatmak için üste dokunmak olağan).
 */
export function RequestDialog({ request, onClose, onSubmit, balance }) {
  const [last, setLast] = useState(request)
  if (request && request !== last) setLast(request)
  if (!last) return null
  return (
    <RequestPanel
      key={last.seq}
      kind={last.kind}
      from={last.from}
      open={Boolean(request)}
      onClose={onClose}
      onSubmit={onSubmit}
      balance={balance}
    />
  )
}

function RequestPanel({ kind, from, open, onClose, onSubmit, balance }) {
  const { t, locale } = useLocale()
  const mobile = useIsMobile()
  const form = useRequestForm(kind)
  const idBase = useId().replace(/:/g, "")
  const formId = `${idBase}-form`
  const bodyRef = useRef(null)
  const sent = useRef(false)
  const closed = useRef(false)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const back = useReturnFocus(() => from)
  const tab = tabOf(kind)
  const title = t(`selfService.cta.${kind}`)
  const description = t(`selfService.new.desc.${kind}`)

  const close = () => {
    closed.current = true
    setConfirm(false)
    onClose()
  }
  const guarded = () => form.dirty && !sent.current
  const requestClose = () => (guarded() ? setConfirm(true) : close())
  // Geri tuşu: önce açık onayı kapatır, dolu formda onay sorar; ikisinde de form açık kalır.
  useBackToClose(open, () => {
    if (confirm || guarded()) {
      setConfirm(!confirm)
      return false
    }
    close()
  })

  const submit = async (e) => {
    e.preventDefault()
    if (busy || sent.current) return
    const pending = form.build(t, locale)
    if (!pending) {
      // Hatalar bir sonraki çizimde görünür; odak ilk hatalı alana.
      requestAnimationFrame(() => bodyRef.current?.querySelector("[aria-invalid='true']")?.focus())
      return
    }
    // Fişler gönderimden önce küçültülüyor (birkaç saniye sürebilir): çift gönderim olmasın.
    setBusy(true)
    try {
      const out = await pending
      if (closed.current) return
      sent.current = true
      onSubmit(kind, out)
    } finally {
      setBusy(false)
    }
  }
  // Gönderildiyse odak tetiğe dönmez: sohbetin yazma alanına bırakılır.
  const onCloseAutoFocus = (e) => {
    if (sent.current) e.preventDefault()
    back.onCloseAutoFocus(e)
  }
  const onOpenChange = (o) => !o && requestClose()
  // Formun ilk alanı (masrafta açık kalemin ilk alanı; başlıktaki × ya da kopyala değil).
  const firstField = () =>
    bodyRef.current?.querySelector("[data-row-start] button") ??
    bodyRef.current?.querySelector("button")
  // Dolu formda dışarı dokunuş yok sayılır (sorulmaz da: çoğu kez kazara ya da klavyeyi kapatmak için).
  const keepOutside = (e) => form.dirty && e.preventDefault()

  const body = (
    <MotionConfig reducedMotion="user">
      <form
        id={formId}
        ref={bodyRef}
        noValidate
        onSubmit={submit}
        aria-label={title}
        className="@container/form"
      >
        {kind === "leave" ? (
          <LeaveForm form={form} idBase={idBase} balance={balance} />
        ) : kind === "expense" ? (
          <ExpenseForm form={form} idBase={idBase} />
        ) : (
          <SlotGrid
            tkey={form.key}
            idBase={idBase}
            values={form.values}
            errors={form.errors}
            onChange={form.setSlot}
            onAdd={form.addSlot}
            onRemove={form.removeSlot}
          />
        )}
      </form>
    </MotionConfig>
  )

  const footer = (
    <div
      className={cn(
        "flex items-center gap-3",
        // Yatay telefonda (kısa ekran) ipucu ve düğme yan yana: form alanına yer kalsın.
        mobile && "flex-col items-stretch gap-2.5 shortest:flex-row shortest:items-center",
      )}
    >
      <p
        aria-live="polite"
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 text-[0.75rem] leading-snug",
          form.invalid ? "font-medium text-destructive" : "text-muted-foreground",
          mobile && "justify-center text-center shortest:justify-start shortest:text-start",
        )}
      >
        {!form.invalid && (
          <HugeiconsIcon icon={AiChat02Icon} aria-hidden="true" className="size-3.5 shrink-0" />
        )}
        {form.invalid
          ? t("selfService.form.err.summary", { n: form.invalid })
          : t("selfService.form.how")}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {!mobile && (
          <button
            type="button"
            onClick={requestClose}
            className="h-10 rounded-xl px-3.5 text-[0.8125rem] font-semibold text-foreground/75 transition hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {t("selfService.form.cancel")}
          </button>
        )}
        <button
          type="submit"
          form={formId}
          aria-busy={busy || undefined}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-fill-deep px-4 text-[0.875rem] font-semibold text-brand-on-brand shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background pointer-coarse:h-12 shortest:h-11"
        >
          {t("selfService.form.send")}
          <HugeiconsIcon
            icon={busy ? Loading03Icon : SentIcon}
            aria-hidden="true"
            className={cn(
              "size-4",
              busy ? "animate-spin motion-reduce:animate-none" : "rtl:-scale-x-100",
            )}
          />
        </button>
      </div>
    </div>
  )

  const discard = (
    <DiscardConfirm
      open={open && confirm}
      onKeep={() => setConfirm(false)}
      onDiscard={close}
      // Dokunuşla açılan onayda odak sayfadaydı: forma dönünce ilk alana.
      fallback={firstField}
    />
  )
  if (mobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        onEscapeKeyDown={keepEscape}
        onPointerDownOutside={keepOutside}
        returnFocus={() => from}
        onCloseAutoFocus={(e) => sent.current && e.preventDefault()}
        footer={footer}
        className="max-h-[94dvh] data-[side=bottom]:h-[94dvh]"
      >
        {/* Açıklama çekmecenin adında da var (ekran okuyucu iki kez okumasın). */}
        <p
          aria-hidden="true"
          className="-mt-1 mb-4 text-[0.8125rem] text-muted-foreground shortest:hidden"
        >
          {description}
        </p>
        {body}
        {discard}
      </BottomSheet>
    )
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={keepEscape}
        onPointerDownOutside={keepOutside}
        // İlk odak ilk alanda (başlığın × düğmesinde değil).
        onOpenAutoFocus={(e) => {
          back.onOpenAutoFocus()
          e.preventDefault()
          firstField()?.focus()
        }}
        onCloseAutoFocus={onCloseAutoFocus}
        className="flex max-h-[min(88dvh,52rem)] w-[calc(100vw-2rem)] max-w-none flex-col gap-0 overflow-hidden rounded-[1.25rem] p-0 sm:max-w-[38rem]"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-border/60 px-6 pb-4 pt-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-ink">
            <HugeiconsIcon icon={tab.cta} aria-hidden="true" className="size-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[1rem] font-semibold tracking-[-0.01em]">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[0.8125rem] leading-snug">
              {description}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t("sheet.close")}
            className="-me-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              aria-hidden="true"
              className="size-4"
              strokeWidth={2}
            />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">{body}</div>
        <div className="shrink-0 border-t border-border/60 bg-muted/30 px-6 py-3.5">{footer}</div>
        {discard}
      </DialogContent>
    </Dialog>
  )
}
