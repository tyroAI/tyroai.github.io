import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon"
import AlarmClockIcon from "@hugeicons/core-free-icons/AlarmClockIcon"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon"
import Link01Icon from "@hugeicons/core-free-icons/Link01Icon"
import RepeatIcon from "@hugeicons/core-free-icons/RepeatIcon"
import StarIcon from "@hugeicons/core-free-icons/StarIcon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { CalendarMonthGrid } from "@/components/common/CalendarMonthGrid"
import { DestructiveDialog } from "@/components/security/dialogs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useLocale } from "@/hooks/useLocale"
import { STATUS } from "@/lib/graph"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { localDayKey } from "@/lib/todo"
import { keyToDate } from "@/lib/todoInsights"
import { cn } from "@/lib/utils"
import { DuePicker } from "./DuePicker"
import { TaskCheck } from "./TodoBoard"
import { listIcon } from "./listIcon"

/**
 * Görev ayrıntısı — To Do'nun sağ paneli: başlık · adımlar · son tarih ·
 * hatırlatıcı · tekrar · not · bağlı içerik · silme.
 *
 * ⚠️ **ADIMLAR VE BAĞLI İÇERİK PANEL AÇILINCA OKUNUR** (gerekçe
 * `lib/todoBoard.js`: `$expand` bu kiracıda denenmedi). İskelet bu yüzden
 * yalnız o iki bölümde; görevin kendi alanları zaten listede.
 *
 * ⚠️ **BAŞLIK VE NOT ODAK ÇIKINCA KAYDEDİLİR**, her tuşta değil: her harf bir
 * PATCH olurdu ve To Do bir görevi saniyede birden çok kez yazmaya 429
 * diyor. Değişmediyse hiç yazılmaz.
 *
 * ⚠️ **SİLME ONAYLI** (`DestructiveDialog`, `/security`nin kutusu): To Do'da
 * geri alma yok. Kutuda neyin GİDECEĞİ (adımlar, not) ve neyin KALACAĞI
 * (işaretli e-postanın kendisi Outlook'ta) ayrı ayrı yazıyor.
 */

const OPTS_FULL = { day: "numeric", month: "long", year: "numeric" }
const OPTS_STAMP = { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }
const REPEATS = ["daily", "weekdays", "weekly", "monthly", "yearly"]

function Section({ children, className }) {
  return <div className={cn("ms-surface rounded-2xl p-1.5", className)}>{children}</div>
}

