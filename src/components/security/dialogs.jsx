import { HugeiconsIcon } from "@hugeicons/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BrandOrb } from "@/components/brand/BrandOrb"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  GÜVENLİK SAYFASININ KUTULARI — tek kabuk, İKİ ton
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Bu sayfadaki üç kutu (yeni kayıt · yetki silme · talep silme) shadcn'in
 * çıplak varsayılanında kalmıştı: ikon yok, marka yok, birincil düğme
 * generic. Oysa aynı uygulamanın dashboard'undaki iki kutu (Erişim iste,
 * Talep detayı) orb sütunlu ve marka dolgulu. Aynı üründe iki kutu dili.
 *
 * ── NEDEN İKİ TON, ÜÇ DEĞİL ────────────────────────────────────────────
 *
 * ⚠️ **ORB YALNIZ YARATAN KUTUDA.** "Erişim iste"nin kardeşi bir kayıt
 * AÇMA kutusu; orada maskot doğru. Bir SİLME onayında orb neşeli durur —
 * geri alınamaz bir işi sevimli göstermek, o işin ne olduğunu gizlemektir.
 * Yıkıcı kutular kendi tonunu taşıyor: kırmızı ikon karesi ve sonucu
 * yazan bir cümle.
 *
 * ⚠️ **ODAK VAZGEÇ'TE** (macOS'un yıkıcı sayfalarındaki kural): Return
 * refleksi bir silme onaylamamalı. `autoFocus` iptal düğmesinde.
 */

/**
 * YARATAN KUTU — solda orb sütunu, sağda içerik.
 *
 * Ölçüler "Erişim iste" ile BİREBİR (`sm:w-[10rem]`, `size={104}`): iki
 * kutu arka arkaya açıldığında kabuk kıpırdamamalı.
 */
export function BrandDialog({
  open,
  onOpenChange,
  title,
  description,
  busy,
  children,
  footer,
  className,
}) {
  const { locale } = useLocale()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("overflow-hidden p-0 sm:max-w-lg", className)}>
        <div className="flex flex-col items-stretch sm:flex-row">
          {/* Orbun durumu ANLAMLI: kayıt yazılırken `thinking`, beklerken
              `idle`. Sabit bir durum, kutunun gerçekten bir iş yaptığı anı
              söylemezdi. */}
          <div className="relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-soft/70 via-brand-soft/25 to-transparent py-4 sm:w-[10rem] sm:py-0">
            <BrandOrb
              surface="dashboard"
              state={busy ? "thinking" : "idle"}
              expressive
              size={104}
            />
          </div>

          <div className="min-w-0 flex-1 p-5">
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle
                lang={locale}
                className="text-[1.0625rem] leading-tight tracking-[-0.01em]"
              >
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription className="text-[0.8125rem] leading-snug">
                  {description}
                </DialogDescription>
              ) : null}
            </DialogHeader>

            <div className="mt-4 flex flex-col gap-3.5">{children}</div>

            <DialogFooter className="mt-5 gap-2 sm:gap-2">{footer}</DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * YIKICI KUTU — kırmızı ikon karesi, sonucu yazan cümle, sonra onay.
 *
 * ⚠️ **SONUÇ MADDE MADDE.** Tek bir paragraf ("kalıcı olarak silinecek")
 * okunmadan geçiliyor. Ne gideceği ve ne KALACAĞI ayrı satırlarda: bir
 * yetki kaydını silerken kişinin TALEPLERİNİN kalması, yöneticinin
 * bilmesi gereken ama sormayacağı bir şey.
 */
export function DestructiveDialog({
  open,
  onOpenChange,
  icon,
  title,
  description,
  consequences,
  confirmLabel,
  cancelLabel,
  onConfirm,
  busy,
  subject,
}) {
  const { locale } = useLocale()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <span
            aria-hidden="true"
            className="mb-1 grid size-10 place-items-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20"
          >
            <HugeiconsIcon icon={icon} className="size-5" strokeWidth={1.9} />
          </span>
          <DialogTitle lang={locale} className="text-[1.0625rem] leading-tight tracking-[-0.01em]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[0.8125rem] leading-snug">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Silinecek ŞEY adıyla ve kutunun içinde: onaya basmadan önce
            gözün son durağı burası olmalı. */}
        {subject ? (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[0.8125rem] tracking-[0.015em] [font-variant-ligatures:none] text-foreground">
            {subject}
          </div>
        ) : null}

        {consequences?.length ? (
          <ul className="space-y-1">
            {consequences.map((c) => (
              <li
                key={c.text}
                className="flex items-start gap-2 text-[0.75rem] leading-snug text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-[0.3125rem] size-1 shrink-0 rounded-full",
                    c.kind === "keep" ? "bg-emerald-500" : "bg-destructive",
                  )}
                />
                {c.text}
              </li>
            ))}
          </ul>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          {/* ⚠️ Odak VAZGEÇ'te: Return refleksi bir silme onaylamamalı. */}
          <button
            type="button"
            autoFocus
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3.5 text-[0.8125rem] font-medium transition-colors hover:bg-foreground/[0.04] [@media(pointer:coarse)]:min-h-11"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-destructive px-3.5 text-[0.8125rem] font-medium text-white transition hover:brightness-110 disabled:opacity-60 [@media(pointer:coarse)]:min-h-11"
          >
            <HugeiconsIcon icon={icon} className="size-3.5" strokeWidth={2} />
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
