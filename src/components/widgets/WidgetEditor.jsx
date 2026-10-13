import { useEffect, useRef, useState } from "react"
import { MotionConfig } from "motion/react"
import { useLocale } from "@/hooks/useLocale"
import { focusBoardEditEntry, setBoardEditing, useBoardEditing } from "@/lib/boardEdit"
import { notify } from "@/lib/notify"
import { CATALOG } from "./layout"
import { members, shownId, step as stepOp } from "./layoutOps"
import { WidgetCatalog } from "./WidgetCatalog"
import { WidgetEditorContext } from "./widgetEditorContext"

const UNDO_MS = 8000

/** Kartın şeridine odak (`ctl` verilmişse o düğmeye); kart yoksa header'daki düğmeye. */
function focusSlot(next) {
  const scope = next.zone ? `[data-zone="${next.zone}"] ` : ""
  const el = next.id ? document.querySelector(`${scope}[data-widget-slot="${next.id}"]`) : null
  const target =
    (next.ctl && el?.querySelector(`[data-ctl="${next.ctl}"]`)) ||
    el?.querySelector('[role="toolbar"] [tabindex="0"]')
  el?.scrollIntoView({ block: "nearest" })
  if (target) target.focus({ preventScroll: true })
  else focusBoardEditEntry()
}
const EASE = { duration: 0.28, ease: [0.2, 0, 0, 1] }

/**
 * Pano'nun düzenleme akışı — kip header'daki "Panoyu düzenle"den açılır
 * (`lib/boardEdit`), düğmeleri sayfanın altındaki yüzen çubukta. Kurallar:
 * - Üç bölge (sol sütun · ana bölüm · diğer); oklar bölge içinde komşuyla yer
 *   değiştirir, uçta kartı komşu bölgeye geçirir.
 * - Ana bölümde (sol sütun dahil) bir kartın üstüne bırakmak SORAR: üst üste
 *   koy (yığın) ya da yerine taşı. "Diğer"de bırakmak doğrudan taşır.
 * - "Widget ekle" kataloğu açar (`WidgetCatalog`): canlı önizlemeler, çoklu seçim;
 *   seçilenler tek kayıtta eklenir, odak ilk eklenen kartın şeridine gider.
 * - Pano'ya göre bölgeler `layout.zones` (Anasayfa'da "diğer" yok).
 * - Erişilebilirlik: her değişiklik canlı bölgeden duyurulur; kaldırma ve
 *   varsayılana dönüş "Geri al"la; Esc ve Bitti düzenlemeden çıkar, odak
 *   header'daki düğmeye döner; taşınan kartın şeridi odağı alır (kart bölge
 *   değiştirince yeniden kuruluyor — yeni bölgesinde aranır).
 */
