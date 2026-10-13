import { useId, useRef } from "react"
import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { useLocale } from "@/hooks/useLocale"
import { isRtl, rovingIndex } from "@/lib/rovingKeys"
import { inYear } from "@/lib/selfServiceModel"
import { cn } from "@/lib/utils"
import { TABS } from "../kinds"

const GLIDE = { type: "spring", visualDuration: 0.42, bounce: 0.16 }
const STILL = { duration: 0 }

/**
 * Sekmeler: İzinler · Masraflar · İş avansları — seçili dönemdeki kayıt sayılarıyla. WAI-ARIA
 * sekme kalıbı: yalnız seçili sekme sekme durağı, oklar · Home · End sekmeyi değiştirir (sağdan
 * sola dilde ters). Seçim vurgusu sekmeler arasında kayar (Arc'ın tabs bileşeninden, uiarc.dev,
 * MIT); hareketi azalt tercihinde atlar.
 */
export function RecordTabs({ data, tab, year, onTab }) {
  const { t } = useLocale()
  const group = useId()
  const reduce = useReducedMotion()
  const refs = useRef([])
  const at = Math.max(
    0,
    TABS.findIndex((it) => it.id === tab),
  )
  const onKeyDown = (e) => {
    const next = rovingIndex(e.key, at, TABS.length, isRtl(e.currentTarget))
    if (next < 0) return
    e.preventDefault()
    if (next !== at) onTab(TABS[next].id)
    refs.current[next]?.focus()
  }
  return (
    <div
      role="tablist"
      aria-label={t("selfService.records")}
      className="isolate flex gap-1 overflow-x-auto rounded-2xl bg-muted/60 p-1"
    >
      <LayoutGroup id={group}>
        {TABS.map((it, i) => {
          const count = data?.[it.data] ? inYear(data[it.data], year).length : null
          const selected = i === at
          return (
            <button
              key={it.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              id={`ss-tab-${it.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="ss-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => onTab(it.id)}
              onKeyDown={onKeyDown}
              className={cn(
                "relative flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[0.8125rem] @[22rem]/ss:gap-1.5 @[22rem]/ss:px-2 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:min-h-11 @[30rem]/ss:gap-2 @[30rem]/ss:px-3",
                selected ? "text-foreground" : "text-foreground/70 hover:text-foreground",
              )}
            >
              {selected && (
                <motion.span
                  layoutId="tab"
                  aria-hidden="true"
                  transition={reduce ? STILL : GLIDE}
                  className="absolute inset-0 -z-10 rounded-xl bg-card shadow-sm"
                />
              )}
              <HugeiconsIcon
                icon={it.icon}
                className="hidden size-4 shrink-0 @[30rem]/ss:block"
                strokeWidth={1.8}
              />
              {/* Telefonda kısa ad: üç sekme tek satırda kırpılmadan. */}
              <span className="truncate @[30rem]/ss:hidden">
                {t(`selfService.tabShort.${it.id}`)}
              </span>
              <span className="hidden truncate @[30rem]/ss:inline">
                {t(`selfService.tab.${it.id}`)}
              </span>
              {count != null && (
                <span className="rounded-full bg-foreground/[0.07] px-1.5 text-[0.6875rem] tabular-nums">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </LayoutGroup>
    </div>
  )
}
