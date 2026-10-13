import { useLayoutEffect } from "react"

/**
 * Kayan kabın kenar solması: devamı olan yanda `--fade-start` / `--fade-end` (px) CSS
 * değişkenlerini kurar; kap bunlarla `mask-image` çizer (bkz. `SegmentedControl`, Self
 * Servis'in sağ kolonu). Durum React'te değil, DOM'da: kaydırırken yeniden çizim yok.
 * Kabın ve doğrudan çocuklarının boyu değişince (sekme, içerik) yeniden ölçer.
 *
 * @param {import("react").RefObject<HTMLElement>} ref
 * @param {"x"|"y"} [axis]
 * @param {number} [size] solma boyu (px)
 */
export function useScrollFade(ref, axis = "x", size = 20) {
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const edges = () => {
      const pos = Math.abs(axis === "x" ? node.scrollLeft : node.scrollTop)
      const room =
        axis === "x" ? node.scrollWidth - node.clientWidth : node.scrollHeight - node.clientHeight
      node.style.setProperty("--fade-start", pos > 1 ? `${size}px` : "0px")
      node.style.setProperty("--fade-end", room - pos > 1 ? `${size}px` : "0px")
    }
    edges()
    node.addEventListener("scroll", edges, { passive: true })
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(edges)
    observer?.observe(node)
    for (const child of node.children) observer?.observe(child)
    return () => {
      node.removeEventListener("scroll", edges)
      observer?.disconnect()
    }
  }, [ref, axis, size])
}
