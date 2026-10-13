import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { HugeiconsIcon } from "@hugeicons/react"
import CheckListIcon from "@hugeicons/core-free-icons/CheckListIcon"
import TaskAdd01Icon from "@hugeicons/core-free-icons/TaskAdd01Icon"
import { useActionTodos } from "@/components/myspace/summary/useActionTodos"
import { useLocale } from "@/hooks/useLocale"
import { useMeetingInsight } from "@/hooks/useMeetingInsight"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { grantMeetingScopes } from "@/lib/meetingInsights"
import { openMeetingSummary } from "@/lib/summaryBus"
import { outcomeState } from "./outcomeState"
import { WidgetEmpty } from "./WidgetEmpty"
import { WidgetFrame } from "./WidgetFrame"
import { PageBody, Pager } from "./paging/Pager"
import { usePager } from "./paging/usePager"
import { useNarrow } from "./useNarrow"

const DAY = 86_400_000
const WINDOW_DAYS = 14
const MAX_MEETINGS = 20
const OPTS_WHEN = { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
// Dar kart (içerik < 22rem): sayfada TEK toplantı — eylemler alt satıra iner.
const NARROW_PX = 352
const BTN =
  "inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[0.71875rem] font-semibold transition pointer-coarse:h-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
const CTA =
  "inline-flex h-8 items-center rounded-full bg-brand-fill-deep px-3.5 text-[0.75rem] font-semibold text-brand-on-brand transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/**
 * Bir toplantının özet durumunu yukarı bildirir, kendisi bir şey çizmez:
 * sayfa değişince satırlar yeniden kurulsa da sorgu ve sonucu burada kalır.
 * "Soramadık" ayrı ayrı: izin gerekiyor · Graph reddetti · hata.
 */
function Probe({ event, onState }) {
  const res = useMeetingInsight(event)
  const { state, data } = outcomeState(res)
  const insight = res.insight
  // `data` her çizimde yeni; değişimi durum ve özetin kendisi taşır.
  useEffect(
    () => onState(event.id, state, data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event.id, state, insight, onState],
  )
  return null
}

/**
 * Bir toplantı: adı tam genişlikte (basınca özet açılır), altında zaman ve yapılacak
 * sayısı, sağda eylemler. Üç satırlık eski düzende ad eylemlerin arasında kesiliyor,
 * son satır kartın dibine değiyordu.
 */
function Row({ event, actions }) {
  const { t, locale } = useLocale()
  const todos = useActionTodos(actions, event.subject, t)
  const when = getDateTimeFormat(locale, OPTS_WHEN).format(event.start)
  const title = event.subject || t("calendar.noSubject")
  return (
    <li className="rounded-2xl bg-muted/40 px-3.5 py-2.5 transition-colors hover:bg-muted/70">
      <button
        type="button"
        title={title}
        onClick={() => openMeetingSummary(event)}
        className="block w-full truncate rounded-md text-start text-[0.8125rem] font-medium transition-colors hover:text-brand-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {title}
      </button>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-2">
        {/* Dar kartta saat ve rozet kendi satırında, eylemler altında alt alta tam
            genişlik: sığmayınca rozet düğmenin altına giriyor, etiket kırılıyordu. */}
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[0.71875rem] text-muted-foreground @max-[22rem]/widget:basis-full">
          <span className="truncate">{when}</span>
          {actions.length ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[0.6875rem] font-medium text-foreground/75 ring-1 ring-border">
              <HugeiconsIcon icon={CheckListIcon} className="size-3" strokeWidth={2} />
              {t("widgets.outcomes.count", { n: actions.length })}
            </span>
          ) : (
            <span className="shrink-0">· {t("widgets.outcomes.notesOnly")}</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 @max-[22rem]/widget:w-full @max-[22rem]/widget:flex-col @max-[22rem]/widget:items-stretch @max-[22rem]/widget:[&>button]:justify-center">
          {actions.length > 0 && (
            <button
              type="button"
              disabled={todos.allDone}
              onClick={todos.addAll}
              className={`${BTN} bg-brand/[0.08] text-brand hover:bg-brand/15`}
            >
              {!todos.allDone && (
                <HugeiconsIcon icon={TaskAdd01Icon} className="size-3.5" strokeWidth={2} />
              )}
              {todos.allDone ? t("widgets.outcomes.added") : t("widgets.outcomes.add")}
            </button>
          )}
          <button
            type="button"
            onClick={() => openMeetingSummary(event)}
            className={`${BTN} border border-border bg-background/60 text-foreground/80 hover:bg-accent`}
          >
            {t("widgets.outcomes.summary")}
          </button>
        </span>
      </div>
    </li>
  )
}

/**
 * Toplantı içgörüleri — son iki haftanın biten Teams toplantılarından YALNIZ
 * Copilot özeti olanlar (en yenisi önce, sayfa başına 2; dar kartta 1): yapılacak sayısı,
 * tek tıkla To Do'ya ekleme ve özet penceresi. Özet sorulamadıysa bunu söyler
 * (izin ver · erişim yok · tekrar dene), "özetli toplantı yok" demez.
 */
export function OutcomesWidget({ ctx, className }) {
  const { cal, now } = ctx
  const { t } = useLocale()
  const { instance, accounts } = useMsal()
  const [round, setRound] = useState(0)
  const recent = useMemo(() => {
    const since = now - WINDOW_DAYS * DAY
    return (cal.events ?? [])
      .filter(
        (e) =>
          !e.owner &&
          e.joinUrl &&
          !e.isAllDay &&
          e.myResponse !== "declined" &&
          e.end.getTime() <= now &&
          e.end.getTime() >= since,
      )
      .sort((a, b) => b.end - a.end)
      .slice(0, MAX_MEETINGS)
  }, [cal.events, now])
  const [states, setStates] = useState({})
  const onState = useCallback(
    (id, state, data) =>
      setStates((s) => (s[id]?.state === state ? s : { ...s, [id]: { state, data } })),
    [],
  )
  const stateOf = (e) => states[e.id]?.state ?? "loading"
  const ready = recent.filter((e) => stateOf(e) === "ready")
  const body = useRef(null)
  const narrow = useNarrow(body, NARROW_PX)
  const pager = usePager(ready, narrow ? 1 : 2)
  const any = (s) => recent.some((e) => stateOf(e) === s)
  const again = () => {
    setStates({})
    setRound((n) => n + 1)
  }

  let empty = null
  if (!ready.length && cal.status !== "loading" && !any("loading")) {
    if (any("consent"))
      empty = (
        <WidgetEmpty
          icon={CheckListIcon}
          action={
            <button
              type="button"
              className={CTA}
              onClick={async () => {
                if (await grantMeetingScopes(instance, accounts[0] ?? null)) again()
              }}
            >
              {t("widgets.outcomes.grant")}
            </button>
          }
        >
          {t("widgets.outcomes.consent")}
        </WidgetEmpty>
      )
    else if (any("denied"))
      empty = <WidgetEmpty icon={CheckListIcon}>{t("widgets.outcomes.denied")}</WidgetEmpty>
    else if (any("error"))
      empty = (
        <WidgetEmpty
          icon={CheckListIcon}
          action={
            <button type="button" className={CTA} onClick={again}>
              {t("widgets.outcomes.retry")}
            </button>
          }
        >
          {t("widgets.outcomes.error")}
        </WidgetEmpty>
      )
    else empty = <WidgetEmpty icon={CheckListIcon}>{t("widgets.outcomes.empty")}</WidgetEmpty>
  }

  return (
    <WidgetFrame
      id="outcomes"
      title={t("widgets.outcomes.title")}
      icon={CheckListIcon}
      busy={cal.status === "loading"}
      className={className}
      pager={<Pager pager={pager} label={t("widgets.outcomes.title")} />}
    >
      {recent.map((e) => (
        <Probe key={`${round}:${e.id}`} event={e} onState={onState} />
      ))}
      <div ref={body} className="flex min-h-0 flex-1 flex-col">
        {ready.length ? (
          <PageBody pager={pager} className="mt-3 space-y-2">
            {pager.items.map((e) => (
              <Row key={e.id} event={e} actions={states[e.id].data.actions} />
            ))}
          </PageBody>
        ) : (
          (empty ?? (
            <div aria-hidden="true" className="mt-3 space-y-2">
              {[0, 1].map((i) => (
                <span key={i} className="ms-skeleton block h-[4.5rem] rounded-2xl" />
              ))}
            </div>
          ))
        )}
      </div>
    </WidgetFrame>
  )
}
