import { useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"
// Hafta başlangıcı ORTAK: özel günler paneli de "bu hafta / gelecek hafta"
// penceresini aynı tablodan kuruyor (bkz. lib/weekStart.js).
import { FIRST_DAY } from "@/lib/weekStart"

// Hoisted so the per-locale Intl cache key stays stable — a fresh object
// literal each render would allocate a new formatter and never hit the cache
// (the cache keys on locale + JSON.stringify(options)).
const OPTS_MONTH_YEAR = { month: "long", year: "numeric" }
const OPTS_WEEKDAY_NARROW = { weekday: "narrow" }
const OPTS_DAY_FULL = { weekday: "long", day: "numeric", month: "long", year: "numeric" }

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
// Ay atlarken gün ayın sonuna kırpılır (31 Mart → 28/29 Şubat).
function addMonths(d, n) {
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate()
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last))
}

/**
 * The mini calendar at the top of the panel — Outlook's macOS dropdown shape.
 *
 * Collapsed by default to TWO week rows (the week that contains `visibleMonth`
 * plus the next), because the panel's real content is the agenda underneath:
 * six week rows push today's meetings below the fold, and the person opening
 * this is almost always asking "what's next", not browsing October. The
 * chevron underneath expands to the full six-week month, exactly like the
 * disclosure control in Outlook.
 *
 * `visibleMonth` therefore does double duty as the ANCHOR date: collapsed, the
 * grid starts at that date's week and prev/next should step ±14 days;
 * expanded, its month is shown and prev/next step ±1 month. The parent owns
 * that stepping — the grid only reports clicks.
 *
 * ⚠️ **SEÇİCİ KİPİ** (`picker`, 2026-09-29 — Akışım'ın "İzin iste" şablonu).
 * Panelde seçili gün ikincil (açık gri), BUGÜN birincildir: panel "bugün ne
 * var" sorusunu cevaplıyor. Bir tarih SEÇİCİSİNDE ise sorulan şey seçilen
 * gün; orada seçili gün dolu marka rengi, bugün yalnız bir halka. İki ek
 * seçenek de yalnız seçici için: `minDay` (öncesi seçilemez — bitiş,
 * başlangıçtan önce olamaz) ve `rangeFrom` (başlangıç ile seçili gün
 * arasındaki günler hafifçe boyanır). Varsayılanlar değişmedi, yani panelin
 * ve özel günlerin çizimi bit bit aynı.
 */
