import { useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon"
import AlarmClockIcon from "@hugeicons/core-free-icons/AlarmClockIcon"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import Attachment01Icon from "@hugeicons/core-free-icons/Attachment01Icon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import CheckListIcon from "@hugeicons/core-free-icons/CheckListIcon"
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon"
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon"
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon"
import Note01Icon from "@hugeicons/core-free-icons/Note01Icon"
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon"
import RepeatIcon from "@hugeicons/core-free-icons/RepeatIcon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import StarIcon from "@hugeicons/core-free-icons/StarIcon"
import Sun03Icon from "@hugeicons/core-free-icons/Sun03Icon"
import Task01Icon from "@hugeicons/core-free-icons/Task01Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import {
  SORTS,
  dueLabel,
  groupTasks,
  keyToDate,
  searchTasks,
  tasksForView,
} from "@/lib/todoInsights"
import { FIRST_DAY } from "@/lib/weekStart"
import { cn } from "@/lib/utils"
import { EmptyState, RowsSkeleton } from "./BoardStates"
import { TodoAddBar } from "./TodoAddBar"
import { listIcon } from "./listIcon"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  To-Do'nun LİSTE bölümü — görünümler · listeler · ekleme · gruplar
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Microsoft To Do'nun kendi iskeleti: solda akıllı görünümler (Bugün ·
 * Önemli · Planlanan · Tümü · Tamamlanan) ve kişinin listeleri, sağda seçili
 * görünümün grupları. "Günüm" (My Day) YOK — Graph o görünümü vermiyor;
 * "Bugün" teslim tarihiyle tanımlı ve Akışım'ın "Bugünün odağı"nın aynısı
 * (`lib/todoInsights.js` › `isFocus`).
 *
 * ⚠️ **DÜZEN KAPSAYICIYLA** (`@container/board`): sohbet rıhtımı açılınca
 * sayfa daralıyor ama görüntü alanı aynı kalıyor (Keşfet'in dersi). Dar
 * kapsayıcıda ray yatay bir çip şeridine iniyor — görünümler aynı anda iki
 * yerde çizilmiyor.
 *
 * ⚠️ **İŞARETLENEN SATIR BİR AN YERİNDE KALIR** (`keepOpen`, 1,1 sn): To
 * Do'nun kendi davranışı. Anında yok olan satır "yanlışlıkla mı bastım?"
 * dedirtiyordu; üstü çizili hâli görünüp sonra tamamlananlara kayıyor.
 */

const VIEW_META = [
  { id: "today", icon: Sun03Icon },
  { id: "important", icon: StarIcon },
  { id: "planned", icon: Calendar03Icon },
  { id: "all", icon: Task01Icon },
  { id: "done", icon: CheckmarkCircle02Icon },
]
const KEEP_MS = 1100
const OPTS_GROUP_DAY = { weekday: "long", day: "numeric", month: "long" }
const OPTS_DONE_TIME = { hour: "2-digit", minute: "2-digit" }

/* ─── Satır ───────────────────────────────────────────────────────────── */

function MetaChip({ icon, children, tone, label }) {
  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center gap-1 text-[0.6875rem] leading-4",
        tone === "overdue"
          ? "font-medium text-amber-700 dark:text-amber-400"
          : tone === "today"
            ? "font-medium text-brand-ink"
            : "text-muted-foreground",
      )}
    >
      {icon && (
        <HugeiconsIcon icon={icon} className="size-3 shrink-0" strokeWidth={2} aria-hidden="true" />
      )}
      {children}
      {!children && label && <span className="sr-only">{label}</span>}
    </span>
  )
}

