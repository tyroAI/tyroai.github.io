import { useCallback, useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { useLocale } from "@/hooks/useLocale"
import { STATUS, requestGraphScopes } from "@/lib/graph"
import { isMsalConfigured } from "@/lib/msal"
import {
  MAX_TASKS,
  MAX_TITLE,
  addTask,
  removeTask,
  toggleTask,
  useMySpaceTasks,
} from "@/lib/myspaceTasks"
import { notify } from "@/lib/notify"
import {
  TODO_SCOPES,
  clearFocusTaskDue,
  createFocusTask,
  fetchFocusTasks,
  localDayKey,
  setFocusTaskDone,
} from "@/lib/todo"
import { notifyTodoChanged, onTodoChanged } from "@/lib/todoSync"

/**
 * "Bugünün odağı"nın TEK kapısı — Microsoft To Do varsa o, yoksa bu tarayıcı.
 *
 * | durum | kart |
 * |---|---|
 * | `loading` | iskelet |
 * | `ready` + `todo` | To Do'nun bugün/gecikmiş görevleri; değişiklik To Do'ya yazılır |
 * | `denied` + `local` | yerel liste (bugünkü davranış) + "To Do'ya bağlan" |
 * | `error` + `todo` | "şu an ulaşılamıyor" + Tekrar dene — yerel listeye DÜŞÜLMEZ |
 * | oturum yok (`?devauth`) | yerel liste, bağlan düğmesi yok |
 *
 * ⚠️ **HATA YEREL LİSTEYE DÜŞÜRMEZ.** `denied` (izin yok) ile `error` (ağ,
 * sunucu) ayrı hâller: izin yokken yerel liste DOĞRU cevap; bir ağ hatasında
 * ise kişinin To Do'su vardır ve yerine eski bir yerel liste göstermek "işlerin
 * bunlar" diye yalan söylemek olurdu.
 *
 * ⚠️ **YEREL LİSTE İLK BAĞLANIŞTA TO DO'YA TAŞINIR** — iş iş, her biri To Do'ya
 * yazıldıktan SONRA yerelden silinerek (yarıda kesilen taşıma veri kaybetmez,
 * tekrar koşunca kalanlar taşınır). Modül düzeyindeki `migrating` sözü aynı
 * anda iki taşımayı (StrictMode'un çift efekti, iki sekme) önlüyor.
 *
 * ⚠️ **ÖNBELLEK BELLEKTE, HESAP + GÜN ANAHTARLI** ve çıkışta düşüyor
 * (`clearTodoCache`, msal.js): görev başlıkları kişinin kendi verisi, ortak bir
 * tarayıcıda diske yazılmaz. 60 sn tazelik; sekmeye dönüşte bayatsa yeniden
 * çekilir — To Do'da Outlook'tan eklenen iş karta öyle düşüyor.
 *
 * ⚠️ **DEĞİŞİKLİKLER İYİMSER**: kart hemen değişir, To Do reddederse geri alınır
 * ve bir bildirim çıkar. Beklemek her tıklamayı bir ağ turuna bağlardı.
 */

let cache = null // { key, day, tasks, defaultListId, at }
let migrating = null
const FRESH_MS = 60_000

export function clearTodoCache() {
  cache = null
  migrating = null
}

// To-Do sayfası yazdıysa bu önbellek bayat (`lib/todoSync.js`): sayfada eklenen
// bugünün işi Akışım'a dönünce görünmeli, bir dakika beklemeden.
onTodoChanged((source) => {
  if (source !== "focus") cache = null
})

function accountOf(instance, key) {
  if (!key) return null
  return instance.getAllAccounts().find((a) => a.homeAccountId === key) ?? null
}

/** Geçici (iyimser) görev kimliği sayacı — modül ömrü boyunca artar. */
let tempSeq = 0

export function useFocusTasks() {
  const { t } = useLocale()
  const { instance, accounts } = useMsal()
  const key = isMsalConfigured ? (accounts[0]?.homeAccountId ?? null) : null
  const local = useMySpaceTasks()
  const [nonce, setNonce] = useState(0)
  // Durum HESAPLA BİRLİKTE tutulur; hesap değişince eski hesabın görevleri
  // yeni oturumda bir kare bile çizilmez (Keşfet kancalarının kuralı).
  const [state, setState] = useState(() => {
    const today = localDayKey()
    return cache && cache.key === key && cache.day === today
      ? {
          key,
          status: "ready",
          tasks: cache.tasks,
          defaultListId: cache.defaultListId,
          skipped: cache.skipped,
          detail: cache.detail,
        }
      : { key, status: "loading", tasks: [], defaultListId: null }
  })

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false
    const account = accountOf(instance, key)
    const today = localDayKey()
    fetchFocusTasks(instance, account, today).then(async (res) => {
      if (cancelled) return
      if (res.status !== STATUS.ready) {
        setState({
          key,
          status: res.status === STATUS.error ? "error" : "denied",
          tasks: [],
          defaultListId: null,
          detail: res.detail ?? "",
        })
        return
      }
      const { tasks, defaultListId, skipped = 0, detail = "" } = res
      // Kısmi sonuç (okunamayan liste) önbelleğe GİRMEZ: bir sonraki açılış
      // eksik listeyi yeniden sorsun, 60 sn boyunca eksik kalmasın.
      cache = skipped
        ? null
        : { key, day: today, tasks, defaultListId, skipped, detail, at: Date.now() }
      setState({ key, status: "ready", tasks, defaultListId, skipped, detail })
    })
    return () => {
      cancelled = true
    }
  }, [key, nonce, instance])

  // Sekmeye dönüşte bayatsa tazele (Outlook'tan eklenen iş karta düşsün).
  useEffect(() => {
    if (!key) return undefined
    const onVisible = () => {
      if (document.hidden) return
      if (
        !cache ||
        cache.key !== key ||
        Date.now() - cache.at > FRESH_MS ||
        cache.day !== localDayKey()
      ) {
        setNonce((n) => n + 1)
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [key])

  const current =
    state.key === key
      ? state
      : { key, status: key ? "loading" : "local", tasks: [], defaultListId: null }
  const mode = !key || current.status === "denied" ? "local" : "todo"
  const ready = mode === "todo" && current.status === "ready"

  // Yerel listeyi To Do'ya taşı — bir kez, bağlantı ilk hazır olduğunda.
  useEffect(() => {
    if (!ready || !local.length || !current.defaultListId || migrating) return
    const account = accountOf(instance, key)
    const listId = current.defaultListId
    const today = localDayKey()
    const items = [...local]
    // ⚠️ To Do'da AYNI ADLA zaten duran iş İKİNCİ KEZ YAZILMAZ: iki yerde de
    // tutan kişide her işi çift görürdü. Karşılaştırma büyük/küçük harf ve
    // boşluk duyarsız; eşleşen yerel satır yalnız yerelden silinir.
    const norm = (x) =>
      String(x ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase("tr")
    const existing = new Set(current.tasks.map((x) => norm(x.title)))
    migrating = (async () => {
      let moved = 0
      for (const item of items) {
        if (!existing.has(norm(item.title))) {
          const res = await createFocusTask(instance, account, {
            listId,
            title: item.title,
            today,
            done: item.done,
          })
          if (res.status !== STATUS.ready) break
          existing.add(norm(item.title))
        }
        removeTask(item.id)
        moved += 1
      }
      return moved
    })()
    migrating
      .then((moved) => {
        if (moved > 0) {
          notifyTodoChanged("focus")
          notify.success(t("myspace.todo.migrated", { n: moved }))
          setNonce((n) => n + 1)
        }
      })
      .finally(() => {
        migrating = null
      })
  }, [ready, local, current.defaultListId, current.tasks, instance, key, t])

  const patchTasks = useCallback(
    (fn) => {
      setState((s) => {
        if (s.key !== key || s.status !== "ready") return s
        const tasks = fn(s.tasks)
        if (cache && cache.key === key) cache = { ...cache, tasks }
        return { ...s, tasks }
      })
    },
    [key],
  )

  const fail = useCallback(() => notify.error(t("myspace.todo.saveFailed")), [t])

  const add = useCallback(
    (title) => {
      if (mode === "local") return addTask(title)
      const clean = String(title ?? "")
        .trim()
        .slice(0, MAX_TITLE)
      if (!clean || !ready || !current.defaultListId) return false
      const today = localDayKey()
      const temp = {
        // ⚠️ Sayaç ŞART: aynı milisaniyedeki iki ekleme (çok satırlı yapıştırma,
        // hızlı Enter) aynı geçici kimliği alıyordu ve ilk sunucu yanıtı HEPSİNİ
        // aynı göreve çeviriyordu — React'ta yinelenen anahtar, listede çift iş.
        id: `tmp-${Date.now().toString(36)}-${++tempSeq}`,
        listId: current.defaultListId,
        title: clean,
        done: false,
        dueKey: today,
        overdue: false,
        created: new Date().toISOString(),
        pending: true,
      }
      patchTasks((list) => [...list, temp])
      createFocusTask(instance, accountOf(instance, key), {
        listId: current.defaultListId,
        title: clean,
        today,
      }).then((res) => {
        if (res.status === STATUS.ready) {
          patchTasks((list) => list.map((x) => (x.id === temp.id ? res.task : x)))
          notifyTodoChanged("focus")
        } else {
          patchTasks((list) => list.filter((x) => x.id !== temp.id))
          fail()
        }
      })
      return true
    },
    [mode, ready, current.defaultListId, patchTasks, instance, key, fail],
  )

  const toggle = useCallback(
    (id) => {
      if (mode === "local") return toggleTask(id)
      const task = current.tasks.find((x) => x.id === id)
      if (!task || task.pending) return
      const today = localDayKey()
      const flip = (x) =>
        x.id === id
          ? {
              ...x,
              done: !x.done,
              doneOn: !x.done ? today : undefined,
              overdue: x.done ? x.dueKey < today : false,
            }
          : x
      patchTasks((list) => list.map(flip))
      setFocusTaskDone(instance, accountOf(instance, key), {
        listId: task.listId,
        taskId: id,
        done: !task.done,
      }).then((res) => {
        if (res.status !== STATUS.ready) {
          patchTasks((list) => list.map((x) => (x.id === id ? task : x)))
          fail()
        } else notifyTodoChanged("focus")
      })
    },
    [mode, current.tasks, patchTasks, instance, key, fail],
  )

  const remove = useCallback(
    (id) => {
      if (mode === "local") return removeTask(id)
      const index = current.tasks.findIndex((x) => x.id === id)
      const task = current.tasks[index]
      if (!task || task.pending) return
      patchTasks((list) => list.filter((x) => x.id !== id))
      clearFocusTaskDue(instance, accountOf(instance, key), {
        listId: task.listId,
        taskId: id,
      }).then((res) => {
        if (res.status !== STATUS.ready) {
          patchTasks((list) => {
            const next = [...list]
            next.splice(Math.min(index, next.length), 0, task)
            return next
          })
          fail()
        } else notifyTodoChanged("focus")
      })
    },
    [mode, current.tasks, patchTasks, instance, key, fail],
  )

  const connect = useCallback(async () => {
    const ok = await requestGraphScopes(instance, accountOf(instance, key), TODO_SCOPES)
    if (ok) setNonce((n) => n + 1)
    else notify.error(t("myspace.todo.connectFailed"))
  }, [instance, key, t])

  const retry = useCallback(() => setNonce((n) => n + 1), [])

  const tasks = mode === "local" ? local : current.tasks
  return {
    mode,
    status: mode === "local" ? "ready" : current.status,
    loading: mode === "todo" && current.status === "loading",
    tasks,
    canConnect: Boolean(key) && current.status === "denied",
    // Okunamayan liste sayısı ve arızanın kısa adı ("HTTP 429 · …").
    skipped: mode === "todo" ? (current.skipped ?? 0) : 0,
    detail: mode === "todo" ? (current.detail ?? "") : "",
    full: mode === "local" && tasks.length >= MAX_TASKS,
    add,
    toggle,
    remove,
    connect,
    retry,
  }
}
