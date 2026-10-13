const KEYS = new Set(["ArrowDown", "ArrowUp", "Home", "End"])

/**
 * Kişi satırları arasında klavye: ↑/↓ bir önceki/sonraki, Home/End ilk/son `[data-team-row]`
 * düğmesi (aynı kap içinde). Sekme tuşu sırası değişmez; oklar yalnız kısayol.
 */
export function rowNav(event) {
  if (!KEYS.has(event.key)) return
  const items = [...event.currentTarget.querySelectorAll("[data-team-row]")]
  const i = items.indexOf(document.activeElement)
  if (i < 0) return
  event.preventDefault()
  const last = items.length - 1
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? last
        : Math.min(last, Math.max(0, i + (event.key === "ArrowDown" ? 1 : -1)))
  items[next]?.focus()
}