function AutoText({
  value,
  onChange,
  onCommit,
  className,
  placeholder,
  label,
  singleLine = false,
  disabled,
}) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      disabled={disabled}
      aria-label={label}
      placeholder={placeholder}
      onChange={(e) => onChange(singleLine ? e.target.value.replace(/\n/g, " ") : e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (singleLine && e.key === "Enter") {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
      className={cn(
        "block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-muted-foreground/60",
        className,
      )}
    />
  )
}

/* ─── Adımlar ─────────────────────────────────────────────────────────── */

function Steps({ board, task }) {
  const { t } = useLocale()
  const [state, setState] = useState({ status: "loading", steps: [] })
  const [draft, setDraft] = useState("")

  useEffect(() => {
    let cancelled = false
    board.loadSteps(task).then((res) => {
      if (cancelled) return
      setState(
        res.status === STATUS.ready
          ? { status: "ready", steps: res.steps }
          : { status: "error", steps: [] },
      )
    })
    return () => {
      cancelled = true
    }
    // Yalnız görev değişince — `board` her render'da yeni bir nesne.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id])

  async function add(e) {
    e.preventDefault()
    const title = draft.trim().slice(0, 255)
    if (!title) return
    setDraft("")
    const temp = { id: `tmp-${Date.now()}`, title, done: false, pending: true }
    setState((s) => ({ ...s, steps: [...s.steps, temp] }))
    const res = await board.createStep(task, title)
    setState((s) => ({
      ...s,
      steps:
        res.status === STATUS.ready
          ? s.steps.map((x) => (x.id === temp.id ? res.step : x))
          : s.steps.filter((x) => x.id !== temp.id),
    }))
  }

  async function toggle(step) {
    setState((s) => ({
      ...s,
      steps: s.steps.map((x) => (x.id === step.id ? { ...x, done: !x.done } : x)),
    }))
    const res = await board.changeStep(task, step.id, { done: !step.done })
    if (res.status !== STATUS.ready)
      setState((s) => ({ ...s, steps: s.steps.map((x) => (x.id === step.id ? step : x)) }))
  }

  // Adım adının DÜZENLEMEDEN ÖNCEKİ hâli — boş bırakılırsa ya da To Do
  // reddederse ona dönülür.
  const before = useRef({})

  async function rename(stepId, title) {
    const original = before.current[stepId]
    const revert = () =>
      setState((s) => ({
        ...s,
        steps: s.steps.map((x) => (x.id === stepId ? { ...x, title: original } : x)),
      }))
    const clean = title.trim().slice(0, 255)
    if (original === undefined || clean === original) return
    if (!clean) return revert()
    const res = await board.changeStep(task, stepId, { title: clean })
    if (res.status !== STATUS.ready) revert()
  }

  async function remove(step) {
    const index = state.steps.findIndex((x) => x.id === step.id)
    setState((s) => ({ ...s, steps: s.steps.filter((x) => x.id !== step.id) }))
    const res = await board.removeStep(task, step.id)
    if (res.status !== STATUS.ready)
      setState((s) => {
        const steps = [...s.steps]
        steps.splice(index, 0, step)
        return { ...s, steps }
      })
  }

  // Paneldeki değişiklik satıra da yansısın (satırın "Adımları göster"i aynı
  // adımları göstersin). Yalnız okunmuş hâl yazılır; geçici kimlikliler dahil.
  const sync = board.setTaskSteps
  useEffect(() => {
    if (state.status === "ready")
      sync?.(
        task.id,
        state.steps.map(({ id, title, done, createdAt, pending }) => ({
          id,
          title,
          done,
          createdAt,
          pending,
        })),
      )
    // `sync` her çizimde yeni olabilir; yalnız adımlar değişince yaz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, task.id])

  const done = state.steps.filter((x) => x.done).length

  return (
    <Section>
      <div className="flex items-center justify-between px-2.5 pb-1 pt-1.5">
        <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {t("todo.detail.steps")}
        </h3>
        {state.steps.length > 0 && (
          <span className="text-[0.6875rem] tabular-nums text-muted-foreground">
            {done}/{state.steps.length}
          </span>
        )}
      </div>
      {state.status === "loading" && (
        <div aria-hidden="true" className="space-y-2 px-2.5 py-2">
          <span className="ms-skeleton block h-3 w-3/4 rounded-full" />
          <span className="ms-skeleton block h-3 w-1/2 rounded-full" />
        </div>
      )}
      {state.status === "error" && (
        <p className="px-2.5 py-2 text-[0.75rem] text-muted-foreground">
          {t("todo.detail.stepsError")}
        </p>
      )}
      <ul>
        {state.steps.map((step) => (
          <li
            key={step.id}
            className={cn(
              "group/step flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-foreground/[0.03]",
              step.pending && "opacity-60",
            )}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={step.done}
              aria-label={step.title}
              disabled={step.pending}
              onClick={() => toggle(step)}
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-full border transition",
                step.done
                  ? "border-transparent bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-brand-on-brand"
                  : "border-foreground/30 hover:border-brand",
              )}
            >
              {step.done && (
                <HugeiconsIcon icon={Tick02Icon} className="size-2.5" strokeWidth={3} />
              )}
            </button>
            <input
              value={step.title}
              disabled={step.pending}
              aria-label={t("todo.detail.stepTitle")}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  steps: s.steps.map((x) =>
                    x.id === step.id ? { ...x, title: e.target.value } : x,
                  ),
                }))
              }
              onFocus={() => (before.current[step.id] = step.title)}
              onBlur={(e) => rename(step.id, e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className={cn(
                "no-ios-zoom min-w-0 flex-1 bg-transparent text-[0.8125rem] outline-none",
                step.done && "text-muted-foreground line-through decoration-foreground/30",
              )}
            />
            <button
              type="button"
              disabled={step.pending}
              onClick={() => remove(step)}
              aria-label={t("todo.detail.removeStep")}
              className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground/60 opacity-0 transition hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover/step:opacity-100 [@media(pointer:coarse)]:opacity-100"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
      {state.status !== "loading" && (
        <form onSubmit={add} className="flex items-center gap-2.5 px-2.5 py-1.5">
          <HugeiconsIcon icon={Add01Icon} className="size-4 shrink-0 text-brand" strokeWidth={2} />
          <input
            value={draft}
            maxLength={255}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("todo.detail.addStep")}
            aria-label={t("todo.detail.addStep")}
            className="no-ios-zoom min-w-0 flex-1 bg-transparent py-1 text-[0.8125rem] outline-none placeholder:text-brand/80"
          />
        </form>
      )}
    </Section>
  )
}

/* ─── Hatırlatıcı ─────────────────────────────────────────────────────── */

function Reminder({ task, onChange }) {
  const { t, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const current = task.reminderAt ? new Date(task.reminderAt) : null
  const label = current
    ? getDateTimeFormat(locale, OPTS_STAMP).format(current)
    : t("todo.reminder.set")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={task.done}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.8125rem] outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-50",
            current ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <HugeiconsIcon icon={AlarmClockIcon} className="size-4 shrink-0" strokeWidth={1.8} />
          <span className="min-w-0 flex-1 truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-[17rem] gap-0 p-0"
      >
        <ReminderBody
          current={current}
          dueKey={task.dueKey}
          onSave={(d) => {
            onChange(d.toISOString())
            setOpen(false)
          }}
          onClear={
            current
              ? () => {
                  onChange(null)
                  setOpen(false)
                }
              : null
          }
        />
      </PopoverContent>
    </Popover>
  )
}

function ReminderBody({ current, dueKey, onSave, onClear }) {
  const { t } = useLocale()
  const startKey = current ? localDayKey(current) : (dueKey ?? localDayKey())
  const [day, setDay] = useState(() => keyToDate(startKey))
  const [month, setMonth] = useState(() => keyToDate(startKey))
  const [time, setTime] = useState(() =>
    current
      ? `${String(current.getHours()).padStart(2, "0")}:${String(current.getMinutes()).padStart(2, "0")}`
      : "09:00",
  )
  function save() {
    const [h, m] = time.split(":").map(Number)
    const at = new Date(day)
    at.setHours(h || 0, m || 0, 0, 0)
    onSave(at)
  }
  return (
    <div>
      <CalendarMonthGrid
        visibleMonth={month}
        onPrev={() => setMonth((x) => new Date(x.getFullYear(), x.getMonth() - 1, 1))}
        onNext={() => setMonth((x) => new Date(x.getFullYear(), x.getMonth() + 1, 1))}
        selectedDay={day}
        onSelectDay={setDay}
        picker
        minDay={new Date()}
      />
      <div className="flex items-center gap-2 border-t border-border px-3 py-2.5">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-[0.75rem] text-muted-foreground">
          {t("todo.reminder.time")}
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="no-ios-zoom h-8 rounded-lg border border-border bg-background px-2 text-[0.8125rem] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          />
        </label>
        <button
          type="button"
          onClick={save}
          className="h-8 rounded-full bg-brand-fill-deep px-3 text-[0.75rem] font-semibold text-brand-on-brand"
        >
          {t("todo.reminder.save")}
        </button>
      </div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-[0.8125rem] text-destructive transition hover:bg-destructive/10"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={2} />
          {t("todo.reminder.remove")}
        </button>
      )}
    </div>
  )
}

