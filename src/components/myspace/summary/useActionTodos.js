import { useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { STATUS, requestGraphScopes } from "@/lib/graph"
import { TODO_SCOPES, describeFailure } from "@/lib/todo"
import { addTodo } from "@/lib/todoFromMeeting"
import { showResultToast } from "@/lib/refreshToast"

/**
 * Özetin yapılacaklarını To Do'ya ekler. Satır başına durum: yok · `busy` ·
 * `done`. Görevin notunda açıklama, sorumlu ve toplantının adı. İzin yoksa
 * (`Tasks.ReadWrite`) düğmeye basan kişiye bir kez sorulur.
 */
export function useActionTodos(actions, subject, t) {
  const { instance, accounts } = useMsal()
  const [state, setState] = useState({})
  const doneRef = useRef(new Set())
  const failRef = useRef("")
  const set = (i, v) => setState((s) => ({ ...s, [i]: v }))

  async function addOne(i) {
    const a = actions[i]
    if (!a || doneRef.current.has(i)) return true
    set(i, "busy")
    const note = [
      a.title && a.text,
      a.owner && t("meetingSummary.todoNoteOwner", { name: a.owner }),
      subject && t("meetingSummary.todoNoteMeeting", { subject }),
    ]
      .filter(Boolean)
      .join("\n")
    const task = { title: a.title || a.text, note }
    let res = await addTodo(instance, accounts[0], task)
    if (
      res.status === STATUS.denied &&
      (await requestGraphScopes(instance, accounts[0], TODO_SCOPES))
    ) {
      res = await addTodo(instance, accounts[0], task)
    }
    const ok = res.status === STATUS.ready
    if (ok) doneRef.current.add(i)
    else failRef.current = describeFailure(res, res.where)
    set(i, ok ? "done" : undefined)
    return ok
  }

  async function run(indexes) {
    let added = 0
    for (const i of indexes) if (await addOne(i)) added += 1
    if (added === indexes.length) {
      showResultToast({ title: t("meetingSummary.todoAddedToast", { n: added }) })
    } else {
      // Teknik neden (HTTP kodu · çağrı) bildirimde: sahadaki hata tahminsiz okunsun.
      showResultToast({
        state: "error",
        title: t("meetingSummary.todoFailed"),
        detail: failRef.current,
      })
    }
  }

  return {
    state,
    add: (i) => run([i]),
    addAll: () => run(actions.map((_, i) => i).filter((i) => !doneRef.current.has(i))),
    allDone: actions.length > 0 && actions.every((_, i) => state[i] === "done"),
  }
}
