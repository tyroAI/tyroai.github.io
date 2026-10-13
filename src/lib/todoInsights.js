import { foldTr } from "@/lib/feed"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { localDayKey } from "@/lib/todo"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  TO-DO SAYFASI — SAF HESAP (görünümler, gruplar, sıralama, özetler)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Ağa çıkmaz, React bilmez; aynı girdiye aynı çıktı. Sayfanın her rakamı
 * buradan geliyor ve her biri görevlerin kendi alanlarının aritmetiği —
 * tahmin, puan ya da "verimlilik skoru" YOK (Akışım'ın "süs değil ölçü"
 * kuralı).
 *
 * ⚠️ **"BUGÜN" = AKIŞIM'IN "BUGÜNÜN ODAĞI", BİREBİR** (`isFocus`). Tanım
 * `lib/todo.js` › `toFocusTask`ın aynısı: açık ve teslimi bugün ya da geçmiş;
 * ya da BUGÜN bitmiş ve teslimi bugün ya da geçmiş. İki yüzey farklı bir
 * "bugün" söyleseydi Akışım'da 3/5 yazarken burada 4/6 görünürdü — istek de
 * tam olarak bunu söylüyordu: *"akışımda günün odağında girdiklerimizi orada
 * görelim"*.
 *
 * ⚠️ **GÜNLER YEREL TAKVİM GÜNÜ ANAHTARI** (`YYYY-MM-DD`): teslim tarihi bir
 * gün, an değil (gerekçe `lib/todo.js` başında); karşılaştırma dizge sırası,
 * saat dilimi hiç girmiyor.
 */

export const VIEWS = ["today", "important", "planned", "all", "done"]

/** `YYYY-MM-DD` → yerel Date (gece yarısı). */
export function keyToDate(key) {
  const [y, m, d] = String(key).split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(key, n) {
  const d = keyToDate(key)
  d.setDate(d.getDate() + n)
  return localDayKey(d)
}

/** Haftanın son günü — hafta başı dilin kararı (`lib/weekStart.js`'in `FIRST_DAY`i). */
export function endOfWeekKey(key, firstDay = 1) {
  const d = keyToDate(key)
  const lead = (d.getDay() - firstDay + 7) % 7
  return addDays(key, 6 - lead)
}

/** To-Do'nun ilerleme kartındaki dönemler; varsayılan bugün. */
export const PERIODS = ["today", "week", "month", "year"]

/** Dönemin ilk ve son günü (`YYYY-MM-DD`). Hafta başı dilin kararı. */
export function periodRange(today, period, firstDay = 1) {
  if (period === "week") {
    const end = endOfWeekKey(today, firstDay)
    return [addDays(end, -6), end]
  }
  const [y, m] = today.split("-")
  if (period === "month") {
    // Sonraki ayın 0. günü = bu ayın son günü.
    const last = new Date(Number(y), Number(m), 0).getDate()
    return [`${y}-${m}-01`, `${y}-${m}-${String(last).padStart(2, "0")}`]
  }
  if (period === "year") return [`${y}-01-01`, `${y}-12-31`]
  return [today, today]
}

/**
 * Dönemin ilerlemesi — `isFocus`un dönemli hâli, bugün için BİREBİR aynı:
 * teslimi dönemin sonuna kadar olan işler; açık olan (gecikmişler dahil) hep
 * sayılır, biten yalnız dönemin içinde bittiyse.
 */
export function periodProgress(tasks, today, period, firstDay = 1) {
  const [start, end] = periodRange(today, period, firstDay)
  let total = 0
  let done = 0
  for (const t of tasks) {
    if (!t.dueKey || t.dueKey > end) continue
    if (t.done) {
      if (!t.doneKey || t.doneKey < start || t.doneKey > end) continue
      done += 1
    }
    total += 1
  }
  return { done, total }
}

/** Akışım'ın bugünü (gerekçe dosya başında). */
export function isFocus(task, today) {
  if (!task.dueKey || task.dueKey > today) return false
  return task.done ? task.doneKey === today : true
}

const IMPORTANCE_RANK = { high: 0, normal: 1, low: 2 }

/** Akıllı sıra: teslimi olan önce (eskiden yeniye), sonra önem, sonra eklenme. */
function smartCompare(a, b) {
  if (a.dueKey !== b.dueKey) {
    if (!a.dueKey) return 1
    if (!b.dueKey) return -1
    return a.dueKey < b.dueKey ? -1 : 1
  }
  const ia = IMPORTANCE_RANK[a.importance] ?? 1
  const ib = IMPORTANCE_RANK[b.importance] ?? 1
  if (ia !== ib) return ia - ib
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
}

export const SORTS = ["smart", "due", "importance", "created", "alpha"]

export function sortTasks(tasks, sort = "smart", locale = "tr") {
  const list = [...tasks]
  switch (sort) {
    case "due":
      return list.sort((a, b) => {
        if (a.dueKey === b.dueKey) return smartCompare(a, b)
        if (!a.dueKey) return 1
        if (!b.dueKey) return -1
        return a.dueKey < b.dueKey ? -1 : 1
      })
    case "importance":
      return list.sort(
        (a, b) =>
          (IMPORTANCE_RANK[a.importance] ?? 1) - (IMPORTANCE_RANK[b.importance] ?? 1) ||
          smartCompare(a, b),
      )
    case "created":
      return list.sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
      )
    case "alpha":
      return list.sort((a, b) => a.title.localeCompare(b.title, locale, { sensitivity: "base" }))
    default:
      return list.sort(smartCompare)
  }
}

