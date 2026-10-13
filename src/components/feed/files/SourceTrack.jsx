import { HugeiconsIcon } from "@hugeicons/react"
import Building03Icon from "@hugeicons/core-free-icons/Building03Icon"
import CloudIcon from "@hugeicons/core-free-icons/CloudIcon"
import Layers01Icon from "@hugeicons/core-free-icons/Layers01Icon"
import Share08Icon from "@hugeicons/core-free-icons/Share08Icon"
import { useLocale } from "@/hooks/useLocale"
import { SOURCES } from "@/lib/filesLocation"
import { cn } from "@/lib/utils"

const ICONS = {
  all: Layers01Icon,
  onedrive: CloudIcon,
  sharepoint: Share08Icon,
  corporate: Building03Icon,
}

/**
 * KAYNAK ŞERİDİ — raylı segment (kapsam): Tümü · OneDrive · SharePoint · Şirket.
 *
 * ⚠️ **SEÇİLİ DİLİM TEK BAKIŞTA OKUNUR.** Soluk ray üstünde beyaz bir dilim ve
 * gri etiketler sayfanın beyazında kayboluyordu; ray dolu tonda, seçili dilim
 * markanın mürekkebinde ve ince bir marka halkasıyla, öteki etiketler okunur
 * mürekkepte. İkonlar geniş kapsayıcıda — dar ekranda dört dilim etiketle sığıyor.
 */
export function SourceTrack({ value, onChange }) {
  const { t } = useLocale()
  return (
    // Dar kapsayıcıda tam genişlik (dört eşit dilim), geniş kapsayıcıda
    // içeriği kadar — süzgeç çipleriyle aynı satırı paylaşıyor.
    <div
      role="group"
      aria-label={t("myfiles.source.aria")}
      className="flex w-full min-w-0 items-stretch gap-0.5 rounded-full border border-border bg-muted p-1 @[34rem]/files:w-auto"
    >
      {SOURCES.map((s) => {
        const on = value === s
        return (
          <button
            key={s}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(s)}
            // ⚠️ `truncate` DEĞİL: 328–358 px'te "SharePoint" kırpılıyordu.
            // Etiket gerekirse iki satıra iner (FEED_VIEWS emsali).
            className={cn(
              "inline-flex min-w-0 grow basis-auto items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-center text-[0.8125rem] leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 @[34rem]/files:grow-0 @[34rem]/files:px-3.5 [@media(pointer:coarse)]:min-h-10",
              on
                ? "bg-card font-semibold text-brand-ink shadow-sm ring-1 ring-brand/25"
                : "font-medium text-foreground/70 hover:bg-card/60 hover:text-foreground",
            )}
          >
            <HugeiconsIcon
              icon={ICONS[s]}
              aria-hidden="true"
              className={cn(
                "hidden size-3.5 shrink-0 @[34rem]/files:block",
                on ? "text-brand" : "text-foreground/45",
              )}
              strokeWidth={1.9}
            />
            <span className="line-clamp-2 [overflow-wrap:anywhere]">
              {t(`myfiles.source.${s}`)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
