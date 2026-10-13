import { useEffect, useState } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * Full-view image preview over a dark scrim.
 *
 * Addressed by ID, not by index. The images it shows are composer attachments
 * the user can delete WHILE it is open, and an index would then point at a
 * different picture — or past the end of the list. An id that is no longer in
 * `items` simply means "closed", which is also what happens when the object URL
 * behind it is revoked.
 *
 * Composed from the Radix primitive rather than from `@/components/ui/dialog`.
 * That shared component is a small centred CARD — padding, ring, popover
 * background, `sm:max-w-sm`, its own scroll container — and dressing it as a
 * lightbox meant negating a dozen classes, each of which had to be negated
 * again at the `sm:` breakpoint. Building the stage directly is both shorter
 * and immune to a future edit of the card's styling.
 */
export function ImageLightbox({ items = [], activeId, onActiveIdChange, onClose }) {
  const { t } = useLocale()
  const index = items.findIndex((it) => it.id === activeId)
  const item = index >= 0 ? items[index] : null
  const open = Boolean(item)

  // Radix keeps the content mounted through its close animation, and by then
  // `item` is already null — the picture would blink out a frame before the
  // scrim faded. The last live frame is held in STATE, updated during render
  // (React's "adjust state when props change" form — a ref here trips the
  // no-refs-during-render rule), so the whole thing fades together.
  const [held, setHeld] = useState(null)
  if (item && (held?.item !== item || held.index !== index || held.total !== items.length)) {
    setHeld({ item, index, total: items.length })
  } else if (held && activeId && index === -1) {
    // Removed out from under the viewer: its object URL has just been revoked,
    // so fading the held frame out would fade a broken-image glyph. Dropped
    // here in render (same adjust-state form); the close itself is an effect
    // because it sets PARENT state.
    setHeld(null)
  }
  const view = item ? { item, index, total: items.length } : held

  // The picture disappearing out from under the viewer (removed from the tray,
  // or sent) closes it.
  useEffect(() => {
    if (activeId && index === -1) onClose?.()
  }, [activeId, index, onClose])

  const step = (delta) => {
    if (!view || view.total < 2) return
    const next = (view.index + delta + items.length) % items.length
    if (items[next]) onActiveIdChange?.(items[next].id)
  }

  const many = (view?.total ?? 0) > 1

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80 supports-backdrop-filter:backdrop-blur-xs",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          // Escape must not travel. ChatDock listens for it on `window`
          // (ChatDock.jsx:83) and Radix's own handler neither stops propagation
          // nor preventDefaults, so one press would close the preview AND the
          // entire chat panel underneath it. Stopping propagation still leaves
          // Radix's capture-phase listener to close this dialog.
          onEscapeKeyDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault()
              step(1)
            } else if (e.key === "ArrowLeft") {
              e.preventDefault()
              step(-1)
            }
          }}
          // The caption is the description; a separate one would be read twice.
          aria-describedby={undefined}
          // The stage is the whole window, so the controls can sit in the
          // window's corners no matter how small the picture is.
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4 outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {view?.item?.name || t("chat.attach.preview")}
          </DialogPrimitive.Title>

          {/* Clicking the dark space closes, the way every image viewer does.
              Radix's dismiss-on-outside-pointerdown cannot help here: the stage
              covers the window, so every click is technically inside it. */}
          <div className="absolute inset-0" onClick={() => onClose?.()} aria-hidden />

          {view && (
            <figure className="relative z-10 flex max-h-full flex-col items-center gap-3">
              <img
                // Keyed by id so switching pictures paints the new one instead
                // of holding the previous frame while the next decodes.
                key={view.item.id}
                src={view.item.url}
                alt={view.item.name || ""}
                // object-contain under both caps: a panorama is bounded by
                // width, a phone screenshot by height, and neither is upscaled
                // past its own pixels. The height cap leaves room for the
                // caption and the stage padding, so a tall screenshot never
                // pushes the filename off the bottom of the window.
                className="max-h-[calc(100dvh-9rem)] max-w-full rounded-xl bg-black/20 object-contain shadow-2xl ring-1 ring-white/15"
              />
              <figcaption className="flex max-w-full items-center gap-2 rounded-full bg-black/60 px-4 py-1.5 text-[0.78125rem] text-white/90 backdrop-blur-sm">
                <span className="min-w-0 truncate font-medium">{view.item.name}</span>
                {view.item.meta && (
                  <>
                    <Dot />
                    <span className="shrink-0 tabular-nums text-white/70">{view.item.meta}</span>
                  </>
                )}
                {many && (
                  <>
                    <Dot />
                    <span className="shrink-0 tabular-nums text-white/70">
                      {view.index + 1} / {view.total}
                    </span>
                  </>
                )}
              </figcaption>
            </figure>
          )}

          {many && (
            <>
              <ViewerButton
                label={t("chat.attach.prev")}
                icon={ArrowLeft01Icon}
                onClick={() => step(-1)}
                className="left-3 top-1/2 -translate-y-1/2"
              />
              <ViewerButton
                label={t("chat.attach.next")}
                icon={ArrowRight01Icon}
                onClick={() => step(1)}
                className="right-3 top-1/2 -translate-y-1/2"
              />
            </>
          )}

          <ViewerButton
            label={t("chat.attach.closePreview")}
            icon={Cancel01Icon}
            onClick={() => onClose?.()}
            className="right-3 top-3"
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Dot() {
  return (
    <span aria-hidden className="text-white/35">
      ·
    </span>
  )
}

/**
 * Floating control on the scrim. White-on-translucent rather than themed: it
 * sits on a black backdrop in both light and dark mode, where the card/border
 * tokens would be invisible in one of them.
 */
function ViewerButton({ label, icon, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "absolute z-20 grid size-9 place-items-center rounded-full bg-white/10 text-white/90 ring-1 ring-white/20 backdrop-blur-sm",
        "transition hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70",
        className,
      )}
    >
      <HugeiconsIcon icon={icon} className="size-4" strokeWidth={2} />
    </button>
  )
}
