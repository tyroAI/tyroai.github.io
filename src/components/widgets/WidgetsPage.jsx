import { useMemo, useRef, useState } from "react"
import { useLocale } from "@/hooks/useLocale"
import { useMe } from "@/hooks/useMe"
import { useConfig } from "@/hooks/useConfig"
import { useAppLock } from "@/hooks/useAuthorizations"
import { useDailyBriefCta } from "@/hooks/useDailyBriefCta"
import { useCalendarEvents } from "@/hooks/useCalendarEvents"
import { useMailMessages } from "@/hooks/useMailMessages"
import { useFeedFresh } from "@/hooks/useFeedUnread"
import { usePageAccess } from "@/hooks/usePageAccess"
import { useFocusTasks } from "@/hooks/useFocusTasks"
import { useMyCelebration } from "@/hooks/useMyCelebration"
import { useTodoBoard } from "@/hooks/useTodoBoard"
import { useWeather } from "@/hooks/useWeather"
import { defaultCalendarRange, startOfDay } from "@/lib/calendarRange"
import { readSharedCalendars } from "@/lib/sharedCalendars"
import { meetingLoad } from "@/lib/meetingLoad"
import { firstDayOfWeek } from "@/lib/weekStart"
import { OverlayScrollbar } from "@/components/common/OverlayScrollbar"
import { AppsSection } from "@/components/myspace/AppsSection"
import { SectionDivider } from "@/components/myspace/SectionDivider"
import { useMinuteNow } from "@/components/myspace/useMinuteNow"
import { BoardEditBar } from "./BoardEditBar"
import { MainWidgets } from "./MainWidgets"
import { MoreWidgets } from "./MoreWidgets"
import { WidgetEditor } from "./WidgetEditor"
import { CATALOG } from "./layout"
import { renderWidgetFor } from "./renderWidget"
import { useWidgetLayout } from "./useWidgetLayout"

/**
 * Pano (`/widgets`, widget sayfası) — Anasayfa'nın deneme kopyası. Ana bölüm
 * Anasayfa'nın üst kısmı gibi (solda hava + soru kutusu, sağda widget'lar),
 * altında "Diğer widget'lar", en altta asistanlar ve uygulamalar. Hava ve soru
 * kutusu dahil her kart bir widget; sıra, bölge ve yığınlar kişinin düzeninden
 * (`useWidgetLayout`). Düzenleme kipi header'daki "Panoyu düzenle"den
 * (`lib/boardEdit`). Kapı rotada
 * (`lib/widgetsPolicy.js`). Takvim, posta ve odak Anasayfa'yla aynı önbelleği
 * paylaşıyor; Graph'a ikinci kez gidilmiyor.
 */
export function WidgetsPage({ onOpenChat, onNewChat }) {
  const { t, locale } = useLocale()
  const me = useMe()
  const { agents } = useConfig()
  const lock = useAppLock()
  const pageAccess = usePageAccess()
  const celebration = useMyCelebration()
  const weather = useWeather()
  const now = useMinuteNow()
  const [today] = useState(() => startOfDay(new Date()))
  const { rangeStart, rangeEnd } = useMemo(() => defaultCalendarRange(today), [today])
  const [people] = useState(readSharedCalendars)
  const cal = useCalendarEvents(rangeStart, rangeEnd, true, people)
  const mail = useMailMessages(12)
  const feedFresh = useFeedFresh()
  const focus = useFocusTasks()
  const board = useTodoBoard()
  const briefAgent = lock.ready
    ? (agents.find((a) => !lock.isLocked(a.name)) ?? null)
    : (agents[0] ?? null)
  const briefCta = useDailyBriefCta(briefAgent)
  const scrollRef = useRef(null)
  const firstName = (me.name || "").split(" ")[0]
  const ctx = { cal, mail, focus, feedFresh, now, pageAccess, board }
  const available = useMemo(
    () =>
      new Set(
        Object.keys(CATALOG).filter(
          (id) =>
            (id !== "feed-picks" || pageAccess.feed) && (id !== "todo-summary" || pageAccess.todo),
        ),
      ),
    [pageAccess.feed, pageAccess.todo],
  )
  const layout = useWidgetLayout(available)
  const load = useMemo(
    () => meetingLoad(cal.events, new Date(now), rangeStart, firstDayOfWeek(locale), rangeEnd),
    [cal.events, now, rangeStart, rangeEnd, locale],
  )

  const renderWidget = renderWidgetFor({
    weather,
    now,
    firstName,
    celebration,
    ctx,
    briefCta,
    onNewChat,
    load,
  })

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="ms-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="myspace-gutter mx-auto w-full max-w-[96rem] px-5 pb-16 pt-8 sm:px-8 sm:pt-10 lg:px-12 lg:pt-14">
          <div className="@container/myspace">
            <h1 className="sr-only">{t("nav.widgets")}</h1>
            <WidgetEditor layout={layout} render={renderWidget}>
              <BoardEditBar />
              {/* Cam kart varken arkada paletin yumuşak ışıkları: cam ancak böyle görünür. */}
              <div className="relative isolate">
                {layout.hasGlass && <div aria-hidden="true" className="board-ambient" />}
                <MainWidgets render={renderWidget} />
                <MoreWidgets render={renderWidget} />
              </div>
              <SectionDivider className="mt-12 lg:mt-14" />
              <AppsSection
                onOpenChat={onOpenChat}
                feedOpen={pageAccess.feed}
                className="mt-10 lg:mt-12"
              />
            </WidgetEditor>
          </div>
        </div>
      </div>
      <OverlayScrollbar targetRef={scrollRef} avoidNotch />
    </div>
  )
}
