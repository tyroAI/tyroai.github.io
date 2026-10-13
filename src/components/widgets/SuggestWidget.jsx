import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import StarIcon from "@hugeicons/core-free-icons/StarIcon"
import Sun03Icon from "@hugeicons/core-free-icons/Sun03Icon"
import { useLocale } from "@/hooks/useLocale"
import { localDayKey } from "@/lib/todo"
import { dueLabel } from "@/lib/todoInsights"
import { WidgetEmpty } from "./WidgetEmpty"
import { FrameAction, WidgetFrame } from "./WidgetFrame"
import { PageBody, Pager } from "./paging/Pager"
import { usePager } from "./paging/usePager"

const PER_PAGE = 3
const MAX = 12

/**
 * Bugüne al — Bugünün odağı boş kalmasın diye öneri: bugüne düşmemiş açık
 * işler, önce yıldızlılar, sonra teslimi en yakın olanlar. "Bugüne al" işin
 * son tarihini bugüne çeker; iş Anasayfa'nın odağında da belirir
 * (`useTodoBoard` › `updateTask`, iki yüzey `lib/todoSync` ile eşitlenir).
 */
export function SuggestWidget({ ctx, className }) {
  const { board, pageAccess } = ctx
  const { t, locale } = useLocale()
  const [moved, setMoved] = useState(() => new Set())
  const today = localDayKey()
  const picks = useMemo(
    () =>
      board.tasks
        .filter((x) => !x.done && !moved.has(x.id) && (!x.dueKey || x.dueKey > today))
        .sort((a, b) => {
          const star = (b.importance === "high") - (a.importance === "high")
          if (star) return star
          return (a.dueKey ?? "9999") < (b.dueKey ?? "9999") ? -1 : 1
        })
        .slice(0, MAX),
    [board.tasks, moved, today],
  )

  const pager = usePager(picks, PER_PAGE)

  function take(task) {
    setMoved((s) => new Set(s).add(task.id))
    board.updateTask(task.id, { dueKey: today })
  }

  return (
    <WidgetFrame
      id="suggest"
      title={t("widgets.suggest.title")}
      icon={Sun03Icon}
      busy={board.loading}
      className={className}
      pager={<Pager pager={pager} label={t("widgets.suggest.title")} />}
      action={
        pageAccess.todo ? (
          <FrameAction to="/todo?view=planned">{t("widgets.suggest.all")}</FrameAction>
        ) : null
      }
    >
      {board.loading ? (
        <div aria-hidden="true" className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="ms-skeleton block h-9 rounded-xl" />
          ))}
        </div>
      ) : board.status !== "ready" ? (
        <p className="mt-3 text-[0.8125rem] text-muted-foreground">
          {t("widgets.common.unavailable")}
        </p>
      ) : picks.length ? (
        <PageBody pager={pager} className="mt-2 space-y-1">
          {pager.items.map((task) => (
            <li key={task.id} className="flex min-h-10 items-center gap-2.5">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium">
                  {task.importance === "high" && (
                    <HugeiconsIcon
                      icon={StarIcon}
                      className="size-3.5 shrink-0 fill-current text-brand"
                      strokeWidth={1.8}
                    />
                  )}
                  <span className="truncate">{task.title || t("todo.untitled")}</span>
                </span>
                <span className="block truncate text-[0.6875rem] text-muted-foreground">
                  {task.dueKey
                    ? dueLabel(task.dueKey, today, t, locale)
                    : t("widgets.suggest.noDue")}
                </span>
              </span>
              <button
                type="button"
                onClick={() => take(task)}
                className="inline-flex h-7 shrink-0 items-center rounded-full bg-brand/[0.08] px-2.5 text-[0.71875rem] font-semibold text-brand transition hover:bg-brand/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {t("widgets.suggest.take")}
              </button>
            </li>
          ))}
        </PageBody>
      ) : (
        <WidgetEmpty icon={Sun03Icon}>{t("widgets.suggest.empty")}</WidgetEmpty>
      )}
    </WidgetFrame>
  )
}
