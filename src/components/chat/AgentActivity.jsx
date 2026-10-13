import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { InlineLoader } from "generative-loaders"
import { HugeiconsIcon } from "@hugeicons/react"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import { useIsUnderManager } from "@/hooks/useIsUnderManager"
import { IT_MANAGER_KEYS } from "@/lib/constants"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * What the agent is doing, while it does it.
 *
 * Two sources, and they are not equal.
 *
 * When the agent talks, it wins. The Bot Framework stream carries
 * `informative` updates ("Searching knowledge sources…") alongside the answer;
 * copilot.js already separated them so they'd never be mistaken for the reply,
 * and until recently dropped them. Those lines go up verbatim, keep a tick,
 * and stack into a list of what actually happened. If the agent says it is
 * reading project data, that sentence is the agent's, not ours.
 *
 * When it doesn't — and against the TYRO Trader agent it currently never does,
 * the stream stays silent from the request until the finished answer — the
 * current line falls back to a clock-driven stage (see STAGES). Those are
 * written to describe the shape of answering and nothing more: no tool, no
 * source, no record, and no promise that it is nearly done. They never earn a
 * tick, because nothing was observed to finish.
 *
 * The counter is a clock.
 *
 * LAYOUT IS FIXED ON PURPOSE. The scroller re-pins to the bottom whenever its
 * content resizes, so anything here that grows or shrinks mid-wait yanks the
 * whole transcript. The status row is a fixed height and the counter sits in a
 * reserved slot that is present from the first frame — invisible early rather
 * than absent, so its arrival moves nothing.
 */

/** Seconds since `startedAt`, ticking while mounted. */
function useElapsed(startedAt) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  if (!startedAt) return 0
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}

/** Elapsed seconds before the counter is revealed. Below this the number is
 *  noise — a fast answer shouldn't be made to look slow. */
const COUNTER_AFTER_S = 3
/** Finished steps kept on screen; older ones drop off rather than growing the
 *  bubble through a long flow. */
const MAX_VISIBLE_STEPS = 3

/**
 * The wait, narrated on a clock.
 *
 * This agent sends nothing between the request and the finished answer — no
 * typing activity, no `informative` update — so for the whole wait there is
 * exactly one observed event to report, and a bubble that reads "Delivering
 * your request" for forty seconds is worse than useless: it looks stuck.
 *
 * So these labels are time-derived, and deliberately describe the SHAPE of
 * answering rather than any specific work. None of them claims a tool ran, a
 * source was read or a record was fetched — those sentences only ever appear
 * when the agent itself sends them, and then they appear verbatim. And none
 * of them is a promise: the last rung stops claiming the answer is imminent
 * rather than repeating "almost ready" forever, which is the lie the phrase
 * carousel this replaced used to tell.
 *
 * ⚠️ O son basamak bir ÖZÜR DEĞİL. Bir zamanlar "Beklenenden uzun sürüyor,
 * hâlâ çalışıyor…" yazıyordu ve kullanıcıya olumsuz okunuyordu — bekleyen
 * kişiye bir şeyin ters gittiğini ima ediyor. Yerine ne olduğunu ANLATAN
 * nötr bir cümle geldi ("Kapsamlı bir sorgu — veriler derleniyor"): 50
 * saniyeye ulaşan turlar pratikte geniş kapsamlı sorgular. Söz vermeden
 * bilgi verir; asıl kaçınılan şey hâlâ "neredeyse hazır"ı tekrarlamak.
 *
 * ⚠️ Bu basamaklar 2026-09-08'e kadar SATIRI YERİNDE DEĞİŞTİRİRDİ ve asla
 * tik almazdı; iz yalnızca gerçekten olmuş işleri taşırdı. İstek üzerine
 * değişti: araç çağrılarına erişim olmadığı için ajan gözlenen olay
 * üretmiyor ve iz her turda boş kalıyordu. Artık geçilen her basamak ize
 * düşüyor ve gözlenen adımlarla aynı tiki taşıyor. Tik burada "bu iş bitti"
 * değil "bir sonrakine geçildi" anlamına gelir; ayrım kullanıcıya
 * gösterilmez, ilerleme ALGISI bilinçli olarak tercih edilmiştir.
 */
const STAGES = [
  { at: 0, key: "chat.activity.delivering" },
  { at: 3, key: "chat.activity.processing" },
  { at: 8, key: "chat.activity.composing" },
  { at: 16, key: "chat.activity.finalizing" },
  { at: 28, key: "chat.activity.almost" },
  { at: 50, key: "chat.activity.long" },
]

/** Bugüne kadar geçilmiş TÜM basamaklar, sırayla. Sonuncusu o anki satır. */
function stagesUpTo(elapsed, t) {
  const passed = STAGES.filter((s) => elapsed >= s.at)
  return (passed.length ? passed : [STAGES[0]]).map((s) => t(s.key))
}

/**
 * İZİN GÖVDESİ — başlığın altında, tek bir dikey rayın sağında.
 *
 * Ray `before:` ile çizilir, satır başına bir DOM düğümü eklemez; başlığın
 * glifiyle hizalı olması için sol kenar boşluğu glif genişliğinin yarısına
 * (`ml-[0.5625rem]`) oturur. Rayın altı bir tık kısa (`bottom-1`): son satırın
 * dibinde biten bir çizgi listeyi kapatıyor gibi okunuyor, oysa iz devam
 * edebilir.
 */