export function WidgetEditor({ layout, render, children }) {
  const { t } = useLocale()
  const editing = useBoardEditing()
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const [choice, setChoice] = useState(null)
  const [notice, setNotice] = useState("")
  // Katalog açıkken eklenecek bölge (kapalıyken `null`).
  const [catalogZone, setCatalogZone] = useState(null)
  const focusNext = useRef(null)
  // Katalogdan eklenenin odağı pencere KAPANINCA verilir: açıkken odak kilidi geri çekerdi.
  const afterCatalog = useRef(null)
  const { items } = layout
  const name = (id) => t(CATALOG[id].title)
  const slot = (id) => items.find((x) => x.id === id)
  const zoneTo = (zone) => t(`widgets.zoneTo.${zone}`)

  useEffect(() => () => setBoardEditing(false), [])
  useEffect(() => {
    // Kip header'dan da açılıp kapanıyor (dış durum); duyuru bir kare sonra.
    const id = requestAnimationFrame(() => setNotice(editing ? t("widgets.say.editOn") : ""))
    return () => cancelAnimationFrame(id)
  }, [editing, t])

  useEffect(() => {
    if (!editing) return undefined
    function onKey(e) {
      // Açık açılır pencere ya da bırakma sorusu Esc'i kendisi tüketir.
      if (e.key !== "Escape" || e.defaultPrevented) return
      setBoardEditing(false)
      focusBoardEditEntry()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [editing])

  useEffect(() => {
    const next = focusNext.current
    if (!next) return
    focusNext.current = null
    focusSlot(next)
  }, [items])

  function undoToast(message, prev) {
    notify.info(message, {
      duration: UNDO_MS,
      action: {
        label: t("widgets.undo"),
        onClick: () => {
          layout.restore(prev)
          setNotice(t("widgets.say.restored"))
        },
      },
    })
  }

  function announceMove(id, list) {
    const it = list.find((x) => x.id === id)
    const inZone = list.filter((x) => x.zone === it.zone)
    const pos = inZone.findIndex((x) => x.id === id) + 1
    setNotice(t("widgets.say.moved", { name: name(shownId(it)), pos, total: inZone.length }))
  }

  function choose(kind) {
    const c = choice
    setChoice(null)
    if (!c || !kind) return
    const target = slot(c.to)
    if (kind === "stack") {
      layout.stackOnto(c.from, c.to)
      setNotice(t("widgets.say.stacked", { name: name(c.from), target: name(shownId(target)) }))
      focusNext.current = { id: c.to, zone: target.zone }
    } else {
      layout.moveTo(c.from, c.to)
      setNotice(t("widgets.say.toZone", { name: name(c.from), zone: zoneTo(target.zone) }))
      focusNext.current = { id: c.from, zone: target.zone }
    }
  }

  const actions = {
    step(id, dir) {
      const before = slot(id)
      if (!before) return
      const after = stepOp(items, id, dir, layout.zones)
      const moved = after.find((x) => x.id === id)
      layout.step(id, dir)
      focusNext.current = { id, ctl: dir < 0 ? "back" : "forward", zone: moved.zone }
      if (moved.zone !== before.zone)
        setNotice(
          t("widgets.say.toZone", { name: name(shownId(before)), zone: zoneTo(moved.zone) }),
        )
      else announceMove(id, after)
    },
    /** Ana bölümde kartın üstüne bırakma sorar; "diğer"de doğrudan taşır. */
    drop(fromId, toId) {
      const target = slot(toId)
      if (!target || fromId === toId) return
      if (target.zone !== "more") return setChoice({ from: fromId, to: toId })
      layout.moveTo(fromId, toId)
      setNotice(t("widgets.say.toZone", { name: name(fromId), zone: zoneTo(target.zone) }))
    },
    choose,
    /** Bölgenin boş alanına bırakma: o bölgenin sonuna. */
    dropZone(id, zone) {
      layout.appendTo(id, zone)
      setNotice(t("widgets.say.toZone", { name: name(id), zone: zoneTo(zone) }))
      focusNext.current = { id, zone }
    },
    /** Klavye: öncekinin üstüne koy (aynı bölgede). */
    stack(id) {
      const it = slot(id)
      const inZone = items.filter((x) => x.zone === it?.zone)
      const prev = inZone[inZone.findIndex((x) => x.id === id) - 1]
      if (!prev) return
      layout.stackOnto(id, prev.id)
      setNotice(t("widgets.say.stacked", { name: name(id), target: name(shownId(prev)) }))
      focusNext.current = { id: prev.id, ctl: "unstack" }
    },
    unstack(id) {
      const it = slot(id)
      if (!it) return
      const memberId = shownId(it)
      layout.unstack(id, memberId)
      setNotice(t("widgets.say.unstacked", { name: name(memberId) }))
      focusNext.current = { id: memberId }
    },
    show(id, at) {
      const it = slot(id)
      if (!it) return
      layout.show(id, at)
      const list = members(it)
      setNotice(t("widgets.say.showing", { name: name(list[at]), pos: at + 1, total: list.length }))
    },
    look(id, value) {
      layout.setLook(id, value)
      setNotice(t("widgets.say.look", { name: name(id), look: t(`widgets.look.${value}`) }))
    },
    resize(id) {
      const wide = !slot(id)?.wide
      layout.resize(id)
      setNotice(t(wide ? "widgets.say.wide" : "widgets.say.narrow", { name: name(id) }))
    },
    remove(id) {
      const it = slot(id)
      if (!it) return
      const memberId = shownId(it)
      const i = items.findIndex((x) => x.id === id)
      const prev = layout.remove(id, memberId)
      const stays = members(it).length > 1
      const rest = items.filter((x) => x.id !== id)
      focusNext.current = stays
        ? { id: members(it).find((x) => x !== memberId) }
        : { id: rest[Math.min(i, rest.length - 1)]?.id ?? null }
      undoToast(t("widgets.say.removed", { name: name(memberId) }), prev)
    },
    openCatalog(zone = layout.addZone) {
      setCatalogZone(zone)
    },
    /** Katalogdan: seçilenler tek kayıtta; odak (pencere kapanınca) ilk eklenenin şeridine. */
    addMany(ids, zone = layout.addZone) {
      if (!ids.length) return
      layout.addMany(ids, zone)
      setNotice(
        ids.length === 1
          ? t("widgets.say.added", { name: name(ids[0]) })
          : t("widgets.say.addedMany", { n: ids.length }),
      )
      // Katalogda bölgesi olan (Karşılama → sol sütun) oraya gider; odak orada aranır.
      afterCatalog.current = { id: ids[0], zone: CATALOG[ids[0]]?.zone ?? zone }
    },
    reset() {
      if (layout.isDefault) return
      const prev = layout.reset()
      undoToast(t("widgets.say.reset"), prev)
    },
    done() {
      setBoardEditing(false)
      focusBoardEditEntry()
    },
  }

  const value = { editing, drag, setDrag, over, setOver, choice, layout, actions }
  return (
    <WidgetEditorContext.Provider value={value}>
      <MotionConfig reducedMotion="user" transition={EASE}>
        {children}
      </MotionConfig>
      <WidgetCatalog
        open={catalogZone != null}
        onOpenChange={(open) => !open && setCatalogZone(null)}
        ids={layout.hidden}
        render={render}
        onAdd={(ids) => {
          actions.addMany(ids, catalogZone ?? undefined)
          setCatalogZone(null)
        }}
        onClosed={(e) => {
          const next = afterCatalog.current
          if (!next) return
          e.preventDefault()
          afterCatalog.current = null
          focusSlot(next)
        }}
      />
      <p role="status" aria-live="polite" data-widget-live className="sr-only">
        {notice}
      </p>
    </WidgetEditorContext.Provider>
  )
}
