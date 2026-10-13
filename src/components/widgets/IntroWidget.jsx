import { useEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon"
import { BrandOrb } from "@/components/brand/BrandOrb"
import { InsightTip } from "@/components/myspace/InsightTip"
import { prepareMeeting } from "@/components/myspace/meetingUtils"
import { useGreetingHeading } from "@/components/myspace/useGreetingHeading"
import { useLocale } from "@/hooks/useLocale"
import { requestOpenChat, setPendingAsk } from "@/lib/chatBus"
import { greetingKey } from "@/lib/greeting"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"
import { BRIEF_ICON } from "./briefIcons"
import { introAction } from "./introAction"
import { useBrief } from "./useBrief"
import { useBrandInk } from "./useBrandInk"
import { useBriefTips } from "./useBriefTips"
import { useIntroLines } from "./useIntroLines"
import "./IntroWidget.css"

const OFFICE = "tyro office"
const OPTS_DATE = { weekday: "long", day: "numeric", month: "long" }
const MAX_CHIPS = 4
const CHIP =
  "intro-card__chip inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.75rem] font-medium text-white ring-1 ring-white/20 backdrop-blur-sm transition pointer-coarse:h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
// Metin satırları kürenin altına girmesin: sağ pay kürenin boyu kadar.
const BESIDE_ORB = "pe-[calc(var(--orb,0px)+0.75rem)]"

/**
 * Karşılama — hava kartını istemeyenler için giriş kartı: paletin renklerinden
 * katmanlı premium zemin (`IntroWidget.css`), küre, selamlama ve günün brifingi.
 * Brifing Günün brifingi kartıyla AYNI veriden (`useBrief`); haplar aynı
 * ipuçlarını açar (`useBriefTips` — üstüne gelince ilk kayıtlar, önizleme,
 * ilgili yer); cümlelerdeki toplantı ifadeleri vurgulu (`useIntroLines`). Tek
 * düğme "sıradaki en iyi adım" (`introAction`): toplantıya hazırlan · günü/yarını
 * planla · haftaya hazırlan — "Günün özeti" hazır soru kutucuğunda zaten var. Küre
 * kartın genişliğine göre ölçülür; gözler imleci izler, karta gelince dinler.
 */
export function IntroWidget({ ctx, firstName, celebration, className }) {
  const { t, locale } = useLocale()
  const brief = useBrief(ctx)
  const { tips, meetingsTip, dialog } = useBriefTips(brief.tipData)
  const { headline, meetingLine } = useIntroLines(brief, meetingsTip)
  const heading = useGreetingHeading(greetingKey(brief.date.getHours()), celebration)
  const host = useRef(null)
  const [width, setWidth] = useState(0)
  const [live, setLive] = useState(false)
  const { ink, veil } = useBrandInk()

  useEffect(() => {
    const el = host.current
    if (!el || typeof ResizeObserver === "undefined") return undefined
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const orb = width ? Math.round(Math.max(64, Math.min(124, width * 0.22))) : 0

  const next = introAction({
    weekend: brief.weekend,
    part: brief.part,
    left: brief.left,
    now: brief.date.getTime(),
  })
  function act() {
    if (next.kind === "prepare") return prepareMeeting(next.meeting, t, locale)
    setPendingAsk({ question: t(`widgets.intro.ask.${next.kind}`), agent: OFFICE })
    requestOpenChat({ focusComposer: true })
  }

  return (
    <section
      ref={host}
      data-widget="intro"
      data-ink={ink}
      aria-label={t("widgets.intro.title")}
      onPointerEnter={() => setLive(true)}
      onPointerLeave={() => setLive(false)}
      style={{ "--orb": `${orb}px`, "--intro-veil": veil }}
      className={cn(
        "intro-card @container/intro relative isolate flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] p-5 text-white shadow-[0_18px_40px_-24px_var(--brand-via)]",
        className,
      )}
    >
      <span aria-hidden="true" className="intro-card__aurora" />
      <span aria-hidden="true" className="intro-card__shade" />
      <span aria-hidden="true" className="intro-card__grain" />
      {orb > 0 && (
        <div aria-hidden="true" inert className="pointer-events-none absolute end-4 top-4">
          <span className="intro-card__glow absolute -inset-[18%] rounded-full bg-white/25 blur-xl" />
          <BrandOrb
            surface="dashboard"
            state={live ? "listening" : "idle"}
            mascotState={live ? "listening" : undefined}
            restState="idle"
            trackPage
            size={orb}
          />
        </div>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <p
          className={cn(
            "intro-card__kicker truncate text-[0.6875rem] font-semibold uppercase tracking-[0.08em]",
            BESIDE_ORB,
          )}
        >
          {getDateTimeFormat(locale, OPTS_DATE).format(brief.date)}
          {brief.weekend && ` · ${t("widgets.brief.weekendTag")}`}
        </p>
        <h2
          className={cn(
            "mt-1 text-[length:clamp(1.375rem,6.5cqi,2rem)] font-semibold leading-[1.1] tracking-[-0.025em] [text-shadow:0_1px_2px_rgb(0_0_0/0.16)]",
            BESIDE_ORB,
          )}
        >
          {firstName ? (
            <>
              {heading}, <span className="intro-card__name">{firstName}</span>!
            </>
          ) : (
            `${heading}!`
          )}
        </h2>
        {brief.loading ? (
          <span
            aria-hidden="true"
            className="intro-card__skel mt-2 block h-4 w-2/3 rounded-full bg-white/20"
          />
        ) : (
          <>
            <p className={cn("mt-1.5 text-[0.875rem] font-medium leading-snug", BESIDE_ORB)}>
              {headline}
            </p>
            {meetingLine && (
              <p className={cn("mt-0.5 text-[0.75rem] font-medium leading-relaxed", BESIDE_ORB)}>
                {meetingLine}
              </p>
            )}
          </>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          {brief.loading
            ? [0, 1, 2].map((i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="intro-card__skel h-7 w-20 rounded-full bg-white/15"
                />
              ))
            : brief.items.slice(0, MAX_CHIPS).map((item) => (
                <InsightTip key={item.id} {...tips[item.id]} side="bottom" align="start">
                  <button type="button" className={CHIP}>
                    <HugeiconsIcon
                      icon={BRIEF_ICON[item.id]}
                      className="size-3.5"
                      strokeWidth={2}
                    />
                    {t(`widgets.intro.chip.${item.id}`)}
                    <span className="font-semibold tabular-nums">{item.n}</span>
                  </button>
                </InsightTip>
              ))}
          <button
            type="button"
            onClick={act}
            className="intro-card__cta ms-auto inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-3 text-[0.75rem] font-semibold shadow-sm transition pointer-coarse:h-9 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <HugeiconsIcon
              icon={next.kind === "prepare" ? AiChat02Icon : SparklesIcon}
              className="size-3.5"
              strokeWidth={2}
            />
            {t(`widgets.intro.cta.${next.kind}`)}
          </button>
        </div>
      </div>
      {dialog}
    </section>
  )
}
