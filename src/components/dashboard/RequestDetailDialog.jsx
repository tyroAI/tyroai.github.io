import { HugeiconsIcon } from "@hugeicons/react"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import Comment01Icon from "@hugeicons/core-free-icons/Comment01Icon"
import ShieldKeyIcon from "@hugeicons/core-free-icons/ShieldKeyIcon"
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { IconOrLogo } from "@/components/common/IconOrLogo"
import { BrandOrb } from "@/components/brand/BrandOrb"
import { useLocale } from "@/hooks/useLocale"
import { formatStamp } from "@/lib/date"
import { cn } from "@/lib/utils"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  GÖNDERDİĞİM TALEP — kilitli karttaki "İnceleniyor"un arkası
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Talebini gönderen kişinin sorduğu iki soru var ve ikisinin de cevabı
 * başka HİÇBİR ekranda yoktu: "ne zaman istemiştim" ve "ne oldu". Yetkiler
 * ekranı yalnız yöneticiye açık, kartın rozeti ise tek kelime.
 *
 * ⚠️ **"ERİŞİM İSTE" KUTUSUNUN KARDEŞİ** (2026-09-17, istek üzerine).
 * Aynı kabuk: solda orb sütunu, sağda içerik. İki kutu aynı talebin iki
 * ucu — biri gönderirken, biri sonucu okurken açılıyor — ve farklı
 * görünmeleri, kullanıcıya iki ayrı özellik gibi gelirdi.
 *
 * ⚠️ **ORBUN İFADESİ DURUMU SÖYLÜYOR, DEKORASYON DEĞİL:**
 *   cevap yok  → `thinking`  (hâlâ bakılıyor)
 *   cevap var  → `speaking`  (sana söylenmiş bir söz var)
 * Sabit bir ifade, kutunun taşıdığı tek haberi (cevap geldi mi) söylemezdi.
 * Kullanıcının bu kutuyu ikinci kez açma sebebi tam olarak o.
 *
 * ⚠️ **SALT OKUNUR.** Buradan talep geri çekilemiyor ve not düzeltilemiyor.
 * İkisi de yazılabilir olsaydı yöneticinin okuduğu metin, okurken
 * değişebilen bir metin olurdu — "onayladığım talep bu muydu" sorusu
 * cevapsız kalırdı. Yanlış yazılmış bir gerekçenin bugünkü karşılığı
 * yöneticiye söylemek; bu bilinçli olarak yeterli sayıldı.
 *
 * ⚠️ **YÖNETİCİ NOTU BOŞKEN SATIR YİNE ÇİZİLİR**, "henüz cevap yok" diyerek.
 * Satırı hiç göstermemek, kullanıcıya böyle bir kanal olmadığını
 * düşündürürdü; oysa kanal var ve cevap gelince tam oraya düşecek.
 * Kullanıcının kendi notu ise boşken çizilmez — kendi yazmadığı bir alanın
 * boş olduğunu ona söylemenin bir değeri yok.
 */

/**
 * Bir satır: ikon kutusu · kaş başlık · değer.
 *
 * İkon kutusu kare ve HALKALI (`ring-1`), düz bir glif değil: dört satır
 * alt alta dururken çıplak ikonlar bir liste değil bir yığın gibi
 * okunuyordu. Kare, gözün soldan aşağı inebileceği bir sütun kuruyor.
 */
function Row({ icon, label, tone = "brand", children }) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden="true"
        className={cn(
          "mt-px grid size-7 shrink-0 place-items-center rounded-lg ring-1",
          tone === "amber" &&
            "bg-amber-500/12 text-amber-700 ring-amber-500/25 dark:text-amber-400",
          tone === "emerald" &&
            "bg-emerald-500/12 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400",
          tone === "brand" && "bg-brand-soft/60 text-brand-on-soft ring-brand/15",
          tone === "muted" && "bg-foreground/[0.05] text-muted-foreground ring-border",
        )}
      >
        <HugeiconsIcon icon={icon} className="size-3.5" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-0.5 text-[0.8125rem] leading-relaxed text-foreground">{children}</div>
      </div>
    </div>
  )
}

