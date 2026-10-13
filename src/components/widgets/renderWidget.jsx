import { cn } from "@/lib/utils"
import { BriefBubble } from "@/components/myspace/BriefBubble"
import { FocusCard } from "@/components/myspace/FocusCard"
import { HelpOrbCard } from "@/components/myspace/HelpOrbCard"
import { MeetingRhythmCard } from "@/components/myspace/MeetingRhythmCard"
import { NextMeetingCard } from "@/components/myspace/NextMeetingCard"
import { AskWidget } from "./AskWidget"
import { BriefWidget } from "./BriefWidget"
import { FeedPicksWidget } from "./FeedPicksWidget"
import { FocusWindowWidget } from "./FocusWindowWidget"
import { HolidayWidget } from "./HolidayWidget"
import { IntroWidget } from "./IntroWidget"
import { MarketWidget } from "./MarketWidget"
import { NudgeWidget } from "./NudgeWidget"
import { OutcomesWidget } from "./OutcomesWidget"
import { PendingMailWidget } from "./PendingMailWidget"
import { PlannerWidget } from "./PlannerWidget"
import { RecentFilesWidget } from "./RecentFilesWidget"
import { SuggestWidget } from "./SuggestWidget"
import { TeamTodayWidget } from "./TeamTodayWidget"
import { TodoSummaryWidget } from "./TodoSummaryWidget"
import { TravelWidget } from "./TravelWidget"
import { WeatherWidget } from "./WeatherWidget"
import { WeekWidget } from "./WeekWidget"

/**
 * Widget kimliği → bileşen. Pano ve Anasayfa aynı çiziciyi kullanır; veriler
 * sayfanın (`env`): hava, takvim, posta, odak… Katalogdaki önizleme de bununla
 * çizilir. Bilinmeyen kimlik `null`.
 */
export function renderWidgetFor(env) {
  const { weather, now, firstName, celebration, ctx, briefCta, onNewChat, load } = env
  const { cal, mail, focus, feedFresh, pageAccess } = ctx
  return function renderWidget(id, className) {
    switch (id) {
      case "weather":
        return (
          <WeatherWidget
            key={id}
            weather={weather}
            now={now}
            firstName={firstName}
            celebration={celebration}
            className={className}
          />
        )
      case "weather-plain":
        return <WeatherWidget key={id} plain weather={weather} now={now} className={className} />
      case "intro":
        return (
          <IntroWidget
            key={id}
            ctx={ctx}
            firstName={firstName}
            celebration={celebration}
            className={className}
          />
        )
      case "ask":
        return (
          <AskWidget key={id} briefCta={briefCta} onNewChat={onNewChat} className={className} />
        )
      case "day-summary":
        return (
          <BriefBubble
            key={id}
            compact
            className={className}
            celebration={celebration}
            cal={cal}
            mail={mail}
            now={now}
            focus={focus}
            feedFresh={feedFresh}
            feedOpen={pageAccess.feed}
            todoOpen={pageAccess.todo}
          />
        )
      case "help":
        return (
          <HelpOrbCard key={id} anchorRef={env.helpRef} scene={env.scene} className={className} />
        )
      case "brief":
        return <BriefWidget key={id} ctx={ctx} className={className} />
      case "next-meeting":
        return (
          <NextMeetingCard
            key={id}
            cal={cal}
            now={now}
            className={cn("min-h-[12.5rem]", className)}
          />
        )
      case "focus":
        return (
          <FocusCard
            key={id}
            focus={focus}
            canOpenTodo={pageAccess.todo}
            className={cn("min-h-[12.5rem]", className)}
          />
        )
      case "todo-summary":
        return <TodoSummaryWidget key={id} ctx={ctx} className={className} />
      case "rhythm":
        return <MeetingRhythmCard key={id} cal={cal} load={load} now={now} className={className} />
      case "market":
        return <MarketWidget key={id} className={className} />
      case "suggest":
        return <SuggestWidget key={id} ctx={ctx} className={className} />
      case "pending-mail":
        return <PendingMailWidget key={id} className={className} />
      case "planner":
        return <PlannerWidget key={id} className={className} />
      case "recent-files":
        return <RecentFilesWidget key={id} className={className} />
      case "focus-window":
        return <FocusWindowWidget key={id} ctx={ctx} className={className} />
      case "team-today":
        return <TeamTodayWidget key={id} className={className} />
      case "week":
        return <WeekWidget key={id} ctx={ctx} className={className} />
      case "outcomes":
        return <OutcomesWidget key={id} ctx={ctx} className={className} />
      case "holiday":
        return <HolidayWidget key={id} ctx={ctx} className={className} />
      case "travel":
        return <TravelWidget key={id} ctx={ctx} className={className} />
      case "feed-picks":
        return <FeedPicksWidget key={id} ctx={ctx} className={className} />
      case "nudge":
        return <NudgeWidget key={id} ctx={ctx} className={className} />
      default:
        return null
    }
  }
}
