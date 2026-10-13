import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { TodoSummaryCard } from "@/components/todo/TodoSummaryCard"
import { useQuickAdd } from "@/components/todo/useQuickAdd"
import { useLocale } from "@/hooks/useLocale"
import { localDayKey } from "@/lib/todo"
import { boardSummary } from "@/lib/todoInsights"
import { cn } from "@/lib/utils"

/**
 * To-Do özeti — To-Do sayfasının tek kartı, widget olarak (`TodoSummaryCard` aynen).
 * Kendi kabı var (`@container/todo`): düzen sayfa değil HÜCRE genişliğine göre — geniş hücrede
 * hap ve tepsi, dar hücrede ve telefonda maskot + KPI çubuğu (hap yok). Kart hücreyi doldurur.
 * Veri panonun To Do kancası (`ctx.board`, iki pano da zaten çağırıyor); durum kutuları ve
 * halka To-Do sayfasının aynı görünümünü açar (`/todo?view=…`, Bugün adressiz).
 */
export function TodoSummaryWidget({ ctx, className }) {
  const { board, now } = ctx
  const { t } = useLocale()
  const navigate = useNavigate()
  // Gün dönünce panonun dakikalık saatiyle birlikte döner.
  const today = localDayKey(now ? new Date(now) : new Date())
  const summary = useMemo(() => boardSummary(board.tasks, today), [board.tasks, today])
  const { busy, quickAdd } = useQuickAdd(board, today)
  const openView = useCallback(
    (view) => navigate(view === "today" ? "/todo" : `/todo?view=${view}`),
    [navigate],
  )

  return (
    <div data-widget="todo-summary" className={cn("@container/todo flex min-w-0", className)}>
      <TodoSummaryCard
        board={board}
        summary={summary}
        today={today}
        busy={busy}
        onQuickAdd={quickAdd}
        onView={openView}
        label={t("widgets.todo.title")}
        className="w-full"
      />
    </div>
  )
}
