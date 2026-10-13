import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import SentIcon from "@hugeicons/core-free-icons/SentIcon"
import { useMsal } from "@azure/msal-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RecipientField } from "@/components/common/RecipientField"
import { FileBadge } from "@/components/common/FileBadge"
import { fileMeta } from "@/lib/fileMeta"
import { useRecentPeople } from "@/hooks/useRecentPeople"
import { sendWithConsent, unresolvedRecipients } from "@/lib/mailSend"
import { MAX_ATTACHMENT_BYTES, sendFileMail } from "@/lib/sendFileMail"
import { showResultToast } from "@/lib/refreshToast"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * Dosyayı e-posta ile gönderme kutusu.
 *
 * Posta KULLANICININ KENDİ kutusundan, doğrudan Graph ile gider ve dosya
 * gerçek bir ek olarak eklenir; Gönderilmiş Öğeler'de de durur.
 *
 * Bir süre ikinci bir yol vardı: görevi `tyro office` ajanına devretmek.
 * Kaldırıldı, çünkü ölçüldü — ajan üzerinden gönderim ~90 saniye, buradan
 * birkaç saniye sürüyor. İki yolun tek farkı hızdı ve yavaş olanı seçmek
 * için bir sebep kalmamıştı. Devir mantığı panelin diğer iki menü öğesinde
 * (özetle / üzerinde çalış) yaşamaya devam ediyor.
 *
 * Bunun iki bedeli var ve ikisi de görünür: ek en fazla ~3 MB olabilir
 * (Graph'ın tek istek sınırı) ve alıcının TAM ADRESİ gerekir — adı çözecek
 * bir ajan yok. Bkz. `src/lib/sendFileMail.js`.
 */

export function FileMailDialog({ item, onClose }) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={(o) => !o && onClose()}>
      {item && <Body item={item} onClose={onClose} />}
    </Dialog>
  )
}

