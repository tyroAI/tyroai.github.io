import { useCallback, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { PanelFooterAction } from "@/components/common/PanelFooterAction"
import { Skeleton } from "@/components/ui/skeleton"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { DateTimePill } from "@/components/common/DateTimePill"
import { useMsal } from "@azure/msal-react"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { useCalendarEvents, groupEventsByDay, daysWithEvents } from "@/hooks/useCalendarEvents"
import { STATUS, requestGraphScopes } from "@/lib/graph"
import { CalendarMonthGrid } from "./CalendarMonthGrid"
import { AgendaDay } from "./calendar/AgendaDay"
import { CalendarSearchBar } from "./calendar/CalendarSearchBar"
import { SearchResults } from "./calendar/SearchResults"
import { StateMessage } from "./calendar/StateMessage"
import { SharedCalendarBar } from "./SharedCalendarBar"
import { readSharedCalendars, writeSharedCalendars } from "@/lib/sharedCalendars"
import { AGENDA_DAYS, calendarRange, startOfDay } from "@/lib/calendarRange"
import { derivePeopleFromEvents } from "@/lib/derivePeople"
import { bucketsOf, filterEvents, isSearching } from "@/lib/calendarSearch"
import { cn } from "@/lib/utils"

const OPTS_WEEKDAY_LONG = { weekday: "long" }
const OPTS_DAY_MONTH = { day: "numeric", month: "long" }
const ACTION_BTN =
  "grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** `trigger`/`side`/`align`: bkz. MailPopover — çentik aynı paneli soldan açar. */
export function CalendarPopover({ trigger, side, align = "end", open, onOpenChange } = {}) {
  const { locale, t } = useLocale()
  /* Rozet kapısı — gerekçe tetikleyicinin yanında. */
  const wide = useMediaQuery("(min-width: 1024px)")
  const today = startOfDay(new Date())
  // Doubles as the mini-grid's anchor: collapsed, the grid shows this date's
  // week + the next; expanded, this date's month. See CalendarMonthGrid.
  const [visibleMonth, setVisibleMonth] = useState(today)
  const [selectedDay, setSelectedDay] = useState(null)
  // Collapsed by default, like the macOS Outlook dropdown: the agenda is the
  // content, the grid is navigation.
  const [gridCollapsed, setGridCollapsed] = useState(true)

  // Fetch a window that covers the visible grid, TODAY, and the whole agenda
  // — whichever direction the user has navigated. The agenda anchors to
  // `selectedDay ?? today` regardless of what month the grid shows, so a
  // window derived from the grid alone breaks the moment someone pages back:
  // June's window ends in July, today's buckets all miss it, fourteen days
  // print "no events" over a full calendar, and the header badge zeroes — and
  // stays zeroed, because this component lives in the always-mounted header.
  const { rangeStart, rangeEnd } = useMemo(
    // Formül `@/lib/calendarRange`'de: sohbetteki referans seçici de aynı
    // aralığı istiyor ve önbellek anahtarı tam ISO aralığını içerdiği için
    // bir milisaniyelik fark ikinci bir çekim demek.
    () => calendarRange({ visibleMonth, selectedDay, today }),
    [visibleMonth, selectedDay, today],
  )

  // Takvimi bizimle paylaşan kişiler. Liste bu tarayıcıda saklanır; Graph
  // "kim paylaştı" diye sorulabilecek bir uç sunmuyor (bkz. sharedCalendars).
  const [people, setPeople] = useState(readSharedCalendars)
  const updatePeople = useCallback((next) => {
    setPeople(next)
    writeSharedCalendars(next)
  }, [])

  const { status, events, refresh, error, unreachable } = useCalendarEvents(
    rangeStart,
    rangeEnd,
    true,
    people,
  )
  const staleSession = error && error !== "consent_required"
  const { instance, accounts } = useMsal()

  // Popup first, then refetch — the user stays exactly where they were.
  async function connect() {
    const ok = await requestGraphScopes(instance, accounts[0], ["Calendars.Read"])
    if (ok) refresh()
  }

  /**
   * Takvim eklemek için ADAY kişiler — kendi toplantılarının katılımcıları.
   *
   * Kullanıcının elle adres yazmasını istemiyoruz: takvimini paylaşan kişi
   * neredeyse her zaman aynı toplantılarda bulunduğu biri ve o veri ZATEN
   * elimizde (etkinliklerin katılımcı listesi). Sık görüneni öne alır;
   * dizin araması yeni bir izin isterdi.
   */
  const myAddress = (accounts[0]?.username ?? "").toLowerCase()
  const candidates = useMemo(() => derivePeopleFromEvents(events, myAddress), [events, myAddress])

  const marked = useMemo(() => daysWithEvents(events), [events])

  // Today's meetings, shown on the trigger the way mail shows unread — the
  // point is to answer "anything on today?" without opening anything.
  const todayCount = useMemo(
    () => groupEventsByDay(events, today, 1)[0]?.events.length ?? 0,
    [events, today],
  )

  // Agenda starts at the selected day when the user picks one, otherwise
  // today. EMPTY days stay in — Outlook lists "Çarşamba · 12 Ağustos /
  // Zamanlanan etkinlik yok" rather than skipping the day, and that absence
  // is information: it answers "is Wednesday free?" without being asked.
  const agendaFrom = selectedDay ?? today
  const buckets = useMemo(
    () => groupEventsByDay(events, agendaFrom, AGENDA_DAYS),
    [events, agendaFrom],
  )
  const hasAnyEvent = useMemo(() => buckets.some((b) => b.events.length > 0), [buckets])

  // Arama yüklü aralığın tamamında (bkz. calendarRange); panel kapanınca sıfırlanır.
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const closeSearch = () => {
    setSearchOpen(false)
    setQuery("")
    setFilter("all")
  }
  const searching = searchOpen && isSearching({ query, filter })
  const results = useMemo(
    () => (searching ? bucketsOf(filterEvents(events, { query, filter })) : []),
    [searching, events, query, filter],
  )

  function dayLabel(day) {
    const diff = Math.round((day - today) / 86400000)
    const prefix = diff === 0 ? t("calendar.today") : diff === 1 ? t("calendar.tomorrow") : null
    return {
      prefix,
      weekday: getDateTimeFormat(locale, OPTS_WEEKDAY_LONG).format(day),
      date: getDateTimeFormat(locale, OPTS_DAY_MONTH).format(day),
      isToday: diff === 0,
    }
  }

  function step(direction) {
    setVisibleMonth((m) => {
      if (gridCollapsed && !searchOpen) {
        // Two visible weeks — a step is a fortnight, not a month.
        const next = new Date(m)
        next.setDate(next.getDate() + direction * 14)
        return next
      }
      return new Date(m.getFullYear(), m.getMonth() + direction, 1)
    })
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) closeSearch()
        onOpenChange?.(next)
      }}
    >
      <PopoverTrigger asChild>
        {/* Sayı yalnız dar ekranda: masaüstünde çentik aynı sayıyı zaten
            gösteriyor (bkz. docs/features/header-panelleri.md). */}
        {trigger ?? <DateTimePill badge={wide ? 0 : todayCount} />}
      </PopoverTrigger>
      {/* gap-0 matters: PopoverContent's base classes include flex-col gap-4,
          which would space every section a full rem apart. */}
      {/* Ölçü tarifi MailPopover.jsx'te yazılı — DÖRT panel aynı reçeteyi paylaşır. */}
      <PopoverContent
        side={side}
        align={align}
        sideOffset={side ? 14 : 8}
        collisionPadding={24}
        // Esc önce aramanın metnini, sonra aramayı kapatır; paneli üçüncüsü.
        onEscapeKeyDown={(e) => {
          if (!searchOpen) return
          e.preventDefault()
          if (query) setQuery("")
          else closeSearch()
        }}
        className="flex max-h-[min(26rem,calc(100dvh-8rem))] sm:max-h-[min(36rem,calc(100dvh-5rem))] w-[min(23rem,calc(100vw-3rem))] flex-col overflow-hidden gap-0 p-0"
      >
        <div className="shrink-0">
          {!searchOpen && (
            <SharedCalendarBar
              people={people}
              candidates={candidates}
              unreachable={unreachable ?? []}
              onChange={updatePeople}
            />
          )}
          <CalendarMonthGrid
            visibleMonth={visibleMonth}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            selectedDay={selectedDay}
            onSelectDay={(d) => {
              setSelectedDay((prev) => (prev && sameDay(prev, d) ? null : d))
              setVisibleMonth(d)
            }}
            markedDays={marked}
            collapsed={gridCollapsed}
            daysHidden={searchOpen}
            onToggleCollapsed={() => setGridCollapsed((v) => !v)}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
                  aria-label={t("calendar.search")}
                  aria-pressed={searchOpen}
                  title={t("calendar.search")}
                  className={cn(ACTION_BTN, searchOpen && "bg-accent text-foreground")}
                >
                  <HugeiconsIcon icon={Search01Icon} className="size-3.5" strokeWidth={2} />
                </button>
                <a
                  href="https://outlook.office.com/calendar/deeplink/compose"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("calendar.newEvent")}
                  title={t("calendar.newEvent")}
                  className={ACTION_BTN}
                >
                  <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
                </a>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={t("calendar.moreOptions")}
                      className={ACTION_BTN}
                    >
                      <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" strokeWidth={2} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[10rem]">
                    <DropdownMenuItem asChild>
                      <a
                        href="https://outlook.office.com/calendar/view/month"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("calendar.openOutlook")}
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={refresh}>{t("calendar.refresh")}</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            }
          />
          {searchOpen && (
            <CalendarSearchBar
              query={query}
              onQuery={setQuery}
              filter={filter}
              onFilter={setFilter}
              onClose={closeSearch}
            />
          )}
        </div>

        <Separator className="shrink-0" />

        <div className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/15">
          {status === "loading" && (
            <div className="space-y-3 px-4 py-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-3 w-10" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {status === STATUS.denied && (
            <StateMessage
              icon={Alert02Icon}
              title={staleSession ? t("calendar.staleTitle") : t("calendar.permissionTitle")}
              body={staleSession ? t("calendar.staleBody") : t("calendar.permissionBody")}
              action={staleSession ? t("calendar.connect") : t("calendar.retry")}
              onAction={staleSession ? connect : refresh}
            />
          )}
          {status === STATUS.error && (
            <StateMessage
              icon={Alert02Icon}
              title={t("calendar.error")}
              body={t("calendar.errorBody")}
              action={t("calendar.retry")}
              onAction={refresh}
            />
          )}
          {status === STATUS.unauthenticated && <StateMessage title={t("calendar.signedOut")} />}

          {status === STATUS.ready && searching && (
            <SearchResults buckets={results} dayLabel={dayLabel} />
          )}

          {status === STATUS.ready && !searching && !hasAnyEvent && (
            <StateMessage title={t("calendar.noEvents")} />
          )}

          {status === STATUS.ready &&
            !searching &&
            hasAnyEvent &&
            buckets.map((bucket) => (
              <AgendaDay
                key={bucket.day.toISOString()}
                bucket={bucket}
                label={dayLabel(bucket.day)}
              />
            ))}
        </div>

        <Separator className="shrink-0" />
        <PanelFooterAction as="a" external href="https://outlook.office.com/calendar/view/month">
          {t("calendar.openOutlook")}
        </PanelFooterAction>
      </PopoverContent>
    </Popover>
  )
}
