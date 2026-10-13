import { useMemo, useState } from "react"
import { BottomSheet } from "@/components/common/BottomSheet"
import { useGradientInk } from "@/hooks/useGradientInk"
import { useLocale } from "@/hooks/useLocale"
import { HERO_INK } from "@/lib/gradientInk"
import { cn } from "@/lib/utils"
import { TodoGreeting } from "./TodoGreeting"
import { TodoKpiBar } from "./TodoKpiBar"
import { TodoStatusSheet, TodoStatusTray } from "./TodoStatusTray"
import { plannedTasks } from "./statusTones"

/**
 * To-Do'nun TEK kartı: karşılama (maskot · günün cümlesi · bugüne ekleme) ve durum (dört
 * sayı · ilerleme halkası) aynı gradyanın içinde. Düzen kabın genişliğine göre
 * (`@container/todo`, viewport değil); görünürlük CSS'te, ölçüm yok, ilk çizimde zıplama yok:
 *
 * | kap | düzen |
 * |---|---|
 * | ≥ 64rem | solda karşılama, sağda beyaz tepsi: 2×2 durum + halka sütunu (kartın sonu) |
 * | 48–64rem | maskot · metin · hap tek sırada; altta tepsi: dört durum tek sırada, halka sonda |
 * | 34–48rem | aynı sıra; altta tek satır `TodoKpiBar` (dört durum o genişlikte kesiliyordu) |
 * | < 34rem | maskot · metin (hap yok) + altta çubuk; dokununca alttan çekmece |
 * | yatay telefon (kısa ekran) | hap yok, çubuk metnin YANINDA: kart tek sıra |
 *
 * Kap sayfada sayfanın kendisi, Pano'da widget hücresi (`TodoSummaryWidget`): hücre boyunu
 * doldurur, artan boyu karşılama sırası alır (defter yine alttaki öğeye oturur).
 *
 * Mürekkep gradyandan ölçülür (`--hero-ink`, `lib/gradientInk.js`): açık paletlerde beyaz
 * metin ~2:1'de kalıyordu. Tepsi ve çubuk düz kart, mürekkepten bağımsız.
 */
export function TodoSummaryCard({
  board,
  summary,
  today,
  celebrate = false,
  busy = false,
  onQuickAdd,
  onView,
  label,
  className,
}) {
  const { t } = useLocale()
  const ink = useGradientInk()
  const [sheet, setSheet] = useState(false)
  const loading = board.status === "loading"
  // Veri SORULAMADI (izin yok · ulaşılamıyor · oturum yok): sayılar sıfır değil "—".
  const unavailable = !loading && board.status !== "ready"
  const planned = useMemo(() => plannedTasks(board.tasks, today), [board.tasks, today])
  const state = useMemo(
    () => ({ loading, unavailable, live: !loading && !unavailable }),
    [loading, unavailable],
  )
  const status = { tasks: board.tasks, summary, planned, today, state }

  return (
    <section
      aria-label={label ?? t("todo.hero.aria")}
      data-ink={ink}
      style={{ "--hero-ink": HERO_INK[ink] }}
      className={cn(
        "group/herocard relative isolate flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] p-4 text-[color:var(--hero-ink)] shadow-[0_18px_40px_-24px_var(--brand-via)] @[40rem]/todo:p-5 shortest:py-3",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-from via-brand-via to-brand-to"
      />
      <div className="grid flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3 @[64rem]/todo:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] @[64rem]/todo:grid-rows-1 @[64rem]/todo:gap-6 @[40rem]/todo:shortest:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] @[40rem]/todo:shortest:grid-rows-1 @[40rem]/todo:shortest:items-center @[40rem]/todo:shortest:gap-4">
        <TodoGreeting
          board={board}
          summary={summary}
          celebrate={celebrate}
          busy={busy}
          onQuickAdd={onQuickAdd}
        />
        <TodoStatusTray
          {...status}
          onView={onView}
          className="hidden @[48rem]/todo:grid shortest:hidden"
        />
        <TodoKpiBar
          {...status}
          onOpen={() => setSheet(true)}
          className="@[48rem]/todo:hidden shortest:flex"
        />
      </div>
      <BottomSheet open={sheet} onOpenChange={setSheet} title={t("todo.status.aria")}>
        <TodoStatusSheet
          {...status}
          onView={(v) => {
            setSheet(false)
            onView(v)
          }}
        />
      </BottomSheet>
    </section>
  )
}
