import { createContext, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { isPublicPage } from "@/lib/publicPages"

const STORAGE_KEY = "tyro-theme"
const VALID = ["light", "dark"]
// Varsayılan AÇIK: işletim sisteminin koyu tercihi izlenmez — kişi seçene dek
// giriş de uygulama da açık. Tek istisna tanıtım sayfaları (aşağıda).
const DEFAULT_THEME = "light"
/**
 * Tanıtım sayfaları (Hakkımızda · Ekibimiz) KENDİ temalarıyla açılır: dışarıdan
 * her girişte koyu. Düğme yalnız bu iki sayfanın temasını değiştirir ve ikisi
 * arasında geçerken korunur; kişinin kayıtlı tercihine dokunmaz, girişe
 * dönünce kayıtlı tema geri gelir.
 */
const PUBLIC_DEFAULT = "dark"

export const ThemeContext = createContext(null)

function readInitial() {
  if (typeof window === "undefined") return DEFAULT_THEME
  // Eski "system" kaydı da varsayılana (açık) düşer: seçenek kalktı.
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return VALID.includes(saved) ? saved : DEFAULT_THEME
}

export function ThemeProvider({ children }) {
  // `preference`: kişinin kayıtlı seçimi; tanıtım sayfalarında gösterilen tema ondan ayrı.
  const [preference, setPreference] = useState(readInitial)
  const theme = preference
  const { pathname } = useLocation()
  const onPublic = isPublicPage(pathname)
  const [publicTheme, setPublicTheme] = useState(PUBLIC_DEFAULT)
  // Dışarıdan her girişte varsayılana dön (render sırasında, önceki değere
  // bakarak — efekt bir kare eski temayla çizerdi).
  const [wasOnPublic, setWasOnPublic] = useState(onPublic)
  if (onPublic !== wasOnPublic) {
    setWasOnPublic(onPublic)
    if (onPublic) setPublicTheme(PUBLIC_DEFAULT)
  }
  const effective = onPublic ? publicTheme : theme

  // Boyamadan ÖNCE: sayfa açık temayla bir kare görünüp koyuya geçmesin.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", effective === "dark")
  }, [effective])
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, preference)
  }, [preference])

  // useCallback so the context value's setTheme / toggle references stay
  // stable. Without these, the useMemo below would still produce a new
  // object every render (since setTheme/toggle would be fresh closures),
  // defeating the memoization for every consumer.
  const setTheme = useCallback(
    (next) => {
      const value = VALID.includes(next) ? next : DEFAULT_THEME
      if (onPublic) setPublicTheme(value)
      else setPreference(value)
    },
    [onPublic],
  )
  const toggle = useCallback(() => {
    const flip = (t) => (t === "dark" ? "light" : "dark")
    if (onPublic) setPublicTheme(flip)
    else setPreference(flip(theme))
  }, [onPublic, theme])

  // Memoize the context value object so the only reason consumers re-render
  // is an actual theme change, not a parent re-render of <ThemeProvider>.
  const shownPreference = onPublic ? publicTheme : preference
  const value = useMemo(
    () => ({ theme: effective, preference: shownPreference, setTheme, toggle }),
    [effective, shownPreference, setTheme, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
