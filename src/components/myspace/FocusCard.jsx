import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { InsightTip } from "@/components/myspace/InsightTip"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { showResultToast } from "@/lib/refreshToast"
import { MAX_TITLE } from "@/lib/myspaceTasks"
import { cn } from "@/lib/utils"
import { Card, CardTitle } from "./CardShell"
import { FocusEmpty } from "./FocusEmpty"

/* ─── Bugünün odağı ──────────────────────────────────────────────── */

const OPTS_DAY_MONTH = { day: "numeric", month: "long" }

/**
 * BUGÜNÜN ODAĞI — iş listesi.
 *
 * ⚠️ **TAMAMLANMA HALKASI YOK.** Kart sağ ızgaranın ilk satırında özet balonu
 * ve sıradaki toplantıyla yan yana, tek sütun; ilerleme başlıktaki "1/5"te —
 * aynı bilgi bir kez. Ekran okuyucu sayının cümlesini duyar
 * (`myspace.progress.count`).
 *
 * ⚠️ **EKLEME ALANI HER ZAMAN AÇIK**, bir düğmenin arkasında değil. Enter
 * ekler ve odak alanda KALIR (art arda yazılır); çok satırlı yapıştırma her
 * satırı ayrı iş yapar (paylaşılan bir listeyi kopyalayıp yapıştırmak). Yerel
 * yedekte liste dolunca alanın yerinde sebebi yazılır. Yazma yolları
 * `useFocusTasks`ta: To Do'da ekleme bugünün tarihiyle, × işi SİLMEZ bugünden
 * çıkarır, gecikmiş iş kehribar.
 *
 * ⚠️ Yerel yedekteyken kaynak altta yazılı ("yalnız bu tarayıcı"); To Do'ya
 * bağlıyken alt satır yok. To-Do sayfasını açabilene (`canOpenTodo`) başlık
 * satırının sağında bir ok.
 */
