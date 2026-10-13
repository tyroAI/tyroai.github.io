import { useId, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { HugeiconsIcon } from "@hugeicons/react"
import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import MailSend01Icon from "@hugeicons/core-free-icons/MailSend01Icon"
import { RecipientField } from "@/components/common/RecipientField"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLocale } from "@/hooks/useLocale"
import { useRecentPeople } from "@/hooks/useRecentPeople"
import { forwardPost, shareText, teamsShareUrl } from "@/lib/feedShare"
import { sendWithConsent, unresolvedRecipients } from "@/lib/mailSend"
import { notify } from "@/lib/notify"
import { OPTION_ICON } from "./actionStyles"

/**
 * Paylaşma penceresi. `mode` "mail": posta seçilen kişilere kullanıcının kutusundan
 * iletilir (isteğe bağlı not ile). `mode` "teams": aynı kişilerle Teams sohbeti açılır,
 * mesaj (konu + tek satır özet) hazır ve düzenlenebilir. Kişi seçici dosya postasınınki
 * (`RecipientField` + `useRecentPeople`).
 *
 * ⚠️ Hata PENCEREDE söylenir (`role="alert"`), bildirimle değil: modal açıkken sayfanın
 * geri kalanı — bildirim bölgesi dahil — ekran okuyucudan gizli. Başarıda pencere kapanır
 * ve sonuç bildirimle gelir.
 */
export function ShareDialog({ post, mode, onClose, returnFocus }) {
  return (
    <Dialog open={Boolean(mode)} onOpenChange={(o) => !o && onClose()}>
      {mode && <Body post={post} mode={mode} onClose={onClose} returnFocus={returnFocus} />}
    </Dialog>
  )
}

function Body({ post, mode, onClose, returnFocus }) {
  const { t } = useLocale()
  const { instance, accounts } = useMsal()
  const suggestions = useRecentPeople(true)
  const uid = useId()
  const [to, setTo] = useState([])
  const [note, setNote] = useState(() => (mode === "teams" ? shareText(post, t) : ""))
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const mail = mode === "mail"
  const subject = post.subject || t("feed.noSubject")
  const toId = `${uid}-to`
  const noteId = `${uid}-note`

  /** Alıcı yoksa ya da adressiz bir ad varsa söyler ve odağı alıcı kutusuna verir. */
  function valid() {
    const missing = unresolvedRecipients(to)
    const ok = to.length > 0 && !missing.length
    if (!to.length) setError(t("feed.share.needsPeople"))
    else if (missing.length) setError(t("feed.share.needsAddress", { names: missing.join(", ") }))
    else setError(null)
    if (!ok) document.getElementById(toId)?.focus()
    return ok
  }

  async function forward() {
    if (sending || !valid()) return
    setSending(true)
    const account = accounts[0]
    const res = await sendWithConsent(instance, account, () =>
      forwardPost(instance, account, { id: post.id, to, comment: note.trim() }),
    )
    setSending(false)
    if (res.ok) {
      onClose()
      notify.success(t("feed.share.sentTitle"), {
        description: t("feed.share.sentBody", { names: to.map((p) => p.name).join(", ") }),
      })
      return
    }
    setError(
      res.reason === "denied"
        ? t("files.mailDenied")
        : t("feed.share.failedBody", { detail: res.detail || "" }).trim(),
    )
  }

  function openTeams() {
    if (!valid()) return
    window.open(teamsShareUrl(to, note.trim()), "_blank", "noopener,noreferrer")
    onClose()
  }

  return (
    <DialogContent
      showCloseButton={false}
      // Sohbet rıhtımı da Escape dinliyor: pencereyi kapatan Escape rıhtımı kapatmasın.
      onEscapeKeyDown={(e) => e.stopPropagation()}
      // Odak doğrudan alıcı kutusuna: paylaşmanın ilk adımı kişi seçmek.
      onOpenAutoFocus={(e) => {
        e.preventDefault()
        document.getElementById(toId)?.focus()
      }}
      // Pencereyi açan menü satırı kapanınca yok olur: odak Paylaş düğmesine döner.
      onCloseAutoFocus={(e) => {
        const el = returnFocus?.current
        if (!el?.isConnected) return
        e.preventDefault()
        el.focus()
      }}
      className="w-[calc(100vw-1.5rem)] max-w-none gap-0 sm:w-full sm:max-w-[30rem]"
    >
      <div className="flex items-start gap-3 border-b border-border/60 pb-3">
        <span className={OPTION_ICON}>
          <HugeiconsIcon icon={mail ? MailSend01Icon : BubbleChatIcon} strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-[0.875rem] font-semibold leading-tight">
            {t(mail ? "feed.share.mail" : "feed.share.teams")}
          </DialogTitle>
          <DialogDescription className="mt-0.5 line-clamp-2 text-[0.71875rem] leading-snug">
            {subject}
          </DialogDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("sheet.close")}
          onClick={onClose}
          className="size-8 shrink-0 rounded-lg pointer-coarse:size-11 [&_svg]:!size-4"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>

      <div className="space-y-3 py-3">
        <RecipientField
          id={toId}
          label={t("files.mailTo")}
          value={to}
          onChange={(next) => {
            setTo(next)
            setError(null)
          }}
          suggestions={suggestions}
          placeholder={t("files.mailToPlaceholder")}
        />
        <div className="space-y-1.5">
          <Label htmlFor={noteId} className="text-[0.71875rem] text-muted-foreground">
            {t(mail ? "feed.share.note" : "feed.share.message")}
          </Label>
          <Textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={mail ? t("feed.share.notePlaceholder") : undefined}
            rows={3}
            className="resize-none text-[0.78125rem]"
          />
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-500/10 px-2.5 py-2 text-[0.71875rem] leading-snug text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <p className="min-w-0 flex-1 basis-48 text-[0.6875rem] leading-snug text-muted-foreground">
          {t(mail ? "feed.share.mailFoot" : "feed.share.teamsFoot")}
        </p>
        {/* Paletin koyu dolgusu: sayfada görünen renk, beyaz yazıyla her palette AA. */}
        <Button
          type="button"
          onClick={mail ? forward : openTeams}
          aria-busy={sending || undefined}
          className="h-9 shrink-0 gap-1.5 rounded-lg bg-brand-fill-deep text-[0.78125rem] text-brand-on-brand hover:bg-brand-fill-deep/90 pointer-coarse:h-11 aria-busy:opacity-70"
        >
          <HugeiconsIcon
            icon={mail ? MailSend01Icon : BubbleChatIcon}
            className="size-4"
            strokeWidth={1.9}
          />
          {mail ? t(sending ? "feed.share.sending" : "feed.share.send") : t("feed.share.openTeams")}
        </Button>
      </div>
    </DialogContent>
  )
}
