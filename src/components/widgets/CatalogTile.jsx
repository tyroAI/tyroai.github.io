import { useEffect, useId, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { CATALOG } from "./layout"

// Önizlemenin çizildiği gerçek boy (px): kart ızgaradaki boyunda çizilir, kutuya küçültülür.
const SIZE = { left: [480, 232], wide: [620, 240], narrow: [320, 240] }
// Görünümsüz kartlar (hava) sol sütunun boyunda; görünümsüz ama GENİŞ olan (To-Do özeti) geniş.
const sizeOf = (id) =>
  CATALOG[id]?.zone === "left" || (CATALOG[id]?.looks === false && !CATALOG[id]?.wide)
    ? SIZE.left
    : CATALOG[id]?.wide
      ? SIZE.wide
      : SIZE.narrow

/**
 * Katalogda tek widget: gerçek verinle küçültülmüş canlı önizleme, adı ve açıklaması.
 * Kutunun tamamı bir onay kutusu (çoklu seçim; Boşluk işaretler). Önizleme yalnız
 * görüntü: `inert`, ekran okuyucuya kapalı — adı ve açıklaması okunur.
 */
export function CatalogTile({ id, render, checked, onToggle }) {
  const { t } = useLocale()
  const descId = useId()
  const box = useRef(null)
  const [scale, setScale] = useState(0)
  const [w, h] = sizeOf(id)

  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === "undefined") return undefined
    const ro = new ResizeObserver(() => setScale(Math.min(el.clientWidth / w, el.clientHeight / h)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [w, h])

  return (
    <li>
      <label
        className={cn(
          // `relative`: görünmez onay kutusu kutunun içinde konumlansın (odakta pencere kaymasın).
          "group/tile relative flex h-full cursor-pointer flex-col rounded-[1.25rem] border border-border bg-card p-2 transition",
          "hover:border-brand/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/50",
          checked && "border-brand ring-2 ring-brand/25 hover:border-brand",
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onToggle}
          aria-describedby={descId}
        />
        <div
          ref={box}
          aria-hidden="true"
          inert
          className="pointer-events-none relative aspect-[16/9] overflow-hidden rounded-[0.875rem] bg-muted/40"
        >
          {scale > 0 && (
            <div
              className="@container/myspace absolute top-1/2 left-1/2"
              style={{
                width: w,
                height: h,
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
            >
              {render(id, "h-full")}
            </div>
          )}
        </div>
        <div className="flex items-start gap-2 px-1.5 pt-2.5 pb-1">
          <span className="min-w-0 flex-1">
            <span className="block text-[0.8125rem] font-medium">{t(CATALOG[id].title)}</span>
            <span id={descId} className="mt-0.5 block text-[0.71875rem] text-muted-foreground">
              {t(`widgets.catalog.${id}`)}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition",
              checked
                ? "border-transparent bg-brand-fill-deep text-brand-on-brand"
                : "border-border text-transparent",
            )}
          >
            <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={2.5} />
          </span>
        </div>
      </label>
    </li>
  )
}
