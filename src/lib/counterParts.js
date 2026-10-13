import { getNumberFormat } from "@/lib/intl-cache"

const DIGITS = new Map()

/** Dilin rakam glifleri (0–9): Arapçada "٠…٩", ötekilerde "0…9". */
export function digitGlyphs(locale) {
  let glyphs = DIGITS.get(locale)
  if (!glyphs) {
    const fmt = getNumberFormat(locale, { useGrouping: false })
    glyphs = Array.from({ length: 10 }, (_, i) => fmt.format(i))
    DIGITS.set(locale, glyphs)
  }
  return glyphs
}

/**
 * Biçimli sayıyı sayaç sütunlarına böler: her rakam basamak değeriyle anahtarlanır (999 → 1.000
 * olunca birler sütunu yine birler sütunu kalır), ayraç ve simgeler metin parçası. Rakam dilin
 * kendi glifiyle tanınır. Biçimlenemiyorsa (geçersiz para birimi) ya da tanınmayan rakam varsa
 * `null`: çağıran düz metin gösterir.
 *
 * @returns {{ text: string, parts: ({ key: string, digit: number } | { key: string, text: string })[] } | null}
 */
export function counterParts(value, locale, options = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  let raw
  try {
    raw = getNumberFormat(locale, options).formatToParts(value)
  } catch {
    return null
  }
  const glyphs = digitGlyphs(locale)
  let place = raw.reduce((n, p) => n + (p.type === "integer" ? p.value.length : 0), 0)
  let fraction = 0
  let unknown = false
  const digitOf = (ch) => {
    const d = glyphs.indexOf(ch)
    if (d < 0) unknown = true
    return d
  }
  const parts = raw.flatMap((p, i) => {
    if (p.type === "integer")
      return [...p.value].map((ch) => ({ key: `i${--place}`, digit: digitOf(ch) }))
    if (p.type === "fraction")
      return [...p.value].map((ch) => ({ key: `f${fraction++}`, digit: digitOf(ch) }))
    const key = p.type === "group" ? `g${place}` : p.type === "decimal" ? "d" : `${p.type}${i}`
    return [{ key, text: p.value }]
  })
  if (unknown) return null
  return { text: raw.map((p) => p.value).join(""), parts }
}
