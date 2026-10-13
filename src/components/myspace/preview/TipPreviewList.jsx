import { useState } from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { SidePreview } from "./SidePreview"

/**
 * Özetin ipucundaki satır listesi (posta · açık işler · Keşfet bildirimleri):
 * etiket · değer; satıra basınca o kaydın önizlemesi açılır — masaüstünde
 * ipucunun yanında (`SidePreview`), telefonda pencerede (`onOpen`). İlk
 * `limit` satır + "+n daha" (basınca hepsi, uzunsa kayar).
 *
 * `label(item)`, `value(item)`: satırın iki sütunu; `labelClass`: etiket
 * sütununun genişliği (gönderen adı ile sıra numarası aynı genişlikte olmaz).
 */
export function TipPreviewList({
  kind,
  items,
  label,
  value,
  onOpen,
  labelClass = "w-[7rem]",
  valueLang = "tr",
  limit = 3,
}) {
  const { t } = useLocale()
  const isMobile = useIsMobile()
  const [openId, setOpenId] = useState(null)
  const [all, setAll] = useState(false)
  const hidden = items.length - limit
  const shown = hidden > 0 && !all ? items.slice(0, limit) : items

  return (
    <>
      <ul
        className={cn(
          "mt-2.5 flex flex-col text-[0.8125rem] leading-snug",
          all &&
            "max-h-[min(50vh,18rem)] overflow-y-auto overscroll-contain pe-1 [scrollbar-width:thin]",
        )}
      >
        {shown.map((item) => (
          <SidePreview
            key={item.id}
            kind={kind}
            item={item}
            open={openId === item.id}
            onOpenChange={(next) => setOpenId(next ? item.id : null)}
            mobile={isMobile}
          >
            {(wrap) => (
              // Satırın tamamı önizlemeyi açar (değer düğmesinin `::after`'ı satırı kaplar).
              <li className="group/tp relative -mx-2 flex items-baseline gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.07] has-[[data-state=open]]:bg-white/[0.1]">
                <span
                  className={cn(
                    "shrink-0 text-white/55 tabular-nums [overflow-wrap:anywhere]",
                    labelClass,
                  )}
                >
                  {label(item)}
                </span>
                {wrap(
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={isMobile ? () => onOpen(item) : undefined}
                    lang={valueLang ?? undefined}
                    className="min-w-0 flex-1 rounded-sm text-start font-medium decoration-white/40 underline-offset-[0.2em] outline-none [overflow-wrap:anywhere] after:absolute after:inset-0 after:rounded-lg after:content-[''] group-hover/tp:underline focus-visible:after:ring-2 focus-visible:after:ring-white/50"
                  >
                    {value(item)}
                  </button>,
                )}
              </li>
            )}
          </SidePreview>
        ))}
      </ul>
      {hidden > 0 && !all && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-1.5 self-start rounded-sm text-[0.75rem] font-medium text-white/70 underline decoration-white/25 underline-offset-[0.2em] outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 [@media(pointer:coarse)]:min-h-10"
        >
          {t("myspace.tip.more", { n: hidden })}
        </button>
      )}
    </>
  )
}
