import { STATUS } from "@/lib/graph"
import { createTaskFromMail, deleteBoardTask } from "@/lib/todoBoard"
import { notifyTodoChanged } from "@/lib/todoSync"

/**
 * "Kaydet"in Graph tarafı: gönderi varsayılan To Do listesine tarihsiz bir "sonra oku"
 * görevi olur — başlık konu, not gönderen, postaya dönen bağlantı (`linkedResources`,
 * Sana özel'in "To-Do'ya ekle"siyle aynı yardımcı). Kaydı kaldırmak görevi siler.
 * Yeni kapsam yok: `Tasks.ReadWrite` zaten To-Do sayfasının.
 */
export async function saveTask(instance, account, { title, note, webUrl }) {
  const res = await createTaskFromMail(instance, account, { title, note, webUrl, important: false })
  if (res.status !== STATUS.ready) return { status: res.status }
  return {
    status: STATUS.ready,
    taskId: res.task?.id ?? null,
    listId: res.task?.listId ?? null,
    listName: res.listName ?? "",
  }
}

/** Görevi siler. Görev To Do'da zaten silinmişse (404) de kayıt kalkar — `graphDelete` öyle döner. */
export async function removeTask(instance, account, { listId, taskId }) {
  if (!listId || !taskId) return { status: STATUS.ready }
  const res = await deleteBoardTask(instance, account, { listId, taskId })
  if (res.status === STATUS.ready) notifyTodoChanged("mail")
  return { status: res.status }
}