export function RequestDetailDialog({ detail, onClose }) {
  const { t, locale } = useLocale()
  const app = detail?.app ?? null
  const request = detail?.request ?? null
  const answered = Boolean(request?.adminNote)

  return (
    <Dialog open={!!detail} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        <div className="flex flex-col items-stretch sm:flex-row">
          {/* Orb sütunu "Erişim iste" kutusuyla BİREBİR aynı ölçüde:
              telefonda üstte ve kısa, geniş ekranda solda 10rem. İki kutu
              arka arkaya açıldığında kabuk kıpırdamamalı. */}
          <div className="relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-soft/70 via-brand-soft/25 to-transparent py-4 sm:w-[10rem] sm:py-0">
            <BrandOrb
              surface="dashboard"
              state={answered ? "speaking" : "thinking"}
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
                {t("lock.detail.title")}
              </DialogTitle>
              <DialogDescription className="text-[0.8125rem] leading-snug">
                {/* Manşet altı CEVABIN DURUMUNU söyler, genel bir cümle
                    değil: kutuyu ikinci kez açan kişi tam olarak bunu
                    öğrenmeye geliyor. */}
                {answered ? t("lock.detail.body.answered") : t("lock.detail.body")}
              </DialogDescription>
            </DialogHeader>

            {/* Hangi app olduğu ADIYLA DEĞİL KENDİSİYLE — kartta hangi
                ikonu gördüyse kutuda da onu görüyor. */}
            {app && (
              <div className="mt-3.5 inline-flex max-w-full items-center gap-2 rounded-xl border border-brand/20 bg-brand-soft/40 py-1.5 pl-1.5 pr-3">
                <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-white">
                  <IconOrLogo iconName={app.iconName} logo={app.logo} className="size-3.5" />
                </span>
                <span className="min-w-0 truncate text-[0.8125rem] font-semibold text-brand-on-soft">
                  {app.name}
                </span>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3.5">
              {/* Durum ve tarih TEK satırda: ikisi de kısa ve birlikte tek
                  bir cümle kuruyorlar ("16.09'da istendi, inceleniyor").
                  Ayrı satırlara bölmek kutuyu uzatıp hiçbir şey eklemezdi. */}
              <Row
                icon={answered ? CheckmarkCircle02Icon : Calendar03Icon}
                label={t("lock.detail.when")}
                tone={answered ? "emerald" : "amber"}
              >
                <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="tabular-nums">{formatStamp(request?.createdOn)}</span>
                  <span
                    className={cn(
                      "text-[0.75rem] font-medium",
                      answered
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-amber-700 dark:text-amber-400",
                    )}
                  >
                    · {answered ? t("lock.detail.status.answered") : t("lock.detail.status.open")}
                  </span>
                </span>
              </Row>

              {request?.userNote ? (
                <Row icon={Comment01Icon} label={t("lock.detail.userNote")} tone="muted">
                  <span className="whitespace-pre-wrap break-words">{request.userNote}</span>
                </Row>
              ) : null}

              <Row icon={ShieldKeyIcon} label={t("lock.detail.adminNote")}>
                {answered ? (
                  /* Cevap geldiğinde metin KUTUYA alınıyor: kutunun
                     taşıdığı tek yeni bilgi bu ve alt alta duran dört
                     satırın içinden ayrılması gerekiyor. */
                  <span className="mt-0.5 block rounded-lg border border-brand/20 bg-brand-soft/30 px-3 py-2 whitespace-pre-wrap break-words text-foreground">
                    {request.adminNote}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t("lock.detail.adminNote.empty")}</span>
                )}
              </Row>
            </div>

            <p className="mt-4 border-t border-border/60 pt-3 text-[0.6875rem] leading-relaxed text-muted-foreground">
              {t("lock.detail.footer")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
