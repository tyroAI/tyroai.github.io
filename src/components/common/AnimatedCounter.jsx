import { useEffect, useRef, useState } from "react"
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react"
import { counterParts, digitGlyphs } from "@/lib/counterParts"
import { cn } from "@/lib/utils"

// Arc'ın hareket belirteçleri: tekerlek sönümlü yay, sütun ekleme/çıkarma hafif esnek.
const SMOOTH = { type: "spring", visualDuration: 0.4, bounce: 0 }
const MORPH = { type: "spring", visualDuration: 0.42, bounce: 0.16 }
const STILL = { duration: 0 }
const BLUR = 2
const WHEEL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const PRESENCE = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
}

/** Tekerlekteki tek rakam: tekerleğin konumuna uzaklığı yerini ve görünürlüğünü belirler. */
function Glyph({ position, digit, glyph }) {
  const offset = useTransform(position, (p) => ((((digit - p) % 10) + 15) % 10) - 5)
  const y = useTransform(offset, (o) => `${o}em`)
  const opacity = useTransform(offset, (o) => Math.max(0, 1 - Math.abs(o)))
  const visibility = useTransform(offset, (o) => (Math.abs(o) >= 1 ? "hidden" : "visible"))
  const filter = useTransform(offset, (o) =>
    Math.abs(o) < 0.02 || Math.abs(o) >= 1 ? "none" : `blur(${(Math.abs(o) * BLUR).toFixed(2)}px)`,
  )
  return (
    <motion.span
      className="absolute inset-x-0 top-[var(--feather)] text-center"
      style={{ y, opacity, filter, visibility }}
    >
      {glyph}
    </motion.span>
  )
}

/** Rakam tekerleği: sayının gittiği yöne döner, kilometre sayacı gibi 9 → 0 sarar. */
function Column({ digit, direction, glyphs, reduce }) {
  const position = useMotionValue(digit)
  const wheel = useRef({ digit, target: digit })
  useEffect(() => {
    const s = wheel.current
    if (s.digit === digit) return
    s.target += direction < 0 ? -((s.digit - digit + 10) % 10) : (digit - s.digit + 10) % 10
    s.digit = digit
    if (reduce) position.jump(s.target)
    else animate(position, s.target, SMOOTH)
  }, [digit, direction, position, reduce])
  return (
    <motion.span
      {...PRESENCE}
      transition={reduce ? STILL : MORPH}
      className="relative -my-[var(--feather)] inline-block overflow-hidden py-[var(--feather)] [mask-image:linear-gradient(to_bottom,transparent,#000_calc(var(--feather)*1.5),#000_calc(100%-var(--feather)*1.5),transparent)]"
    >
      <span className="invisible">{glyphs[0]}</span>
      {WHEEL.map((d) => (
        <Glyph key={d} position={position} digit={d} glyph={glyphs[d]} />
      ))}
    </motion.span>
  )
}

/**
 * Sayaç: değer değişince rakamlar tekerlek gibi döner (dönem değişince özet tutarları).
 * Arc'ın animated-counter bileşeninden uyarlandı (uiarc.dev, MIT); rakamlar dilin glifiyle
 * (Arapça dahil), biçim `Intl.NumberFormat` seçenekleriyle (`options`). İlk çizimde hareket
 * yok; hareketi azalt tercihinde rakam yerine atlar. Ekran okuyucu yalnız düz metni duyar.
 * Biçimlenemeyen değer (geçersiz para birimi) düz metin.
 *
 * @param {number} p.value
 * @param {string} p.locale
 * @param {Intl.NumberFormatOptions} [p.options]
 * @param {string} [p.prefix] sayının önündeki metin (birim kalıbından)
 * @param {string} [p.suffix] sayının ardındaki metin ("gün")
 * @param {string} [p.fallback] biçimlenemezse gösterilen metin
 */
export function AnimatedCounter({
  value,
  locale,
  options,
  prefix = "",
  suffix = "",
  fallback,
  className,
}) {
  const reduce = Boolean(useReducedMotion())
  const [previous, setPrevious] = useState(value)
  const [direction, setDirection] = useState(1)
  if (value !== previous) {
    setPrevious(value)
    setDirection(value > previous ? 1 : -1)
  }
  const counted = counterParts(value, locale, options)
  if (!counted)
    return <span className={className}>{fallback ?? `${prefix}${value ?? "—"}${suffix}`}</span>
  const glyphs = digitGlyphs(locale)
  return (
    <span className={cn("relative inline-flex", className)}>
      <span className="sr-only">{`${prefix}${counted.text}${suffix}`}</span>
      <span
        aria-hidden="true"
        className="inline-flex select-none items-start whitespace-pre [--feather:0.16em]"
      >
        {prefix && <span>{prefix}</span>}
        <AnimatePresence initial={false}>
          {counted.parts.map((p) =>
            "digit" in p ? (
              <Column
                key={p.key}
                digit={p.digit}
                direction={direction}
                glyphs={glyphs}
                reduce={reduce}
              />
            ) : (
              <motion.span
                key={p.key}
                {...PRESENCE}
                transition={reduce ? STILL : MORPH}
                className="inline-block overflow-x-clip"
              >
                {p.text}
              </motion.span>
            ),
          )}
        </AnimatePresence>
        {suffix && <span>{suffix}</span>}
      </span>
    </span>
  )
}
