import { useCallback, useSyncExternalStore } from "react"
import { useMsal } from "@azure/msal-react"
import { useLocale } from "@/hooks/useLocale"
import { getSnapshot, setHandoff, subscribe } from "@/lib/forYouSession"
import { STATUS, requestGraphScopes } from "@/lib/graph"
import { showResultToast } from "@/lib/refreshToast"
import { TODO_SCOPES } from "@/lib/todo"
import { createTaskFromMail } from "@/lib/todoBoard"

const EMPTY = Object.freeze({ key: null, opened: new Set(), todo: new Map() })

/** Bu hesabın Sana özel oturum kaydı (`lib/forYouSession.js`); başka hesabınki dönmez. */
export function useForYouSession(key) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return key && snap.key === key ? snap : EMPTY
}

/**
 * POSTAYI TO-DO'YA DEVRET — Sana özel'in "To-Do'ya ekle"si (2026-10-01).
 *
 * `add(item)`: varsayılan listeye tarihsiz bir görev (başlık konu, not
 * gönderen, postaya dönen bağlantı; yüksek önemliyse yıldızlı). Posta
 * DEĞİŞMEZ — bayrağı kaldırmak `Mail.ReadWrite` isterdi ve bu depo yalnız
 * `Mail.Read` taşıyor.
 *
 *   busy     → istek yolda (ikinci basış yok sayılır)
 *   done     → bağlantı o LİSTEYE gider (`listId`), bildirim liste adıyla
 *   connect  → To Do izni yok: "To Do'ya bağlan" → izin → TEK tekrar
 *   (silinir)→ başka bir hata: bildirim, posta değişmedi
 *
 * ⚠️ Durum OTURUM KAYDINDA (`lib/forYouSession.js`), bileşende değil: sekme
 * değişince "Eklendi" kaybolmasın, aynı posta iki kez göreve çevrilmesin.
 */
export function useMailHandoff() {
  const { t } = useLocale()
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const key = account?.homeAccountId ?? null
  const session = useForYouSession(key)

  const entryOf = useCallback((id) => session.todo.get(id) ?? null, [session])

  const add = useCallback(
    async (item, { onDone } = {}) => {
      if (!account || !key || !item?.id) return
      // Çift basış: kaydın CANLI hâline bakılır (bu çizimin kopyasına değil).
      const live = getSnapshot()
      if (live.key === key && live.todo.has(item.id)) return
      setHandoff(key, item.id, { state: "busy" })
      const res = await createTaskFromMail(instance, account, {
        title: item.subject || t("feed.noSubject"),
        note: t("feed.important.taskNote", { author: item.author }),
        webUrl: item.webLink,
        important: item.importance === "high",
      })
      if (res.status === STATUS.ready) {
        // Görev kimliği de tutulur: Keşfet'in "Kaydet"i aynı görevi tanır ve kaldırabilir.
        setHandoff(key, item.id, {
          state: "done",
          listId: res.task?.listId ?? null,
          taskId: res.task?.id ?? null,
          listName: res.listName ?? "",
        })
        showResultToast({
          title: t("feed.important.toTodoDone"),
          detail: [
            t("feed.important.todo.addedBody", { list: res.listName || t("nav.todo") }),
            item.flag === "flagged" ? t("feed.important.todo.flaggedNote") : null,
          ]
            .filter(Boolean)
            .join(" "),
        })
        onDone?.()
      } else if (res.status === STATUS.denied) {
        setHandoff(key, item.id, { state: "connect" })
      } else {
        setHandoff(key, item.id, null)
        showResultToast({
          state: "error",
          title: t("feed.important.toTodoFailed"),
          detail: t("feed.important.todo.failedBody"),
        })
      }
    },
    [account, key, instance, t],
  )

  const connect = useCallback(
    async (item, opts) => {
      if (!account || !key) return
      const ok = await requestGraphScopes(instance, account, TODO_SCOPES)
      if (!ok) return
      setHandoff(key, item.id, null)
      await add(item, opts)
    },
    [account, key, instance, add],
  )

  return { session, entryOf, add, connect }
}
