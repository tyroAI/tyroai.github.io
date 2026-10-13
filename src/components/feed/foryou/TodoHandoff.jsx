import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import Loading03Icon from "@hugeicons/core-free-icons/Loading03Icon"
import TaskAdd01Icon from "@hugeicons/core-free-icons/TaskAdd01Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * "TO-DO'YA EKLE" HAPI — boşta · ekleniyor · eklendi (bağlantı) · bağlan.
 *
 * ⚠️ **HER ZAMAN GÖRÜNÜR** (eskiden yalnız üstüne gelince): dokunmatikte
 * hover yok ve gizli bir teklif keşfedilmiyor. Dar kapsayıcıda kısa ad
 * ("To-Do"), 40rem'den geniş kapsayıcıda tam ad ("To-Do'ya ekle"); görünen
 * ad düğmenin adının İÇİNDE (WCAG 2.5.3).
 * ⚠️ **"TO-DO'DA GÖR" O LİSTEYİ AÇAR** (`?view=list%3A…`): kimlikte `+` ve `/`
 * olabiliyor, `URLSearchParams` kodluyor; çıplak `list:${id}` yazmak `+`yı
 * boşluğa çevirip yanlış listeye götürürdü.
 * ⚠️ Odak düğmedeyken eklendiyse odak bağlantıya geçer (düğme yok oldu).
 * ⚠️ Ekleniyor hâli `aria-disabled`, `disabled` DEĞİL (odak kaybolmasın).
 */
const PILL =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[0.71875rem] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand/30 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:px-3.5"

export function TodoHandoff({ item, entry, todoOpen, onAdd, onConnect }) {
  const { t } = useLocale()
  const state = entry?.state ?? "idle"
  const subject = item.subject || t("feed.noSubject")
  const target = useRef(null)
  const hadFocus = useRef(false)

  useEffect(() => {
    if (!hadFocus.current || state === "idle" || state === "busy") return
    hadFocus.current = false
    target.current?.focus()
  }, [state])

  // Odak GERÇEKTEN düğmedeyse (klavye, ya da odaklayan tarayıcıda tık) bağlantıya taşınır.
  const remember = (e) => {
    hadFocus.current = document.activeElement === e.currentTarget
  }

  if (state === "done") {
    const content = (
      <>
        <HugeiconsIcon icon={Tick02Icon} className="size-3.5" strokeWidth={2.2} />
        {todoOpen ? t("feed.important.toTodoOpen") : t("feed.important.toTodoDone")}
      </>
    )
    const cls = cn(
      PILL,
      "bg-emerald-500/10 px-3 text-emerald-700 dark:text-emerald-400 motion-safe:animate-in motion-safe:zoom-in-95",
    )
    if (!todoOpen) {
      return (
        <span ref={target} tabIndex={-1} className={cn(cls, "outline-none")}>
          {content}
        </span>
      )
    }
    const href = entry.listId
      ? `/todo?${new URLSearchParams({ view: `list:${entry.listId}` })}`
      : "/todo"
    return (
      <Link
        ref={target}
        to={href}
        aria-label={t("feed.important.todo.openAria", { subject })}
        className={cn(cls, "hover:bg-emerald-500/15")}
      >
        {content}
      </Link>
    )
  }

  if (state === "connect") {
    return (
      <button
        ref={target}
        type="button"
        onClick={(e) => {
          remember(e)
          onConnect(item)
        }}
        className={cn(
          PILL,
          "border border-amber-500/30 bg-amber-500/[0.06] text-foreground hover:bg-amber-500/10",
        )}
      >
        <HugeiconsIcon
          icon={Alert02Icon}
          className="size-3.5 text-amber-600 dark:text-amber-400"
          strokeWidth={2}
        />
        {t("todo.connect")}
      </button>
    )
  }

  const busy = state === "busy"
  return (
    <button
      type="button"
      onClick={(e) => {
        if (busy) return
        remember(e)
        onAdd(item)
      }}
      aria-label={t("feed.important.todo.addAria", { subject })}
      aria-busy={busy || undefined}
      aria-disabled={busy || undefined}
      className={cn(
        PILL,
        "border border-border bg-card text-muted-foreground hover:border-brand/30 hover:bg-brand/[0.06] hover:text-foreground group-hover/imp:border-brand/25 group-hover/pin:border-brand/25",
        busy && "cursor-progress",
      )}
    >
      <HugeiconsIcon
        icon={busy ? Loading03Icon : TaskAdd01Icon}
        className={cn("size-3.5", busy && "animate-spin motion-reduce:animate-none")}
        strokeWidth={1.9}
      />
      {busy ? (
        <span>{t("feed.important.todo.busy")}</span>
      ) : (
        <>
          <span className="@[40rem]/foryou:hidden">{t("nav.todo")}</span>
          <span className="hidden @[40rem]/foryou:inline">{t("feed.important.toTodo")}</span>
        </>
      )}
    </button>
  )
}