function Trace({ children }) {
  return (
    <div
      className={cn(
        "relative ml-[0.5625rem] flex flex-col gap-0.5 pl-3.5",
        "before:absolute before:top-0 before:bottom-1 before:left-0 before:w-px before:bg-border",
      )}
    >
      {children}
    </div>
  )
}

/**
 * Tamamlanmış tek adım. İkon ve metin DEĞİŞMEDİ — değişen, satırın artık
 * rayın sağında ve kendi belirme animasyonuyla gelmesi.
 *
 * Gecikme satır SIRASINA bağlı: hepsi aynı anda belirseydi liste tek bir
 * blok gibi düşerdi, oysa okunması istenen şey sıra.
 */
function DoneStep({ text, index = 0, animate = true }) {
  return (
    <div
      className={cn(
        "flex min-h-6 items-center gap-2 rounded-md px-1.5 text-[0.71875rem] leading-none",
        "text-muted-foreground/80",
        animate && "agent-row",
      )}
      style={animate ? { animationDelay: `${Math.min(index, 4) * 80}ms` } : undefined}
    >
      <HugeiconsIcon
        icon={Tick02Icon}
        className="size-3 shrink-0 text-brand-via/70"
        strokeWidth={2.6}
      />
      <span className="min-w-0 truncate">{text}</span>
    </div>
  )
}

/**
 * Split the trace into "what is finished" and "what is happening now".
 *
 * The finished list is observed events only: the stream answering, and the
 * agent's own status lines. The current line is the agent's latest word if it
 * gave one — always preferred over the clock — and the time-derived stage
 * otherwise.
 */
function useTrace(activity, elapsed, t) {
  const steps = activity?.steps ?? []
  const received = Boolean(activity?.received)
  const observed = [...(received ? [t("chat.activity.received")] : []), ...steps]
  const clock = stagesUpTo(elapsed, t)

  // Başlıkta duran satır, öncelik sırasıyla: O AN ÇALIŞAN ARAÇ → ajanın son
  // sözü → saatin o anki basamağı.
  //
  // Çalışan araç en önde, çünkü gözlenenlerin de saatin de anlatamadığı tek
  // şey o: adı belli, süresi belirsiz, ŞU AN oluyor. Sahada ölçüldü — ilk
  // araç bitene kadar 14 saniye boyunca ekranda yalnız uydurma basamaklar
  // duruyordu.
  const current =
    activity?.running || (observed.length ? observed[observed.length - 1] : clock[clock.length - 1])

  // İZ İKİ KAYNAKTAN BESLENİR VE İKİSİ AYNI GÖRÜNÜR — bilinçli.
  //
  // `observed` — ajanın kendi bildirdiği şeyler; gerçekten olmuş işler.
  // `clock`    — saatten türeyen basamaklar; durum satırının o ana kadar
  //              söyledikleri.
  //
  // İkincisi ize İSTEK ÜZERİNE yazılıyor (2026-09-08): araç çağrılarına
  // bugün erişimimiz yok, ajan çoğu turda hiç gözlenen olay üretmiyor ve
  // onlar olmadan iz her turda boş kalıyor, açılır düzen hiç görünmüyordu.
  //
  // ⚠️ İKİSİ DE TİK ALIR. Bir tur ayrı glifler denendi (saat basamakları
  // için içi boş halka) ve İSTEK ÜZERİNE geri alındı: bu satırların işi
  // ilerleme ALGISI vermek ve iki farklı işaret, okuyana açıklanamayan bir
  // ayrım gösteriyordu. Kararın bedeli kayıtlı olsun: tik burada "bu iş
  // bitti" demiyor, "bir sonrakine geçildi" diyor.
  //
  // Ajan konuşmaya başladıysa saatin O ANKİ basamağı da geçmişe düşer
  // (`clock` tamamı), çünkü artık başlıkta ajanın sözü var.
  const clockRows = observed.length ? clock : clock.slice(0, -1)

  return {
    done: [...clockRows, ...observed.slice(0, -1)].slice(-MAX_VISIBLE_STEPS),
    current,
  }
}

