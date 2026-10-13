import { motion, AnimatePresence } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import File01Icon from "@hugeicons/core-free-icons/File01Icon"
import Maximize01Icon from "@hugeicons/core-free-icons/Maximize01Icon"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { useLocale } from "@/hooks/useLocale"
import { formatFileSize } from "./composerFiles"

/**
 * One row in the attachments tray.
 *
 * For an image the whole label is a button: the chip is small and near the
 * bottom edge of the window, so the click target should be the entire thing
 * rather than the 24px thumbnail. Hover gives a peek, click opens the full
 * view — the peek costs nothing and answers "which image is this?", the full
 * view answers "what does it say?".
 *
 * A native file drag cannot open the peek, because the OS dispatches drag
 * events instead of pointer events while a drag is in flight — so there is no
 * hover card lingering under the drop overlay to suppress.
 *
 * Non-image files keep an inert chip: there is nothing to preview, and a
 * button that does nothing is worse than no button.
 */
function AttachmentChip({ att, onPreview, onRemove, onPreviewBroken }) {
  const { t } = useLocale()
  const label = (
    <>
      {/* A pasted screenshot is named image-<timestamp>.png, and three of them
          truncate to the same string — the thumbnail is the only thing that
          tells them apart. */}
      {att.previewUrl ? (
        <img
          src={att.previewUrl}
          alt=""
          // A previewUrl is minted for anything with an image/* type, but
          // HEIC and AVIF — what a Mac hands over from Photos — do not decode
          // in Chrome or Firefox. Without this the chip showed an empty 24px
          // hole and the viewer opened on nothing. The failure demotes the
          // attachment to a plain file chip, which is the honest rendering.
          onError={onPreviewBroken}
          className="size-6 shrink-0 rounded-md border border-border/60 object-cover"
        />
      ) : (
        <HugeiconsIcon
          icon={File01Icon}
          className="size-3.5 shrink-0 text-brand-deep"
          strokeWidth={1.6}
        />
      )}
      <span className="max-w-[10rem] truncate font-medium" title={att.name}>
        {att.name}
      </span>
      <span className="tabular-nums text-muted-foreground">{formatFileSize(att.size)}</span>
    </>
  )

  return (
    <div className="group inline-flex max-w-full items-center rounded-lg border border-border bg-card pr-1 text-xs">
      {onPreview ? (
        <HoverCard openDelay={280} closeDelay={60}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              // Radix restores focus to whatever was focused when the dialog
              // opened, and macOS does not focus a button on click — so
              // without this, closing the viewer dropped the user at the top
              // of the document instead of back on the chip.
              onClick={(e) => {
                e.currentTarget.focus()
                onPreview()
              }}
              aria-haspopup="dialog"
              aria-label={`${t("chat.attach.preview")} — ${att.name}`}
              className="flex min-w-0 items-center gap-2 rounded-l-lg py-1 pl-2 pr-1.5 transition hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
            >
              {label}
            </button>
          </HoverCardTrigger>
          {/* Above the chip, never below: the composer is pinned to the bottom
              of the window, so a card on the bottom side would be pushed back
              over its own trigger by collision handling. */}
          <HoverCardContent
            side="top"
            align="start"
            sideOffset={10}
            className="w-auto max-w-[20rem] p-2"
          >
            <img
              src={att.previewUrl}
              alt=""
              className="max-h-[13.75rem] max-w-[18.75rem] rounded-lg object-contain"
            />
            <p className="mt-1.5 flex items-center gap-1.5 px-0.5 text-[0.6875rem] text-muted-foreground">
              <HugeiconsIcon icon={Maximize01Icon} className="size-3 shrink-0" strokeWidth={2} />
              {t("chat.attach.enlarge")}
            </p>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <div className="flex min-w-0 items-center gap-2 py-1 pl-2 pr-1.5">{label}</div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("chat.attach.remove")}
        className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-3" strokeWidth={2} />
      </button>
    </div>
  )
}

/**
 * Bestecinin ek tepsisi. Çözülemeyen küçük resim (`brokenPreviews`) düz dosya
 * çipine iner ve önizlemesi kapanır.
 */
export function AttachmentTray({
  attachments,
  brokenPreviews,
  onPreview,
  onPreviewBroken,
  onRemove,
}) {
  return (
    <AnimatePresence initial={false}>
      {attachments.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden border-b border-border/60 bg-muted/20"
        >
          <div className="flex flex-wrap gap-2 px-4 py-2.5 sm:px-6">
            {attachments.map((att) => {
              const broken = brokenPreviews.has(att.id)
              return (
                <AttachmentChip
                  key={att.id}
                  att={broken ? { ...att, previewUrl: null } : att}
                  onPreview={att.previewUrl && !broken ? () => onPreview(att.id) : undefined}
                  onPreviewBroken={() => onPreviewBroken(att.id)}
                  onRemove={() => onRemove(att.id)}
                />
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
