import { useSyncExternalStore } from "react"

/**
 * Pano'nun düzenleme kipi — header'daki "Panoyu düzenle" düğmesi ile sayfanın
 * kendisi (kartlar, alt çubuk) AYNI durumu okur. Sayfa sökülünce kip kapanır.
 */
let editing = false
const subs = new Set()

export function setBoardEditing(next) {
  const value = typeof next === "function" ? next(editing) : Boolean(next)
  if (value === editing) return
  editing = value
  for (const fn of subs) fn()
}

function subscribe(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

export const useBoardEditing = () =>
  useSyncExternalStore(
    subscribe,
    () => editing,
    () => false,
  )

/** Düzenlemeden çıkınca odağın döneceği yer: header'daki "Panoyu düzenle" düğmesi. */
export const focusBoardEditEntry = () => document.querySelector("[data-board-edit-toggle]")?.focus()
