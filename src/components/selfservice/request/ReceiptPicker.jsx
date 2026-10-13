import { useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Attachment01Icon from "@hugeicons/core-free-icons/Attachment01Icon"
import Camera01Icon from "@hugeicons/core-free-icons/Camera01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Pdf01Icon from "@hugeicons/core-free-icons/Pdf01Icon"
import { formatFileSize } from "@/components/chat/composerFiles"
import { useLocale } from "@/hooks/useLocale"
import { MAX_ATTACHMENT_BYTES, MAX_IMAGE_BYTES, isCompressibleImage } from "@/lib/copilot"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"

const MAX_FILES = 3
const SOFT =
  "inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-[0.8125rem] font-medium text-foreground/85 transition hover:border-brand/40 hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:h-11 [&_svg]:size-4"
const coarse = () => Boolean(window.matchMedia?.("(pointer: coarse)").matches)

/**
 * Masraf satırının fiş görselleri (görsel ya da PDF, satır başına en çok 3). Telefonda iki yol:
 * "Fotoğraf çek" doğrudan arka kamerayı açar (`capture`), ataç galeriden ya da dosyadan seçer.
 * Sınırlar sohbet ekleriyle aynı (`lib/copilot`): görsel gönderimde küçültülür.
 */
export function ReceiptPicker({ idBase, files, onAdd, onRemove }) {
  const { t } = useLocale()
  const cameraRef = useRef(null)
  const pickRef = useRef(null)
  const touch = coarse()
  const labelId = `${idBase}-receipts`

  const take = (e) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ""
    const ok = picked.filter((f) => {
      const image = f.type.startsWith("image/")
      if (!image && f.type !== "application/pdf") {
        notify.error(t("selfService.form.receiptType"))
        return false
      }
      const cap = isCompressibleImage(f) ? MAX_IMAGE_BYTES : MAX_ATTACHMENT_BYTES
      if (f.size > cap) {
        notify.error(t("chat.attach.tooLarge", { name: f.name, size: formatFileSize(cap) }))
        return false
      }
      return true
    })
    // Sınırı aşan seçim sessizce kesilmesin: kişi eksik fişle gönderebilirdi.
    const room = MAX_FILES - files.length
    if (ok.length > room) notify.error(t("selfService.form.receiptMax", { n: MAX_FILES }))
    if (ok.length && room > 0) onAdd(ok.slice(0, room))
  }

  return (
    <div role="group" aria-labelledby={labelId}>
      <p id={labelId} className="mb-1.5 text-[0.75rem] font-medium text-foreground/80">
        {t("selfService.form.receipt")}
        <span className="font-normal text-muted-foreground">
          {" · "}
          {t("myspace.template.optional")}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {files.map((f) => (
          <span
            key={f.id}
            className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border bg-background py-1 ps-1 pe-1"
          >
            {f.url ? (
              <img src={f.url} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-destructive/10 text-red-700 dark:text-red-300">
                <HugeiconsIcon icon={Pdf01Icon} aria-hidden="true" className="size-4" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block max-w-[9rem] truncate text-[0.75rem] font-medium">
                {f.file.name}
              </span>
              <span className="block text-[0.6875rem] text-muted-foreground tabular-nums">
                {formatFileSize(f.file.size)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onRemove(f.id)}
              aria-label={t("selfService.form.receiptRemove", { name: f.file.name })}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:size-11"
            >
              <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        ))}
        {files.length >= MAX_FILES ? (
          <span className="text-[0.75rem] text-muted-foreground">
            {t("selfService.form.receiptFull", { n: MAX_FILES })}
          </span>
        ) : (
          <>
            {touch && (
              <button type="button" onClick={() => cameraRef.current?.click()} className={SOFT}>
                <HugeiconsIcon icon={Camera01Icon} aria-hidden="true" strokeWidth={1.8} />
                {t("selfService.form.receiptCamera")}
              </button>
            )}
            <button
              type="button"
              onClick={() => pickRef.current?.click()}
              aria-label={touch ? t("selfService.form.receiptPick") : undefined}
              className={cn(SOFT, touch && "w-11 justify-center px-0")}
            >
              <HugeiconsIcon icon={Attachment01Icon} aria-hidden="true" strokeWidth={1.8} />
              {!touch && t("selfService.form.receiptAdd")}
            </button>
          </>
        )}
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={take}
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
      />
      <input
        ref={pickRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={take}
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
      />
    </div>
  )
}