/** En yeni biten başta. */
const byDoneDesc = (a, b) =>
  (a.doneAt ?? a.doneKey ?? "") < (b.doneAt ?? b.doneKey ?? "") ? 1 : -1

/** Arama: başlık + not, Türkçe katlamalı, kelimeler VE'lenir (sayfanın kuralı). */
export function searchTasks(tasks, query) {
  const words = foldTr(query).split(/\s+/).filter(Boolean)
  if (!words.length) return tasks
  return tasks.filter((t) => {
    const hay = foldTr(`${t.title} ${t.note}`)
    return words.every((w) => hay.includes(w))
  })
}

/** Görünümün (ya da listenin) görevleri — gruplanmadan. */
export function tasksForView(tasks, view, today) {
  if (view?.startsWith("list:")) {
    const id = view.slice(5)
    return tasks.filter((t) => t.listId === id)
  }
  switch (view) {
    case "today":
      return tasks.filter((t) => isFocus(t, today))
    case "important":
      return tasks.filter((t) => !t.done && t.importance === "high")
    case "planned":
      return tasks.filter((t) => !t.done && t.dueKey)
    case "done":
      return tasks.filter((t) => t.done)
    default:
      return tasks.filter((t) => !t.done)
  }
}

/** Kenar rayındaki sayılar: AÇIK iş sayısı (bugünde odak kümesinin açıkları). */
export function viewCounts(tasks, lists, today) {
  const open = tasks.filter((t) => !t.done)
  const counts = {
    today: open.filter((t) => t.dueKey && t.dueKey <= today).length,
    important: open.filter((t) => t.importance === "high").length,
    planned: open.filter((t) => t.dueKey).length,
    all: open.length,
    done: tasks.length - open.length,
  }
  for (const l of lists) counts[`list:${l.id}`] = open.filter((t) => t.listId === l.id).length
  return counts
}

/**
 * Görünümün grupları: `[{ id, label, tone, tasks, collapsible }]` — `label`
 * bir sözlük anahtarı ya da (liste adı, tarih) hazır metin (`raw`).
 *
 * ⚠️ `keepOpen`: az önce işaretlenen görevler ~1 sn AÇIK grubunda kalıyor
 * (To Do'nun kendi davranışı) — işaretlenen satırın anında yok olması, "bastım
 * ve kayboldu, yanlışlıkla mı oldu?" dedirtiyordu. Hesap burada, zamanlayıcı
 * bileşende.
 */
