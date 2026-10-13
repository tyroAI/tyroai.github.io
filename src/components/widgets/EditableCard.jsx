import { useState } from "react"
import { motion } from "motion/react"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { DropChoice } from "./DropChoice"
import { CATALOG, looksOf, spanOf } from "./layout"
import { edges, members, shownId } from "./layoutOps"
import { StackNav } from "./StackNav"
import { useWidgetEditor } from "./widgetEditorContext"
import { WidgetToolbar } from "./WidgetToolbar"
import "./widgetLooks.css"

/**
 * Kart kabuğu — bir YUVA: tek widget ya da yığın (biri görünür, ‹ › ile geçilir,
 * görünen düzende saklanır). Dış kutu yer animasyonu (motion); HTML5 sürükleme
 * içteki kutuda (motion `onDragStart`ı kendi jestine ayırıyor). Düzenlerken
 * kartın içi tıklanmaz; yığının okları ve bırakma sorusu üstte, tıklanır.
 */
export function EditableCard({ item, render }) {
  const { t } = useLocale()
  const { editing, drag, over, setDrag, setOver, choice, layout, actions } = useWidgetEditor()
  const [dir, setDir] = useState(1)
  const list = members(item)
  const at = list.indexOf(shownId(item))
  const shown = list[at]
  const look = layout.lookOf(shown)
  const name = (id) => t(CATALOG[id].title)
  const zone = item.zone
  const zones = layout.zones
  const z = zones.indexOf(zone)
  const inZone = layout.items.filter((x) => x.zone === zone)
  const zi = inZone.findIndex((x) => x.id === item.id)
  const { first, last } = edges(layout.items, item.id, zones)
  const target = over === item.id && drag != null && drag !== item.id
  const end = () => {
    setDrag(null)
    setOver(null)
  }

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      data-widget-slot={item.id}
      data-tour={layout.tour?.[shown]}
      className={cn("min-w-0", spanOf(zone, item.wide))}
    >
      <div
        draggable={editing || undefined}
        onDragStart={(e) => {
          setDrag(item.id)
          e.dataTransfer.effectAllowed = "move"
        }}
        onDragOver={(e) => {
          if (drag == null || drag === item.id) return
          e.preventDefault()
          e.stopPropagation()
          setOver(item.id)
        }}
        onDragLeave={() => setOver((o) => (o === item.id ? null : o))}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (drag != null) actions.drop(drag, item.id)
          end()
        }}
        onDragEnd={end}
        className={cn(
          "group/stack relative h-full",
          editing && "cursor-grab active:cursor-grabbing",
          drag === item.id && "opacity-40",
        )}
      >
        <div
          className={cn("h-full", editing && "pointer-events-none select-none")}
          inert={editing || undefined}
        >
          {/* Yığında geçiş: yeni widget geldiği yönden kısa bir kaymayla girer. */}
          <motion.div
            key={shown}
            initial={list.length > 1 ? { opacity: 0, x: dir * 24 } : false}
            animate={{ opacity: 1, x: 0 }}
            data-widget-look={look}
            className="h-full"
          >
            {render(shown, "h-full")}
          </motion.div>
        </div>
        {list.length > 1 && (
          <StackNav
            names={list.map(name)}
            at={at}
            onGo={(i, d) => {
              setDir(d)
              actions.show(item.id, i)
            }}
          />
        )}
        {editing && (
          <div
            className={cn(
              "absolute inset-0 rounded-[1.75rem] outline-2 -outline-offset-2 outline-dashed transition",
              target ? "bg-brand/[0.06] outline-brand" : "outline-brand/35",
            )}
          >
            <WidgetToolbar
              name={name(shown)}
              wide={item.wide}
              first={first}
              last={last}
              crossBack={zi === 0 && z > 0 ? t(`widgets.zoneTo.${zones[z - 1]}`) : null}
              crossForward={
                zi === inZone.length - 1 && z < zones.length - 1
                  ? t(`widgets.zoneTo.${zones[z + 1]}`)
                  : null
              }
              canResize={zone !== "left"}
              canStack={zone !== "more" && zi > 0}
              canUnstack={list.length > 1}
              looks={looksOf(shown)}
              look={look}
              onLook={(value) => actions.look(shown, value)}
              onMove={(step) => actions.step(item.id, step)}
              onResize={() => actions.resize(item.id)}
              onStack={() => actions.stack(item.id)}
              onUnstack={() => actions.unstack(item.id)}
              onRemove={() => actions.remove(item.id)}
            />
          </div>
        )}
        {choice?.to === item.id && (
          <DropChoice
            name={name(shownId(layout.items.find((x) => x.id === choice.from) ?? item))}
            onChoose={actions.choose}
          />
        )}
      </div>
    </motion.div>
  )
}
