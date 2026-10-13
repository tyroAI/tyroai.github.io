import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { useBackToClose } from "@/hooks/useBackToClose"
import { useLocale } from "@/hooks/useLocale"
import { useReturnFocus } from "@/hooks/useReturnFocus"
import { cn } from "@/lib/utils"

/**
 * Telefonun alttan açılan çekmecesi: sayfada yer kaplamayan ayrıntı (KPI'lar, süzgeçler)
 * dokununca burada açılır. Tutamak + başlık + kapat; içerik kendi içinde kayar, alt kenar
 * güvenli alana kadar dolgulu. Ekranı aşmaz (en çok %88). Kapanınca odak açan öğeye döner
 * (`useReturnFocus`; `returnFocus()` başka bir hedef verebilir); çağıranın `onCloseAutoFocus`u
 * `preventDefault` ederse dokunulmaz (odak sohbete bırakılıyor). `scrollLabel`: içerikte
 * odaklanabilir öğe yoksa kayan gövde odak alır (klavyeyle kaydırılsın), bu adla bölge olur.
 * `footer`: kaymayan alt şerit (formun gönder düğmesi), gövdenin altında. `closeOnBack`: Geri
 * tuşu çekmeceyi kapatır (`true`) ya da bu işlevi çağırır (`false` dönerse açık kalır).
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  className,
  onOpenAutoFocus,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onPointerDownOutside,
  returnFocus,
  closeOnBack,
  scrollLabel,
  footer,
  children,
}) {
  const { t } = useLocale()
  const back = useReturnFocus(returnFocus)
  useBackToClose(open && Boolean(closeOnBack), () =>
    typeof closeOnBack === "function" ? closeOnBack() : onOpenChange(false),
  )
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        onOpenAutoFocus={(e) => {
          back.onOpenAutoFocus()
          onOpenAutoFocus?.(e)
        }}
        onCloseAutoFocus={(e) => {
          onCloseAutoFocus?.(e)
          back.onCloseAutoFocus(e)
        }}
        onEscapeKeyDown={onEscapeKeyDown}
        onPointerDownOutside={onPointerDownOutside}
        // Açıklama yoksa Radix'in "Description eksik" uyarısı susturulur (bağlantı da kurulmaz).
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "max-h-[88dvh] rounded-t-[1.75rem] border-x-0 bg-background pb-[max(1rem,env(safe-area-inset-bottom))] text-sm",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-foreground/15 shortest:hidden"
        />
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-2 shortest:pt-1.5">
          <SheetTitle className="text-[1rem] font-semibold tracking-[-0.01em]">{title}</SheetTitle>
          <SheetClose
            aria-label={t("sheet.close")}
            className="-me-2 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:size-11"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
          </SheetClose>
        </div>
        {description && <SheetDescription className="sr-only">{description}</SheetDescription>}
        <div
          {...(scrollLabel ? { tabIndex: 0, role: "region", "aria-label": scrollLabel } : {})}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
        >
          {children}
        </div>
        {footer && <div className="shrink-0 border-t border-border/60 px-5 pt-3">{footer}</div>}
      </SheetContent>
    </Sheet>
  )
}
