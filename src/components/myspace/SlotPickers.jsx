import { useId, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { CalendarMonthGrid } from "@/components/common/CalendarMonthGrid"
import { useLocale } from "@/hooks/useLocale"
import { fold } from "@/lib/fold"
import { optionLabel } from "@/lib/promptTemplates"
import { cn } from "@/lib/utils"

/**
 * Alanlı hazır sorunun seçici gövdeleri — sohbetin cümlesi (`TemplatePrompt`) ve Self Servis
 * talep formları (`selfservice/request`) aynı takvimi ve aramalı listeyi kullanır.
 */

/* Açılışta ayın hangisi olduğu: seçili gün → alt sınır (başlangıç) → bugün.
   Ayrı bileşen, çünkü içerik kapanınca sökülüyor ve her açılış taze bir ayla
   başlamalı — ebeveynde tutulan bir ay, geçen açılışta gezinilen ayda kalırdı. */
export function DatePickerBody({ value, min, rangeFrom, onPick, roomy }) {
  const [month, setMonth] = useState(() => value ?? min ?? new Date())
  const step = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1))
  return (
    <CalendarMonthGrid
      visibleMonth={month}
      onPrev={() => step(-1)}
      onNext={() => step(1)}
      selectedDay={value ?? null}
      onSelectDay={onPick}
      picker
      minDay={min}
      rangeFrom={rangeFrom}
      roomy={roomy}
    />
  )
}

/* Ayrı bileşen: içerik kapanınca sökülüyor, her açılış boş bir aramayla
   başlıyor (`DatePickerBody` ile aynı gerekçe). Arama kutusu WAI-ARIA combobox'ı: odak kutuda
   kalır, oklarla gezilen seçenek `aria-activedescendant` ile ekran okuyucuya bildirilir. */
export function SearchList({ slot, field, value, onPick }) {
  const { t, locale } = useLocale()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const listRef = useRef(null)
  const listId = `${useId().replace(/:/g, "")}-list`
  const optionId = (i) => `${listId}-${i}`

  const items = useMemo(
    () =>
      slot.options.map((o) => {
        const label = optionLabel(t, slot, o)
        const sub = slot.describe?.(o) ?? ""
        return { o, label, sub, hay: fold(`${label} ${sub}`) }
      }),
    [slot, t],
  )
  const words = fold(query).split(/\s+/).filter(Boolean)
  const shown = words.length ? items.filter((it) => words.every((w) => it.hay.includes(w))) : items
  const at = Math.min(active, Math.max(shown.length - 1, 0))

  const move = (next) => {
    setActive(next)
    listRef.current?.children?.[next]?.scrollIntoView({ block: "nearest" })
  }

  return (
    <div className="flex flex-col">
      <label className="relative flex items-center border-b border-border">
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute start-3 size-3.5 text-muted-foreground"
          strokeWidth={2}
        />
        <span className="sr-only">{field}</span>
        <input
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={shown.length ? optionId(at) : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              move(Math.min(at + 1, shown.length - 1))
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              move(Math.max(at - 1, 0))
            } else if (e.key === "Enter") {
              e.preventDefault()
              if (shown[at]) onPick(shown[at].o)
            }
          }}
          placeholder={t("myspace.template.search")}
          autoComplete="off"
          className="no-ios-zoom h-9 w-full bg-transparent ps-8 pe-3 text-[0.8125rem] outline-none placeholder:text-muted-foreground/70 pointer-coarse:h-11"
        />
      </label>
      <p
        className="px-3 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        lang={locale}
      >
        {field}
      </p>
      {shown.length === 0 ? (
        <p className="px-3 pb-3 pt-1 text-[0.8125rem] text-muted-foreground">
          {t("myspace.template.noMatch")}
        </p>
      ) : (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={field}
          className="max-h-[min(16rem,40vh)] overflow-y-auto overscroll-contain p-1"
        >
          {shown.map((it, i) => {
            const selected = it.o === value
            return (
              <button
                key={it.o}
                id={optionId(i)}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                onPointerMove={() => i !== at && setActive(i)}
                onClick={() => onPick(it.o)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-start text-[0.8125rem] outline-none transition pointer-coarse:min-h-11 pointer-coarse:items-center",
                  i === at && "bg-accent",
                  selected && "font-semibold",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className={cn("block", slot.describe && "font-semibold tabular-nums")}>
                    {it.label}
                  </span>
                  {it.sub && (
                    <span className="block text-[0.6875rem] leading-snug text-foreground/65 [overflow-wrap:anywhere]">
                      {it.sub}
                    </span>
                  )}
                </span>
                {selected && (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    className="mt-0.5 size-3.5 shrink-0 text-brand"
                    strokeWidth={2.2}
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
