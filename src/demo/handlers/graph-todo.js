// Microsoft To Do (`/me/todo/…`) ve Planner (`/me/planner/tasks`) — bellekte
// tam CRUD: listeler, görevler, adımlar (checklistItems) ve bağlı kaynaklar.
// Tohum `data/todo-seed.js`; ilk istekte kurulur, oturum boyunca yaşar.
import { graph, notFound, reply } from "../router"
import { ME } from "../persona"
import { hash } from "../data/calendar-time"
import { PLANS, seedPlanner, seedTodo, utcStamp } from "../data/todo-seed"

const GRAPH = "https://graph.microsoft.com/v1.0"

let store = null
function db() {
  if (!store) store = seedTodo(new Date())
  return store
}
let planner = null
const plannerTasks = () => (planner ??= seedPlanner(new Date()))

let seq = 0
const newId = (prefix) => {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}-${seq}`
}
const nowIso = () => new Date().toISOString()
const etag = (o) => `W/"${hash(`${o.id}|${o.lastModifiedDateTime ?? ""}`).toString(36)}"`

const findList = (id) => db().lists.find((l) => l.id === id) ?? null
const tasksOf = (listId) => db().tasks[listId] ?? null
function findTask(listId, taskId) {
  return tasksOf(listId)?.find((t) => t.id === taskId) ?? null
}

const badRequest = (message) =>
  reply({ error: { code: "invalidRequest", message } }, { status: 400 })

/* ─── Biçim ───────────────────────────────────────────────────────────── */

const listOut = (l) => ({ "@odata.etag": etag(l), ...l })

function taskOut(t, expand = "") {
  const { checklistItems, linkedResources: _links, ...rest } = t
  void _links
  const out = { "@odata.etag": etag(t), ...rest }
  if (/checklistItems/i.test(expand)) out.checklistItems = checklistItems.map((s) => ({ ...s }))
  return out
}

/* ─── OData süzgeçleri (To Do'nun kullandığı kadarı) ──────────────────── */

function matches(t, filter) {
  if (!filter) return true
  return filter
    .split(/\s+and\s+/i)
    .map((c) => /^\(?\s*([\w/]+)\s+(eq|ne)\s+'([^']*)'\s*\)?$/i.exec(c.trim()))
    .every((m) => {
      if (!m) return true // tanınmayan koşul: yok sayılır
      const value = String(m[1].split("/").reduce((o, k) => o?.[k], t) ?? "")
      return m[2].toLowerCase() === "eq" ? value === m[3] : value !== m[3]
    })
}

function ordered(list, orderby) {
  if (!orderby) return list
  const [field, dir] = orderby.trim().split(/\s+/)
  const get = (t) => String(field.split("/").reduce((o, k) => o?.[k], t) ?? "")
  const sign = /desc/i.test(dir ?? "") ? -1 : 1
  return [...list].sort((a, b) => (get(a) < get(b) ? -sign : get(a) > get(b) ? sign : 0))
}

function paged(ctx, items, defaultTop = 50) {
  const top = Math.max(1, Math.min(Number(ctx.query.get("$top")) || defaultTop, 1000))
  const skip = Math.max(0, Number(ctx.query.get("$skip")) || 0)
  const out = { value: items.slice(skip, skip + top) }
  if (skip + top < items.length) {
    const next = new URL(ctx.url.href)
    next.searchParams.set("$skip", String(skip + top))
    out["@odata.nextLink"] = next.toString()
  }
  return out
}

/* ─── Tekrar: tamamlanınca bir sonraki görev ──────────────────────────── */

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

function nextDue(key, recurrence) {
  const p = recurrence?.pattern
  if (!key || !p) return null
  const [y, m, d] = key.split("-").map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  const interval = Math.max(1, p.interval ?? 1)
  if (p.type === "daily") base.setUTCDate(base.getUTCDate() + interval)
  else if (p.type === "weekly") {
    const days = (p.daysOfWeek ?? []).map((x) => DAYS.indexOf(x)).filter((x) => x >= 0)
    do base.setUTCDate(base.getUTCDate() + 1)
    while (days.length && !days.includes(base.getUTCDay()))
    if (days.length <= 1 && interval > 1) base.setUTCDate(base.getUTCDate() + 7 * (interval - 1))
  } else if (p.type === "absoluteMonthly") base.setUTCMonth(base.getUTCMonth() + interval)
  else if (p.type === "absoluteYearly") base.setUTCFullYear(base.getUTCFullYear() + interval)
  else return null
  return base.toISOString().slice(0, 10)
}

/* ─── Yazma ───────────────────────────────────────────────────────────── */

const WRITABLE = [
  "title",
  "importance",
  "isReminderOn",
  "reminderDateTime",
  "dueDateTime",
  "startDateTime",
  "recurrence",
  "categories",
  "body",
]

function applyChanges(task, body, listId) {
  const changes = body ?? {}
  for (const k of WRITABLE) {
    if (!(k in changes)) continue
    if (changes[k] === null) delete task[k]
    else if (k === "body") task.body = { content: "", contentType: "text", ...changes.body }
    else task[k] = changes[k]
  }
  if ("dueDateTime" in changes && changes.dueDateTime === null) delete task.recurrence
  if ("status" in changes) {
    const wasDone = task.status === "completed"
    task.status = changes.status
    if (changes.status === "completed" && !wasDone) {
      task.completedDateTime = utcStamp(Date.now())
      // To Do: tamamlanan tekrar eden görevin yerine bir sonraki açılır.
      const due = nextDue(task.dueDateTime?.dateTime?.slice(0, 10), task.recurrence)
      if (due) {
        const copy = {
          ...structuredClone(task),
          id: newId("task"),
          status: "notStarted",
          dueDateTime: { dateTime: `${due}T00:00:00.0000000`, timeZone: "UTC" },
          createdDateTime: nowIso(),
          lastModifiedDateTime: nowIso(),
        }
        delete copy.completedDateTime
        copy.recurrence = {
          ...task.recurrence,
          range: { ...task.recurrence.range, startDate: due },
        }
        copy.checklistItems = copy.checklistItems.map((s, i) => ({
          ...s,
          id: `${copy.id}-step-${i + 1}`,
          isChecked: false,
          checkedDateTime: undefined,
        }))
        delete task.recurrence
        tasksOf(listId).push(copy)
      }
    } else if (changes.status !== "completed") delete task.completedDateTime
  }
  if (typeof task.title === "string") task.title = task.title.slice(0, 255)
  task.lastModifiedDateTime = nowIso()
}

/* ─── Listeler ────────────────────────────────────────────────────────── */

graph("GET", "/me/todo/lists", (ctx) => ({
  "@odata.context": `${GRAPH}/$metadata#users('${ME.id}')/todo/lists`,
  ...paged(ctx, db().lists.map(listOut)),
}))

