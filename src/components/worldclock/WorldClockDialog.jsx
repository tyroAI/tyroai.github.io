import { useCallback, useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import TimeZoneIcon from "@hugeicons/core-free-icons/TimeZoneIcon"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useLocale } from "@/hooks/useLocale"
import { useWorldClock } from "@/hooks/useWorldClock"
import { showResultToast } from "@/lib/refreshToast"
import { cityById, wallClock } from "@/lib/worldClock"
import { ClockFooter } from "./ClockFooter"
import { ClockRow } from "./ClockRow"
import { OverlapRow } from "./OverlapRow"
import { CitySearch } from "./CitySearch"
import { DayNav } from "./DayNav"
import { epochDay, useClockRows } from "./useClockRows"

/**
 * Pencerenin içi — yalnız açıkken çizilir (Radix içeriği kapanınca söker),
 * yani saat her açılışta tazedir ve kapalıyken tıkırdamaz.
 */
function WorldClockBody({ t, locale }) {
  const clock = useWorldClock()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])
  const homeTz = cityById(clock.home)?.tz
  const todayN = epochDay(wallClock(homeTz, new Date(now)))
  const [dayN, setDayN] = useState(null) // null = bugün
  const [base, setBase] = useState(null)
  const [hover, setHover] = useState(null)
  const [pinned, setPinned] = useState(null)
  const sel = dayN ?? todayN
  const view = useClockRows({ ids: clock.cities, home: clock.home, now, dayN: sel, locale, t })
  // Sütunun sol kenarı: kabın dolgusu + bilgi sütunu + şeridin dolgusu.
  const colLeft = (pos) => `calc(0.5rem + var(--info) + 0.5rem + var(--cell) * ${pos})`

  // Dar ekranda şerit kayar: açılışta şu anki saat görünür olsun.
  const nowRef = useRef(null)
  useEffect(() => {
    nowRef.current?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [])

  const onPick = useCallback((i) => setPinned((p) => (p === i ? null : i)), [])
  const onRemove = clock.remove
  const onSetHome = clock.setHome

  function copyTimes() {
    const lines = view.rows.map((r) => {
      const at = r.strip[pinned].at
      return `${r.name} — ${view.timeOf(r.city.tz, at)}, ${view.dateOf(r.city.tz, at)}`
    })
    navigator.clipboard?.writeText(lines.join("\n")).then(
      () => showResultToast({ title: t("worldClock.copied") }),
      () => {},
    )
  }

  const home = view.rows[0]
  const pinnedAt = pinned != null && home ? home.strip[pinned].at : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 border-b border-border px-4 pb-3 pt-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
            <HugeiconsIcon icon={TimeZoneIcon} className="size-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[1.0625rem] font-semibold">
              {t("worldClock.title")}
            </DialogTitle>
            <p className="text-[0.75rem] text-muted-foreground">{t("worldClock.subtitle")}</p>
          </div>
          <DialogClose
            aria-label={t("sheet.close")}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
          </DialogClose>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CitySearch
            exclude={clock.cities}
            onAdd={clock.add}
            locale={locale}
            describe={view.describe}
            timeOf={view.timeOf}
            t={t}
          />
          <DayNav
            base={base ?? todayN - 1}
            selected={sel}
            today={todayN}
            onBase={setBase}
            onSelect={(n) => {
              setDayN(n === todayN ? null : n)
              setPinned(null)
            }}
            locale={locale}
            t={t}
          />
        </div>
      </div>

      {/* Şeritler tek kaydırma alanında: sütunlar satırlar arasında hizalı,
          bilgi sütunu yapışkan. Zaman ekseni her dilde soldan sağa. */}
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-gutter:auto]!">
        <div
          dir="ltr"
          className="relative w-max min-w-full px-2 py-1 [--cell:2.25rem] [--info:11.5rem] sm:[--info:18rem]"
          onPointerLeave={() => setHover(null)}
        >
          {/* Fareyle gezilen saat yumuşak dolgu; seçili saat marka çerçevesi;
              şu an dakikasına kadar yerinde ince bir çizgi. */}
          {hover != null && hover !== pinned && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-[2] w-[var(--cell)] rounded-lg bg-foreground/[0.07]"
              style={{ left: colLeft(hover) }}
            />
          )}
          {pinned != null && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-[2] w-[var(--cell)] rounded-lg border-2 border-brand bg-brand/[0.07]"
              style={{ left: colLeft(pinned) }}
            />
          )}
          {view.nowPos != null && (
            <span
              ref={nowRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 z-[3] w-0.5 -translate-x-1/2 rounded-full bg-brand shadow-[0_0_0_1px_var(--color-popover)]"
              style={{ left: colLeft(view.nowPos) }}
            >
              <span className="absolute -top-0.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-brand" />
            </span>
          )}
          <OverlapRow
            counts={view.overlap}
            total={view.rows.length}
            homeStrip={view.rows[0]?.strip}
            t={t}
            onHover={setHover}
            onPick={onPick}
          />
          {view.rows.map((row) => (
            <ClockRow
              key={row.city.id}
              row={row}
              t={t}
              monthFmt={view.monthFmt}
              hourLabel={view.hourLabel}
              onHover={setHover}
              onPick={onPick}
              onRemove={onRemove}
              onSetHome={onSetHome}
            />
          ))}
        </div>
      </div>

      <ClockFooter
        pinnedAt={pinnedAt}
        homeName={home?.name}
        homeTz={view.homeTz}
        timeOf={view.timeOf}
        dateOf={view.dateOf}
        onCopy={copyTimes}
        onClear={() => setPinned(null)}
        onReset={clock.reset}
        t={t}
      />
    </div>
  )
}

/** Dünya saati penceresi — header'daki düğmeden açılır (`WorldClockButton`). */
export default function WorldClockDialog({ open, onOpenChange }) {
  const { t, locale } = useLocale()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[min(52rem,calc(100dvh-3rem))] sm:w-full sm:max-w-[min(76rem,calc(100vw-2rem))] sm:rounded-2xl sm:p-0"
      >
        <WorldClockBody t={t} locale={locale} />
      </DialogContent>
    </Dialog>
  )
}