export function TaskCheck({ done, pending, onToggle, label, size = "md" }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      disabled={pending}
      onClick={onToggle}
      className={cn(
        "group/check grid shrink-0 place-items-center rounded-full border-[1.5px] outline-none transition",
        "focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50",
        size === "lg" ? "size-6" : size === "sm" ? "size-[0.9375rem] border" : "size-[1.125rem]",
        done
          ? "border-transparent bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-brand-on-brand"
          : "border-foreground/30 text-transparent hover:border-brand hover:text-brand/60",
      )}
    >
      <HugeiconsIcon
        icon={Tick02Icon}
        className={size === "lg" ? "size-3.5" : size === "sm" ? "size-2" : "size-2.5"}
        strokeWidth={3}
      />
    </button>
  )
}

/**
 * ⚠️ ADIMLAR SORGUYLA GELMEDİYSE SATIR KENDİSİ SORAR — ama yalnız EKRANA
 * GİRİNCE ve aynı anda en çok iki tane (posta kutusunun eşzamanlılık sınırı,
 * `lib/todo.js`in dokuzuncu tur dersi). "Tümü" görünümünde yüz görevin
 * hepsini peşin sormak yüz istek demekti. Anahtar `kimlik@değişiklik`:
 * görev değişmedikçe ikinci kez sorulmaz.
 */
const stepAsk = { running: 0, waiting: [], asked: new Set() }
function pumpSteps() {
  while (stepAsk.running < 2 && stepAsk.waiting.length) {
    const job = stepAsk.waiting.shift()
    stepAsk.running += 1
    job().finally(() => {
      stepAsk.running -= 1
      pumpSteps()
    })
  }
}
function askSteps(board, task) {
  const k = `${task.id}@${task.modifiedAt}`
  if (stepAsk.asked.has(k)) return
  stepAsk.asked.add(k)
  stepAsk.waiting.push(() =>
    board.loadSteps(task).then((res) => {
      if (res.status === "ready") board.setTaskSteps(task.id, res.steps)
    }),
  )
  pumpSteps()
}

/** Açık tutulan adım listeleri — satır gruplar arasında yeniden doğsa da açık kalsın (oturum). */
const openSteps = new Set()