graph("POST", "/me/todo/lists", ({ body }) => {
  const name = String(body?.displayName ?? "").trim()
  if (!name) return badRequest("displayName is required")
  const list = {
    id: newId("list"),
    displayName: name.slice(0, 255),
    isOwner: true,
    isShared: false,
    wellknownListName: "none",
    lastModifiedDateTime: nowIso(),
  }
  db().lists.push(list)
  db().tasks[list.id] = []
  return reply(listOut(list), { status: 201 })
})

graph("GET", /^\/me\/todo\/lists\/([^/]+)$/, ({ match }) => {
  const list = findList(match[1])
  return list ? listOut(list) : notFound()
})

graph("PATCH", /^\/me\/todo\/lists\/([^/]+)$/, ({ match, body }) => {
  const list = findList(match[1])
  if (!list) return notFound()
  if (typeof body?.displayName === "string" && body.displayName.trim()) {
    if (list.wellknownListName !== "none") return badRequest("Well-known lists can't be renamed")
    list.displayName = body.displayName.trim().slice(0, 255)
  }
  list.lastModifiedDateTime = nowIso()
  return listOut(list)
})

graph("DELETE", /^\/me\/todo\/lists\/([^/]+)$/, ({ match }) => {
  const list = findList(match[1])
  if (!list) return notFound()
  if (list.wellknownListName !== "none") return badRequest("Well-known lists can't be deleted")
  db().lists = db().lists.filter((l) => l !== list)
  delete db().tasks[list.id]
  return reply(null, { status: 204 })
})

/* ─── Görevler ────────────────────────────────────────────────────────── */

graph("GET", /^\/me\/todo\/lists\/([^/]+)\/tasks$/, (ctx) => {
  const listId = ctx.match[1]
  const all = tasksOf(listId)
  if (!all) return notFound()
  const expand = ctx.query.get("$expand") ?? ""
  const items = ordered(
    all.filter((t) => matches(t, ctx.query.get("$filter"))),
    ctx.query.get("$orderby"),
  ).map((t) => taskOut(t, expand))
  return {
    "@odata.context": `${GRAPH}/$metadata#users('${ME.id}')/todo/lists('${listId}')/tasks`,
    ...paged(ctx, items),
  }
})

graph("POST", /^\/me\/todo\/lists\/([^/]+)\/tasks$/, ({ match, body }) => {
  const listId = match[1]
  if (!tasksOf(listId)) return notFound()
  const title = String(body?.title ?? "").trim()
  if (!title) return badRequest("title is required")
  const id = newId("task")
  const now = nowIso()
  const task = {
    id,
    title,
    status: "notStarted",
    importance: "normal",
    isReminderOn: false,
    createdDateTime: now,
    lastModifiedDateTime: now,
    hasAttachments: false,
    categories: [],
    body: { content: "", contentType: "text" },
    checklistItems: [],
    linkedResources: (body?.linkedResources ?? []).map((l, i) => ({
      id: `${id}-link-${i + 1}`,
      ...l,
    })),
  }
  applyChanges(task, { ...body, title }, listId)
  task.createdDateTime = now
  tasksOf(listId).push(task)
  return reply(taskOut(task), { status: 201 })
})

