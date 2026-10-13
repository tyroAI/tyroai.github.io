import { useId, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon"
import { cityName, searchCities } from "@/lib/worldClock"
import { cn } from "@/lib/utils"

/**
 * Şehir ekleme kutusu (combobox): yazdıkça katalog ve tarayıcının saat
 * dilimi listesi aranır; ok tuşları, Enter ve Escape çalışır. Escape önce
 * aramayı temizler — pencereyi kapatmaz.
 */
export function CitySearch({ exclude, onAdd, locale, describe, timeOf, t }) {
  const [q, setQ] = useState("")
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const listId = useId()
  const results = useMemo(
    () => searchCities(q, { locale, regionName: (cc) => (cc ? describe({ cc }) : ""), exclude }),
    [q, locale, describe, exclude],
  )
  const shown = open && q.trim().length > 0

  function pick(city) {
    onAdd(city.id)
    setQ("")
    setActive(0)
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      setOpen(true)
      const step = e.key === "ArrowDown" ? 1 : -1
      setActive((a) => (results.length ? (a + step + results.length) % results.length : 0))
    } else if (e.key === "Enter" && shown && results[active]) {
      e.preventDefault()
      pick(results[active])
    } else if (e.key === "Escape" && q) {
      e.stopPropagation()
      setQ("")
    }
  }

  return (
    <div className="relative w-full sm:w-72">
      <HugeiconsIcon
        icon={PlusSignIcon}
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={2}
        aria-hidden="true"
      />
      <input
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown && results[active] ? `${listId}-${active}` : undefined}
        aria-label={t("worldClock.add")}
        placeholder={t("worldClock.add")}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-lg border border-input bg-background pe-3 ps-9 text-[0.8125rem] outline-none transition placeholder:text-muted-foreground focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/20"
      />
      {shown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-lg border border-border bg-popover p-1 shadow-lg [scrollbar-gutter:auto]!"
        >
          {results.length === 0 && (
            <li className="px-3 py-2 text-[0.8125rem] text-muted-foreground">
              {t("worldClock.noResults")}
            </li>
          )}
          {results.map((city, i) => (
            <li
              key={city.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // Tıklama bitmeden kutu odağı kaybedip listeyi kapatmasın.
              onPointerDown={(e) => e.preventDefault()}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(city)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5",
                i === active && "bg-accent",
              )}
            >
              <span className="min-w-0 flex-1">
                <span dir="auto" className="block truncate text-[0.8125rem] font-medium">
                  {cityName(city, locale)}
                </span>
                <span dir="auto" className="block truncate text-[0.6875rem] text-muted-foreground">
                  {describe(city)}
                </span>
              </span>
              <span className="shrink-0 text-[0.75rem] font-semibold tabular-nums text-muted-foreground">
                {timeOf(city.tz)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
