import { useCallback, useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import ChartLineData02Icon from "@hugeicons/core-free-icons/ChartLineData02Icon"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat, getNumberFormat } from "@/lib/intl-cache"
import { CBOT_LINKS, MARKET_ROWS, fetchMarket } from "@/lib/market"
import { cn } from "@/lib/utils"
import { FrameAction, WidgetFrame } from "./WidgetFrame"
import { PageBody, Pager } from "./paging/Pager"
import { usePager } from "./paging/usePager"
import { useNarrow } from "./useNarrow"

const OPTS_TIME = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
const REFRESH_MS = 5 * 60_000
// İçerik < 26rem: tek sütun, sayfada 3 satır (2 sütunda 3 satır sığmıyor, kart dibinde kesiliyordu).
const NARROW_PX = 416
const PILL =
  "relative inline-flex h-6 items-center gap-0.5 rounded-full bg-muted/60 px-2 text-[0.6875rem] font-medium text-foreground/80 transition after:absolute after:inset-x-0 after:-inset-y-1 pointer-coarse:after:content-[''] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
const TREND = {
  up: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  down: "bg-red-500/10 text-red-600 dark:text-red-400",
  flat: "bg-muted text-muted-foreground",
}

/**
 * Piyasa — Türkiye bazlı kurlar, altın ve BIST 100 (`lib/market.js`). Sekme
 * görünürken beş dakikada bir tazelenir. İZLEME LİSTESİ: satırda ad · değer · değişim
 * hapı (yeşil/kırmızı VE okla — renk tek başına anlam taşımasın); geniş kartta iki
 * sütun (solda kurlar, sağda altın ve BIST), dar kartta sayfada üç satır. CBOT
 * vadelileri bağlantı (veri çekilemiyor).
 */
export function MarketWidget({ className }) {
  const { t, locale } = useLocale()
  const [state, setState] = useState({ status: "loading", data: null })

  const apply = useCallback(
    (data) => setState({ status: data ? "ready" : "error", data, refreshing: false }),
    [],
  )

  useEffect(() => {
    fetchMarket().then(apply)
    const id = setInterval(() => !document.hidden && fetchMarket().then(apply), REFRESH_MS)
    return () => clearInterval(id)
  }, [apply])

  function refresh() {
    setState((s) => ({ ...s, refreshing: true }))
    fetchMarket({ force: true }).then(apply)
  }

  const price = (row) =>
    getNumberFormat(locale, {
      minimumFractionDigits: row.kind === "fx" ? 4 : 2,
      maximumFractionDigits: row.kind === "fx" ? 4 : 2,
    }).format(row.value)
  const pct = getNumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const at = state.data?.at
  const rows = (state.status === "loading" ? MARKET_ROWS : (state.data?.rows ?? [])).slice(0, 6)
  const body = useRef(null)
  const narrow = useNarrow(body, NARROW_PX)
  const pager = usePager(rows, narrow ? 3 : 6)
  const source = t(
    state.data?.source === "ecb" ? "widgets.market.sourceEcb" : "widgets.market.source",
  )

  return (
    <WidgetFrame
      id="market"
      title={t("widgets.market.title")}
      icon={ChartLineData02Icon}
      busy={state.status === "loading"}
      className={className}
      pager={narrow ? <Pager pager={pager} label={t("widgets.market.title")} /> : null}
      action={
        <FrameAction
          onClick={refresh}
          aria-label={t("widgets.market.refresh")}
          title={
            at
              ? t("widgets.market.updated", {
                  time: getDateTimeFormat(locale, OPTS_TIME).format(at),
                })
              : undefined
          }
        >
          {/* Dar kartta saat yalnız ipucunda: başlığa yer kalsın ("Piy…" kesiliyordu). */}
          {at && !narrow && getDateTimeFormat(locale, OPTS_TIME).format(at)}
          <HugeiconsIcon
            icon={RefreshIcon}
            className={cn("size-3.5", state.refreshing && "animate-spin")}
            strokeWidth={2}
          />
        </FrameAction>
      }
    >
      <div ref={body} className="flex min-h-0 flex-1 flex-col">
        {state.status === "error" ? (
          <p className="mt-3 text-[0.8125rem] leading-snug text-muted-foreground">
            {t("widgets.market.error")}
          </p>
        ) : (
          <PageBody
            pager={pager}
            className="mt-2.5 grid gap-x-3 gap-y-1 @[26rem]/widget:grid-flow-col @[26rem]/widget:grid-cols-2 @[26rem]/widget:grid-rows-3"
          >
            {pager.items.map((row) => (
              <li
                key={row.id}
                className="flex h-8 min-w-0 items-center gap-2 rounded-lg px-1.5 transition-colors hover:bg-muted/60"
              >
                <span
                  title={t(`widgets.market.row.${row.id}`)}
                  className="min-w-0 flex-1 truncate text-[0.75rem] text-muted-foreground"
                >
                  {t(`widgets.market.row.${row.id}`)}
                </span>
                {state.status === "loading" ? (
                  <span aria-hidden="true" className="ms-skeleton block h-3.5 w-24 rounded-full" />
                ) : (
                  <>
                    <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums">
                      {price(row)}
                    </span>
                    {row.change != null && (
                      <span
                        className={cn(
                          "inline-flex h-5 shrink-0 items-center gap-0.5 rounded-md px-1 text-[0.6875rem] font-semibold tabular-nums",
                          TREND[row.change > 0 ? "up" : row.change < 0 ? "down" : "flat"],
                        )}
                      >
                        <span aria-hidden="true">
                          {row.change > 0 ? "▲" : row.change < 0 ? "▼" : "•"}
                        </span>
                        <span className="sr-only">
                          {t(
                            row.change > 0
                              ? "widgets.market.up"
                              : row.change < 0
                                ? "widgets.market.down"
                                : "widgets.market.flat",
                          )}
                        </span>
                        {pct.format(Math.abs(row.change))}%
                      </span>
                    )}
                  </>
                )}
              </li>
            ))}
          </PageBody>
        )}
        <div className="mt-auto flex items-center justify-between gap-x-3 gap-y-1.5 pt-3 @[26rem]/widget:flex-wrap">
          {CBOT_LINKS.length === 0 ? null : narrow ? (
            // Dar kartta üç bağlantı tek menüde: yan yana iki satıra taşıyor, kaynağı itiyordu.
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger aria-label={t("widgets.market.cbotMenu")} className={PILL}>
                {t("widgets.market.cbotShort")}
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" strokeWidth={2} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                {CBOT_LINKS.map((l) => (
                  <DropdownMenuItem key={l.id} asChild className="pointer-coarse:min-h-11">
                    <a href={l.href} target="_blank" rel="noopener noreferrer">
                      {t(`widgets.market.cbotRow.${l.id}`)}
                      <HugeiconsIcon
                        icon={ArrowUpRight01Icon}
                        className="ms-auto size-3"
                        strokeWidth={2}
                      />
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-[0.6875rem] text-muted-foreground">
                {t("widgets.market.cbot")}
              </span>
              {CBOT_LINKS.map((l) => (
                <a
                  key={l.id}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={PILL}
                >
                  {t(`widgets.market.cbotRow.${l.id}`)}
                  <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3" strokeWidth={2} />
                </a>
              ))}
            </span>
          )}
          <span title={source} className="min-w-0 truncate text-[0.6875rem] text-muted-foreground">
            {source}
          </span>
        </div>
      </div>
    </WidgetFrame>
  )
}
