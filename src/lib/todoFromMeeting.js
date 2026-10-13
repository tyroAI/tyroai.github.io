import { STATUS, graphPost } from "@/lib/graph"
import { RETRY, TODO_SCOPES, getPages, localDayKey, warnFailure } from "@/lib/todo"

// Varsayılan listenin kimliği hesap başına bir kez sorulur (kişisel veri değil,
// yalnız kimlik); hesap değişirse yeniden.
let defaultList = null

async function defaultListId(instance, account) {
  if (defaultList && defaultList.account === account?.homeAccountId) {
    return { status: STATUS.ready, id: defaultList.id }
  }
  // Sorgusuz — Bugünün odağı da listeleri böyle okuyor (`fetchFocusTasks`).
  const res = await getPages(instance, account, "/me/todo/lists", 2)
  if (res.status !== STATUS.ready) {
    warnFailure("toplantı görevi · lists", res)
    return { ...res, where: "lists" }
  }
  const lists = res.data
  const id = (lists.find((l) => l.wellknownListName === "defaultList") ?? lists[0])?.id
  if (!id) return { status: STATUS.error }
  defaultList = { account: account.homeAccountId, id }
  return { status: STATUS.ready, id }
}

/**
 * Varsayılan To Do listesine görev; son tarihi eklendiği gün (kişi To Do'da
 * değiştirir) — Bugünün odağında da görünür. `note` görevin notu (düz metin).
 */
export async function addTodo(instance, account, { title, note, due = localDayKey() }) {
  const list = await defaultListId(instance, account)
  if (list.status !== STATUS.ready) return list
  const res = await graphPost(instance, account, {
    path: `/me/todo/lists/${encodeURIComponent(list.id)}/tasks`,
    scopes: TODO_SCOPES,
    retry: RETRY,
    body: {
      title: title.slice(0, 255),
      // Gün, UTC gece yarısı — To Do'nun kendi saklama biçimi (`createFocusTask` ile aynı).
      dueDateTime: { dateTime: `${due}T00:00:00.0000000`, timeZone: "UTC" },
      ...(note ? { body: { content: note, contentType: "text" } } : {}),
    },
  })
  if (res.status !== STATUS.ready) warnFailure("toplantı görevi · tasks", res)
  return res.status === STATUS.ready ? res : { ...res, where: "tasks" }
}
