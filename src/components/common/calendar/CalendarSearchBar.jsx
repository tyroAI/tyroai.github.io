import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import { useLocale } from "@/hooks/useLocale"
import { CALENDAR_FILTERS } from "@/lib/calendarSearch"
import { cn } from "@/lib/utils"

const ICON_BTN =
  "grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/**
 * Takvim panelinin arama satırı: metin (konu, düzenleyen, yer, katılımcı) ve
 * tek seçimli süzgeç (Tümü · Teams · Yanıt bekleyen · Düzenlediğim). Açılınca
 * imleç kutuda bekler; Esc önce metni, sonra aramayı kapatır (panelde).
 */
export function CalendarSearchBar({ query, onQuery, filter, onFilter, onClose }) {
  const { t } = useLocale()
  return (
    <div className="space-y-2 border-t border-border/50 px-3 pb-2.5 pt-2.5">
      <div className="flex items-center gap-1">
        <div className="relative min-w-0 flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
            aria-hidden="true"
          />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t("calendar.searchPlaceholder")}
            aria-label={t("calendar.search")}
            className="h-8 w-full rounded-lg border border-input bg-background pe-8 ps-8 text-[0.78125rem] outline-none transition placeholder:text-muted-foreground focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/20 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQuery("")}
              aria-label={t("calendar.searchClear")}
              title={t("calendar.searchClear")}
              className="absolute end-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" strokeWidth={2.2} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("calendar.searchClose")}
          title={t("calendar.searchClose")}
          className={ICON_BTN}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
        </button>
      </div>
      <div role="radiogroup" aria-label={t("calendar.search")} className="flex flex-wrap gap-1">
        {CALENDAR_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            onClick={() => onFilter(f)}
            className={cn(
              "h-6 rounded-full px-2.5 text-[0.6875rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:h-8",
              filter === f
                ? "bg-brand text-white"
                : "bg-muted/70 text-foreground/75 hover:bg-muted hover:text-foreground",
            )}
          >
            {t(`calendar.filter.${f}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
