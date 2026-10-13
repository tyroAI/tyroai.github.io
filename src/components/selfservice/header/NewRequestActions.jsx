import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon"
import { BottomSheet } from "@/components/common/BottomSheet"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { TABS } from "../kinds"

const SOFT =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand/[0.09] px-3.5 text-[0.8125rem] font-semibold text-brand-ink transition hover:bg-brand/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:h-11 [&_svg]:size-4"

/**
 * Yeni talep düğmeleri (İzin talebi · Masraf girişi · İş avansı talebi) — talep formu açılır,
 * gönderilince TYRO sohbetinde sürer. Genişte üç düğme; telefonda tek "Yeni talep" ve alttan
 * çekmecede üç seçenek. Seçim `onNew(kind, from)` ile (`kind`: leave · expense · advance;
 * `from`: form kapanınca odağın döneceği düğme — çekmecenin seçeneği o sırada yok olmuştur).
 */
export function NewRequestActions({ onNew }) {
  const { t } = useLocale()
  const [sheet, setSheet] = useState(false)
  const trigger = useRef(null)
  return (
    <>
      <div className="hidden items-center gap-1.5 @[44rem]/ss:flex">
        <span className="me-1 hidden items-center gap-1.5 text-[0.6875rem] font-medium text-muted-foreground @[64rem]/ss:inline-flex">
          <HugeiconsIcon icon={AiChat02Icon} aria-hidden="true" className="size-3.5" />
          {t("selfService.new.hint")}
        </span>
        {TABS.map((it) => (
          <button
            key={it.id}
            type="button"
            aria-haspopup="dialog"
            onClick={() => onNew(it.id)}
            className={SOFT}
          >
            <HugeiconsIcon icon={it.cta} strokeWidth={1.9} aria-hidden="true" />
            {t(`selfService.cta.${it.id}`)}
          </button>
        ))}
      </div>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setSheet(true)}
        className={cn(
          SOFT,
          "bg-brand-fill-deep text-brand-on-brand hover:bg-brand-fill-deep hover:brightness-110 @[44rem]/ss:hidden",
        )}
      >
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2.2} aria-hidden="true" />
        {t("selfService.new.label")}
      </button>
      <BottomSheet
        open={sheet}
        onOpenChange={setSheet}
        title={t("selfService.new.label")}
        description={t("selfService.new.hint")}
        closeOnBack
      >
        <p className="-mt-1 mb-3 flex items-center gap-1.5 text-[0.75rem] text-muted-foreground">
          <HugeiconsIcon icon={AiChat02Icon} aria-hidden="true" className="size-3.5" />
          {t("selfService.new.hint")}
        </p>
        <ul className="space-y-1.5 pb-2">
          {TABS.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => {
                  setSheet(false)
                  onNew(it.id, trigger.current)
                }}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border/70 bg-card px-3 py-2.5 text-start transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-ink">
                  <HugeiconsIcon icon={it.cta} className="size-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-semibold text-foreground">
                    {t(`selfService.cta.${it.id}`)}
                  </span>
                  <span className="block text-[0.75rem] text-muted-foreground">
                    {t(`selfService.new.desc.${it.id}`)}
                  </span>
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
                />
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </>
  )
}
