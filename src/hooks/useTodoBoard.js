import { useCallback, useEffect, useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { useLocale } from "@/hooks/useLocale"
import { STATUS, requestGraphScopes } from "@/lib/graph"
import { isMsalConfigured } from "@/lib/msal"
import { notify } from "@/lib/notify"
import { TODO_SCOPES, localDayKey } from "@/lib/todo"
import {
  addStep,
  createBoardList,
  createBoardTask,
  deleteBoardList,
  deleteBoardTask,
  deleteStep,
  fetchBoard,
  fetchLinks,
  fetchSteps,
  renameBoardList,
  resetTodoBoardQuery,
  updateBoardTask,
  updateStep,
} from "@/lib/todoBoard"
import { notifyTodoChanged, onTodoChanged } from "@/lib/todoSync"

/**
 * To-Do sayfasının TEK veri kapısı — Microsoft To Do'nun tamamı.
 *
 * ⚠️ **ÖNBELLEK BELLEKTE, HESAP ANAHTARLI** ve çıkışta düşüyor
 * (`clearTodoBoardCache`, `msal.js`): görev başlıkları ve notları kişinin
 * kendi verisi, ortak bir tarayıcıda diske yazılmaz (`useFocusTasks`in
 * kuralı). 60 sn tazelik; sekmeye dönüşte bayatsa yeniden okunuyor — Outlook
 * ya da telefondan eklenen iş sayfaya öyle düşüyor.
 *
 * ⚠️ **DEĞİŞİKLİKLER İYİMSER.** Tıklama hemen görünür, To Do reddederse eski
 * hâline döner ve bildirim çıkar. Her tıklamayı bir ağ turuna bağlamak, bir
 * görev listesinde yapılabilecek en yavaş şeydi.
 *
 * ⚠️ **AKIŞIM'LA EŞİTLİ** (`lib/todoSync.js`): burada yapılan her değişiklik
 * Akışım'ın "Bugünün odağı" önbelleğini bayat sayar; oradaki değişiklik de
 * bunun önbelleğini.
 *
 * ⚠️ **KISMİ SONUÇ ÖNBELLEĞE GİRMEZ** (okunamayan liste varsa): bir sonraki
 * açılış eksik listeyi yeniden sorsun, 60 sn boyunca eksik kalmasın.
 */

let cache = null // { key, at, data }
const FRESH_MS = 60_000

export function clearTodoBoardCache() {
  cache = null
  resetTodoBoardQuery()
}

// Akışım yazdıysa bu önbellek bayat — bir sonraki açılış yeniden okusun.
onTodoChanged((source) => {
  if (source !== "board" && cache) cache = { ...cache, at: 0 }
})

function accountOf(instance, key) {
  if (!key) return null
  return instance.getAllAccounts().find((a) => a.homeAccountId === key) ?? null
}

const tempId = () => `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export function useTodoBoard() {
  const { t } = useLocale()
  const { instance, accounts } = useMsal()
  const key = isMsalConfigured ? (accounts[0]?.homeAccountId ?? null) : null
  const [nonce, setNonce] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pendingRefresh = useRef(null)
  const [state, setState] = useState(() =>
    cache && cache.key === key
      ? { key, status: "ready", ...cache.data }
      : { key, status: key ? "loading" : STATUS.unauthenticated, lists: [], tasks: [] },
  )

  useEffect(() => {
    if (!key) return undefined
    const fresh = cache && cache.key === key && Date.now() - cache.at < FRESH_MS
    if (fresh && nonce === 0) {
      // Tazeyse ağa çıkılmaz; durum zaten önbellekten kuruldu.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((s) =>
        s.key === key && s.status === "ready" ? s : { key, status: "ready", ...cache.data },
      )
      return undefined
    }
    let cancelled = false
    fetchBoard(instance, accountOf(instance, key)).then((res) => {
      if (cancelled) return
      const pending = pendingRefresh.current
      pendingRefresh.current = null
      if (res.status !== STATUS.ready) {
        // ⚠️ Yenileme düşerse ekrandaki tablo SİLİNMEZ (Keşfet'in dersi).
        setState((s) =>
          pending && s.key === key && s.status === "ready"
            ? s
            : {
                key,
                status: res.status === STATUS.error ? "error" : res.status,
                lists: [],
                tasks: [],
                detail: res.detail ?? "",
              },
        )
        if (pending) {
          setRefreshing(false)
          pending.resolve({ status: res.status, kept: true })
        }
        return
      }
      const data = {
        lists: res.lists,
        tasks: res.tasks,
        defaultListId: res.defaultListId,
        skipped: res.skipped,
        detail: res.detail,
        doneMissing: res.doneMissing,
        truncated: res.truncated,
        stepsInline: res.stepsInline,
      }
      // ⚠️ Satırların SONRADAN öğrendiği adımlar (sorgu adım getirmediyse)
      // yenilemede kaybolmasın: görev değişmediyse (`modifiedAt`) eski adımlar
      // yeni kayda taşınır. Güncelleyici saf değil ama eş-güçlü (StrictMode).
      setState((prev) => {
        const old =
          prev.key === key && Array.isArray(prev.tasks)
            ? new Map(prev.tasks.map((x) => [x.id, x]))
            : null
        const tasks = old
          ? data.tasks.map((x) => {
              if (x.steps !== undefined) return x
              const o = old.get(x.id)
              return o && o.steps !== undefined && o.modifiedAt === x.modifiedAt
                ? { ...x, steps: o.steps }
                : x
            })
          : data.tasks
        const merged = { ...data, tasks }
        cache = res.skipped ? null : { key, at: Date.now(), data: merged }
        return { key, status: "ready", ...merged }
      })
      if (pending) {
        setRefreshing(false)
        const before = pending.ids
        pending.resolve({
          status: STATUS.ready,
          added: res.tasks.filter((x) => !before.has(x.id)).length,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [key, nonce, instance])

  // Sekmeye dönüşte bayatsa tazele.
  useEffect(() => {
    if (!key) return undefined
    const onVisible = () => {
      if (document.hidden) return
      if (!cache || cache.key !== key || Date.now() - cache.at > FRESH_MS) setNonce((n) => n + 1)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [key])

  const current =
    state.key === key
      ? state
      : { key, status: key ? "loading" : STATUS.unauthenticated, lists: [], tasks: [] }
  const account = accountOf(instance, key)

  /** Durumu ve önbelleği birlikte değiştirir (önbellek varsa). */
  const mutate = useCallback(
    (fn) => {
      setState((s) => {
        if (s.key !== key || s.status !== "ready") return s
        const next = { ...s, ...fn(s) }
        if (cache && cache.key === key) {
          const data = { ...next }
          delete data.status
          delete data.key
          cache = { ...cache, data }
        }
        return next
      })
    },
    [key],
  )

  const fail = useCallback((message) => notify.error(message ?? t("todo.saveFailed")), [t])
  const changed = useCallback(() => notifyTodoChanged("board"), [])

  const patchTask = useCallback(
    (id, fields) =>
      mutate((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, ...fields } : x)) })),
    [mutate],
  )

  /* ── Görevler ─────────────────────────────────────────────────────── */

  const addTask = useCallback(
    ({ title, listId, dueKey = null, importance = "normal", note = "", linked = null }) => {
      const clean = String(title ?? "")
        .trim()
        .slice(0, 255)
      const target = listId ?? current.defaultListId
      if (!clean || !target || current.status !== "ready") return null
      const temp = {
        id: tempId(),
        listId: target,
        title: clean,
        status: "notStarted",
        done: false,
        importance,
        dueKey,
        doneKey: null,
        doneAt: null,
        createdAt: new Date().toISOString(),
        modifiedAt: "",
        note,
        reminderAt: null,
        recurrence: null,
        categories: [],
        hasAttachments: false,
        steps: [],
        pending: true,
      }
      mutate((s) => ({ tasks: [temp, ...s.tasks] }))
      const promise = createBoardTask(instance, account, {
        listId: target,
        title: clean,
        dueKey,
        importance,
        note,
        linked,
      }).then((res) => {
        if (res.status === STATUS.ready && res.task) {
          // Yeni görevin adımı yok — `[]`, satır onu ayrıca sormasın.
          mutate((s) => ({
            tasks: s.tasks.map((x) =>
              x.id === temp.id ? { ...res.task, steps: res.task.steps ?? [] } : x,
            ),
          }))
          changed()
          return res.task
        }
        mutate((s) => ({ tasks: s.tasks.filter((x) => x.id !== temp.id) }))
        fail()
        return null
      })
      return { temp, promise }
    },
    [current.defaultListId, current.status, mutate, instance, account, changed, fail],
  )

  /**
   * Bir görevin alanlarını değiştirir. `changes`: `title` · `importance` ·
   * `done` · `dueKey` · `note` · `reminderAt` · `recurrence`.
   */
  const updateTask = useCallback(
    (id, changes) => {
      const task = current.tasks.find((x) => x.id === id)
      if (!task || task.pending) return Promise.resolve(false)
      const optimistic = { ...changes }
      if ("done" in changes) {
        optimistic.status = changes.done ? "completed" : "notStarted"
        optimistic.doneKey = changes.done ? localDayKey() : null
        optimistic.doneAt = changes.done ? new Date().toISOString() : null
      }
      if ("dueKey" in changes && !changes.dueKey) optimistic.recurrence = null
      patchTask(id, optimistic)
      return updateBoardTask(instance, account, {
        listId: task.listId,
        taskId: id,
        changes,
        task,
      }).then((res) => {
        if (res.status !== STATUS.ready) {
          patchTask(id, task)
          fail()
          return false
        }
        // Sunucunun cevabı (varsa) YETKİLİ: tekrarlayan bir görev tamamlanınca
        // To Do bir SONRAKİ örneği yeni bir görev olarak yaratıyor; o yeni
        // görev ancak yenilemeyle gelir — tamamlanan tekrarlı işte tabloyu
        // tazele ki sıradaki örnek görünsün.
        // ⚠️ PATCH cevabı adımları TAŞIMIYOR (`undefined`): satırdaki bilinen
        // adımlar silinmesin.
        if (res.task)
          mutate((s) => ({
            tasks: s.tasks.map((x) =>
              x.id === id
                ? { ...x, ...res.task, listId: task.listId, steps: res.task.steps ?? x.steps }
                : x,
            ),
          }))
        if ("done" in changes && changes.done && task.recurrence) setNonce((n) => n + 1)
        changed()
        return true
      })
    },
    [current.tasks, patchTask, mutate, instance, account, fail, changed],
  )

  const removeTask = useCallback(
    (id) => {
      const index = current.tasks.findIndex((x) => x.id === id)
      const task = current.tasks[index]
      if (!task || task.pending) return Promise.resolve(false)
      mutate((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) }))
      return deleteBoardTask(instance, account, { listId: task.listId, taskId: id }).then((res) => {
        if (res.status !== STATUS.ready) {
          mutate((s) => {
            const tasks = [...s.tasks]
            tasks.splice(Math.min(index, tasks.length), 0, task)
            return { tasks }
          })
          fail()
          return false
        }
        changed()
        return true
      })
    },
    [current.tasks, mutate, instance, account, fail, changed],
  )

  /* ── Adımlar ve bağlı kaynaklar (görev açılınca) ───────────────────── */

  const loadSteps = useCallback(
    (task) => fetchSteps(instance, account, { listId: task.listId, taskId: task.id }),
    [instance, account],
  )
  const loadLinks = useCallback(
    (task) => fetchLinks(instance, account, { listId: task.listId, taskId: task.id }),
    [instance, account],
  )
  const createStep = useCallback(
    (task, title) =>
      addStep(instance, account, { listId: task.listId, taskId: task.id, title }).then((res) => {
        if (res.status !== STATUS.ready) fail()
        return res
      }),
    [instance, account, fail],
  )
  const changeStep = useCallback(
    (task, stepId, changes) =>
      updateStep(instance, account, { listId: task.listId, taskId: task.id, stepId, changes }).then(
        (res) => {
          if (res.status !== STATUS.ready) fail()
          return res
        },
      ),
    [instance, account, fail],
  )
  /**
   * Satırın adımları — YEREL (ağ yok): ayrıntı panelinin adım listesi ya da
   * satırın kendi sorgusu sonucu buraya yazar, satır ve panel aynı adımları
   * göstersin.
   */
  const setTaskSteps = useCallback((id, steps) => patchTask(id, { steps }), [patchTask])

  /** Satırdan adım işaretleme — iyimser, To Do reddederse geri döner. */
  const toggleStep = useCallback(
    (task, step) => {
      const flip = (done) => (list) =>
        (list ?? []).map((x) => (x.id === step.id ? { ...x, done } : x))
      mutate((s) => ({
        tasks: s.tasks.map((x) =>
          x.id === task.id ? { ...x, steps: flip(!step.done)(x.steps) } : x,
        ),
      }))
      return updateStep(instance, account, {
        listId: task.listId,
        taskId: task.id,
        stepId: step.id,
        changes: { done: !step.done },
      }).then((res) => {
        if (res.status !== STATUS.ready) {
          mutate((s) => ({
            tasks: s.tasks.map((x) =>
              x.id === task.id ? { ...x, steps: flip(step.done)(x.steps) } : x,
            ),
          }))
          fail()
          return false
        }
        changed()
        return true
      })
    },
    [mutate, instance, account, fail, changed],
  )

  const removeStep = useCallback(
    (task, stepId) =>
      deleteStep(instance, account, { listId: task.listId, taskId: task.id, stepId }).then(
        (res) => {
          if (res.status !== STATUS.ready) fail()
          return res
        },
      ),
    [instance, account, fail],
  )

  /* ── Listeler ─────────────────────────────────────────────────────── */

  const addList = useCallback(
    async (name) => {
      const clean = String(name ?? "")
        .trim()
        .slice(0, 120)
      if (!clean) return null
      const res = await createBoardList(instance, account, { name: clean })
      if (res.status !== STATUS.ready) {
        fail()
        return null
      }
      mutate((s) => ({ lists: [...s.lists, res.list] }))
      changed()
      return res.list
    },
    [instance, account, mutate, fail, changed],
  )

  const renameList = useCallback(
    async (listId, name) => {
      const clean = String(name ?? "")
        .trim()
        .slice(0, 120)
      const list = current.lists.find((l) => l.id === listId)
      if (!clean || !list || clean === list.name) return false
      mutate((s) => ({ lists: s.lists.map((l) => (l.id === listId ? { ...l, name: clean } : l)) }))
      const res = await renameBoardList(instance, account, { listId, name: clean })
      if (res.status !== STATUS.ready) {
        mutate((s) => ({ lists: s.lists.map((l) => (l.id === listId ? list : l)) }))
        fail()
        return false
      }
      return true
    },
    [current.lists, instance, account, mutate, fail],
  )

  const removeList = useCallback(
    async (listId) => {
      const res = await deleteBoardList(instance, account, { listId })
      if (res.status !== STATUS.ready) {
        fail()
        return false
      }
      mutate((s) => ({
        lists: s.lists.filter((l) => l.id !== listId),
        tasks: s.tasks.filter((x) => x.listId !== listId),
      }))
      changed()
      return true
    },
    [instance, account, mutate, fail, changed],
  )

  /* ── Yenile · bağlan ──────────────────────────────────────────────── */

  const refresh = useCallback(() => {
    if (cache && cache.key === key) cache = { ...cache, at: 0 }
    setRefreshing(true)
    pendingRefresh.current?.resolve(null)
    return new Promise((resolve) => {
      pendingRefresh.current = { ids: new Set(current.tasks.map((x) => x.id)), resolve }
      setNonce((n) => n + 1)
    })
  }, [key, current.tasks])

  const connect = useCallback(async () => {
    const ok = await requestGraphScopes(instance, account, TODO_SCOPES)
    if (ok) setNonce((n) => n + 1)
    else notify.error(t("todo.connectFailed"))
  }, [instance, account, t])

  return {
    status: current.status,
    loading: current.status === "loading",
    refreshing,
    lists: current.lists ?? [],
    tasks: current.tasks ?? [],
    defaultListId: current.defaultListId ?? null,
    skipped: current.skipped ?? 0,
    detail: current.detail ?? "",
    doneMissing: Boolean(current.doneMissing),
    truncated: Boolean(current.truncated),
    stepsInline: current.stepsInline !== false,
    addTask,
    updateTask,
    removeTask,
    loadSteps,
    loadLinks,
    createStep,
    changeStep,
    removeStep,
    setTaskSteps,
    toggleStep,
    addList,
    renameList,
    removeList,
    refresh,
    connect,
  }
}
