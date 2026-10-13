import { lazy, Suspense, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import File01Icon from "@hugeicons/core-free-icons/File01Icon"
import Download01Icon from "@hugeicons/core-free-icons/Download01Icon"
import PrinterIcon from "@hugeicons/core-free-icons/PrinterIcon"
import QuillWrite02Icon from "@hugeicons/core-free-icons/QuillWrite02Icon"
import { useLocale } from "@/hooks/useLocale"
import { attachmentDownloadUrl, isPrintableHtml, printHtmlAttachment } from "@/lib/botFiles"
import { canSignAttachment } from "@/lib/signedForm"

// Kutu ve PDF çizici yalnız "İmzala ve gönder"e basılınca iner.
const SignFormDialog = lazy(() =>
  import("./sign/SignFormDialog").then((m) => ({ default: m.SignFormDialog })),
)

const CHIP =
  "inline-flex max-w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm transition hover:border-brand-via/50 hover:bg-brand-soft/20"

/**
 * Botun gönderdiği bir dosyayı indirilebilir çip olarak gösterir. Yazdırılabilir
 * bir belgeyse (araçtan gelen HTML, bkz. botFiles) yanında bir Yazdır düğmesi
 * durur: belge indirilmeden doğrudan yazıcı penceresi açılır. Belgede personel
 * imza satırı varsa (izin formu) "İmzala ve gönder" de çıkar (bkz. signedForm).
 */
export function BotFileAttachment({ att }) {
  const { t } = useLocale()
  const [signing, setSigning] = useState(false)
  const signable = useMemo(() => canSignAttachment(att), [att])
  const url = attachmentDownloadUrl(att)
  const name = att.name || att.content?.name || t("chat.attach.file")
  // İçeriği sohbet kaydına sığmayan dosya (büyük ek): yenilemeden sonra
  // indirilecek bir şey kalmıyor. Boşluk yerine ne olduğunu söyle.
  if (!url) {
    return (
      <p className="inline-flex max-w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-[0.78125rem] text-muted-foreground">
        <HugeiconsIcon icon={File01Icon} className="size-4 shrink-0" strokeWidth={1.6} />
        <span className="min-w-0 [overflow-wrap:anywhere]">{t("chat.attach.gone", { name })}</span>
      </p>
    )
  }
  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <a
        href={url}
        download={name}
        target="_blank"
        rel="noopener noreferrer"
        className={`group ${CHIP}`}
      >
        <HugeiconsIcon
          icon={File01Icon}
          className="size-4 shrink-0 text-brand-deep"
          strokeWidth={1.6}
        />
        <span className="max-w-[12.5rem] truncate font-medium" title={name}>
          {name}
        </span>
        <HugeiconsIcon
          icon={Download01Icon}
          className="size-4 shrink-0 text-muted-foreground transition group-hover:text-brand-deep"
          strokeWidth={1.8}
        />
      </a>
      {isPrintableHtml(att) && (
        <button
          type="button"
          onClick={() => printHtmlAttachment(att)}
          className={`${CHIP} font-medium`}
        >
          <HugeiconsIcon
            icon={PrinterIcon}
            className="size-4 shrink-0 text-brand-deep"
            strokeWidth={1.6}
          />
          {t("chat.attach.print")}
        </button>
      )}
      {signable && (
        <button type="button" onClick={() => setSigning(true)} className={`${CHIP} font-medium`}>
          <HugeiconsIcon
            icon={QuillWrite02Icon}
            className="size-4 shrink-0 text-brand-deep"
            strokeWidth={1.6}
          />
          {t("chat.sign.button")}
        </button>
      )}
      {signing && (
        <Suspense fallback={null}>
          <SignFormDialog att={att} name={name} onClose={() => setSigning(false)} />
        </Suspense>
      )}
    </div>
  )
}
