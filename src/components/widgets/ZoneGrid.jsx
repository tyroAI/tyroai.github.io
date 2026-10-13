import { useEffect, useRef, useState } from "react"
import { AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import { AddTile } from "./AddTile"
import { EditableCard } from "./EditableCard"
import { useWidgetEditor } from "./widgetEditorContext"

/** Izgaranın o anki sütun sayısı — kap sorgusu CSS'te, sayı buradan. */
function useColumns(ref, ready) {
  const [cols, setCols] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return undefined
    const read = () =>
      setCols(getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length || 1)
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, ready])
  return cols
}

/**
 * Bir bölgenin ızgarası. Boş alana bırakılan kart bölgenin sonuna geçer.
 * "Widget ekle" kutusu (kataloğu açar): diğerlerde son satırdaki boşlukta (her zaman);
 * ana bölümde düzenlerken sonda; sol sütunda düzenlerken iki yuva dolu değilse.
 */
export function ZoneGrid({ zone, className, render }) {
  const { editing, drag, setDrag, setOver, layout, actions } = useWidgetEditor()
  const items = layout.items.filter((x) => x.zone === zone)
  const grid = useRef(null)
  const cols = useColumns(grid, items.length > 0)
  const cells = items.reduce((n, x) => n + (zone !== "left" && x.wide ? Math.min(2, cols) : 1), 0)
  const holes = items.length ? (cols - (cells % cols)) % cols : cols
  let tile = 0
  if (zone === "more") tile = holes
  else if (editing && zone === "main") tile = 1
  else if (editing && zone === "left" && items.length < 2) tile = 1

  return (
    <div
      ref={grid}
      data-zone={zone}
      onDragOver={(e) => {
        if (drag != null) e.preventDefault()
      }}
      onDrop={(e) => {
        if (drag == null) return
        e.preventDefault()
        actions.dropZone(drag, zone)
        setDrag(null)
        setOver(null)
      }}
      className={cn(className, editing && "pointer-coarse:pt-2")}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((item) => (
          <EditableCard key={item.id} item={item} render={render} />
        ))}
      </AnimatePresence>
      {tile > 0 && (
        <AddTile
          hidden={layout.hidden}
          onOpen={() => actions.openCatalog(zone)}
          style={{ gridColumn: `span ${tile} / span ${tile}` }}
        />
      )}
    </div>
  )
}