export function FocusCard({ focus, canOpenTodo = false, className }) {
  const { t, locale } = useLocale()
  const [draft, setDraft] = useState("")
  const inputRef = useRef(null)
  const { tasks, mode, full } = focus
  const todo = mode === "todo"
  const done = tasks.filter((x) => x.done).length
  const total = tasks.length
  const blocked = focus.loading || focus.status === "error"
  const dayFmt = getDateTimeFormat(locale, OPTS_DAY_MONTH)

  function kickerOf(task) {
    if (task.done) return t("myspace.tasks.tip.done")
    if (task.overdue && task.dueKey) {
      const [y, m, d] = task.dueKey.split("-").map(Number)
      return t("myspace.tasks.tip.overdue", { date: dayFmt.format(new Date(y, m - 1, d)) })
    }
    return t("myspace.tasks.tip.open")
  }

  function submit(e) {
    e.preventDefault()
    if (focus.add(draft)) setDraft("")
    inputRef.current?.focus()
  }

  // Birden çok satır yapıştırıldıysa her satır ayrı iş (tek satır normal yapışır).
  function onPaste(e) {
    const text = e.clipboardData?.getData("text") ?? ""
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, "").trim())
      .filter(Boolean)
    if (lines.length < 2) return
    e.preventDefault()
    let added = 0
    for (const line of lines) if (focus.add(line)) added += 1
    if (added) {
      setDraft("")
      showResultToast({ state: "success", title: t("myspace.focus.addedMany", { n: added }) })
    }
  }

  // To-Do sayfasına giden yol: başlık satırının sağında tek ok.
  const todoArrow = (cls) =>
    todo && canOpenTodo ? (
      <Link
        to="/todo"
        aria-label={t("myspace.focus.openTodoPage")}
        title={t("myspace.focus.openTodoPage")}
        className={cn(
          "-mr-1.5 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground",
          cls,
        )}
      >
        <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" strokeWidth={2} />
      </Link>
    ) : null

  return (
    <Card data-tour="focus" className={className} aria-busy={focus.loading ? true : undefined}>
      <div className="flex min-h-0 flex-1 flex-col">
        <CardTitle action={todoArrow()}>
          <span className="truncate">{t("myspace.tasks.title")}</span>
          {!blocked && total > 0 && (
            <span className="ml-2 shrink-0 text-[0.75rem] tabular-nums text-muted-foreground/70">
              <span aria-hidden="true">
                {done}/{total}
              </span>
              <span className="sr-only">{t("myspace.progress.count", { done, total })}</span>
            </span>
          )}
        </CardTitle>

        {focus.loading ? (
          <>
            <span className="sr-only">{t("myspace.loading")}</span>
            <div aria-hidden="true" className="mt-2 space-y-2.5">
              {["82%", "64%", "74%"].map((w) => (
                <div key={w} className="flex items-center gap-2.5 py-0.5">
                  <span className="ms-skeleton size-4 shrink-0 rounded-full" />
                  <span className="ms-skeleton h-3 rounded-full" style={{ width: w }} />
                </div>
              ))}
              <span className="ms-skeleton block h-9 w-full rounded-xl" />
            </div>
          </>
        ) : focus.status === "error" ? (
          // ⚠️ Ağ/sunucu hatası YEREL LİSTEYE DÜŞMEZ (gerekçe `useFocusTasks`).
          <div className="mt-3 space-y-2">
            <p className="text-[0.8125rem] leading-snug text-muted-foreground">
              {t("myspace.todo.error")}
            </p>
            {focus.detail && (
              <p className="text-[0.6875rem] tabular-nums text-muted-foreground/60 [overflow-wrap:anywhere]">
                {t("myspace.todo.detail", { detail: focus.detail })}
              </p>
            )}
            <button
              type="button"
              onClick={focus.retry}
              className="rounded-full border px-3 py-1.5 text-[0.75rem] font-medium transition hover:bg-accent [@media(pointer:coarse)]:min-h-10"
            >
              {t("calendar.retry")}
            </button>
          </div>
        ) : (
          <>
            {total === 0 && <FocusEmpty />}
            {total > 0 && (
              // Liste kartın boş yerini doldurur (kart satırla uzadıysa
              // dört satırda kesilip altında boşluk kalıyordu); kartın kendi
              // boyuna katkısı eskisi gibi en çok ~4 satır, satırı uzatmaz.
              <ul
                className="-mx-1 mt-1.5 flex-1 basis-0 space-y-0.5 overflow-y-auto px-1 [--row:1.875rem] [scrollbar-width:thin] [@media(pointer:coarse)]:[--row:2.625rem]"
                style={{ minHeight: `min(6.75rem, calc(var(--row) * ${total}))` }}
              >
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className={cn(
                      "group/task relative flex items-center gap-2.5 rounded-lg py-1",
                      task.pending && "opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={task.done}
                      disabled={task.pending}
                      onClick={() => focus.toggle(task.id)}
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded-full border transition [@media(pointer:coarse)]:size-5",
                        task.done
                          ? "border-transparent bg-gradient-to-br from-brand-from via-brand-via to-brand-to text-brand-on-brand"
                          : task.overdue
                            ? "border-amber-500/80 hover:border-brand"
                            : "border-foreground/25 hover:border-brand",
                      )}
                    >
                      {task.done && (
                        <HugeiconsIcon icon={Tick02Icon} className="size-2.5" strokeWidth={3} />
                      )}
                      <span className="sr-only">{task.title}</span>
                    </button>
                    <InsightTip
                      title={task.title}
                      kicker={kickerOf(task)}
                      action={
                        todo && canOpenTodo && !String(task.id).startsWith("tmp-")
                          ? {
                              label: t("myspace.focus.openInTodo"),
                              to: `/todo?${new URLSearchParams({ task: task.id })}`,
                            }
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className={cn(
                          "min-w-0 flex-1 truncate rounded-md text-left text-[0.8125rem] outline-none transition-colors",
                          "focus-visible:ring-2 focus-visible:ring-brand/30 data-[state=open]:text-foreground",
                          task.done &&
                            "text-muted-foreground line-through decoration-foreground/30",
                        )}
                      >
                        {task.title}
                      </button>
                    </InsightTip>
                    <button
                      type="button"
                      disabled={task.pending}
                      onClick={() => focus.remove(task.id)}
                      aria-label={t(todo ? "myspace.tasks.unplan" : "myspace.tasks.remove")}
                      title={t(todo ? "myspace.tasks.unplan" : "myspace.tasks.remove")}
                      className="absolute right-0 grid size-6 shrink-0 place-items-center rounded-md bg-card text-muted-foreground/60 opacity-0 shadow-[-10px_0_8px_-2px_var(--card)] transition hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover/task:opacity-100 [@media(pointer:coarse)]:static [@media(pointer:coarse)]:size-8 [@media(pointer:coarse)]:opacity-100 [@media(pointer:coarse)]:shadow-none"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* ⚠️ EKLEME ALANI KARTIN DİBİNE SABİT (`mt-auto`): kart satırın
                  boyuna geriliyor; alan listenin hemen altında dursa dipte boş
                  bir şerit kalır, yeri de iş sayısına göre oynardı. */}
            {full ? (
              <p className="mt-auto pt-2 text-[0.75rem] leading-snug text-muted-foreground">
                {t("myspace.tasks.full")}
              </p>
            ) : (
              <form onSubmit={submit} className="mt-auto pt-2">
                <label className="sr-only" htmlFor="myspace-task-new">
                  {t("myspace.tasks.add")}
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/60 py-1 pl-2.5 pr-1 transition focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/15">
                  <HugeiconsIcon
                    icon={Add01Icon}
                    className="size-3.5 shrink-0 text-muted-foreground/70"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <input
                    ref={inputRef}
                    id="myspace-task-new"
                    value={draft}
                    maxLength={MAX_TITLE}
                    onChange={(e) => setDraft(e.target.value)}
                    onPaste={onPaste}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && draft) {
                        e.stopPropagation()
                        setDraft("")
                      }
                    }}
                    placeholder={t("myspace.focus.placeholder")}
                    aria-describedby="myspace-task-hint"
                    className="no-ios-zoom min-w-0 flex-1 bg-transparent py-1 text-[0.8125rem] outline-none placeholder:text-muted-foreground/70"
                  />
                  {/* Gönder düğmesi yalnız yazı varken: boş alanın yanında
                        sönük bir ok bir şey vaat etmesin. */}
                  {draft.trim() && (
                    <button
                      type="submit"
                      aria-label={t("myspace.tasks.add")}
                      className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-fill-deep text-brand-on-brand shadow-sm transition hover:brightness-110 [@media(pointer:coarse)]:size-9"
                    >
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className="size-3.5"
                        strokeWidth={2.4}
                      />
                    </button>
                  )}
                </div>
                <span id="myspace-task-hint" className="sr-only">
                  {t("myspace.focus.addHint")}
                </span>
              </form>
            )}
          </>
        )}

        {/* Alt satır yalnız söyleyecek bir şey varken: To Do'ya bağlı ve tam
              okunmuş listede boş bir `pt-3` kartı satırın en uzunu yapıyordu. */}
        {(!todo || (!blocked && focus.skipped > 0)) && (
          // Ekleme alanı varken dibe o yaslı; not onun ALTINDA. Alan yokken
          // (yükleniyor, hata) not dibe kendisi yaslanır.
          <div
            className={cn(
              "space-y-0.5 pt-3",
              (focus.loading || focus.status === "error") && "mt-auto",
            )}
          >
            {/* ⚠️ Okunamayan liste SÖYLENİR: eksik görünen bir liste "bugün başka işin yok" demiş olurdu. */}
            {!blocked && focus.skipped > 0 && (
              <p
                className="text-[0.6875rem] leading-snug text-amber-700 dark:text-amber-400"
                title={focus.detail || undefined}
              >
                {t("myspace.todo.partial", { n: focus.skipped })}
              </p>
            )}
            {/* To Do'ya bağlıyken alt satır yok; To-Do sayfasına giden yol
                başlıktaki ok (`todoArrow`). */}
            {todo ? null : (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[0.6875rem] text-muted-foreground/60">
                  {t("myspace.tasks.local")}
                </p>
                {focus.canConnect && (
                  <button
                    type="button"
                    onClick={focus.connect}
                    className="text-[0.6875rem] font-semibold text-brand underline-offset-2 hover:underline"
                  >
                    {t("myspace.todo.connect")}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
