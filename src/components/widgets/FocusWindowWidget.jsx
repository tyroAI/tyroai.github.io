import { useMemo, useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import Target03Icon from "@hugeicons/core-free-icons/Target03Icon"
import { duration } from "@/components/common/event-detail/eventFormat"
import { useLocale } from "@/hooks/useLocale"
import { isWeekend, nextWorkday } from "@/lib/brief"
import { createFocusBlock, freeWindows } from "@/lib/focusWindow"
import { STATUS } from "@/lib/graph"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { notify } from "@/lib/notify"
import { cn } from "@/lib/utils"
import { WidgetEmpty } from "./WidgetEmpty"
import { WidgetFrame } from "./WidgetFrame"
import { PageBody, Pager } from "./paging/Pager"
import { usePager } from "./paging/usePager"
import { useNarrow } from "./useNarrow"

const OPTS_TIME = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
const OPTS_DAY = { weekday: "long" }
const MAX_BLOCK = 120
// Dar kart (içerik < 16rem): sayfada TEK boşluk, saat büyük, düğme altta tam genişlik —
// yan yana sığmıyor, saat düğmenin altına giriyordu. Kap sorgusu `@max-[16rem]/widget`.
const NARROW_PX = 256

/**
 * Odak penceresi — mesai içindeki toplantısız boşluklar (en az 1 saat) ve tek
 * tıkla takvime "Odak zamanı" bloğu (en çok 2 saat, meşgul, özel). Hafta
 * sonunda ya da mesai bittiyse bir sonraki iş günü. Hesap `lib/focusWindow`.
 * Dar kartta sayfada tek boşluk ve düğme altta (`NARROW_PX`).
 */
export function FocusWindowWidget({ ctx, className }) {
  const { cal, now } = ctx
  const { t, locale } = useLocale()
  const { instance, accounts } = useMsal()
  const [booked, setBooked] = useState(() => new Set())
  const [busy, setBusy] = useState(null)
  const date = useMemo(() => new Date(now), [now])
  const late = date.getHours() >= 17
  const day = useMemo(() => (isWeekend(date) || late ? nextWorkday(date) : date), [date, late])
  const today = day === date
  const windows = useMemo(
    () => freeWindows(cal.events, day, today ? now : null),
    [cal.events, day, today, now],
  )
  const time = getDateTimeFormat(locale, OPTS_TIME)
  const free = windows.reduce((s, w) => s + w.minutes, 0)
  const body = useRef(null)
  const narrow = useNarrow(body, NARROW_PX)
  const pager = usePager(windows, narrow ? 1 : 2)

  async function book(w) {
    const end = new Date(Math.min(w.end.getTime(), w.start.getTime() + MAX_BLOCK * 60_000))
    setBusy(w.start.getTime())
    const res = await createFocusBlock(instance, accounts[0], {
      start: w.start,
      end,
      subject: t("widgets.focusWindow.subject"),
    })
    setBusy(null)
    if (res.status === STATUS.ready) {
      setBooked((s) => new Set(s).add(w.start.getTime()))
      notify.success(
        t("widgets.focusWindow.done", { time: `${time.format(w.start)}–${time.format(end)}` }),
      )
      cal.refresh?.()
    } else notify.error(t("widgets.focusWindow.failed"))
  }

  return (
    <WidgetFrame
      id="focus-window"
      title={t("widgets.focusWindow.title")}
      icon={Target03Icon}
      busy={cal.status === "loading"}
      className={className}
      pager={<Pager pager={pager} label={t("widgets.focusWindow.title")} />}
    >
      <div ref={body} className="flex min-h-0 flex-1 flex-col">
        {cal.status === "loading" ? (
          <div aria-hidden="true" className="mt-3 space-y-2.5">
            <span className="ms-skeleton block h-4 w-2/3 rounded-full" />
            <span className="ms-skeleton block h-10 rounded-xl" />
          </div>
        ) : (
          <>
            <p className="mt-1 text-[0.8125rem] text-muted-foreground">
              {today && !windows.length
                ? null
                : today
                  ? t("widgets.focusWindow.today", {
                      time: duration({ start: new Date(0), end: new Date(free * 60_000) }, t),
                    })
                  : t("widgets.focusWindow.next", {
                      day: getDateTimeFormat(locale, OPTS_DAY).format(day),
                    })}
            </p>
            {windows.length ? (
              <PageBody pager={pager} className="mt-3 space-y-1.5">
                {pager.items.map((w) => {
                  const done = booked.has(w.start.getTime())
                  return (
                    <li
                      key={w.start.getTime()}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-2xl bg-muted/40 px-3 py-1.5",
                        "@max-[16rem]/widget:flex-col @max-[16rem]/widget:items-stretch @max-[16rem]/widget:gap-3 @max-[16rem]/widget:px-3.5 @max-[16rem]/widget:py-3.5",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block whitespace-nowrap text-[0.875rem] font-semibold tabular-nums",
                            "@max-[16rem]/widget:text-[1.125rem] @max-[16rem]/widget:leading-tight",
                          )}
                        >
                          {time.format(w.start)} – {time.format(w.end)}
                        </span>
                        <span
                          className={cn(
                            "block text-[0.6875rem] text-muted-foreground",
                            "@max-[16rem]/widget:mt-1 @max-[16rem]/widget:text-[0.75rem]",
                          )}
                        >
                          {duration(w, t)}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={done || busy != null}
                        onClick={() => book(w)}
                        className={cn(
                          "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand/[0.08] px-2.5 text-[0.71875rem] font-semibold text-brand transition hover:bg-brand/15 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:h-10",
                          "@max-[16rem]/widget:h-9 @max-[16rem]/widget:w-full @max-[16rem]/widget:text-[0.8125rem] @max-[16rem]/widget:pointer-coarse:h-11",
                        )}
                      >
                        {done ? t("widgets.focusWindow.booked") : t("widgets.focusWindow.book")}
                      </button>
                    </li>
                  )
                })}
              </PageBody>
            ) : (
              <WidgetEmpty icon={Target03Icon}>{t("widgets.focusWindow.none")}</WidgetEmpty>
            )}
          </>
        )}
      </div>
    </WidgetFrame>
  )
}
