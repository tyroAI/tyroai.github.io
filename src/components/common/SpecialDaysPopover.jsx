import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { CalendarMonthGrid } from "./CalendarMonthGrid"
import { useCelebrations, STATUS } from "@/hooks/useCelebrations"
import { useLocale } from "@/hooks/useLocale"
import { useMyIdentity } from "@/hooks/useMyCelebration"
import { ANNIVERSARY_DAYS, BIRTHDAY_DAYS } from "@/lib/celebrations"
import { isMine } from "@/lib/myCelebration"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { startOfDay } from "@/lib/calendarRange"
import { endOfNextWeek } from "@/lib/weekStart"
import { specialDaysOfYear, hasReligiousData, isoOf } from "@/data/specialDays"
import { cn } from "@/lib/utils"
import { DayAgenda } from "./special-days/DayAgenda"
import { DayRow } from "./special-days/DayRow"
import { SpecialDaysButton } from "./special-days/SpecialDaysButton"
import { countdownLabel, gridKey, gridKeyOf, parseIso } from "./special-days/dayMath"

/**
 * ÖZEL GÜNLER — header'daki tarih hapının açtığı panel: üstte takvim yaprağı
 * (`CalendarMonthGrid`, iki hafta; ok ayı açar), altında SEÇİLİ GÜNÜN özeti
 * (varsayılan bugün; `DayAgenda`: özel gün · doğum günleri · iş yıl dönümleri
 * · aramıza katılanlar) ve yılın özel günleri (yaklaşanlar önce, geçmiş katlı).
 *
 * Graph'a gitmez: tatiller statik tablodan (`data/specialDays.js`), kutlamalar
 * `useCelebrations`ın önbelleğinden (ek istek yok; yetkisi olmayanda kişi
 * grupları hiç çizilmez). Kurallar ve gerekçeler: `docs/features/ozel-gunler.md`.
 */

// Kütük doğum günü ve yıl dönümünü önümüzdeki bu kadar gün için taşıyor.
const WINDOW_DAYS = Math.min(BIRTHDAY_DAYS, ANNIVERSARY_DAYS)
const OPTS_DAY_MONTH = { day: "numeric", month: "long" }
const OPTS_WEEKDAY = { weekday: "long" }

