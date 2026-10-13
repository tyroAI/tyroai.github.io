import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { TodoProgress } from "./TodoProgress"
import { TodoStatusTiles } from "./TodoStatusTiles"

/**
 * Kartın beyaz tepsisi — durumlar ve ilerleme halkası, gradyanın İÇİNDE tek yüzey.
 * ⚠️ **TEPSİ DÜZ `bg-card`, YARI SAYDAM DEĞİL**: küçük yazı paletin açık ucuna (Insta'nın
 * sarısı) düşüyordu; %5'lik gradyan sızıntısı bile soluk yazıyı 4,5:1'in altına itiyor.
 * Düz kart her palette iki temada da okunur (Keşfet tepsisinin kuralı).
 * Genişte 2×2 durum + halka sütunu; tablette dört durum tek sırada, halka yine sonda.
 */
const TRAY =
  "relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] rounded-[1.375rem] bg-card p-1.5 text-card-foreground shadow-[0_14px_32px_-18px_rgb(0_0_0/0.5)] ring-1 ring-black/[0.05] dark:ring-white/10"

export function TodoStatusTray({ tasks, summary, planned, today, state, onView, className }) {
  const { t } = useLocale()
  return (
    <div
      role="group"
      aria-label={t("todo.status.aria")}
      aria-busy={state.loading || undefined}
      className={cn(TRAY, className)}
    >
      <TodoStatusTiles
        summary={summary}
        planned={planned}
        today={today}
        state={state}
        onView={onView}
      />
      {/* Halka sütunu: tepsinin ve kartın SONU; arada tam boy ince çizgi. */}
      <div className="ms-1.5 flex min-w-0 items-center border-s border-foreground/[0.07] py-2 pe-2 ps-3.5 @[64rem]/todo:w-[10.5rem] @[64rem]/todo:items-stretch @[64rem]/todo:px-1.5 @[64rem]/todo:py-1">
        <TodoProgress
          tasks={tasks}
          today={today}
          openTotal={summary.openTotal}
          state={state}
          onView={onView}
          className="w-full"
        />
      </div>
    </div>
  )
}

/** Telefon çekmecesi: üstte ilerleme (halka sonda), altında dört durum alt alta. */
export function TodoStatusSheet({ tasks, summary, planned, today, state, onView }) {
  return (
    <div className="grid gap-4 pb-1">
      <TodoProgress
        tasks={tasks}
        today={today}
        openTotal={summary.openTotal}
        state={state}
        onView={onView}
        className="px-1"
      />
      <TodoStatusTiles
        summary={summary}
        planned={planned}
        today={today}
        state={state}
        onView={onView}
        variant="sheet"
      />
    </div>
  )
}