function TaskRow({ task, list, today, showList, onToggle, onStar, onOpen, fresh, board }) {
  const { t, locale } = useLocale()
  const due = dueLabel(task.dueKey, today, t, locale)
  const overdue = !task.done && task.dueKey && task.dueKey < today
  const doneTime =
    task.done && task.doneAt
      ? getDateTimeFormat(locale, OPTS_DONE_TIME).format(new Date(task.doneAt))
      : null
  const steps = Array.isArray(task.steps) ? task.steps : null
  const stepsDone = steps ? steps.filter((x) => x.done).length : 0
  const [showSteps, setShowSteps] = useState(() => openSteps.has(task.id))
  const rowRef = useRef(null)
  const stepsId = `steps-${task.id}`

  // Yedek yol: adımları bilinmeyen AÇIK görev ekrana girince sorulur.
  const unknown = task.steps === undefined && !task.done && !task.pending
  useEffect(() => {
    if (!unknown || !board) return undefined
    const el = rowRef.current
    if (!el || typeof IntersectionObserver === "undefined") return undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          askSteps(board, task)
          io.disconnect()
        }
      },
      { rootMargin: "200px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
    // `board`/`task` nesneleri her çizimde yeni; kimlik ve değişiklik anı yeter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unknown, task.id, task.modifiedAt])

  const flipSteps = () => {
    const next = !showSteps
    if (next) openSteps.add(task.id)
    else openSteps.delete(task.id)
    setShowSteps(next)
  }

  return (
    <li
      ref={rowRef}
      className={cn(
        "group/row relative flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-foreground/[0.03]",
        task.pending && "opacity-60",
        fresh && "animate-[todo-fresh_1.6s_ease-out]",
      )}
    >
      <span className="pt-0.5">
        <TaskCheck
          done={task.done}
          pending={task.pending}
          onToggle={() => onToggle(task)}
          label={task.done ? t("todo.check.undo") : t("todo.check.done")}
        />
      </span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpen(task)}
          disabled={task.pending}
          className="block w-full min-w-0 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        >
          <span
            className={cn(
              "line-clamp-2 text-[0.875rem] leading-snug [overflow-wrap:anywhere]",
              task.done && "text-muted-foreground line-through decoration-foreground/30",
            )}
          >
            {task.title || t("todo.untitled")}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {showList && list && (
              <MetaChip icon={listIcon(list)}>
                <span className="max-w-[10rem] truncate">{list.name}</span>
              </MetaChip>
            )}
            {due && !task.done && (
              <MetaChip
                icon={Calendar03Icon}
                tone={overdue ? "overdue" : task.dueKey === today ? "today" : undefined}
              >
                {overdue ? t("todo.due.overdue", { date: due }) : due}
              </MetaChip>
            )}
            {doneTime && (
              <MetaChip icon={CheckmarkCircle02Icon}>
                {t("todo.meta.doneAt", { time: doneTime })}
              </MetaChip>
            )}
            {task.reminderAt && !task.done && (
              <MetaChip icon={AlarmClockIcon} label={t("todo.meta.reminder")} />
            )}
            {task.recurrence && <MetaChip icon={RepeatIcon} label={t("todo.meta.repeat")} />}
            {task.hasAttachments && (
              <MetaChip icon={Attachment01Icon} label={t("todo.meta.attachment")} />
            )}
          </span>
          {/* NOT SATIRDA (2026-10-02, istek: *"to do notunu da satırda görelim"*):
              ikonu değil METNİN kendisi, iki satıra kadar; tamamı ayrıntı
              panelinde. Satırın düğmesinin içinde — basınca paneli açar. */}
          {task.note && (
            <span className="mt-1.5 flex items-start gap-1.5 text-[0.78125rem] leading-snug text-muted-foreground">
              <HugeiconsIcon
                icon={Note01Icon}
                className="mt-0.5 size-3 shrink-0 opacity-70"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="sr-only">{t("todo.meta.note")}: </span>
              <span className="line-clamp-2 whitespace-pre-line [overflow-wrap:anywhere]">
                {task.note}
              </span>
            </span>
          )}
        </button>
        {/* ADIMLAR — "Adımları göster" ile açılıp kapanır (istek, aynı gün).
            Düğme satırın açma düğmesinin KARDEŞİ: iç içe düğme yok. Adım
            buradan da işaretlenir (iyimser, To Do reddederse geri döner). */}
        {steps && steps.length > 0 && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={flipSteps}
              aria-expanded={showSteps}
              aria-controls={stepsId}
              className="inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 -mx-1 text-[0.71875rem] font-medium text-muted-foreground outline-none transition hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/30 [@media(pointer:coarse)]:min-h-9"
            >
              <HugeiconsIcon
                icon={CheckListIcon}
                className="size-3.5"
                strokeWidth={2}
                aria-hidden="true"
              />
              {showSteps ? t("todo.steps.hide") : t("todo.steps.show")}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[0.65625rem] font-semibold tabular-nums",
                  stepsDone === steps.length
                    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                    : "bg-foreground/[0.06] text-foreground/70",
                )}
              >
                {stepsDone}/{steps.length}
              </span>
              <span className="sr-only">
                {t("todo.steps.progress", { done: stepsDone, total: steps.length })}
              </span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className={cn("size-3 transition-transform", showSteps && "rotate-180")}
                strokeWidth={2}
                aria-hidden="true"
              />
            </button>
            {showSteps && (
              <ul id={stepsId} className="mt-1 space-y-0.5 border-l border-foreground/10 pl-2.5">
                {steps.map((step) => (
                  <li
                    key={step.id}
                    className={cn("flex items-start gap-2 py-0.5", step.pending && "opacity-60")}
                  >
                    <span className="pt-[0.1875rem]">
                      <TaskCheck
                        size="sm"
                        done={step.done}
                        pending={step.pending || task.pending || !board}
                        onToggle={() => board?.toggleStep(task, step)}
                        label={t(step.done ? "todo.steps.uncheck" : "todo.steps.check", {
                          title: step.title,
                        })}
                      />
                    </span>
                    <span
                      className={cn(
                        "min-w-0 text-[0.8125rem] leading-snug [overflow-wrap:anywhere]",
                        step.done
                          ? "text-muted-foreground line-through decoration-foreground/30"
                          : "text-foreground/85",
                      )}
                    >
                      {step.title || t("todo.untitled")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onStar(task)}
        disabled={task.pending}
        aria-pressed={task.importance === "high"}
        aria-label={task.importance === "high" ? t("todo.star.off") : t("todo.star.on")}
        title={task.importance === "high" ? t("todo.star.off") : t("todo.star.on")}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-brand/30",
          task.importance === "high"
            ? "text-brand"
            : "text-muted-foreground/40 opacity-0 hover:text-foreground group-hover/row:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100",
        )}
      >
        <HugeiconsIcon
          icon={StarIcon}
          className={cn("size-4", task.importance === "high" && "fill-current")}
          strokeWidth={1.9}
        />
      </button>
    </li>
  )
}

/* ─── Ray: görünümler + listeler ──────────────────────────────────────── */

function RailButton({ active, icon, label, count, onClick, tone, trailing }) {
  return (
    <div className="group/rail relative">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[0.8125rem] outline-none transition",
          "focus-visible:ring-2 focus-visible:ring-brand/30",
          active
            ? "bg-brand/[0.09] font-semibold text-foreground"
            : "text-foreground/75 hover:bg-foreground/[0.04] hover:text-foreground",
        )}
      >
        <HugeiconsIcon
          icon={icon}
          className={cn("size-4 shrink-0", active ? "text-brand" : "text-muted-foreground")}
          strokeWidth={1.9}
        />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count > 0 && (
          <span
            className={cn(
              "shrink-0 text-[0.6875rem] tabular-nums",
              tone === "overdue"
                ? "font-semibold text-amber-700 dark:text-amber-400"
                : "text-muted-foreground",
              trailing && "group-hover/rail:opacity-0",
            )}
          >
            {count}
          </span>
        )}
      </button>
      {trailing}
    </div>
  )
}

