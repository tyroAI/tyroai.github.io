import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import QuillWrite02Icon from "@hugeicons/core-free-icons/QuillWrite02Icon"
import SentIcon from "@hugeicons/core-free-icons/SentIcon"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RecipientField } from "@/components/common/RecipientField"
import { useLocale } from "@/hooks/useLocale"
import { useMyManager } from "@/hooks/useMyManager"
import { useRecentPeople } from "@/hooks/useRecentPeople"
import { htmlOf } from "@/lib/botFiles"
import { formTitleOf } from "@/lib/signedForm"
import { cn } from "@/lib/utils"
import { SignaturePad } from "./SignaturePad"
import { useSignedFormSend } from "./useSignedFormSend"

/**
 * Sohbetteki formu imzalayıp e-postayla gönderme kutusu.
 *
 * Alıcı, kişinin Entra'daki yöneticisiyle önceden dolu gelir; kişi silip
 * başkasını seçebilir. Alana bir kez dokunulunca yönetici bir daha
 * yazılmaz (`editedTo`): geç gelen cevap kişinin seçimini ezmesin.
 */
export function SignFormDialog({ att, name, onClose }) {
  return (
    <Dialog open={Boolean(att)} onOpenChange={(o) => !o && onClose()}>
      {att && <Body att={att} name={name} onClose={onClose} />}
    </Dialog>
  )
}

function Body({ att, name, onClose }) {
  const { t } = useLocale()
  const suggestions = useRecentPeople(true)
  const manager = useMyManager(true)
  const title = useMemo(() => formTitleOf(htmlOf(att)), [att])

  const [strokes, setStrokes] = useState([])
  const [editedTo, setEditedTo] = useState(null)
  const to = editedTo ?? (manager ? [manager] : [])
  const [cc, setCc] = useState([])
  const [subject, setSubject] = useState(() => t("chat.sign.subject", { title: title || name }))
  const [body, setBody] = useState(() => t("chat.sign.bodyDefault"))
  const { phase, error, send } = useSignedFormSend({ att, name, onDone: onClose })

  const busy = phase !== "idle"
  const canSend = strokes.length > 0 && to.length > 0 && subject.trim().length > 0 && !busy
  const label =
    phase === "rendering"
      ? t("chat.sign.preparing")
      : phase === "sending"
        ? t("files.mailSending")
        : t("files.mailSend")

  return (
    <DialogContent
      showCloseButton={false}
      // Sohbet rıhtımı pencerede Escape dinliyor: kutuyu kapatan Escape
      // rıhtımı da kapatmasın.
      onEscapeKeyDown={(e) => e.stopPropagation()}
      className="max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none gap-0 overflow-y-auto sm:w-full sm:max-w-[32.5rem]"
    >
      <div className="flex items-start gap-3 border-b border-border/60 pb-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-deep">
          <HugeiconsIcon icon={QuillWrite02Icon} className="size-[1.125rem]" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <DialogTitle className="truncate text-[0.875rem] font-semibold leading-tight">
            {t("chat.sign.title")}
          </DialogTitle>
          <DialogDescription className="mt-0.5 truncate text-[0.71875rem] leading-tight">
            {name}
          </DialogDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("sheet.close")}
          onClick={onClose}
          className="size-8 shrink-0 rounded-lg [&_svg]:!size-4"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>

      <div className="space-y-3 py-3">
        <SignaturePad strokes={strokes} onChange={setStrokes} />
        <p className="text-[0.65625rem] leading-snug text-muted-foreground">
          {t("chat.sign.placement")}
        </p>
        <div className="space-y-1">
          <RecipientField
            id="sign-to"
            label={t("files.mailTo")}
            value={to}
            onChange={setEditedTo}
            suggestions={suggestions}
            placeholder={t("files.mailToPlaceholder")}
          />
          {editedTo === null && manager && (
            <p className="text-[0.65625rem] leading-snug text-muted-foreground">
              {t("chat.sign.managerHint")}
            </p>
          )}
        </div>
        <RecipientField
          id="sign-cc"
          label={t("files.mailCc")}
          value={cc}
          onChange={setCc}
          suggestions={suggestions}
          placeholder={t("files.mailCcPlaceholder")}
        />
        <div className="space-y-1.5">
          <Label htmlFor="sign-subject" className="text-[0.71875rem] text-muted-foreground">
            {t("files.mailSubject")}
          </Label>
          <Input
            id="sign-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-9 text-[0.78125rem]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sign-body" className="text-[0.71875rem] text-muted-foreground">
            {t("files.mailBody")}
          </Label>
          <Textarea
            id="sign-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="resize-none text-[0.78125rem]"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-2.5 py-2 text-[0.71875rem] leading-snug text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.65625rem] leading-snug text-muted-foreground">
          <HugeiconsIcon icon={Mail01Icon} className="size-3.5 shrink-0" strokeWidth={1.8} />
          {t("files.mailHandoffNote")}
        </p>
        <Button
          type="button"
          disabled={!canSend}
          aria-busy={busy}
          onClick={() => send({ strokes, to, cc, subject, body })}
          className={cn(
            "h-9 shrink-0 gap-1.5 rounded-lg text-[0.78125rem]",
            !canSend && "opacity-60",
          )}
        >
          <HugeiconsIcon icon={SentIcon} className="size-4" strokeWidth={1.9} />
          {label}
        </Button>
      </div>
    </DialogContent>
  )
}
