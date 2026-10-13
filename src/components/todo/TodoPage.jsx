import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { InlineAction } from "@/components/ui/inline-action"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import { OverlayScrollbar } from "@/components/common/OverlayScrollbar"
import { DestructiveDialog } from "@/components/security/dialogs"
import { useLocale } from "@/hooks/useLocale"
import { useTodoBoard } from "@/hooks/useTodoBoard"
import { STATUS } from "@/lib/graph"
import { showResultToast } from "@/lib/refreshToast"
import { localDayKey } from "@/lib/todo"
import { VIEWS, boardSummary } from "@/lib/todoInsights"
import { cn } from "@/lib/utils"
import "./ChecklistOrb.css"
import { TodoBoard } from "./TodoBoard"
import { TodoDetail } from "./TodoDetail"
import { TodoSummaryCard } from "./TodoSummaryCard"
import { useOpenTask } from "./useOpenTask"
import { useQuickAdd } from "./useQuickAdd"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  To-Do (`/todo`) — Microsoft To Do, TYRO'nın içinde
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Başta tek kart (karşılama + durum), altında filtreli liste. İstek ve kararlar
 * `docs/features/todo.md`te.
 *
 * | dosya | işi |
 * |---|---|
 * | `lib/todoBoard.js` | MEKANİZMA: listeler, görevler, adımlar, bağlı içerik, yazma |
 * | `lib/todoInsights.js` | SAF HESAP: görünümler, gruplar, sıralama, özet |
 * | `hooks/useTodoBoard.js` | önbellek, iyimser değişiklik, Anasayfa'yla eşitleme |
 * | `TodoSummaryCard.jsx` | tek kart: düzen (geniş · tablet · telefon), çubuk ve çekmece |
 * | `TodoGreeting.jsx` · `ChecklistOrb` | karşılama: panolu maskot, günün cümlesi, bugüne ekleme |
 * | `TodoStatusTray.jsx` · `TodoStatusTiles.jsx` | beyaz tepsi: dört durum + çekmecenin içi |
 * | `TodoProgress.jsx` · `TodoKpiBar.jsx` | ilerleme halkası (kartın sonu) · telefonun tek satırı |
 * | `useQuickAdd.js` | bugüne hızlı ekleme (kart ve To-Do widget'ı aynı kural) |
 * | `TodoBoard.jsx` · `TodoDetail.jsx` · `DuePicker.jsx` | liste, ayrıntı paneli, tarih seçici |
 *
 * ⚠️ **KAPI ROTADA** (`App.jsx` › `access.todo`, kitle `lib/todoPolicy.js`).
 * Kapıda kalan kişiye bu parça hiç inmiyor.
 *
 * ⚠️ **"BUGÜN" ANASAYFA'NIN BUGÜNÜ** (`isFocus`) ve ekleme iki yüzeyde de aynı
 * kurala gidiyor; yazılan her şey `lib/todoSync.js` ile öteki yüzeyin
 * önbelleğini bayat sayıyor.
 *
 * ⚠️ **GÖRÜNÜM ADRESTE** (`?view=today|important|planned|all|done|list:<id>`),
 * `replace: true` — Keşfet'in `?sec=`i gibi. Tanınmayan değer Bugün'e düşer.
 *
 * ⚠️ **DÜZEN ANASAYFA'NIN** (`myspace-gutter` oluğu çentik için, `@container`
 * kapsayıcı sorguları rıhtım için, `OverlayScrollbar` çentiğin arkasından
 * geçmeyen çubuk için) — gerekçeleri o sayfada.
 */

function Eyebrow({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
      {children}
    </span>
  )
}

function Notice({ tone = "muted", children }) {
  return (
    <p
      className={cn(
        "rounded-xl px-3.5 py-2.5 text-[0.75rem] leading-snug",
        tone === "warn"
          ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
          : "bg-muted/60 text-muted-foreground",
      )}
    >
      {children}
    </p>
  )
}

