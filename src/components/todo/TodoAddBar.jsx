import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon"
import StarIcon from "@hugeicons/core-free-icons/StarIcon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { DuePicker } from "./DuePicker"

/** Görünüme göre yeni işin varsayılanları — To Do'nun kendi kuralı. */
function defaultsFor(view, today, defaultListId) {
  if (view?.startsWith("list:"))
    return { listId: view.slice(5), dueKey: null, importance: "normal" }
  if (view === "today" || view === "planned")
    return { listId: defaultListId, dueKey: today, importance: "normal" }
  if (view === "important") return { listId: defaultListId, dueKey: null, importance: "high" }
  return { listId: defaultListId, dueKey: null, importance: "normal" }
}

export function TodoAddBar({ board, view, today, onAdded, inputRef }) {
  const { t } = useLocale()
  const base = defaultsFor(view, today, board.defaultListId)
  const [draft, setDraft] = useState("")
  // Seçimler görünüm değişince görünümün varsayılanına döner (anahtarlı
  // yeniden kurulum — bkz. `TodoBoard`); kullanıcı değiştirdiyse o değer.
  const [dueKey, setDueKey] = useState(base.dueKey)
  const [importance, setImportance] = useState(base.importance)
  const [listId, setListId] = useState(base.listId)
  const writable = board.lists.filter((l) => l.kind !== "flagged")
  const fixedList = view?.startsWith("list:")

  function submit(e) {
    e.preventDefault()
    const res = board.addTask({
      title: draft,
      listId: listId ?? board.defaultListId,
      dueKey,
      importance,
    })
    if (!res) return
    setDraft("")
    onAdded(res.temp)
    res.promise.then((task) => task && onAdded(task, res.temp.id))
  }

  return (
    <form
      onSubmit={submit}
      data-filled={draft ? "" : undefined}
      className="group/add ms-surface flex flex-wrap items-center gap-2 rounded-2xl py-1.5 pl-3 pr-1.5 transition focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10"
    >
      <HugeiconsIcon
        icon={Add01Icon}
        className="size-[1.125rem] shrink-0 text-brand"
        strokeWidth={2}
      />
      <label htmlFor="todo-add" className="sr-only">
        {t("todo.add.label")}
      </label>
      <input
        ref={inputRef}
        id="todo-add"
        value={draft}
        maxLength={255}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t("todo.add.placeholder")}
        className="no-ios-zoom min-w-[10rem] flex-1 bg-transparent py-2 text-[0.875rem] outline-none placeholder:text-muted-foreground/70"
      />
      {/* Dar panoda (telefon) seçenekler yalnız yazarken ya da kutu odaktayken: kart tek satır. */}
      <div className="flex items-center gap-1.5 @max-[40rem]/board:hidden @max-[40rem]/board:group-focus-within/add:flex @max-[40rem]/board:group-data-[filled]/add:flex">
        <DuePicker value={dueKey} onChange={setDueKey} />
        <button
          type="button"
          onClick={() => setImportance((v) => (v === "high" ? "normal" : "high"))}
          aria-pressed={importance === "high"}
          aria-label={importance === "high" ? t("todo.star.off") : t("todo.star.on")}
          title={importance === "high" ? t("todo.star.off") : t("todo.star.on")}
          className={cn(
            "grid size-8 place-items-center rounded-full border outline-none transition focus-visible:ring-2 focus-visible:ring-brand/30 pointer-coarse:size-11",
            importance === "high"
              ? "border-brand/30 bg-brand/[0.08] text-brand"
              : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
          )}
        >
          <HugeiconsIcon
            icon={StarIcon}
            className={cn("size-3.5", importance === "high" && "fill-current")}
            strokeWidth={1.9}
          />
        </button>
        {!fixedList && writable.length > 1 && (
          <select
            aria-label={t("todo.add.list")}
            value={listId ?? ""}
            onChange={(e) => setListId(e.target.value)}
            className="h-8 max-w-[9rem] truncate rounded-full border border-border bg-background px-2.5 text-[0.75rem] text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/30 pointer-coarse:h-11"
          >
            {writable.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={!draft.trim()}
          className="h-8 rounded-full bg-brand-fill-deep px-3.5 text-[0.75rem] font-semibold text-brand-on-brand shadow-sm transition hover:brightness-110 disabled:opacity-40 pointer-coarse:h-11 pointer-coarse:px-4"
        >
          {t("todo.add.submit")}
        </button>
      </div>
    </form>
  )
}