function ListMenu({ list, onRename, onDelete }) {
  const { t } = useLocale()
  if (list.kind !== "custom" || !list.isOwner) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("todo.lists.menu")}
          className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground opacity-0 outline-none transition hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover/rail:opacity-100 data-[state=open]:opacity-100 [@media(pointer:coarse)]:opacity-100"
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => onRename(list)}>
          <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" strokeWidth={1.8} />
          {t("todo.lists.rename")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(list)}>
          <HugeiconsIcon icon={Delete02Icon} className="size-4" strokeWidth={1.8} />
          {t("todo.lists.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function InlineName({ initial = "", placeholder, onSubmit, onCancel }) {
  const [value, setValue] = useState(initial)
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(value)
      }}
      className="px-1"
    >
      <input
        ref={ref}
        value={value}
        maxLength={120}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => (value.trim() ? onSubmit(value) : onCancel())}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        className="no-ios-zoom w-full rounded-xl border border-brand/40 bg-background px-3 py-2 text-[0.8125rem] outline-none ring-2 ring-brand/10"
      />
    </form>
  )
}

function Rail({ board, view, counts, today, onView, onDeleteList }) {
  const { t } = useLocale()
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState(null)

  async function create(name) {
    setCreating(false)
    const list = await board.addList(name)
    if (list) onView(`list:${list.id}`)
  }

  return (
    <nav aria-label={t("todo.view.aria")} className="flex flex-col gap-0.5">
      {VIEW_META.map((v) => (
        <RailButton
          key={v.id}
          active={view === v.id}
          icon={v.icon}
          label={t(`todo.view.${v.id}`)}
          count={v.id === "done" ? 0 : counts[v.id]}
          tone={
            v.id === "today" && board.tasks.some((x) => !x.done && x.dueKey && x.dueKey < today)
              ? "overdue"
              : undefined
          }
          onClick={() => onView(v.id)}
        />
      ))}
      <div className="mx-3 my-3 h-px bg-border" />
      <p
        className="px-3 pb-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
        lang={undefined}
      >
        {t("todo.lists.title")}
      </p>
      {board.lists.map((l) =>
        renaming === l.id ? (
          <InlineName
            key={l.id}
            initial={l.name}
            onSubmit={(name) => {
              setRenaming(null)
              board.renameList(l.id, name)
            }}
            onCancel={() => setRenaming(null)}
          />
        ) : (
          <RailButton
            key={l.id}
            active={view === `list:${l.id}`}
            icon={listIcon(l)}
            label={l.unreadable ? `${l.name} · ${t("todo.lists.unreadable")}` : l.name}
            count={counts[`list:${l.id}`]}
            onClick={() => onView(`list:${l.id}`)}
            trailing={
              <ListMenu list={l} onRename={(x) => setRenaming(x.id)} onDelete={onDeleteList} />
            }
          />
        ),
      )}
      {creating ? (
        <InlineName
          placeholder={t("todo.lists.newPlaceholder")}
          onSubmit={create}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[0.8125rem] text-brand outline-none transition hover:bg-brand/[0.06] focus-visible:ring-2 focus-visible:ring-brand/30"
        >
          <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
          {t("todo.lists.new")}
        </button>
      )}
    </nav>
  )
}

