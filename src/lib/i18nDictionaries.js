import { strings as tr } from "@/data/strings.tr"

/**
 * Dil sözlükleri. Türkçe (varsayılan ve yedek) pakette; öteki diller yalnız seçilince iner —
 * dördü birlikte ilk yükün ~120 KB gz'siydi. `main.jsx` kayıtlı dilin sözlüğünü ilk çizimden
 * önce yükler (arayüz Türkçe yanıp sönmesin); dil değişince sözlük inene kadar eski dil kalır.
 */
export const LOCALE_STORAGE_KEY = "tyro-locale"

const loaded = { tr }
const LOADERS = {
  en: () => import("@/data/strings.en"),
  ru: () => import("@/data/strings.ru"),
  ar: () => import("@/data/strings.ar"),
}
const pending = {}

/** Yüklüyse dilin sözlüğü, değilse `null`. */
export function dictionaryFor(locale) {
  return loaded[locale] ?? null
}

/** Sözlüğü bir kez indirir; bilinmeyen dil için Türkçe döner. Ağ hatasında reddeder. */
export function loadDictionary(locale) {
  if (loaded[locale]) return Promise.resolve(loaded[locale])
  const load = LOADERS[locale]
  if (!load) return Promise.resolve(loaded.tr)
  pending[locale] ??= load()
    .then((mod) => {
      loaded[locale] = mod.strings
      return mod.strings
    })
    .catch((err) => {
      delete pending[locale]
      throw err
    })
  return pending[locale]
}

/** Kayıtlı dil; depolama okunamazsa (gizli pencere, engel) `null`. */
export function savedLocale() {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return null
  }
}
