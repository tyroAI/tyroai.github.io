import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import ArrowUp01Icon from "@hugeicons/core-free-icons/ArrowUp01Icon"
import ArrowExpand01Icon from "@hugeicons/core-free-icons/ArrowExpand01Icon"
import ArrowShrink01Icon from "@hugeicons/core-free-icons/ArrowShrink01Icon"
import BlurIcon from "@hugeicons/core-free-icons/BlurIcon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import DragDropIcon from "@hugeicons/core-free-icons/DragDropIcon"
import LayerAddIcon from "@hugeicons/core-free-icons/LayerAddIcon"
import Unlink03Icon from "@hugeicons/core-free-icons/Unlink03Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { LookMenu } from "./LookMenu"

// Dokunmatikte 44px (HIG/WCAG 2.5.5); fare için 28px yeter (WCAG 2.5.8 ≥ 24).
const CTL =
  "grid size-7 place-items-center rounded-full text-foreground/70 transition pointer-coarse:size-11 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 aria-disabled:cursor-default aria-disabled:opacity-30 aria-disabled:hover:bg-transparent"
const ICON = "size-4 pointer-coarse:size-5"

// Sıra okları tek sütunda yukarı/aşağı, çok sütunda sola/sağa döner.
const backIcon = (
  <>
    <HugeiconsIcon
      icon={ArrowUp01Icon}
      className={cn(ICON, "@[34rem]/myspace:hidden")}
      strokeWidth={2}
    />
    <HugeiconsIcon
      icon={ArrowLeft01Icon}
      className={cn(ICON, "hidden @[34rem]/myspace:block")}
      strokeWidth={2}
    />
  </>
)
const forwardIcon = (
  <>
    <HugeiconsIcon
      icon={ArrowDown01Icon}
      className={cn(ICON, "@[34rem]/myspace:hidden")}
      strokeWidth={2}
    />
    <HugeiconsIcon
      icon={ArrowRight01Icon}
      className={cn(ICON, "hidden @[34rem]/myspace:block")}
      strokeWidth={2}
    />
  </>
)

/**
 * Kart başına düzen şeridi — WAI-ARIA toolbar kalıbı: tek sekme durağı, içinde
 * oklarla gezinme (Home/End). Kenardaki düğme `disabled` değil `aria-disabled`:
 * kart başa gelince odak düğmede kalır, sayfanın başına düşmez. Tek sütunda
 * sıra yukarı/aşağıdır, oklar da öyle döner. Bölgenin ucunda ok kartı komşu
 * bölgeye geçirir (`crossBack` · `crossForward`: o bölgenin adı, düğmenin adı
 * "… ana bölüme taşı"). Sol sütunda genişlik yok (sütunun genişliği sabit);
 * ana bölümde "öncekinin üstüne koy" (yığın) ve yığında "yığından ayır".
 * "Görünüm" (`looks` birden çoksa): standart · cam … menüsü (`LookMenu`).
 * Düğmeler `data-ctl` taşır: kart yeniden kurulunca odak aynı düğmeye döner.
 * (Belge yönü dört dilde de ltr.)
 */