/** Dar kapsayıcıda rayın yerine: görünümler ve listeler tek yatay şeritte. */
function ChipStrip({ board, view, counts, onView }) {
  const { t } = useLocale()
  const items = [
    ...VIEW_META.map((v) => ({
      id: v.id,
      icon: v.icon,
      label: t(`todo.view.${v.id}`),
      count: v.id === "done" ? 0 : counts[v.id],
    })),
    ...board.lists.map((l) => ({
      id: `list:${l.id}`,
      icon: listIcon(l),
      label: l.name,
      count: counts[`list:${l.id}`],
    })),
  ]
  return (
    <div
      role="group"
      aria-label={t("todo.view.aria")}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
    >
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onView(it.id)}
          aria-pressed={view === it.id}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.75rem] transition [@media(pointer:coarse)]:min-h-10",
            view === it.id
              ? "border-brand/30 bg-brand/[0.09] font-semibold text-foreground"
              : "border-border bg-card text-foreground/75 hover:text-foreground",
          )}
        >
          <HugeiconsIcon
            icon={it.icon}
            className={cn("size-3.5", view === it.id ? "text-brand" : "text-muted-foreground")}
            strokeWidth={1.9}
          />
          <span className="max-w-[9rem] truncate">{it.label}</span>
          {it.count > 0 && <span className="tabular-nums text-muted-foreground">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ─── Gruplar ─────────────────────────────────────────────────────────── */

function GroupHead({ group, count, collapsed, onToggle }) {
  const { t, locale } = useLocale()
  const label = group.label
    ? t(group.label)
    : (group.raw ??
      (group.dateKey
        ? getDateTimeFormat(locale, OPTS_GROUP_DAY).format(keyToDate(group.dateKey))
        : null))
  if (!label) return null
  const cls = cn(
    "flex items-center gap-2 px-3 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em]",
    group.tone === "overdue" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
  )
  if (!group.collapsible) {
    return (
      <h4 className={cls} lang={locale}>
        <span className="[&::first-letter]:uppercase">{label}</span>
        <span className="tabular-nums font-medium opacity-70">{count}</span>
      </h4>
    )
  }
  return (
    <h4 className="px-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className={cn(
          cls,
          "rounded-lg outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/30",
        )}
        lang={locale}
      >
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className={cn("size-3.5 transition-transform", collapsed && "-rotate-90")}
          strokeWidth={2.2}
        />
        {label}
        <span className="tabular-nums font-medium opacity-70">{count}</span>
      </button>
    </h4>
  )
}

