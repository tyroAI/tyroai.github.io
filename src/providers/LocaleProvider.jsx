import { createContext, useCallback, useEffect, useMemo, useState } from "react"
import {
  LOCALE_STORAGE_KEY as STORAGE_KEY,
  dictionaryFor,
  loadDictionary,
  savedLocale,
} from "@/lib/i18nDictionaries"

// Locales available in the picker. Order = display order in UI. toggle()
// cycles through this list in order — most callsites should call
// setLocale(id) through a dropdown so the user picks their actual language.
export const LOCALES = ["tr", "en", "ru", "ar"]
// Layout stays LTR for every locale (sidebar on the left, header tools on
// the right). Arabic text reads naturally right-to-left INSIDE its own
// containers via the browser's bidi algorithm — no `dir="rtl"` needed
// globally. Per user request: "arapçada sidebar filan yeri değiştirme
// sadece yazıları değiştir çeviri yap".
const DEFAULT = "tr"

export const LocaleContext = createContext(null)

function readInitial() {
  if (typeof window === "undefined") return DEFAULT
  const saved = savedLocale()
  return LOCALES.includes(saved) ? saved : DEFAULT
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(readInitial)
  // Sözlük henüz inmediyse (main.jsx beklemeden çizildiyse) Türkçe görünür, inince yenilenir.
  const [loadedTick, setLoadedTick] = useState(0)

  useEffect(() => {
    if (dictionaryFor(locale)) return undefined
    let alive = true
    loadDictionary(locale)
      .then(() => alive && setLoadedTick((n) => n + 1))
      .catch(() => alive && setLocaleState(DEFAULT))
    return () => {
      alive = false
    }
  }, [locale])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      /* depolama kapalı: tercih yalnız bu oturumda */
    }
    document.documentElement.setAttribute("lang", locale)
    // dir always ltr — chrome layout (sidebar, header) stays in place across
    // all locales; Arabic text bidi-renders naturally inside its containers.
    document.documentElement.setAttribute("dir", "ltr")
  }, [locale])

  /**
   * t(key, fallbackOrVars?, vars?)
   *
   * Falls through to ENGLISH before giving up, so a key that only exists in
   * en/tr renders readable text under ru/ar instead of the raw key string
   * (the header's mail/files/calendar panels add ~110 keys and the ru/ar
   * files trail behind on a few of them).
   *
   * `vars` interpolates {name} placeholders. Doing it here keeps
   * `.replace()` chains out of the call sites — and out of the way of user
   * data: String.replace expands $-patterns in its replacement, so a mail
   * subject like "Butce $$4M" reached the assistant mangled when a call site
   * built the sentence by hand.
   */
  const t = useCallback(
    (key, fallbackOrVars, maybeVars) => {
      const varsGiven = typeof fallbackOrVars === "object" && fallbackOrVars !== null
      const fallback = varsGiven ? undefined : fallbackOrVars
      const vars = varsGiven ? fallbackOrVars : maybeVars

      const dict = dictionaryFor(locale) ?? dictionaryFor(DEFAULT)
      const value =
        dict[key] ?? dictionaryFor("en")?.[key] ?? dictionaryFor(DEFAULT)[key] ?? fallback ?? key
      if (!vars) return value
      return String(value).replace(/\{(\w+)\}/g, (m, name) =>
        vars[name] != null ? String(vars[name]) : m,
      )
    },
    // `loadedTick`: sözlük inince `t` değişir, metinler yenilenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, loadedTick],
  )

  // Yeni dil sözlüğü inince geçer: inene kadar arayüz eski dilde kalır (yarım çeviri
  // görünmez). Ağ yoksa geçiş olmaz.
  const setLocale = useCallback((next) => {
    const target = LOCALES.includes(next) ? next : DEFAULT
    loadDictionary(target)
      .then(() => setLocaleState(target))
      .catch(() => {})
  }, [])

  // LOCALES sırasıyla döner (tek dokunuşlu header düğmesi kalıbı).
  const toggle = useCallback(
    () => setLocale(LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length]),
    [locale, setLocale],
  )

  const value = useMemo(() => ({ locale, setLocale, toggle, t }), [locale, setLocale, toggle, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