export function AgentActivity({ activity }) {
  const { t } = useLocale()
  const reduceMotion = useReducedMotion()
  const elapsed = useElapsed(activity?.startedAt)
  const { done, current } = useTrace(activity, elapsed, t)
  // The seconds counter is a DIAGNOSTIC, not part of the answer: to a user it
  // reads as a promise ("something happens at N"), to IT it is the latency
  // number they actually ask for. So it renders only for the IT management
  // chain, read straight off the Entra manager hierarchy (IT manager's chain).
  // This is now the ONLY surface on that rule — the trader agent's lock was
  // removed on 2026-08-29. `=== true` keeps the counter hidden while the
  // chain is still being resolved and on any lookup failure. The clock itself
  // still ticks for everyone: the stage ladder runs on it.
  const showTimer = useIsUnderManager(IT_MANAGER_KEYS) === true

  // İz VARSA açık başlar: bekleyen kişi ilerlemeyi görmek istiyor. Elle
  // kapatan kullanıcı geri çekilmez (`manual` null değilken o kazanır).
  const [manual, setManual] = useState(null)
  const hasTrace = done.length > 0
  const expanded = hasTrace && (manual ?? true)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("chat.activity.label")}
      className="flex min-w-0 flex-col gap-1 py-0.5"
    >
      {/* BAŞLIK SATIRI — canlı olan burada, tarih altta.
          Yüksekliği SABİT (`h-5`): kaydırıcı içerik boyu değişince dibe
          yeniden çakılıyor, yani beklerken büyüyüp küçülen bir satır tüm
          dökümü zıplatır. Chevron yalnızca açılacak bir iz VARSA çizilir —
          boş bir açılır işareti olmayan bir şeyi vaat ederdi. */}
      <div className="flex h-5 items-center gap-2">
        {/* Glif değişmedi (`InlineLoader`, `--brand-text`). Grid + sabit
            kutu satır kutusunun dışında tutar, yani miras alınan satır
            yüksekliği onu büyütemez. */}
        <span className="grid size-5 shrink-0 place-items-center">
          <InlineLoader variant="fold" size={20} speed={0.75} color="var(--brand-text)" />
        </span>

        {/* Keyed fade-in, no AnimatePresence. Both of its modes are wrong
            here: `wait` unmounts the old label first and the empty frame
            collapses the row, and `popLayout` pulls the outgoing one out of
            flow — which drew the old and new status on top of each other,
            unreadably. Letting React swap the node outright leaves no gap
            (the row is a fixed height) and no overlap.

            Parıltı metnin İÇİNDEN geçer (bkz. `.agent-shimmer`): tur
            sürerken satırın hâlâ değiştiğini söyleyen tek işaret. */}
        <motion.span
          key={current}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "min-w-0 truncate text-[0.78125rem] font-medium leading-none @max-3xl/chat:text-[0.75rem]",
            reduceMotion ? "text-foreground/80" : "agent-shimmer",
          )}
        >
          {current}
        </motion.span>

        {/* Reserved from the first frame — see the layout note above. The
            slot itself only exists for the IT audience, so everyone else's
            row simply never carries it and nothing shifts either way. */}
        {showTimer && (
          <span
            aria-hidden={elapsed < COUNTER_AFTER_S}
            className={cn(
              "shrink-0 text-[0.6875rem] leading-none tabular-nums text-muted-foreground/60 transition-opacity",
              elapsed < COUNTER_AFTER_S && "opacity-0",
            )}
          >
            {Math.max(elapsed, COUNTER_AFTER_S)}s
          </span>
        )}

        {hasTrace && (
          <button
            type="button"
            onClick={() => setManual((v) => !(v ?? true))}
            aria-expanded={expanded}
            aria-label={t("chat.activity.steps").replace("{count}", String(done.length))}
            className={cn(
              "-mr-1 grid size-5 shrink-0 place-items-center rounded-md",
              "text-muted-foreground/70 transition hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className={cn("size-3 transition-transform duration-300", expanded && "rotate-180")}
              strokeWidth={2.4}
            />
          </button>
        )}
      </div>

      {expanded && (
        <Trace>
          {done.map((text, i) => (
            <DoneStep key={`${i}-${text}`} text={text} index={i} animate={!reduceMotion} />
          ))}
        </Trace>
      )}
    </div>
  )
}

/**
 * The same trace after the answer lands, collapsed to one line.
 *
 * Kept because "what did it do to get this?" is a fair question of an answer
 * about a voyage's P&L, and the steps are already in hand. Only the agent's
 * own words go in here — "delivered" and "received" are plumbing, interesting
 * while you wait and noise afterwards. Collapsed by default: it is
 * provenance, not the point.
 */
export function AgentActivitySummary({ steps }) {
  const { t } = useLocale()
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  if (!steps?.length) return null

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {/* Canlı izin başlığıyla AYNI kalıp: glif · metin · chevron. İkisi aynı
          şeyin iki hâli, farklı iki düzen konuşsalardı cevabın altındaki
          satır başka bir bileşen gibi okunurdu. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "-ml-1.5 flex h-6 w-fit items-center gap-1.5 rounded-md px-1.5",
          "text-[0.6875rem] font-medium text-muted-foreground/70 transition",
          "hover:bg-accent/50 hover:text-foreground",
        )}
      >
        <HugeiconsIcon
          icon={Tick02Icon}
          className="size-3 shrink-0 text-brand-via/70"
          strokeWidth={2.6}
        />
        <span className="truncate">
          {t("chat.activity.steps").replace("{count}", String(steps.length))}
        </span>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className={cn("size-3 shrink-0 transition-transform duration-300", open && "rotate-180")}
          strokeWidth={2.4}
        />
      </button>

      {open && (
        <Trace>
          {steps.map((text, i) => (
            <DoneStep key={`${i}-${text}`} text={text} index={i} animate={!reduceMotion} />
          ))}
        </Trace>
      )}
    </div>
  )
}
