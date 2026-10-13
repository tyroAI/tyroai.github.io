import { HugeiconsIcon } from "@hugeicons/react"
import AtIcon from "@hugeicons/core-free-icons/AtIcon"
import CheckListIcon from "@hugeicons/core-free-icons/CheckListIcon"
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon"
import Loading03Icon from "@hugeicons/core-free-icons/Loading03Icon"
import TaskAdd01Icon from "@hugeicons/core-free-icons/TaskAdd01Icon"
import Note01Icon from "@hugeicons/core-free-icons/Note01Icon"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { useActionTodos } from "./useActionTodos"

const OPTS_TIME = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }

const TODO_BTN =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[0.6875rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-70"

function TodoButton({ state, onAdd, t }) {
  if (state === "done") {
    return (
      <span className={`${TODO_BTN} bg-emerald-500/12 text-emerald-700 dark:text-emerald-300`}>
        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5" strokeWidth={2} />
        {t("meetingSummary.todoAdded")}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={state === "busy"}
      className={`${TODO_BTN} bg-brand/10 text-brand hover:bg-brand/15`}
    >
      <HugeiconsIcon
        icon={state === "busy" ? Loading03Icon : TaskAdd01Icon}
        className={state === "busy" ? "size-3.5 animate-spin" : "size-3.5"}
        strokeWidth={2}
      />
      {t("meetingSummary.todoAdd")}
    </button>
  )
}

function Section({ icon, title, count, action, children }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        <span className="grid size-6 place-items-center rounded-lg bg-brand/10 text-brand">
          <HugeiconsIcon icon={icon} className="size-3.5" strokeWidth={2} aria-hidden="true" />
        </span>
        {title}
        {count != null && <span className="tabular-nums text-muted-foreground/70">{count}</span>}
        {action && <span className="ms-auto normal-case tracking-normal">{action}</span>}
      </h3>
      {children}
    </section>
  )
}

/**
 * Özetin gövdesi — Copilot'un konuşulanları (başlık · metin · alt maddeler),
 * yapılacaklar (sorumluyla) ve kişinin anıldığı yerler (saat · konuşan ·
 * cümle). Metin toplantının dilinde gelir: `lang` verilmez, tarayıcı karar
 * verir; uzun cümleler sarar, hiçbir şey kırpılmaz. Her yapılacak tek tek ya
 * da hepsi birden To Do'ya eklenir (`useActionTodos`).
 */
export function SummaryBody({ insight, subject, t, locale }) {
  const time = getDateTimeFormat(locale, OPTS_TIME)
  const todos = useActionTodos(insight.actions, subject, t)
  return (
    <div className="space-y-7">
      {insight.notes.length > 0 && (
        <Section icon={Note01Icon} title={t("meetingSummary.notes")}>
          <ol className="space-y-4">
            {insight.notes.map((n, i) => (
              <li key={i} className="rounded-2xl bg-muted/40 p-4 ring-1 ring-border/50">
                {n.title && (
                  <p dir="auto" className="text-[0.9375rem] font-semibold leading-snug">
                    {n.title}
                  </p>
                )}
                {n.text && (
                  <p
                    dir="auto"
                    className="mt-1.5 text-[0.84375rem] leading-relaxed text-foreground/80"
                  >
                    {n.text}
                  </p>
                )}
                {n.subpoints.length > 0 && (
                  <ul className="mt-3 space-y-2 border-s-2 border-brand/25 ps-3.5">
                    {n.subpoints.map((p, j) => (
                      <li key={j} dir="auto" className="text-[0.8125rem] leading-relaxed">
                        {p.title && <span className="font-medium">{p.title}</span>}
                        {p.title && p.text && <span className="text-muted-foreground"> — </span>}
                        {p.text && <span className="text-foreground/75">{p.text}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {insight.actions.length > 0 && (
        <Section
          icon={CheckListIcon}
          title={t("meetingSummary.actions")}
          count={insight.actions.length}
          action={
            insight.actions.length > 1 &&
            !todos.allDone && (
              <button
                type="button"
                onClick={todos.addAll}
                className="rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold text-brand transition hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {t("meetingSummary.todoAddAll")}
              </button>
            )
          }
        >
          <ul className="divide-y divide-border/60 rounded-2xl ring-1 ring-border/60">
            {insight.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-3 p-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-brand/50"
                />
                <div className="min-w-0 flex-1">
                  {a.title && (
                    <p dir="auto" className="text-[0.84375rem] font-semibold leading-snug">
                      {a.title}
                    </p>
                  )}
                  {a.text && (
                    <p
                      dir="auto"
                      className="mt-0.5 text-[0.8125rem] leading-relaxed text-foreground/75"
                    >
                      {a.text}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {a.owner && (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[0.6875rem] font-semibold text-foreground/75">
                      {a.owner}
                    </span>
                  )}
                  <TodoButton state={todos.state[i]} onAdd={() => todos.add(i)} t={t} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {insight.mentions.length > 0 && (
        <Section icon={AtIcon} title={t("meetingSummary.mentions")} count={insight.mentions.length}>
          <ul className="space-y-2.5">
            {insight.mentions.map((m, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-11 shrink-0 pt-0.5 text-[0.75rem] tabular-nums text-muted-foreground">
                  {m.at ? time.format(m.at) : ""}
                </span>
                <blockquote className="min-w-0 flex-1 border-s-2 border-border ps-3">
                  <p dir="auto" className="text-[0.8125rem] leading-relaxed text-foreground/80">
                    “{m.text}”
                  </p>
                  {m.speaker && (
                    <footer className="mt-0.5 text-[0.75rem] font-medium text-muted-foreground">
                      {m.speaker}
                    </footer>
                  )}
                </blockquote>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