/* ─── Bölüm ───────────────────────────────────────────────────────────── */

export function TodoBoard({
  board,
  today,
  view,
  onView,
  onOpenTask,
  onDeleteList,
  onCompleted,
  addRef,
  actions,
}) {
  const { t, locale } = useLocale()
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState("smart")
  const [keepOpen, setKeepOpen] = useState(() => new Set())
  const [fresh, setFresh] = useState(() => new Set())
  const [collapsed, setCollapsed] = useState(() => new Set(["done"]))
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const listById = useMemo(() => new Map(board.lists.map((l) => [l.id, l])), [board.lists])
  const counts = useMemo(() => {
    const open = board.tasks.filter((x) => !x.done)
    const c = {
      today: open.filter((x) => x.dueKey && x.dueKey <= today).length,
      important: open.filter((x) => x.importance === "high").length,
      planned: open.filter((x) => x.dueKey).length,
      all: open.length,
    }
    for (const l of board.lists) c[`list:${l.id}`] = open.filter((x) => x.listId === l.id).length
    return c
  }, [board.tasks, board.lists, today])

  const firstDay = FIRST_DAY[locale] ?? 1
  const scoped = useMemo(
    () => searchTasks(tasksForView(board.tasks, view, today), query),
    [board.tasks, view, today, query],
  )
  const groups = useMemo(
    () => groupTasks(scoped, view, { today, lists: board.lists, sort, locale, firstDay, keepOpen }),
    [scoped, view, today, board.lists, sort, locale, firstDay, keepOpen],
  )
  const showList = !view?.startsWith("list:") && board.lists.length > 1
  const title = view?.startsWith("list:")
    ? (listById.get(view.slice(5))?.name ?? "")
    : t(`todo.view.${view}`)
  const activeList = view?.startsWith("list:") ? listById.get(view.slice(5)) : null
  const openCount = scoped.filter((x) => !x.done).length

  function toggle(task) {
    const next = !task.done
    board.updateTask(task.id, { done: next })
    if (next) {
      onCompleted?.()
      setKeepOpen((s) => new Set(s).add(task.id))
      timers.current.push(
        setTimeout(() => {
          setKeepOpen((s) => {
            const n = new Set(s)
            n.delete(task.id)
            return n
          })
        }, KEEP_MS),
      )
    }
  }

  function added(task, replaces) {
    setFresh((s) => {
      const n = new Set(s)
      if (replaces) n.delete(replaces)
      n.add(task.id)
      return n
    })
    timers.current.push(
      setTimeout(() => {
        setFresh((s) => {
          const n = new Set(s)
          n.delete(task.id)
          return n
        })
      }, 1700),
    )
  }

  const loading = board.status === "loading"

  return (
    <div className="@container/board">
      <div className="grid gap-6 @[52rem]/board:grid-cols-[14.5rem_minmax(0,1fr)] @[52rem]/board:gap-10">
        <aside className="hidden @[52rem]/board:block">
          <div className="sticky top-4">
            {loading ? (
              <div aria-hidden="true" className="space-y-2 px-3 pt-1">
                {[70, 55, 62, 40, 58].map((w) => (
                  <span
                    key={w}
                    className="ms-skeleton block h-4 rounded-full"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            ) : (
              <Rail
                board={board}
                view={view}
                counts={counts}
                today={today}
                onView={onView}
                onDeleteList={onDeleteList}
              />
            )}
          </div>
        </aside>

        <div className="min-w-0">
          {!loading && (
            <div className="mb-4 @[52rem]/board:hidden">
              <ChipStrip board={board} view={view} counts={counts} onView={onView} />
            </div>
          )}

          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className="flex min-w-0 items-center gap-2 text-[1.375rem] font-semibold tracking-[-0.02em]"
                  lang={locale}
                >
                  <span className="truncate">{title}</span>
                  {!loading && view !== "done" && (
                    <span className="text-[0.875rem] font-medium tabular-nums text-muted-foreground">
                      {openCount}
                    </span>
                  )}
                </h3>
                {activeList?.isShared && (
                  <p className="mt-0.5 text-[0.71875rem] text-muted-foreground">
                    {t("todo.lists.shared")}
                  </p>
                )}
              </div>
              {/* Dar panoda Yenile başlığın yanında: arama satırda yer bulsun ("Gör…" diye kesilmesin). */}
              <span className="shrink-0 @[40rem]/board:hidden">{actions}</span>
            </div>
            <div className="flex w-full items-center gap-2 @[40rem]/board:w-auto">
              <label className="relative flex min-w-0 flex-1 items-center @[40rem]/board:w-60 @[40rem]/board:flex-none">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
                  strokeWidth={1.8}
                />
                <span className="sr-only">{t("todo.search.aria")}</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("todo.search.placeholder")}
                  className="no-ios-zoom h-9 w-full min-w-0 rounded-full border border-border bg-muted/40 pl-9 pr-3 text-[0.8125rem] outline-none transition placeholder:text-muted-foreground/70 focus-visible:border-brand/40 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-brand/25 pointer-coarse:h-11"
                />
              </label>
              {view !== "done" && (
                <select
                  aria-label={t("todo.sort.label")}
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-9 max-w-[8.5rem] shrink-0 truncate rounded-full border border-border bg-card px-3 text-[0.75rem] text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/30 pointer-coarse:h-11 @[40rem]/board:max-w-none"
                >
                  {SORTS.map((s) => (
                    <option key={s} value={s}>
                      {t(`todo.sort.${s}`)}
                    </option>
                  ))}
                </select>
              )}
              <span className="hidden @[40rem]/board:contents">{actions}</span>
            </div>
          </div>

          {!loading &&
            view !== "done" &&
            activeList?.kind !== "flagged" &&
            board.status === "ready" && (
              <div className="mt-5">
                {/* Anahtar görünüm: görünüm değişince varsayılanlar (bugünün
                  tarihi, yıldız, liste) o görünümünkine döner — efekt içinde
                  `setState` yerine yeniden kurulum (deponun lint kuralı). */}
                <TodoAddBar
                  key={view}
                  board={board}
                  view={view}
                  today={today}
                  onAdded={added}
                  inputRef={addRef}
                />
              </div>
            )}

          <div className="mt-6 space-y-6">
            {loading && <RowsSkeleton />}
            {!loading && board.status === "ready" && !groups.length && (
              <EmptyState view={view} searching={Boolean(query.trim())} />
            )}
            {groups.map((g) => {
              const isCollapsed = g.collapsible && collapsed.has(g.id)
              return (
                <section key={g.id} aria-label={g.label ? t(g.label) : (g.raw ?? undefined)}>
                  <GroupHead
                    group={g}
                    count={g.tasks.length}
                    collapsed={isCollapsed}
                    onToggle={() =>
                      setCollapsed((s) => {
                        const n = new Set(s)
                        if (n.has(g.id)) n.delete(g.id)
                        else n.add(g.id)
                        return n
                      })
                    }
                  />
                  {!isCollapsed && (
                    <ul className="ms-surface rounded-[1.5rem] p-1.5">
                      {g.tasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          list={listById.get(task.listId)}
                          today={today}
                          showList={showList}
                          onToggle={toggle}
                          onStar={(x) =>
                            board.updateTask(x.id, {
                              importance: x.importance === "high" ? "normal" : "high",
                            })
                          }
                          onOpen={onOpenTask}
                          fresh={fresh.has(task.id)}
                          board={board}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
