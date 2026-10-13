/** Self Servis'in hap düğmeleri (durum süzgeci, etkin süzgeçler) — tek giysi. */
export const CHIP =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[0.75rem] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:h-11"
export const CHIP_ON = "border-transparent bg-foreground text-background"
export const CHIP_OFF = "border-border bg-card text-foreground/80 hover:bg-accent"

/**
 * Çerçevesiz araç düğmesi (Yenile, Dışa aktar, Rapor): çubukta sessiz durur, üzerine gelince
 * belirir. Yalnız ikonluysa `ICON` ile kare (dokunmatikte 44 px).
 */
export const GHOST =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-[0.75rem] font-semibold text-foreground/75 transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50 pointer-coarse:h-11 [&_svg]:size-4"
export const ICON = "min-w-8 px-0 pointer-coarse:min-w-11"
