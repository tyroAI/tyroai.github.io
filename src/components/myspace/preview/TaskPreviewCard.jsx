import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import Notification01Icon from "@hugeicons/core-free-icons/Notification01Icon"
import StarIcon from "@hugeicons/core-free-icons/StarIcon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { Separator } from "@/components/ui/separator"
import { useLocale } from "@/hooks/useLocale"
import { useTodoTask } from "@/hooks/useTodoTask"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { localDayKey } from "@/lib/todo"
import { cn } from "@/lib/utils"

const OPTS_DAY = { day: "numeric", month: "long" }
const OPTS_STAMP = {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
}
const dayOf = (key) => {
  const [y, m, d] = String(key).split("-").map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Özetin "açık işler" satırındaki görevin önizlemesi: başlık, teslim
 * (gecikmişse kırmızı), önem, hatırlatma, not ve adımlar. Microsoft To Do'daki
 * görevin tam hâli açılınca istenir (`useTodoTask`); gelene kadar kısa model
 * görünür. Yerel listedeki iş (To Do yok) yalnız başlığını ve bunu söyler.
 * Dipte "To-Do'da aç" görevin ayrıntısını To-Do sayfasında açar.
 */
export function TaskPreviewCard({ task, openTo }) {
  const { t, locale } = useLocale()
  const res = useTodoTask(task)
  const v = { ...task, ...(res.task ?? {}) }
  const today = localDayKey()
  const day = getDateTimeFormat(locale, OPTS_DAY)
  const stamp = getDateTimeFormat(locale, OPTS_STAMP)
  const due =
    v.dueKey &&
    (v.dueKey === today
      ? t("myspace.taskPreview.dueToday")
      : v.dueKey < today && !v.done
        ? t("myspace.taskPreview.overdue", { date: day.format(dayOf(v.dueKey)) })
        : t("myspace.taskPreview.due", { date: day.format(dayOf(v.dueKey)) }))
  const steps = Array.isArray(v.steps) ? v.steps : []
  const stepsDone = steps.filter((s) => s.done).length

  return (
    <div className="text-[0.75rem]">
      <div className="p-4">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
              v.done ? "border-brand bg-brand text-white" : "border-muted-foreground/40",
            )}
          >
            {v.done && <HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={3} />}
          </span>
          <p
            dir="auto"
            className={cn(
              "min-w-0 flex-1 text-[0.9375rem] font-semibold leading-snug [overflow-wrap:anywhere]",
              v.done && "text-muted-foreground line-through",
            )}
          >
            {v.title}
          </p>
          {v.importance === "high" && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-700 dark:text-amber-300">
              <HugeiconsIcon
                icon={StarIcon}
                className="size-3"
                strokeWidth={2}
                aria-hidden="true"
              />
              {t("myspace.taskPreview.important")}
            </span>
          )}
        </div>
        <div className="mt-3 space-y-1.5 ps-[1.875rem] text-foreground/80">
          {v.done && <p className="font-medium text-brand">{t("myspace.taskPreview.done")}</p>}
          {due && (
            <p
              className={cn(
                "flex items-center gap-2",
                v.dueKey < today && !v.done && "font-medium text-destructive",
              )}
            >
              <HugeiconsIcon
                icon={Calendar03Icon}
                className="size-3.5 shrink-0"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              {due}
            </p>
          )}
          {v.reminderAt && (
            <p className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Notification01Icon}
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              {t("myspace.taskPreview.reminder", { date: stamp.format(new Date(v.reminderAt)) })}
            </p>
          )}
          {res.status === "loading" && (
            <span aria-hidden="true" className="ms-skeleton mt-2 block h-3 w-2/3 rounded-full" />
          )}
        </div>
      </div>

      {v.note && (
        <>
          <Separator />
          <div className="max-h-40 overflow-y-auto overscroll-contain p-4 py-3 [scrollbar-gutter:auto]!">
            <p dir="auto" className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {v.note}
            </p>
          </div>
        </>
      )}

      {steps.length > 0 && (
        <>
          <Separator />
          <div className="p-4 py-3">
            <p className="font-medium text-foreground/85">
              {t("myspace.taskPreview.steps", { done: stepsDone, total: steps.length })}
            </p>
            <ul className="mt-2 space-y-1.5">
              {steps.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full border",
                      s.done ? "border-brand bg-brand text-white" : "border-muted-foreground/40",
                    )}
                  >
                    {s.done && (
                      <HugeiconsIcon icon={Tick02Icon} className="size-2.5" strokeWidth={3} />
                    )}
                  </span>
                  <span
                    dir="auto"
                    className={cn(
                      "min-w-0 [overflow-wrap:anywhere]",
                      s.done && "text-muted-foreground line-through",
                    )}
                  >
                    {s.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <Separator />
      <div className="p-3.5">
        {openTo ? (
          <Link
            to={openTo}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[0.75rem] font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            {t("myspace.tip.tasks.open")}
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className="size-3.5 rtl:rotate-180"
              strokeWidth={2}
              aria-hidden="true"
            />
          </Link>
        ) : (
          <p className="text-center text-muted-foreground">{t("myspace.taskPreview.local")}</p>
        )}
      </div>
    </div>
  )
}