export function SpecialDaysPopover({ trigger, side, align = "end" } = {}) {
  const { locale, t } = useLocale()
  const today = startOfDay(new Date())
  const todayIso = isoOf(today)
  const [visibleMonth, setVisibleMonth] = useState(today)
  const [selectedDay, setSelectedDay] = useState(null) // null = bugün
  const [gridCollapsed, setGridCollapsed] = useState(true)
  const [showPast, setShowPast] = useState(false)

  const year = visibleMonth.getFullYear()
  const days = useMemo(() => specialDaysOfYear(year), [year])
  const past = useMemo(() => days.filter((s) => s.to < todayIso), [days, todayIso])
  const upcoming = useMemo(() => days.filter((s) => s.to >= todayIso), [days, todayIso])

  /* "Bu hafta ya da gelecek hafta" — pencere `lib/weekStart.js`te. */
  const soonIso = useMemo(() => isoOf(endOfNextWeek(today, locale)), [today, locale])
  const soon = useMemo(() => upcoming.filter((s) => s.from <= soonIso), [upcoming, soonIso])

  /* İK kütüğünden önümüzdeki günlerin kutlamaları. Kişinin kendisi listede
     kalır ("Senin günün") ama rozete girmez. */
  const celebrations = useCelebrations()
  const ids = useMyIdentity()
  const peopleKnown = celebrations.status === STATUS.ready
  const people = useMemo(() => {
    if (!peopleKnown) return []
    const pick = (list, kind) =>
      (list ?? []).map((p) => ({ ...p, kind, self: isMine(ids, p.mail) }))
    return [
      ...pick(celebrations.birthdays, "birthday"),
      ...pick(celebrations.anniversaries, "anniversary"),
      ...pick(celebrations.joiners, "joiner"),
    ]
  }, [celebrations, ids, peopleKnown])

  /* Izgaradaki işaretler: tatiller + kutlama olan günler. Dar kipte ızgara ay
     sınırını aştığı için komşu yıllar da taranır. Anahtar ızgaranınki
     (`gridKey`, ay 0 tabanlı) — ISO verilirse hiçbir nokta çizilmez. */
  const marked = useMemo(() => {
    const set = new Set()
    for (const y of [year - 1, year, year + 1]) {
      for (const s of specialDaysOfYear(y)) for (const iso of s.dates) set.add(gridKey(iso))
    }
    for (const p of people) {
      const d = new Date(today)
      d.setDate(d.getDate() + p.inDays)
      set.add(gridKeyOf(d))
    }
    return set
    // `today` her çizimde yeni nesne; gün değişimi `todayIso`dan okunur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, people, todayIso])

  const fmtDayMonth = getDateTimeFormat(locale, OPTS_DAY_MONTH)
  const fmtWeekday = getDateTimeFormat(locale, OPTS_WEEKDAY)

  // Dar kipte bir adım İKİ HAFTA (yaprağın boyu), açık kipte bir ay.
  const step = (delta) =>
    setVisibleMonth((m) => {
      if (gridCollapsed) {
        const next = new Date(m)
        next.setDate(next.getDate() + delta * 14)
        return next
      }
      return new Date(m.getFullYear(), m.getMonth() + delta, 1)
    })

  const pick = (d) => {
    setVisibleMonth(d)
    setSelectedDay(isoOf(d) === todayIso ? null : startOfDay(d))
  }
  // Seçili günü bir gün geri/ileri al (ızgara da o güne gider).
  const stepDay = (delta) => {
    const d = new Date(selectedDay ?? today)
    d.setDate(d.getDate() + delta)
    pick(d)
  }
  const toToday = () => {
    setSelectedDay(null)
    setVisibleMonth(today)
  }

  // Geçmiş bir yıla gezinildiğinde liste boş kalmasın.
  const pastOpen = showPast || upcoming.length === 0

  // Rozet: yaklaşan tatiller + BUGÜNÜN kutlamaları (kendisi hariç).
  const badge = soon.length + people.filter((p) => p.inDays === 0 && !p.self).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Glif sayıya göre: rozet varken çan, yokken işaretli takvim
            (gerekçe belgede). Rozetin rengi paletten (`--badge`). */}
        {trigger ?? <SpecialDaysButton badge={badge} />}
      </PopoverTrigger>
      {/* Ölçü tarifi MailPopover.jsx'te yazılı — paneller aynı reçeteyi paylaşır. */}
      <PopoverContent
        side={side}
        align={align}
        sideOffset={side ? 14 : 8}
        collisionPadding={24}
        className="flex max-h-[min(30rem,calc(100dvh-8rem))] w-[min(23rem,calc(100vw-3rem))] flex-col gap-0 overflow-hidden p-0 sm:max-h-[min(40rem,calc(100dvh-5rem))]"
      >
        <div className="shrink-0">
          <CalendarMonthGrid
            visibleMonth={visibleMonth}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            selectedDay={selectedDay}
            onSelectDay={(d) => {
              // Seçili güne yeniden basmak bugüne döndürür.
              if (selectedDay && isoOf(selectedDay) === isoOf(d)) toToday()
              else pick(d)
            }}
            markedDays={marked}
            collapsed={gridCollapsed}
            onToggleCollapsed={() => setGridCollapsed((v) => !v)}
          />
        </div>

        <Separator className="shrink-0" />

        {/* Yaklaşan tatil şeridi: yalnız pencere içinde bir tatil varken (haber). */}
        {soon.length > 0 && (
          <button
            type="button"
            onClick={() => pick(parseIso(soon[0].from))}
            className="flex shrink-0 items-center gap-2 border-b border-border bg-brand/[0.10] px-4 py-2 text-start transition hover:bg-brand/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
          >
            <HugeiconsIcon
              icon={Flag02Icon}
              className="size-3.5 shrink-0 text-brand"
              strokeWidth={2.2}
            />
            <span className="min-w-0 flex-1 truncate text-[0.71875rem] font-medium text-foreground">
              {t(`special.day.${soon[0].id}`)}
            </span>
            <span className="shrink-0 text-[0.6875rem] font-semibold tabular-nums text-brand">
              {countdownLabel(soon[0], todayIso, t)}
            </span>
          </button>
        )}

        {/* Gün özeti ve yılın listesi TEK kaydırma alanı: ızgara yerinde kalır. */}
        <div className="min-h-0 overflow-y-auto overscroll-contain pb-1 [scrollbar-gutter:auto]! [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/15">
          <DayAgenda
            day={selectedDay ?? today}
            todayIso={todayIso}
            people={people}
            peopleKnown={peopleKnown}
            windowDays={WINDOW_DAYS}
            holidays={[...past, ...upcoming]}
            onToday={toToday}
            onStep={stepDay}
            fmtDayMonth={fmtDayMonth}
            fmtWeekday={fmtWeekday}
            t={t}
          />

          <div className="flex items-baseline gap-2 px-4 pb-1 pt-3">
            <span className="text-[0.625rem] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
              {t("special.title")}
            </span>
            <span className="ml-auto text-[0.6875rem] font-semibold tabular-nums text-muted-foreground">
              {year}
            </span>
          </div>

          {upcoming.map((s) => (
            <DayRow
              key={s.id + s.from}
              entry={s}
              todayIso={todayIso}
              fmtDayMonth={fmtDayMonth}
              fmtWeekday={fmtWeekday}
              t={t}
              onPick={pick}
              highlight={soon.some((x) => x.from === s.from)}
            />
          ))}

          {upcoming.length === 0 && past.length > 0 && (
            <p className="px-4 pb-1 pt-2 text-[0.6875rem] text-muted-foreground/70">
              {t("special.noneUpcoming")}
            </p>
          )}

          {/* Geçmiş günler katlı: önce yaklaşanlar; düğme `aria-expanded` taşır. */}
          {past.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowPast((v) => !v)}
                aria-expanded={pastOpen}
                className="mt-1 flex w-full items-center gap-1.5 border-t border-border px-4 py-2 text-left text-[0.6875rem] font-medium text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className={cn("size-3.5 shrink-0 transition-transform", pastOpen && "rotate-90")}
                  strokeWidth={2.2}
                />
                {t("special.past")}
                <span className="tabular-nums text-muted-foreground/70">({past.length})</span>
              </button>
              {pastOpen &&
                past.map((s) => (
                  <DayRow
                    key={s.id + s.from}
                    entry={s}
                    todayIso={todayIso}
                    fmtDayMonth={fmtDayMonth}
                    fmtWeekday={fmtWeekday}
                    t={t}
                    onPick={pick}
                    dim
                  />
                ))}
            </>
          )}

          {/* Eksik veri söylenir: dinî bayramlar elle girilir (data/specialDays.js). */}
          {!hasReligiousData(year) && (
            <p className="flex items-start gap-2 border-t border-border px-4 py-3 text-[0.6875rem] leading-snug text-muted-foreground/70">
              <HugeiconsIcon
                icon={Flag02Icon}
                className="mt-px size-3.5 shrink-0"
                strokeWidth={2}
              />
              {t("special.religiousMissing")}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
