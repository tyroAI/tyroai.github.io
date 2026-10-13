import { useMsal } from "@azure/msal-react"
import KanbanIcon from "@hugeicons/core-free-icons/KanbanIcon"
import { useLocale } from "@/hooks/useLocale"
import { useWidgetData } from "@/hooks/useWidgetData"
import { localDayKey } from "@/lib/todo"
import { dueLabel } from "@/lib/todoInsights"
import { fetchPlannerTasks } from "@/lib/widgetSources"
import { cn } from "@/lib/utils"
import { WidgetBody } from "./WidgetBody"
import { WidgetEmpty } from "./WidgetEmpty"
import { WidgetFrame } from "./WidgetFrame"
import { PageBody, Pager } from "./paging/Pager"
import { usePager } from "./paging/usePager"

/**
 * Planner işlerim — ekip panolarında bana atanmış, bitmemiş işler (teslimi en
 * yakın önce): plan adı, teslim, gecikme kehribar. Satır işi Planner'da açar.
 */
export function PlannerWidget({ className }) {
  const { t, locale } = useLocale()
  const { accounts } = useMsal()
  const tenant = accounts[0]?.tenantId ?? ""
  const res = useWidgetData("planner", fetchPlannerTasks)
  const tasks = res.data?.tasks ?? []
  const today = localDayKey()
  const pager = usePager(tasks, 3)
  return (
    <WidgetFrame
      id="planner"
      title={t("widgets.planner.title")}
      icon={KanbanIcon}
      busy={res.status === "loading"}
      className={className}
      pager={<Pager pager={pager} label={t("widgets.planner.title")} />}
      action={
        res.data?.total && pager.pages < 2 ? (
          <span className="text-[0.71875rem] tabular-nums text-muted-foreground">
            {t("widgets.planner.total", { n: res.data.total })}
          </span>
        ) : null
      }
    >
      <WidgetBody status={res.status} rows={4}>
        {tasks.length ? (
          <PageBody pager={pager} className="mt-3">
            {pager.items.map((x) => {
              const key = x.due ? localDayKey(x.due) : null
              const late = key && key < today
              return (
                <li key={x.id}>
                  <a
                    href={`https://tasks.office.com/${tenant}/Home/Task/${x.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-xl px-2 transition hover:bg-accent/60"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        x.started ? "bg-sky-500" : "border border-muted-foreground/50",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.8125rem] font-medium">
                        {x.urgent && (
                          <span className="me-1 font-bold text-red-600 dark:text-red-400">!</span>
                        )}
                        {x.title}
                      </span>
                      <span className="block truncate text-[0.6875rem] text-muted-foreground">
                        {x.plan}
                        {x.plan && key ? " · " : ""}
                        {key && (
                          <span
                            className={cn(late && "font-medium text-amber-700 dark:text-amber-400")}
                          >
                            {dueLabel(key, today, t, locale)}
                          </span>
                        )}
                      </span>
                    </span>
                  </a>
                </li>
              )
            })}
          </PageBody>
        ) : (
          <WidgetEmpty icon={KanbanIcon}>{t("widgets.planner.empty")}</WidgetEmpty>
        )}
      </WidgetBody>
    </WidgetFrame>
  )
}