function Body({ item, onClose }) {
  const { t, locale } = useLocale()
  const { instance, accounts } = useMsal()
  const suggestions = useRecentPeople(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [to, setTo] = useState([])
  const [cc, setCc] = useState([])

  // Konu ve mesaj HAZIR gelir — "hızlı" olan bu. İkisi de düzenlenebilir,
  // çünkü kullanıcı ajana ne gittiğini görmeli ve gerekirse tek kelimeyi
  // değiştirebilmeli.
  const [subject, setSubject] = useState(() => item.name.replace(/\.[^.]+$/, ""))
  const [body, setBody] = useState(() => t("files.mailBodyDefault"))

  const canSend = to.length > 0 && subject.trim().length > 0 && !sending
  const tooLarge = item.size != null && item.size > MAX_ATTACHMENT_BYTES

  /**
   * Doğrudan gönderim — asistanı hiç karıştırmadan, dosyanın kendisini eke
   * koyarak. Alıcı ADRESİ olmayan satırlar gönderilmez: Exchange'in
   * çözemeyeceği bir adı yollamak, sessizce yanlış kişiye ulaşmak demektir.
   */
  async function sendDirect() {
    const missing = unresolvedRecipients([...to, ...cc])
    if (missing.length) {
      setError(t("files.mailNeedsAddress", { names: missing.join(", ") }))
      return
    }
    setError(null)
    setSending(true)
    const res = await sendWithConsent(instance, accounts[0], () =>
      sendFileMail(instance, accounts[0], { item, to, cc, subject: subject.trim(), body }),
    )
    setSending(false)
    if (res.ok) {
      showResultToast({
        title: t("files.mailSentTitle"),
        detail: t("files.mailSentDetail", { name: item.name }),
      })
      onClose()
      return
    }
    setError(
      res.reason === "too-large"
        ? t("files.mailTooLarge")
        : res.reason === "denied"
          ? t("files.mailDenied")
          : res.reason === "no-recipient"
            ? t("files.mailNeedsAddress", { names: to.map((p) => p.name).join(", ") })
            : res.reason === "no-file"
              ? t("files.mailNoFile")
              : // Graph'ın kendi cümlesi teşhis için tek kaynak: olduğu gibi.
                t("files.mailFailed", { detail: res.detail || "" }),
    )
  }

  return (
    <DialogContent
      showCloseButton={false}
      data-files-layer=""
      // Sohbet rıhtımı pencerede Escape dinliyor: pencereyi kapatan Escape
      // rıhtımı da kapatmasın (Radix yine kapatıyor — `preventDefault` yok).
      onEscapeKeyDown={(e) => e.stopPropagation()}
      className="w-[calc(100vw-1.5rem)] max-w-none gap-0 sm:w-full sm:max-w-[32.5rem]"
    >
      <div className="flex items-start gap-3 border-b border-border/60 pb-3">
        <FileBadge item={{ ...item, kind: "file" }} size="md" />
        <div className="min-w-0 flex-1">
          <DialogTitle className="truncate text-[0.875rem] font-semibold leading-tight">
            {t("files.mailTitle")}
          </DialogTitle>
          <DialogDescription className="mt-0.5 truncate text-[0.71875rem] leading-tight">
            {item.name} · {fileMeta(item, locale)}
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
        <RecipientField
          id="mail-to"
          label={t("files.mailTo")}
          value={to}
          onChange={setTo}
          suggestions={suggestions}
          placeholder={t("files.mailToPlaceholder")}
        />
        <RecipientField
          id="mail-cc"
          label={t("files.mailCc")}
          value={cc}
          onChange={setCc}
          suggestions={suggestions}
          placeholder={t("files.mailCcPlaceholder")}
        />
        <div className="space-y-1.5">
          <Label htmlFor="mail-subject" className="text-[0.71875rem] text-muted-foreground">
            {t("files.mailSubject")}
          </Label>
          <Input
            id="mail-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-9 text-[0.78125rem]"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mail-body" className="text-[0.71875rem] text-muted-foreground">
            {t("files.mailBody")}
          </Label>
          <Textarea
            id="mail-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="resize-none text-[0.78125rem]"
          />
        </div>
      </div>

      {(error || tooLarge) && (
        <p className="rounded-lg bg-destructive/10 px-2.5 py-2 text-[0.71875rem] leading-snug text-destructive">
          {error ?? t("files.mailTooLarge")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        {/* Kim gönderiyor sorusunun cevabı burada yazılı: uygulama değil,
            asistan. Kullanıcı düğmeye bastıktan sonra sohbetin açılıp görevin
            kendiliğinden gitmesi sürpriz olmasın. */}
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.65625rem] leading-snug text-muted-foreground">
          <HugeiconsIcon icon={Mail01Icon} className="size-3.5 shrink-0" strokeWidth={1.8} />
          {t("files.mailHandoffNote")}
        </p>
        {/* TEK yol: doğrudan gönderim. Bir süre ajana devreden ikinci bir
            düğme de vardı ve kaldırıldı — ölçüldü: ajan üzerinden gönderim
            ~90 saniye sürüyor, buradan gönderim birkaç saniye. Aynı işi iki
            hızda yapan iki düğme, yavaş olanı seçen kullanıcı üretmekten
            başka bir işe yaramıyordu. */}
        <Button
          type="button"
          disabled={!canSend || tooLarge}
          title={tooLarge ? t("files.mailTooLarge") : undefined}
          onClick={sendDirect}
          className={cn(
            "h-9 shrink-0 gap-1.5 rounded-lg text-[0.78125rem]",
            (!canSend || tooLarge) && "opacity-60",
          )}
        >
          <HugeiconsIcon icon={SentIcon} className="size-4" strokeWidth={1.9} />
          {sending ? t("files.mailSending") : t("files.mailSend")}
        </Button>
      </div>
    </DialogContent>
  )
}
