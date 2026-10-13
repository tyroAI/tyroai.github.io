import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { useLocale } from "@/hooks/useLocale"
import { useMailBody } from "@/hooks/useMailMessages"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { OPTS_DAY_LONG, mailFrameDoc } from "./mailFormat"

/**
 * Postanın TAM boy okuma penceresi — panelin içinde değil, `MailPopover`in
 * KÖKÜNDE çiziliyor.
 *
 * ⚠️ **KONUM ZORUNLU.** Pencereyi `PopoverContent`in içine koymak işe
 * yaramaz: düğmeye basınca odak pencereye geçiyor, açılır panel kapanıyor
 * ve Radix içeriğini SÖKÜYOR — pencere doğar doğmaz ölürdü. Kök, panel
 * kapansa da ayakta kalan tek yer.
 */
export function MailReaderDialog({ mail, photo, onOpenChange }) {
  const { t, locale } = useLocale()
  const body = useMailBody(mail?.id)
  if (!mail) return null
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(94dvh,60rem)] w-[min(80rem,calc(100vw-1.5rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-h-none sm:max-w-none sm:pb-0"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <PersonAvatar name={mail.from || "?"} photo={photo} className="mt-0.5 size-10" />
          <div className="min-w-0 flex-1">
            <span className="truncate text-[0.8125rem] font-semibold">
              {mail.from || t("mail.unknownSender")}
            </span>
            <DialogTitle className="mt-1 text-[1.0625rem] font-semibold leading-snug tracking-[-0.015em]">
              {mail.subject || t("mail.noSubject")}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[0.6875rem] [&::first-letter]:uppercase">
              {mail.received ? getDateTimeFormat(locale, OPTS_DAY_LONG).format(mail.received) : ""}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t("mail.close")}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:size-11"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden bg-card">
          {body?.html ? (
            <iframe
              title={mail.subject || t("mail.noSubject")}
              sandbox=""
              className="size-full border-0 bg-white"
              srcDoc={mailFrameDoc(body.html)}
            />
          ) : (
            <div className="h-full overflow-y-auto overscroll-contain p-5">
              <p className="whitespace-pre-line text-[0.8125rem] leading-relaxed text-foreground/85">
                {body?.text || mail.preview || ""}
              </p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
          <a
            href={mail.webLink ?? "https://outlook.office.com/mail/"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[0.75rem] font-semibold text-white transition hover:brightness-110"
          >
            <HugeiconsIcon icon={Mail01Icon} className="size-3.5" strokeWidth={2} />
            {t("mail.openOutlook")}
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
