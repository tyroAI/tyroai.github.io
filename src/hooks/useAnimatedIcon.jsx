import { useCallback, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"

/**
 * An icon, and the hover handlers that belong on the CONTROL around it.
 *
 * Takes `{ icon, animatedIcon }`: `icon` is a Hugeicons glyph, `animatedIcon`
 * a component from the hugeicons-animated registry. When both are given the
 * animated one is drawn and `icon` stays as the plain-glyph fallback.
 *
 * The animation is driven by the control, not by the icon's own box. A 20px
 * glyph inside a ~180px nav row sits at its left edge, so hovering the label —
 * most of what people actually hover — would never reach it and the icon would
 * sit still while the row lit up. Handing the icon a ref is what makes the
 * hand-off possible: `useIconAnimation` stops binding its own enter/leave once
 * a ref is attached, so these handlers become the only trigger. It matters
 * less on a 36px header button, but one rule beats two.
 *
 * Callers spread `hoverProps` on the control and place `icon` inside it. With
 * no `animatedIcon`, `hoverProps` is empty and nothing is bound.
 *
 * Hooks cannot run in a loop, so list callers render each row through a
 * component rather than inline in `items.map`.
 */
export function useAnimatedIcon(item) {
  const iconRef = useRef(null)
  const AnimatedIcon = item.animatedIcon

  const onMouseEnter = useCallback(() => {
    iconRef.current?.startAnimation?.()
  }, [])
  const onMouseLeave = useCallback(() => {
    iconRef.current?.stopAnimation?.()
  }, [])

  // The animated components render a plain <div> wrapper, which the sidebar's
  // `[&_svg]:shrink-0` does not reach — without `shrink-0` a long label
  // squeezes it. The inner svg carries no `size-` class, so the sidebar's
  // `[&_svg:not([class*='size-'])]:size-5` still lands it at the same 20px as
  // every other nav glyph.
  const icon = AnimatedIcon ? (
    <AnimatedIcon ref={iconRef} className="shrink-0" aria-hidden="true" />
  ) : item.icon ? (
    <HugeiconsIcon icon={item.icon} />
  ) : null

  return {
    icon,
    hoverProps: AnimatedIcon ? { onMouseEnter, onMouseLeave } : {},
  }
}