export function groupTasks(
  tasks,
  view,
  { today, lists = [], sort = "smart", locale = "tr", firstDay = 1, keepOpen },
) {
  const isOpen = (t) => !t.done || keepOpen?.has(t.id)
  const open = sortTasks(tasks.filter(isOpen), sort, locale)
  const done = tasks.filter((t) => !isOpen(t)).sort(byDoneDesc)

  if (view === "done") {
    const groups = new Map()
    for (const t of done) {
      const key = t.doneKey ?? "unknown"
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(t)
    }
    return [...groups.entries()].map(([key, list]) => ({
      id: `done:${key}`,
      label:
        key === today
          ? "todo.group.today"
          : key === addDays(today, -1)
            ? "todo.group.yesterday"
            : null,
      dateKey: key === "unknown" ? null : key,
      tone: "done",
      tasks: list,
    }))
  }

  if (view === "planned") {
    const tomorrow = addDays(today, 1)
    const weekEnd = endOfWeekKey(today, firstDay)
    const buckets = [
      { id: "overdue", label: "todo.group.overdue", tone: "overdue", test: (k) => k < today },
      { id: "today", label: "todo.group.today", tone: "today", test: (k) => k === today },
      { id: "tomorrow", label: "todo.group.tomorrow", test: (k) => k === tomorrow },
      { id: "week", label: "todo.group.thisWeek", test: (k) => k > tomorrow && k <= weekEnd },
      { id: "later", label: "todo.group.later", test: (k) => k > weekEnd && k > tomorrow },
    ]
    return buckets
      .map((b) => ({
        id: b.id,
        label: b.label,
        tone: b.tone,
        tasks: open.filter((t) => t.dueKey && b.test(t.dueKey)),
      }))
      .filter((g) => g.tasks.length)
  }

  if (view === "today") {
    const overdue = open.filter((t) => t.dueKey && t.dueKey < today)
    const due = open.filter((t) => !(t.dueKey && t.dueKey < today))
    return [
      { id: "overdue", label: "todo.group.overdue", tone: "overdue", tasks: overdue },
      { id: "today", label: "todo.group.today", tone: "today", tasks: due },
      {
        id: "doneToday",
        label: "todo.group.doneToday",
        tone: "done",
        tasks: done,
        collapsible: true,
      },
    ].filter((g) => g.tasks.length)
  }

  if (view === "all") {
    return lists
      .map((l) => ({
        id: `list:${l.id}`,
        raw: l.name,
        tasks: open.filter((t) => t.listId === l.id),
      }))
      .filter((g) => g.tasks.length)
  }

  // Önemli ve tek liste: açıklar, sonra katlanan tamamlananlar.
  return [
    { id: "open", label: null, tasks: open },
    ...(view?.startsWith("list:")
      ? [
          {
            id: "done",
            label: "todo.group.completed",
            tone: "done",
            tasks: done,
            collapsible: true,
          },
        ]
      : []),
  ].filter((g) => g.tasks.length)
}

/**
 * Üst panonun özeti. Her alan bir sayım ya da o sayımın dökümü (ipuçları
 * satırları buradan okuyor).
 */
export function boardSummary(tasks, today) {
  const open = tasks.filter((t) => !t.done)
  const focus = tasks.filter((t) => isFocus(t, today))
  const overdue = open
    .filter((t) => t.dueKey && t.dueKey < today)
    .sort((a, b) => (a.dueKey < b.dueKey ? -1 : 1))
  const dueToday = open.filter((t) => t.dueKey === today)
  const doneToday = tasks.filter((t) => t.done && t.doneKey === today)

  // Önümüzdeki yedi gün (bugün dahil): o gün teslimi olan AÇIK işler.
  const week = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i)
    return { key, tasks: open.filter((t) => t.dueKey === key) }
  })

  // Son yedi gün (bugün dahil): o gün BİTEN işler; ve ondan önceki yedi.
  const doneOn = (key) => tasks.filter((t) => t.done && t.doneKey === key)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6)
    return { key, tasks: doneOn(key) }
  })
  const prev7Total = Array.from(
    { length: 7 },
    (_, i) => doneOn(addDays(today, i - 13)).length,
  ).reduce((s, n) => s + n, 0)

  // Seri: bugünden (bugün boşsa dünden) geriye, her gün en az bir iş biten
  // ardışık günler. Bugün henüz boşsa seri BOZULMAZ — gün bitmedi.
  let streak = 0
  let cursor = doneOn(today).length ? today : addDays(today, -1)
  for (let i = 0; i < 366 && doneOn(cursor).length; i += 1) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return {
    openTotal: open.length,
    focusTotal: focus.length,
    focusDone: focus.filter((t) => t.done).length,
    focusOpen: focus.filter((t) => !t.done),
    dueToday,
    overdue,
    doneToday,
    important: open.filter((t) => t.importance === "high"),
    week,
    last7,
    last7Total: last7.reduce((s, d) => s + d.tasks.length, 0),
    prev7Total,
    streak,
  }
}

const OPTS_DUE_SHORT = { weekday: "short", day: "numeric", month: "short" }

/** Son tarihin kısa adı: Bugün · Yarın · Dün · "Çar 8 Eki". */
export function dueLabel(dueKey, today, t, locale) {
  if (!dueKey) return null
  if (dueKey === today) return t("todo.due.today")
  if (dueKey === addDays(today, 1)) return t("todo.due.tomorrow")
  if (dueKey === addDays(today, -1)) return t("todo.due.yesterday")
  return getDateTimeFormat(locale, OPTS_DUE_SHORT).format(keyToDate(dueKey))
}