export function TodoPage() {
  const { t } = useLocale()
  const board = useTodoBoard()
  const [params, setParams] = useSearchParams()
  const [today, setToday] = useState(localDayKey)
  const [openId, setOpenId, closeTask] = useOpenTask(params, setParams)
  const [celebrate, setCelebrate] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const scrollRef = useRef(null)
  const boardRef = useRef(null)
  const addRef = useRef(null)
  const celebrateTimer = useRef(0)

  // Gün döndüyse "bugün" de dönsün (sekme gece açık kalınca). Dakikada bir.
  useEffect(() => {
    const id = setInterval(
      () => setToday((cur) => (cur === localDayKey() ? cur : localDayKey())),
      60_000,
    )
    return () => {
      clearInterval(id)
      clearTimeout(celebrateTimer.current)
    }
  }, [])

  const raw = params.get("view") ?? "today"
  const view =
    VIEWS.includes(raw) ||
    (raw.startsWith("list:") && board.lists.some((l) => `list:${l.id}` === raw))
      ? raw
      : "today"
  // Liste görünümü listeler inene kadar bekler — yer imiyle gelen `list:…`
  // ilk karede Bugün'e düşüp adresini kaybetmesin.
  const effectiveView = raw.startsWith("list:") && board.status === "loading" ? raw : view

  function setView(next, scroll = false) {
    const p = new URLSearchParams(params)
    if (next === "today") p.delete("view")
    else p.set("view", next)
    setParams(p, { replace: true })
    if (scroll)
      requestAnimationFrame(() =>
        boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      )
  }

  const summary = useMemo(() => boardSummary(board.tasks, today), [board.tasks, today])
  const ready = board.status === "ready"
  const { busy, quickAdd } = useQuickAdd(board, today)

  function cheer() {
    setCelebrate(true)
    clearTimeout(celebrateTimer.current)
    celebrateTimer.current = setTimeout(() => setCelebrate(false), 1800)
  }

  /** Yenile — `true` başarılı (düğme onay işareti gösterir), değilse `false`. */
  async function onRefresh() {
    if (board.refreshing) return false
    const result = await board.refresh()
    if (!result) return false
    if (result.status === STATUS.ready) {
      showResultToast(
        result.added
          ? {
              title: t("todo.refreshedTitle"),
              detail: t("todo.refreshedNew", { count: result.added }),
            }
          : { title: t("todo.refreshedSameTitle"), detail: t("todo.refreshedSame") },
      )
    } else if (result.kept) {
      showResultToast({
        state: "error",
        title: t("todo.refreshFailed"),
        detail: t("todo.refreshFailedBody"),
      })
    }
    return result.status === STATUS.ready
  }

  const deletingCount = deleting ? board.tasks.filter((x) => x.listId === deleting.id).length : 0

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="ms-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="myspace-gutter mx-auto w-full max-w-[96rem] px-5 pb-16 pt-8 sm:px-8 sm:pt-10 lg:px-12 lg:pt-12 shortest:pt-4">
          <div className="@container/todo">
            <h1 className="sr-only">{t("nav.todo")}</h1>

            {/* ── Tek kart: karşılama + durum (düzen `TodoSummaryCard`ta) ─── */}
            <TodoSummaryCard
              board={board}
              summary={summary}
              today={today}
              celebrate={celebrate}
              busy={busy}
              onQuickAdd={quickAdd}
              onView={(v) => setView(v, true)}
            />

            {/* ── Liste ─────────────────────────────────────────────────── */}
            <section
              ref={boardRef}
              aria-labelledby="todo-board-title"
              className="mt-7 scroll-mt-6 @[40rem]/todo:mt-10 lg:mt-12 shortest:mt-6"
            >
              <div className="mb-4 @[40rem]/todo:mb-6">
                <Eyebrow>{t("todo.board.eyebrow")}</Eyebrow>
                <h2
                  id="todo-board-title"
                  className="mt-2 text-[1.5rem] font-semibold tracking-[-0.02em]"
                >
                  {t("todo.board.title")}
                </h2>
              </div>

              {/* Eksik tabloyu SÖYLE — "soramadık ≠ veri yok". */}
              {ready && (board.skipped > 0 || board.doneMissing || board.truncated) && (
                <div className="mb-5 space-y-2">
                  {board.skipped > 0 && (
                    <Notice tone="warn">{t("todo.partial", { n: board.skipped })}</Notice>
                  )}
                  {board.doneMissing && <Notice tone="warn">{t("todo.doneMissing")}</Notice>}
                  {board.truncated && effectiveView === "done" && (
                    <Notice>{t("todo.truncated")}</Notice>
                  )}
                </div>
              )}

              {board.status === "denied" || board.status === STATUS.denied ? (
                <div className="rounded-[1.5rem] border border-border bg-card px-6 py-12 text-center">
                  <HugeiconsIcon
                    icon={Alert02Icon}
                    className="mx-auto mb-3 size-8 text-muted-foreground/40"
                    strokeWidth={1.5}
                  />
                  <p className="text-[0.9375rem] font-medium">{t("todo.denied")}</p>
                  <p className="mx-auto mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
                    {t("todo.deniedBody")}
                  </p>
                  <button
                    type="button"
                    onClick={board.connect}
                    className="mt-4 rounded-full bg-brand-fill-deep px-4 py-2 text-[0.8125rem] font-semibold text-brand-on-brand"
                  >
                    {t("todo.connect")}
                  </button>
                </div>
              ) : board.status === "error" ? (
                <div className="rounded-[1.5rem] border border-border bg-card px-6 py-12 text-center">
                  <HugeiconsIcon
                    icon={Alert02Icon}
                    className="mx-auto mb-3 size-8 text-muted-foreground/40"
                    strokeWidth={1.5}
                  />
                  <p className="text-[0.9375rem] font-medium">{t("todo.error")}</p>
                  {board.detail && (
                    <p className="mt-1.5 text-[0.6875rem] tabular-nums text-muted-foreground/70 [overflow-wrap:anywhere]">
                      {t("todo.detailLine", { detail: board.detail })}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="mt-4 rounded-full border border-border px-4 py-2 text-[0.8125rem] font-medium transition hover:bg-accent"
                  >
                    {t("todo.retry")}
                  </button>
                </div>
              ) : board.status === STATUS.unauthenticated ? (
                <Notice>{t("todo.signedOutBody")}</Notice>
              ) : (
                <TodoBoard
                  board={board}
                  today={today}
                  view={effectiveView}
                  onView={(v) => setView(v)}
                  onOpenTask={(task) => setOpenId(task.id)}
                  onDeleteList={setDeleting}
                  onCompleted={cheer}
                  addRef={addRef}
                  actions={
                    ready && (
                      // Yenile — `InlineAction` (Keşfet'le aynı düğme), aramanın ve sıralamanın sağında.
                      <InlineAction
                        icon={RefreshIcon}
                        label={t("todo.refresh")}
                        busyLabel={t("todo.refreshing")}
                        doneLabel={t("todo.refreshDone")}
                        busy={board.refreshing}
                        onAction={onRefresh}
                      />
                    )
                  }
                />
              )}
            </section>

            <footer className="mt-16 flex flex-wrap items-center justify-between gap-2 text-[0.6875rem] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="text-brand">
                  ✦
                </span>
                {t("todo.footer")}
              </span>
              <span>
                {t("nav.todo")} · <strong className="font-semibold text-foreground/80">tyro</strong>
              </span>
            </footer>
          </div>
        </div>
      </div>
      <OverlayScrollbar targetRef={scrollRef} avoidNotch />

      <TodoDetail
        board={board}
        taskId={openId}
        // Liste inmeden boş panel açılmasın: iş bulununca açılır.
        open={Boolean(openId) && board.tasks.some((x) => x.id === openId)}
        onOpenChange={(next) => !next && closeTask()}
        onCompleted={cheer}
      />

      <DestructiveDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => !next && setDeleting(null)}
        icon={Delete02Icon}
        title={t("todo.lists.deleteTitle")}
        description={t("todo.lists.deleteBody", { n: deletingCount })}
        subject={deleting?.name}
        consequences={[{ kind: "gone", text: t("todo.lists.deleteGone") }]}
        confirmLabel={t("todo.lists.deleteConfirm")}
        cancelLabel={t("todo.cancel")}
        onConfirm={async () => {
          const list = deleting
          setDeleting(null)
          if (view === `list:${list.id}`) setView("today")
          await board.removeList(list.id)
        }}
      />
    </div>
  )
}
