import { useState } from "react"
import { useMsal } from "@azure/msal-react"
import { useLocale } from "@/hooks/useLocale"
import { htmlOf } from "@/lib/botFiles"
import { sendWithConsent, unresolvedRecipients } from "@/lib/mailSend"
import { showResultToast } from "@/lib/refreshToast"
import { renderFormPdf } from "@/lib/renderFormPdf"
import { sendAttachmentMail } from "@/lib/sendFileMail"
import { strokesToPng } from "@/lib/signatureInk"
import { formTitleOf, formatSignedAt, signFormHtml, signedPdfName } from "@/lib/signedForm"

/**
 * İmzala → PDF'e çevir → kullanıcının kendi kutusundan gönder.
 * `phase`: "idle" | "rendering" | "sending" (düğme etiketi buna göre).
 */
export function useSignedFormSend({ att, name, onDone }) {
  const { t } = useLocale()
  const { instance, accounts } = useMsal()
  const [phase, setPhase] = useState("idle")
  const [error, setError] = useState(null)

  async function send({ strokes, to, cc, subject, body }) {
    // Adresi olmayan satır gönderilmez: Exchange'in çözemeyeceği bir adı
    // yollamak, sessizce yanlış kişiye ulaşmak demek.
    const missing = unresolvedRecipients([...to, ...cc])
    if (missing.length) {
      setError(t("files.mailNeedsAddress", { names: missing.join(", ") }))
      return
    }
    setError(null)
    setPhase("rendering")
    const html = htmlOf(att)
    let pdf
    try {
      const signed = signFormHtml(html, {
        signatureDataUrl: strokesToPng(strokes),
        signedAt: formatSignedAt(new Date()),
      })
      pdf = await renderFormPdf(signed, { title: formTitleOf(html) })
    } catch (err) {
      setPhase("idle")
      setError(t("chat.sign.renderFailed", { detail: err?.message ?? "" }))
      return
    }

    setPhase("sending")
    const fileName = signedPdfName(name)
    const mail = {
      to,
      cc,
      subject: subject.trim(),
      body,
      attachment: { name: fileName, contentType: "application/pdf", bytes: pdf },
    }
    const res = await sendWithConsent(instance, accounts[0], () =>
      sendAttachmentMail(instance, accounts[0], mail),
    )
    setPhase("idle")
    if (res.ok) {
      showResultToast({
        title: t("files.mailSentTitle"),
        detail: t("files.mailSentDetail", { name: fileName }),
      })
      onDone()
      return
    }
    setError(
      res.reason === "too-large"
        ? t("files.mailTooLarge")
        : res.reason === "denied"
          ? t("files.mailDenied")
          : // Graph'ın kendi cümlesi teşhis için tek kaynak: olduğu gibi.
            t("files.mailFailed", { detail: res.detail || "" }),
    )
  }

  return { phase, error, send }
}