graph("GET", /^\/me\/todo\/lists\/([^/]+)\/tasks\/([^/]+)$/, (ctx) => {
  const task = findTask(ctx.match[1], ctx.match[2])
  return task ? taskOut(task, ctx.query.get("$expand") ?? "") : notFound()
})

graph("PATCH", /^\/me\/todo\/lists\/([^/]+)\/tasks\/([^/]+)$/, ({ match, body }) => {
  const task = findTask(match[1], match[2])
  if (!task) return notFound()
  applyChanges(task, body, match[1])
  return taskOut(task)
})

graph("DELETE", /^\/me\/todo\/lists\/([^/]+)\/tasks\/([^/]+)$/, ({ match }) => {
  const list = tasksOf(match[1])
  const i = list?.findIndex((t) => t.id === match[2]) ?? -1
  if (i < 0) return notFound()
  list.splice(i, 1)
  return reply(null, { status: 204 })
})

/* ─── Adımlar (checklistItems) ────────────────────────────────────────── */

const stepsBase = /^\/me\/todo\/lists\/([^/]+)\/tasks\/([^/]+)\/checklistItems/

graph("GET", new RegExp(`${stepsBase.source}$`), (ctx) => {
  const task = findTask(ctx.match[1], ctx.match[2])
  if (!task) return notFound()
  return paged(
    ctx,
    task.checklistItems.map((s) => ({ ...s })),
    100,
  )
})

graph("POST", new RegExp(`${stepsBase.source}$`), ({ match, body }) => {
  const task = findTask(match[1], match[2])
  if (!task) return notFound()
  const name = String(body?.displayName ?? "").trim()
  if (!name) return badRequest("displayName is required")
  const step = {
    id: newId(`${task.id}-step`),
    displayName: name.slice(0, 255),
    isChecked: Boolean(body?.isChecked),
    createdDateTime: nowIso(),
    ...(body?.isChecked ? { checkedDateTime: nowIso() } : {}),
  }
  task.checklistItems.push(step)
  task.lastModifiedDateTime = nowIso()
  return reply({ ...step }, { status: 201 })
})

graph("PATCH", new RegExp(`${stepsBase.source}/([^/]+)$`), ({ match, body }) => {
  const task = findTask(match[1], match[2])
  const step = task?.checklistItems.find((s) => s.id === match[3])
  if (!step) return notFound()
  if (typeof body?.displayName === "string" && body.displayName.trim())
    step.displayName = body.displayName.trim().slice(0, 255)
  if ("isChecked" in (body ?? {})) {
    step.isChecked = Boolean(body.isChecked)
    if (step.isChecked) step.checkedDateTime = nowIso()
    else delete step.checkedDateTime
  }
  task.lastModifiedDateTime = nowIso()
  return { ...step }
})

graph("DELETE", new RegExp(`${stepsBase.source}/([^/]+)$`), ({ match }) => {
  const task = findTask(match[1], match[2])
  const i = task?.checklistItems.findIndex((s) => s.id === match[3]) ?? -1
  if (i < 0) return notFound()
  task.checklistItems.splice(i, 1)
  task.lastModifiedDateTime = nowIso()
  return reply(null, { status: 204 })
})

/* ─── Bağlı kaynaklar ─────────────────────────────────────────────────── */

const linksPath = /^\/me\/todo\/lists\/([^/]+)\/tasks\/([^/]+)\/linkedResources$/

graph("GET", linksPath, ({ match }) => {
  const task = findTask(match[1], match[2])
  return task ? { value: task.linkedResources.map((l) => ({ ...l })) } : notFound()
})

graph("POST", linksPath, ({ match, body }) => {
  const task = findTask(match[1], match[2])
  if (!task) return notFound()
  const link = { id: newId(`${task.id}-link`), ...body }
  task.linkedResources.push(link)
  return reply({ ...link }, { status: 201 })
})

/* ─── Planner ─────────────────────────────────────────────────────────── */

graph("GET", "/me/planner/tasks", (ctx) => ({
  "@odata.context": `${GRAPH}/$metadata#Collection(microsoft.graph.plannerTask)`,
  ...paged(ctx, plannerTasks(), 400),
}))

graph("GET", /^\/planner\/plans\/([^/]+)$/, ({ match }) => {
  const title = PLANS[match[1]]
  if (!title) return notFound()
  return {
    "@odata.etag": `W/"${hash(match[1]).toString(36)}"`,
    id: match[1],
    title,
    createdDateTime: new Date(Date.now() - 90 * 86_400_000).toISOString(),
    owner: `${match[1]}-group`,
    container: { containerId: `${match[1]}-group`, type: "group" },
  }
})

graph("GET", /^\/planner\/tasks\/([^/]+)$/, ({ match }) => {
  const task = plannerTasks().find((t) => t.id === match[1])
  return task ?? notFound()
})
