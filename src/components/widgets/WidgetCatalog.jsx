import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLocale } from "@/hooks/useLocale"
import { CatalogTile } from "./CatalogTile"

/**
 * "Widget ekle" kataloğu — panoda olmayan widget'lar, gerçek verinle canlı
 * önizlemeleriyle. ÇOKLU SEÇİM: istediklerini işaretle, "Ekle (n)" hepsini birden
 * ekler (sıra işaretleme sırası). Önizlemeler yalnız pencere açıkken çizilir.
 * Seçim her açılışta boşalır; Esc ve Vazgeç hiçbir şey eklemeden kapatır. `onClosed`:
 * pencere kapanınca odağın gideceği yeri sayfa seçer (eklenen karta).
 */
export function WidgetCatalog({ open, onOpenChange, ids, render, onAdd, onClosed }) {
  const { t } = useLocale()
  const [picked, setPicked] = useState([])
  const toggle = (id) =>
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPicked([])
        onOpenChange(next)
      }}
    >
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={onClosed}
        // `overflow-clip`, `hidden` DEĞİL: gizli taşma kodla kaydırılabiliyor — kutu seçilince
        // tarayıcı onay kutusunu göstermek için pencereyi kaydırıyor, başlık ekrandan çıkıyordu.
        className="flex max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-clip p-0 sm:max-h-[88vh] sm:max-w-5xl"
      >
        <DialogHeader className="relative border-b border-border px-5 pt-4 pb-3 sm:px-6">
          <DialogTitle className="text-base font-semibold">{t("widgets.add")}</DialogTitle>
          <DialogDescription className="text-[0.8125rem]">
            {t("widgets.catalogDialog.hint")}
          </DialogDescription>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 end-3 pointer-coarse:size-11"
              aria-label={t("sheet.close")}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {open && ids.length ? (
            <ul
              aria-label={t("widgets.catalogDialog.list")}
              className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
            >
              {ids.map((id) => (
                <CatalogTile
                  key={id}
                  id={id}
                  render={render}
                  checked={picked.includes(id)}
                  onToggle={() => toggle(id)}
                />
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-[0.8125rem] text-muted-foreground">
              {t("widgets.addEmpty")}
            </p>
          )}
        </div>
        {/* Telefonda da TEK satır: sayı solda, düğmeler sağda (alt alta üç satır yer yiyordu). */}
        <DialogFooter className="flex-row flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3 sm:px-6">
          <p aria-live="polite" className="me-auto text-[0.8125rem] text-muted-foreground">
            {t("widgets.catalogDialog.picked", { n: picked.length })}
          </p>
          <DialogClose asChild>
            <Button variant="outline" className="pointer-coarse:h-11">
              {t("widgets.drop.cancel")}
            </Button>
          </DialogClose>
          <Button
            disabled={!picked.length}
            onClick={() => {
              onAdd(picked)
              setPicked([])
            }}
            className="bg-brand-fill-deep text-brand-on-brand hover:bg-brand-fill-deep hover:brightness-110 pointer-coarse:h-11"
          >
            {t("widgets.catalogDialog.add", { n: picked.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
