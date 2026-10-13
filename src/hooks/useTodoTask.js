import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { STATUS } from "@/lib/graph"
import { fetchTodoTask } from "@/lib/todoTask"

/**
 * Önizlemesi açık görevin tam hâli. Liste kimliği yoksa (bu tarayıcıdaki
 * yerel liste) istek atılmaz; çağıran elindeki kısa modeli gösterir.
 */
export function useTodoTask(task) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const key = task?.listId && task?.id ? `${task.listId}|${task.id}` : null
  const [loaded, setLoaded] = useState(null) // { key, value }

  useEffect(() => {
    if (!key) return undefined
    let live = true
    fetchTodoTask(instance, account, { listId: task.listId, id: task.id }).then(
      (value) => live && setLoaded({ key, value }),
    )
    return () => {
      live = false
    }
    // `task` her çizimde yeni olabilir; kimliği `key` taşıyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, instance, account])

  if (!key) return { status: STATUS.ready, task: null }
  return loaded?.key === key ? loaded.value : { status: "loading" }
}
