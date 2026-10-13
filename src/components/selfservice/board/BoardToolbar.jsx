import { useEffect, useMemo, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Calendar01Icon from "@hugeicons/core-free-icons/Calendar01Icon"
import FilterRemoveIcon from "@hugeicons/core-free-icons/FilterRemoveIcon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon"
import { Kbd } from "@/components/ui/kbd"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { FacetMenu } from "../filters/FacetMenu"
import { StatusChips } from "../filters/StatusChips"
import { MONTH } from "../kinds"

/** Odak bir yazı alanındayken "/" yazıdır, kısayol değil. */
function typing(target) {
  const el = target instanceof Element ? target : null
  return Boolean(
    el?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']"),
  )
}

/**
 * Listenin araç çubuğu: arama ("/" ile odak), tür/kategori seçici, ay seçici, Temizle ve durum
 * çipleri. Süzgeçler adreste (`f`, `m`, `status`); arama yerel. Dar kapta arama ve seçiciler
 * tek satırda (seçiciler boşken yalnız ikon): liste ilk ekrana yaklaşsın.
 */
export function BoardToolbar({ tab, query, onQuery, view, onFacet, onMonth, onStatus, onClear }) {
  const { t, locale } = useLocale()
  const input = useRef(null)
  const monthFmt = getDateTimeFormat(locale, MONTH)
  const months = useMemo(
    () =>
      view.monthOptions.map((o) => ({
        key: o.key,
        label: monthFmt.format(o.date),
        count: o.count,
      })),
    [view.monthOptions, monthFmt],
  )
  const active = Boolean(query || view.filters.status || view.filters.facet || view.filters.month)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return
      if (!input.current || input.current.offsetParent === null) return
      e.preventDefault()
      input.current.focus()
      input.current.select()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex h-9 min-w-0 flex-1 basis-40 items-center pointer-coarse:h-11 @[40rem]/ss:basis-56">
          <HugeiconsIcon
            icon={Search01Icon}
            aria-hidden="true"
            className="pointer-events-none absolute start-3 size-4 text-muted-foreground"
          />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              // Dolu kutuda Escape temizler ve rıhtıma kaçmaz.
              if (e.key === "Escape" && query) {
                e.stopPropagation()
                e.preventDefault()
                onQuery("")
              }
            }}
            placeholder={t(`selfService.search.${tab}`)}
            aria-label={t(`selfService.search.${tab}`)}
            aria-keyshortcuts="/"
            className="peer h-full w-full rounded-full border border-border bg-card ps-9 pe-3 text-[0.8125rem] pointer-fine:pe-9 outline-none transition focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/20"
          />
          {!query && (
            <Kbd
              aria-hidden="true"
              className="pointer-events-none absolute end-3 hidden transition-opacity peer-focus:opacity-0 pointer-fine:inline-flex"
            >
              /
            </Kbd>
          )}
        </label>
        {view.facetOptions.length > 0 && (
          <FacetMenu
            icon={Tag01Icon}
            label={t(`selfService.facet.${tab}`)}
            allLabel={t("selfService.facet.all")}
            value={view.filters.facet}
            options={view.facetOptions}
            onSelect={onFacet}
            compact
          />
        )}
        {months.length > 1 && (
          <FacetMenu
            icon={Calendar01Icon}
            label={t("selfService.month.label")}
            allLabel={t("selfService.month.all")}
            value={view.filters.month}
            options={months}
            onSelect={onMonth}
            compact
          />
        )}
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[0.75rem] font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:h-11"
          >
            <HugeiconsIcon icon={FilterRemoveIcon} aria-hidden="true" className="size-3.5" />
            {t("selfService.filter.clear")}
          </button>
        )}
      </div>
      <StatusChips
        options={view.statusOptions}
        total={view.statusTotal}
        value={view.filters.status}
        onChange={onStatus}
      />
    </div>
  )
}
