// Shared per-locale Intl.DateTimeFormat cache.
//
// Why a cache: Intl constructors allocate dozens of objects per call. In hot
// paths (every chat message render, the DateTimePill ticking each minute,
// every activity card on the dashboard) the wasted allocations add up.
// `new Intl.DateTimeFormat(...)` cannot be hoisted to module scope because
// the locale is runtime-variable (TR ↔ EN toggle), so we cache one formatter
// per { locale, options } combination instead. Formatters are immutable, so
// reuse is always safe.

const formatters = new Map()

// Map our short locale codes to BCP-47 tags. Used by every Intl.* lookup
// AND by the Web Speech APIs (recognizer + synthesis) — exported so other
// modules can stay in sync with one mapping. Add new locales here when
// they get a strings file.
const BCP47 = {
  tr: "tr-TR",
  en: "en-US",
  ru: "ru-RU",
  ar: "ar-SA",
}

export function bcp47(locale) {
  return BCP47[locale] || "en-US"
}

/**
 * Return a cached Intl.DateTimeFormat for the given locale + options. The
 * cache key is the JSON-stringified options + locale; identical options
 * objects with different key order will produce different keys, so always
 * pass a literal with consistent ordering at call sites.
 *
 * @param {"tr"|"en"|string} locale
 * @param {Intl.DateTimeFormatOptions} options
 * @returns {Intl.DateTimeFormat}
 */
export function getDateTimeFormat(locale, options) {
  const key = locale + "|" + JSON.stringify(options)
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(bcp47(locale), options)
    formatters.set(key, f)
  }
  return f
}

const numberFormats = new Map()

/**
 * Cached `Intl.NumberFormat` — same key rule as `getDateTimeFormat` (pass a
 * literal with consistent key order). The hava durumu hapı formats every
 * number through it: "%67" in Turkish is "67%" in English, "0,9 mm" is "0.9 mm".
 *
 * @param {"tr"|"en"|"ru"|"ar"|string} locale
 * @param {Intl.NumberFormatOptions} [options]
 * @returns {Intl.NumberFormat}
 */
export function getNumberFormat(locale, options = {}) {
  const key = locale + "|" + JSON.stringify(options)
  let f = numberFormats.get(key)
  if (!f) {
    f = new Intl.NumberFormat(bcp47(locale), options)
    numberFormats.set(key, f)
  }
  return f
}

// Plural rules, cached per locale for the same reason as the formatters above:
// `new Intl.PluralRules(...)` on every row render (Dosyalarım's "3 öğe",
// "12 sonuç") allocated a fresh rule object per row per render.
const pluralRuleSets = new Map()

/**
 * Cached `Intl.PluralRules` for a locale (cardinal). Categories are the CLDR
 * ones (`zero one two few many other`); the dictionaries carry all six forms
 * for every plural key, so whatever `select` returns has a string behind it.
 *
 * @param {"tr"|"en"|"ru"|"ar"|string} locale
 * @returns {Intl.PluralRules}
 */
export function pluralRules(locale) {
  let r = pluralRuleSets.get(locale)
  if (!r) {
    r = new Intl.PluralRules(bcp47(locale))
    pluralRuleSets.set(locale, r)
  }
  return r
}

/**
 * `"<base>.<category>"` for a count — the dictionary key of a plural string.
 * `t(pluralKey("myfiles.results.count", locale, n), { count: n })`.
 */
export function pluralKey(base, locale, count) {
  return `${base}.${pluralRules(locale).select(Number(count) || 0)}`
}