export function CalendarMonthGrid({
  visibleMonth,
  onPrev,
  onNext,
  selectedDay,
  onSelectDay,
  markedDays,
  collapsed = false,
  onToggleCollapsed,
  actions,
  picker = false,
  minDay,
  rangeFrom,
  daysHidden = false,
  // Dokunmatikte 44 px gün ve ok düğmeleri (talep formu); çağıran kutuyu genişletir.
  roomy = false,
}) {
  const { locale, t } = useLocale()
  const firstDayOfWeek = FIRST_DAY[locale] ?? 1
  // Seçicide klavye (WAI-ARIA date picker): tek sekme durağı, oklar gün/hafta, PageUp/PageDown
  // ay, Home/End hafta başı/sonu; ay dışına çıkınca ay değişir, odak yeni günde kalır.
  const [focusKey, setFocusKey] = useState(null)
  const moved = useRef(false)
  const gridRef = useRef(null)
  useEffect(() => {
    if (!moved.current || !focusKey) return
    moved.current = false
    gridRef.current?.querySelector(`[data-day="${focusKey}"]`)?.focus()
  }, [focusKey, visibleMonth])

  const { weekdayLabels, weekendCols, cells } = useMemo(() => {
    // Weekday headers: walk a known week and rotate to the locale's start day.
    const fmtNarrow = getDateTimeFormat(locale, OPTS_WEEKDAY_NARROW)
    const labels = []
    const weekend = new Set()
    for (let i = 0; i < 7; i++) {
      // 2024-01-07 is a Sunday, so +index lands on each weekday in turn.
      const weekday = (firstDayOfWeek + i) % 7
      labels.push(fmtNarrow.format(new Date(2024, 0, 7 + weekday)))
      // Outlook greys the weekend columns; that is what makes the strip read
      // as a week at a glance rather than seven equal letters.
      if (weekday === 0 || weekday === 6) weekend.add(i)
    }

    let gridStart
    let count
    if (collapsed) {
      // Two rows anchored to the week containing the anchor date.
      const anchor = startOfDay(visibleMonth)
      const lead = (anchor.getDay() - firstDayOfWeek + 7) % 7
      gridStart = new Date(anchor)
      gridStart.setDate(anchor.getDate() - lead)
      count = 14
    } else {
      const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
      const lead = (first.getDay() - firstDayOfWeek + 7) % 7
      gridStart = new Date(first)
      gridStart.setDate(first.getDate() - lead)
      count = 42
    }

    const out = []
    for (let i = 0; i < count; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      out.push(d)
    }
    return { weekdayLabels: labels, weekendCols: weekend, cells: out }
  }, [locale, firstDayOfWeek, visibleMonth, collapsed])

  const today = startOfDay(new Date())
  const todayKey = dayKey(today)
  const selectedKey = selectedDay ? dayKey(selectedDay) : null
  const minTime = minDay ? startOfDay(minDay).getTime() : null
  const fromTime = rangeFrom ? startOfDay(rangeFrom).getTime() : null
  const toTime = selectedDay ? startOfDay(selectedDay).getTime() : null
  const fullDay = getDateTimeFormat(locale, OPTS_DAY_FULL)
  const month = visibleMonth.getMonth()
  const usable = (d) => !collapsed && d.getMonth() === month && !(minTime != null && d < minTime)
  const has = (key) => key && cells.some((d) => dayKey(d) === key && usable(d))
  // Sekme durağı: oklarla gelinen gün → seçili gün → bugün → ayın ilk seçilebilir günü.
  const stopKey = picker
    ? ([focusKey, selectedKey, todayKey].find(has) ??
      (cells.find(usable) ? dayKey(cells.find(usable)) : null))
    : null

  const onDayKey = (e, d) => {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl"
    const lead = (d.getDay() - firstDayOfWeek + 7) % 7
    const moves = {
      ArrowLeft: () => addDays(d, rtl ? 1 : -1),
      ArrowRight: () => addDays(d, rtl ? -1 : 1),
      ArrowUp: () => addDays(d, -7),
      ArrowDown: () => addDays(d, 7),
      PageUp: () => addMonths(d, -1),
      PageDown: () => addMonths(d, 1),
      Home: () => addDays(d, -lead),
      End: () => addDays(d, 6 - lead),
    }
    const next = moves[e.key]?.()
    if (!next) return
    e.preventDefault()
    if (minTime != null && next < minTime) return
    const shift = (next.getFullYear() - visibleMonth.getFullYear()) * 12 + next.getMonth() - month
    if (shift < 0) onPrev?.()
    else if (shift > 0) onNext?.()
    moved.current = true
    setFocusKey(dayKey(next))
  }

  return (
    <div className="px-3 pt-3 pb-1">
      <div className="mb-1.5 flex items-center gap-0.5">
        <span className="inline-block text-[0.9375rem] font-bold tracking-tight [&::first-letter]:uppercase">
          {getDateTimeFormat(locale, OPTS_MONTH_YEAR).format(visibleMonth)}
        </span>
        <button
          type="button"
          onClick={onPrev}
          aria-label={t(collapsed ? "calendar.prevWeeks" : "calendar.prevMonth")}
          className={cn(
            "ml-1 grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground",
            roomy && "pointer-coarse:size-11",
          )}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label={t(collapsed ? "calendar.nextWeeks" : "calendar.nextMonth")}
          className={cn(
            "grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground",
            roomy && "pointer-coarse:size-11",
          )}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" strokeWidth={2} />
        </button>
        {/* The panel-level actions (+ / …) live at the row's far end — they
            belong to the panel, the grid just reserves them the slot so the
            header reads as one line, the way Outlook draws it. */}
        {actions && <div className="ml-auto flex items-center gap-0.5">{actions}</div>}
      </div>

      {/* Arama sırasında yalnız başlık satırı: sonuçlar günü değil ayı izler. */}
      {!daysHidden && (
        <>
          <div ref={gridRef} className="grid grid-cols-7 gap-y-0.5">
            {weekdayLabels.map((label, i) => (
              <span
                key={`h-${i}`}
                className={cn(
                  "grid h-6 place-items-center text-[0.625rem] font-semibold uppercase",
                  // Seçicide okunur kontrast (AA): hafta içi koyu, hafta sonu gri.
                  picker
                    ? weekendCols.has(i)
                      ? "text-muted-foreground"
                      : "text-foreground/75"
                    : weekendCols.has(i)
                      ? "text-muted-foreground/35"
                      : "text-muted-foreground/70",
                )}
              >
                {label}
              </span>
            ))}
            {cells.map((d) => {
              const key = dayKey(d)
              // Collapsed rows span month boundaries, so "in month" would grey
              // half the strip for no reason a reader can see — every visible day
              // is equally real there.
              const dim = !collapsed && d.getMonth() !== visibleMonth.getMonth()
              const isToday = key === todayKey
              const isSelected = key === selectedKey
              const marked = markedDays?.has(key)
              const time = d.getTime()
              const disabled = minTime != null && time < minTime
              const isFrom = fromTime != null && time === fromTime
              const inRange = fromTime != null && toTime != null && time > fromTime && time < toTime
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  aria-pressed={picker ? isSelected : undefined}
                  aria-label={picker ? fullDay.format(d) : undefined}
                  data-day={picker ? key : undefined}
                  tabIndex={picker ? (key === stopKey ? 0 : -1) : undefined}
                  onKeyDown={picker ? (e) => onDayKey(e, d) : undefined}
                  onFocus={picker ? () => setFocusKey(key) : undefined}
                  onClick={() => onSelectDay(startOfDay(d))}
                  className={cn(
                    "relative mx-auto grid size-7 place-items-center rounded-full text-[0.71875rem] tabular-nums transition",
                    roomy && "pointer-coarse:size-11 pointer-coarse:text-[0.875rem]",
                    // Seçicide ay dışı günler de seçilebilir: soluk değil, gri (AA kontrast).
                    dim
                      ? picker
                        ? "text-muted-foreground"
                        : "text-muted-foreground/35"
                      : "text-foreground",
                    picker
                      ? [
                          "outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-1 focus-visible:ring-offset-popover",
                          disabled && "cursor-not-allowed text-muted-foreground/25",
                          !disabled && !isSelected && "hover:bg-accent/60",
                          inRange && "bg-brand/[0.10]",
                          isFrom && !isSelected && "bg-brand/[0.18] font-semibold",
                          isToday && !isSelected && "font-semibold text-brand ring-1 ring-brand/50",
                          isSelected && "bg-brand font-semibold text-white shadow-sm",
                        ]
                      : [
                          !isToday && !isSelected && "hover:bg-accent/60",
                          isSelected && !isToday && "bg-accent font-semibold",
                          // A filled circle, not a rounded square — the one shape every
                          // calendar user already reads as "today".
                          isToday && "bg-brand font-semibold text-white shadow-sm",
                        ],
                  )}
                >
                  {d.getDate()}
                  {marked && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute bottom-0.5 size-1 rounded-full",
                        isToday ? "bg-white/80" : "bg-brand",
                      )}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={t(collapsed ? "calendar.expandGrid" : "calendar.collapseGrid")}
              className="mt-0.5 flex w-full items-center justify-center rounded-md py-0.5 text-muted-foreground/70 transition hover:bg-accent/50 hover:text-foreground"
            >
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className={cn(
                  "size-4 transition-transform duration-200",
                  !collapsed && "rotate-180",
                )}
                strokeWidth={2}
              />
            </button>
          )}
        </>
      )}
    </div>
  )
}