export function WidgetToolbar({
  name,
  wide,
  first,
  last,
  crossBack = null,
  crossForward = null,
  canResize = true,
  canStack = false,
  canUnstack = false,
  looks = [],
  look,
  onLook,
  onMove,
  onResize,
  onStack,
  onUnstack,
  onRemove,
}) {
  const { t } = useLocale()
  const [active, setActive] = useState(0)
  const refs = useRef([])
  const controls = [
    {
      ctl: "back",
      label: crossBack
        ? t("widgets.ctl.toZone", { name, zone: crossBack })
        : t("widgets.ctl.moveBack", { name }),
      off: first,
      run: () => onMove(-1),
      icon: backIcon,
    },
    {
      ctl: "forward",
      label: crossForward
        ? t("widgets.ctl.toZone", { name, zone: crossForward })
        : t("widgets.ctl.moveForward", { name }),
      off: last,
      run: () => onMove(1),
      icon: forwardIcon,
    },
    canResize && {
      ctl: "resize",
      label: t(wide ? "widgets.ctl.narrow" : "widgets.ctl.wide", { name }),
      run: onResize,
      // Tek sütunda genişlik bir şey değiştirmez: düğme orada hiç çıkmaz.
      className: "hidden @[34rem]/myspace:grid",
      icon: (
        <HugeiconsIcon
          icon={wide ? ArrowShrink01Icon : ArrowExpand01Icon}
          className={ICON}
          strokeWidth={1.9}
        />
      ),
    },
    canStack && {
      ctl: "stack",
      label: t("widgets.ctl.stack", { name }),
      run: onStack,
      icon: <HugeiconsIcon icon={LayerAddIcon} className={ICON} strokeWidth={1.8} />,
    },
    canUnstack && {
      ctl: "unstack",
      label: t("widgets.ctl.unstack", { name }),
      run: onUnstack,
      icon: <HugeiconsIcon icon={Unlink03Icon} className={ICON} strokeWidth={1.8} />,
    },
    looks.length > 1 && {
      ctl: "look",
      menu: true,
      icon: <HugeiconsIcon icon={BlurIcon} className={ICON} strokeWidth={1.8} />,
    },
    {
      ctl: "remove",
      label: t("widgets.ctl.remove", { name }),
      run: onRemove,
      danger: true,
      icon: <HugeiconsIcon icon={Cancel01Icon} className={ICON} strokeWidth={2} />,
    },
  ].filter(Boolean)

  function onKeyDown(e) {
    // Açık görünüm menüsünün tuşları portaldan buraya da kabarır: yalnız şeridinkiler.
    if (!e.currentTarget.contains(e.target)) return
    // Gizli düğme (tek sütunda genişlik) atlanır.
    const shown = controls.map((_, i) => i).filter((i) => refs.current[i]?.offsetParent)
    const at = Math.max(0, shown.indexOf(active))
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    let next = null
    if (step) next = shown[(at + step + shown.length) % shown.length]
    if (e.key === "Home") next = shown[0]
    if (e.key === "End") next = shown[shown.length - 1]
    if (next == null) return
    e.preventDefault()
    setActive(next)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="toolbar"
      aria-label={t("widgets.ctl.toolbar", { name })}
      onKeyDown={onKeyDown}
      className="absolute top-0 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-full bg-background p-0.5 shadow-md ring-1 ring-border"
    >
      {/* Sürükleme yalnız fareyle; dokunmatikte oklar yeter, tutamak yanıltmasın. */}
      <span
        aria-hidden="true"
        title={t("widgets.ctl.drag")}
        className={cn(CTL, "cursor-grab pointer-coarse:hidden")}
      >
        <HugeiconsIcon icon={DragDropIcon} className="size-4" strokeWidth={1.8} />
      </span>
      {controls.map((c, i) =>
        c.menu ? (
          <LookMenu
            key={c.ctl}
            ref={(el) => (refs.current[i] = el)}
            data-ctl={c.ctl}
            tabIndex={i === active ? 0 : -1}
            onFocus={() => setActive(i)}
            name={name}
            looks={looks}
            look={look}
            onLook={onLook}
            className={CTL}
          >
            {c.icon}
          </LookMenu>
        ) : (
          <button
            key={c.ctl}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            data-ctl={c.ctl}
            tabIndex={i === active ? 0 : -1}
            aria-disabled={c.off || undefined}
            aria-label={c.label}
            title={c.label}
            onFocus={() => setActive(i)}
            onClick={() => !c.off && c.run()}
            className={cn(CTL, c.className, c.danger && "hover:bg-red-500/10 hover:text-red-600")}
          >
            {c.icon}
          </button>
        ),
      )}
    </div>
  )
}