/* ─── Tekrar ──────────────────────────────────────────────────────────── */

function Repeat({ task, onChange }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const label = task.recurrence ? t(`todo.repeat.${task.recurrence}`) : t("todo.repeat.set")
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={task.done}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.8125rem] outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-50",
            task.recurrence ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <HugeiconsIcon icon={RepeatIcon} className="size-4 shrink-0" strokeWidth={1.8} />
          <span className="min-w-0 flex-1 truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-60 gap-0 p-1.5"
      >
        {!task.dueKey ? (
          <p className="px-2.5 py-2 text-[0.75rem] leading-snug text-muted-foreground">
            {t("todo.repeat.needsDue")}
          </p>
        ) : (
          <>
            {REPEATS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={task.recurrence === k}
                onClick={() => {
                  onChange(k)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[0.8125rem] outline-none transition hover:bg-accent focus-visible:bg-accent"
              >
                {t(`todo.repeat.${k}`)}
                {task.recurrence === k && (
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    className="size-3.5 text-brand"
                    strokeWidth={2.2}
                  />
                )}
              </button>
            ))}
            {task.recurrence && (
              <button
                type="button"
                onClick={() => {
                  onChange(null)
                  setOpen(false)
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-2.5 py-2 text-left text-[0.8125rem] text-destructive transition hover:bg-destructive/10"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={2} />
                {t("todo.repeat.remove")}
              </button>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

/* ─── Bağlı içerik ────────────────────────────────────────────────────── */

function Links({ board, task }) {
  const { t } = useLocale()
  const [links, setLinks] = useState([])
  useEffect(() => {
    let cancelled = false
    board.loadLinks(task).then((res) => {
      if (!cancelled && res.status === STATUS.ready) setLinks(res.links)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id])
  if (!links.length) return null
  return (
    <Section>
      <h3 className="px-2.5 pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {t("todo.detail.links")}
      </h3>
      {links.map((l) => (
        <a
          key={l.id ?? l.url}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.8125rem] outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-brand/30"
        >
          <HugeiconsIcon
            icon={Link01Icon}
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.8}
          />
          <span className="min-w-0 flex-1 truncate">{l.title || l.app || l.url}</span>
          <HugeiconsIcon
            icon={ArrowUpRight01Icon}
            className="size-3.5 shrink-0 text-muted-foreground"
            strokeWidth={2}
          />
        </a>
      ))}
    </Section>
  )
}

/* ─── Panel ───────────────────────────────────────────────────────────── */

function DetailBody({ board, task, list, onCompleted, onClose }) {
  const { t, locale } = useLocale()
  const [title, setTitle] = useState(task.title)
  const [note, setNote] = useState(task.note)
  const [confirm, setConfirm] = useState(false)
  const full = getDateTimeFormat(locale, OPTS_FULL)
  const stamp = getDateTimeFormat(locale, OPTS_STAMP)
  const locked = Boolean(task.pending)

  function commitTitle() {
    const clean = title.trim().slice(0, 255)
    if (!clean) {
      setTitle(task.title)
      return
    }
    if (clean !== task.title) board.updateTask(task.id, { title: clean })
  }
  function commitNote() {
    if (note !== task.note) board.updateTask(task.id, { note })
  }
  function toggle() {
    const next = !task.done
    board.updateTask(task.id, { done: next })
    if (next) onCompleted?.()
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 pb-6 pt-14">
        <SheetTitle className="sr-only">{t("todo.detail.title")}</SheetTitle>
        <SheetDescription className="sr-only">{task.title}</SheetDescription>

        <div className="flex items-start gap-3">
          <span className="pt-1">
            <TaskCheck
              size="lg"
              done={task.done}
              pending={locked}
              onToggle={toggle}
              label={task.done ? t("todo.check.undo") : t("todo.check.done")}
            />
          </span>
          <AutoText
            value={title}
            onChange={setTitle}
            onCommit={commitTitle}
            singleLine
            disabled={locked}
            label={t("todo.detail.titleLabel")}
            className={cn(
              "text-[1.1875rem] font-semibold leading-snug tracking-[-0.015em] [overflow-wrap:anywhere]",
              task.done && "text-muted-foreground line-through decoration-foreground/30",
            )}
          />
          <button
            type="button"
            disabled={locked}
            onClick={() =>
              board.updateTask(task.id, {
                importance: task.importance === "high" ? "normal" : "high",
              })
            }
            aria-pressed={task.importance === "high"}
            aria-label={task.importance === "high" ? t("todo.star.off") : t("todo.star.on")}
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-brand/30",
              task.importance === "high" ? "text-brand" : "text-muted-foreground",
            )}
          >
            <HugeiconsIcon
              icon={StarIcon}
              className={cn("size-[1.125rem]", task.importance === "high" && "fill-current")}
              strokeWidth={1.9}
            />
          </button>
        </div>
        {list && (
          <p className="mt-2 flex items-center gap-1.5 pl-9 text-[0.75rem] text-muted-foreground">
            <HugeiconsIcon icon={listIcon(list)} className="size-3.5" strokeWidth={1.9} />
            {list.name}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {!locked && <Steps board={board} task={task} />}

          <Section>
            <DuePicker
              variant="row"
              value={task.dueKey}
              onChange={(dueKey) => board.updateTask(task.id, { dueKey })}
            />
            <Reminder
              task={task}
              onChange={(reminderAt) => board.updateTask(task.id, { reminderAt })}
            />
            <Repeat
              task={task}
              onChange={(recurrence) => board.updateTask(task.id, { recurrence })}
            />
          </Section>

          {!locked && <Links board={board} task={task} />}

          <Section className="px-3 py-2.5">
            <AutoText
              value={note}
              onChange={setNote}
              onCommit={commitNote}
              disabled={locked}
              label={t("todo.detail.note")}
              placeholder={t("todo.detail.notePlaceholder")}
              className="no-ios-zoom min-h-[4.5rem] text-[0.8125rem] leading-relaxed"
            />
          </Section>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
        <div className="min-w-0 text-[0.6875rem] leading-snug text-muted-foreground">
          {task.createdAt && (
            <p>{t("todo.detail.created", { date: full.format(new Date(task.createdAt)) })}</p>
          )}
          {task.done && task.doneAt && (
            <p>{t("todo.detail.completed", { date: stamp.format(new Date(task.doneAt)) })}</p>
          )}
          {task.dueKey && !task.done && task.dueKey < localDayKey() && (
            <p className="font-medium text-amber-700 dark:text-amber-400">
              {t("todo.due.overdue", { date: full.format(keyToDate(task.dueKey)) })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            disabled={locked}
            onClick={() => setConfirm(true)}
            aria-label={t("todo.detail.delete")}
            title={t("todo.detail.delete")}
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-4" strokeWidth={1.9} />
          </button>
        </div>
      </footer>

      <DestructiveDialog
        open={confirm}
        onOpenChange={setConfirm}
        icon={Delete02Icon}
        title={t("todo.detail.deleteTitle")}
        description={t("todo.detail.deleteBody")}
        subject={task.title}
        consequences={[
          { kind: "gone", text: t("todo.detail.deleteGone") },
          ...(list?.kind === "flagged"
            ? [{ kind: "keep", text: t("todo.detail.deleteKeepMail") }]
            : []),
        ]}
        confirmLabel={t("todo.detail.deleteConfirm")}
        cancelLabel={t("todo.cancel")}
        onConfirm={() => {
          setConfirm(false)
          onClose()
          board.removeTask(task.id)
        }}
      />
    </>
  )
}

export function TodoDetail({ board, taskId, open, onOpenChange, onCompleted }) {
  const task = board.tasks.find((x) => x.id === taskId) ?? null
  const list = task ? board.lists.find((l) => l.id === task.listId) : null
  return (
    <Sheet open={open && Boolean(task)} onOpenChange={onOpenChange}>
      {/* ⚠️ Genişlik `data-[side=right]:` ÖNEKİYLE: taban sınıf öyle yazılı
          (`w-3/4`, `sm:max-w-sm`) ve öneksiz `w-full` onu ezmiyordu — panel
          telefonda ekranın dörtte üçünde, masaüstünde 24rem'de kalıyordu. */}
      <SheetContent
        side="right"
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
      >
        {task && (
          <DetailBody
            key={task.id}
            board={board}
            task={task}
            list={list}
            onCompleted={onCompleted}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
