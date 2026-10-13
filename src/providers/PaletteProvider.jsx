import { createContext, useCallback, useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { DEFAULT_PALETTE, palettes } from "@/data/palettes"
import { isPublicPage } from "@/lib/publicPages"

const STORAGE_KEY = "tyro-palette"

/**
 * The login page always wears Insta, whatever palette the user picked inside
 * the app.
 *
 * It is the one screen that isn't theirs yet — the front door of the product,
 * where the brand has to look the same for everyone, including the person
 * seeing it for the first time. Pinned here, at the single place that writes
 * `data-palette`, rather than in LoginPage: the page's colours come from CSS
 * tokens that dozens of components read (down to the orb's --voiceorb-*), so
 * pinning it component by component would leave pieces behind — and it did,
 * before this: the logo and its gradient were hardcoded literals while the
 * orb still followed whatever the user had chosen.
 *
 * The user's own selection is NOT touched: it stays in state and in
 * localStorage, and comes straight back the moment they leave /login.
 */
const LOGIN_PATH = "/login"
export const LOGIN_PALETTE = "fiesta"

const VALID = new Set(palettes.map((p) => p.id))

export const PaletteContext = createContext(null)

function readInitial() {
  if (typeof window === "undefined") return DEFAULT_PALETTE
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved && VALID.has(saved) ? saved : DEFAULT_PALETTE
}

export function PaletteProvider({ children }) {
  const [palette, setPaletteState] = useState(readInitial)
  const { pathname } = useLocation()
  // Tanıtım sayfaları (Hakkımızda · Ekibimiz) girişin uzantısı: aynı çivili palet.
  const pinned = pathname === LOGIN_PATH || isPublicPage(pathname) ? LOGIN_PALETTE : null

  useEffect(() => {
    document.documentElement.setAttribute("data-palette", pinned ?? palette)
  }, [palette, pinned])

  // Separate effect, and deliberately NOT keyed on `pinned`: persisting the
  // pinned value would turn a visit to the login page into a palette change.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, palette)
  }, [palette])

  const setPalette = useCallback((id) => setPaletteState(VALID.has(id) ? id : DEFAULT_PALETTE), [])

  const value = useMemo(() => ({ palette, setPalette, palettes }), [palette, setPalette])

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
}
