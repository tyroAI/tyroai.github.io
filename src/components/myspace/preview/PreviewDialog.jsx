import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { PreviewContent } from "./PreviewContent"
import { previewLabel } from "./previewKinds"

/**
 * Telefonda özetin ipucundan açılan önizleme (`preview`: { kind, item } —
 * toplantı · posta · Keşfet bildirimi · görev); masaüstünde aynı içerik
 * ipucunun yanında açılır (`SidePreview`). Pencere ekrana sığar ve kendi
 * içinde kayar; kapanış animasyonu bitene kadar son içerik çizilir.
 */
export function PreviewDialog({ preview, onClose }) {
  const [last, setLast] = useState(null)
  if (preview && preview !== last) setLast(preview)
  const shown = preview ?? last
  return (
    <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="gap-0 p-0 [scrollbar-gutter:auto]! sm:max-w-[26rem] sm:p-0"
      >
        <DialogTitle className="sr-only">
          {shown ? previewLabel(shown.kind, shown.item) : ""}
        </DialogTitle>
        {shown && <PreviewContent kind={shown.kind} item={shown.item} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
