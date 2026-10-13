import { graphGet, STATUS } from "@/lib/graph"
import { toBoardTask } from "@/lib/todoBoard"

const SCOPES = ["Tasks.ReadWrite"]

/**
 * Tek bir To Do görevinin tam hâli (not, önem, adımlar, hatırlatma) — özetin
 * görev önizlemesi için. Adımlar `$expand=checklistItems` ile istenir; kiracı
 * genişletmeyi reddederse (400) adımsız bir kez daha sorulur.
 */
export async function fetchTodoTask(instance, account, { listId, id }) {
  const base = `/me/todo/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(id)}`
  let res = await graphGet(instance, account, {
    path: `${base}?$expand=checklistItems`,
    scopes: SCOPES,
  })
  if (res.status === STATUS.error && res.httpStatus === 400) {
    res = await graphGet(instance, account, { path: base, scopes: SCOPES })
  }
  if (res.status !== STATUS.ready) return { status: res.status }
  return { status: STATUS.ready, task: toBoardTask(res.data, listId) }
}
