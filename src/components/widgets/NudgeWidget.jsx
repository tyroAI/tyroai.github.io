import { useEffect, useMemo, useRef, useState } from "react"
import { BrandOrb } from "@/components/brand/BrandOrb"
import { prepareMeeting } from "@/components/myspace/meetingUtils"
import { useLocale } from "@/hooks/useLocale"
import { useOrbStyle } from "@/hooks/useOrbStyle"
import { isWeekend } from "@/lib/brief"
import { requestOpenChat, setPendingAsk } from "@/lib/chatBus"
import { openMeetingSummary } from "@/lib/summaryBus"
import { cn } from "@/lib/utils"

const OFFICE = "tyro office"
const H = 3_600_000
// Küre kutusunun boy/en oranı ve alt kenarın altında kalan payı (HelpOrbCard'la aynı).
const ORB_BOX_H = { mascot: (470 / 440) * (440 / 342), sphere: 1.775 }
const ORB_HIDDEN = 0.4

/**
 * Önerinin seçimi — ilk tutan kural kazanır: yaklaşan toplantıya hazırlık (2
 * saat) · biten toplantının özeti (3 saat) · gecikmiş işlere plan · pazartesi
 * sabahı haftayı planla · cuma öğleden sonra haftayı özetle · hafta sonu ·
 * genel davet.
 */
function pick({ events, now, overdue }) {
  const date = new Date(now)
  const mine = (events ?? []).filter((e) => !e.owner && !e.isAllDay && e.myResponse !== "declined")
  const soon = mine
    .filter((e) => e.start.getTime() > now && e.start.getTime() - now <= 2 * H)
    .sort((a, b) => a.start - b.start)[0]
  if (soon) return { kind: "prepare", event: soon }
  const ended = mine
    .filter((e) => e.joinUrl && e.end.getTime() <= now && now - e.end.getTime() <= 3 * H)
    .sort((a, b) => b.end - a.end)[0]
  if (ended) return { kind: "recap", event: ended }
  if (isWeekend(date)) return { kind: "weekend" }
  if (overdue > 0) return { kind: "overdue", n: overdue }
  if (date.getDay() === 1 && date.getHours() < 12) return { kind: "weekPlan" }
  if (date.getDay() === 5 && date.getHours() >= 14) return { kind: "weekWrap" }
  return { kind: "default" }
}

/**
 * Bağlamsal öneri — Anasayfa'daki "Sana nasıl yardımcı olabilirim?" kartının
 * görünüşüyle (tek sütun, alttan yükselen küre, imleci izleyen gözler, üstüne
 * gelince dinler); içinde anın tek önerisi ve tek düğme (hazırlan · özete bak
 * · sohbete sor). Küre metnin altında kalan alana göre ölçülür: uzun öneride
 * küçülür, kısa öneride büyür. Soru sohbete park edilir, cevap asistandan gelir.
 */
export function NudgeWidget({ ctx, className }) {
  const { cal, focus, now } = ctx
  const { t, locale } = useLocale()
  const [live, setLive] = useState(false)
  const [box, setBox] = useState(null)
  const hostRef = useRef(null)
  const textRef = useRef(null)
  const kind = useOrbStyle() === "mascot" ? "mascot" : "sphere"
  const overdue = (focus.tasks ?? []).filter((x) => !x.done && x.overdue).length
  const nudge = useMemo(
    () => pick({ events: cal.events, now, overdue }),
    [cal.events, now, overdue],
  )
  const subject = nudge.event?.subject || t("calendar.noSubject")

  useEffect(() => {
    const el = hostRef.current
    if (!el || typeof ResizeObserver === "undefined") return undefined
    const measure = () => {
      const text = textRef.current
      setBox({
        w: el.offsetWidth,
        h: el.offsetHeight,
        textBottom: text ? text.offsetTop + text.offsetHeight : 0,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (textRef.current) ro.observe(textRef.current)
    return () => ro.disconnect()
  }, [])

  let orbSize = 0
  if (box) {
    const byWidth = box.w * (kind === "mascot" ? 0.66 : 0.56)
    const byHeight = (box.h - box.textBottom - 12) / ((1 - ORB_HIDDEN) * ORB_BOX_H[kind])
    orbSize = Math.round(Math.max(72, Math.min(180, byWidth, byHeight)))
  }

  function act() {
    if (nudge.kind === "prepare") return prepareMeeting(nudge.event, t, locale)
    if (nudge.kind === "recap") return openMeetingSummary(nudge.event)
    if (nudge.kind !== "default")
      setPendingAsk({ question: t(`widgets.nudge.ask.${nudge.kind}`), agent: OFFICE })
    requestOpenChat({})
  }

  return (
    <section
      ref={hostRef}
      data-widget="nudge"
      aria-label={t("widgets.nudge.title")}
      onPointerEnter={() => setLive(true)}
      onPointerLeave={() => setLive(false)}
      className={cn(
        "nudge-card group relative isolate flex min-h-[15rem] min-w-0 flex-col overflow-hidden rounded-[1.75rem] p-5 shadow-[0_18px_40px_-24px_var(--brand-via)] transition-transform duration-300 hover:-translate-y-0.5",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="nudge-card__bg absolute inset-0 -z-10 bg-gradient-to-b from-brand-from via-brand-via to-brand-to"
      />
      <span
        aria-hidden="true"
        className="nudge-card__glow absolute inset-x-0 bottom-0 -z-10 h-3/4 bg-[radial-gradient(60%_55%_at_50%_100%,rgb(255_255_255/0.5),transparent_75%)]"
      />
      <div ref={textRef} className="relative z-20 min-w-0">
        <p className="nudge-card__text max-w-[16rem] text-balance text-[1.0625rem] font-semibold leading-[1.2] tracking-[-0.015em] text-brand-on-brand [text-shadow:0_1px_2px_rgb(0_0_0/0.18)]">
          {t(`widgets.nudge.text.${nudge.kind}`, { subject, n: nudge.n ?? 0 })}
        </p>
        <button
          type="button"
          onClick={act}
          onFocus={() => setLive(true)}
          onBlur={() => setLive(false)}
          className="nudge-card__cta mt-3 inline-flex h-8 items-center rounded-full bg-white px-3.5 text-[0.8125rem] font-semibold text-brand-fill-deep shadow-sm transition pointer-coarse:h-11 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {t(`widgets.nudge.act.${nudge.kind}`)}
        </button>
      </div>
      {/* Ölçülmeden çizilmez: yanlış boyda doğup büyüyen küre zıplardı. */}
      <div
        aria-hidden="true"
        inert
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[40%] transition-transform duration-500 group-hover:translate-y-[35%]"
      >
        {orbSize > 0 && (
          <BrandOrb
            surface="dashboard"
            state={live ? "listening" : "idle"}
            mascotState={live ? "listening" : undefined}
            restState="idle"
            trackPage
            size={orbSize}
          />
        )}
      </div>
    </section>
  )
}
