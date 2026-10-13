import { useState, useEffect, useMemo } from "react"
import { motion } from "motion/react"
import { LOGIN_GRADIENT } from "./loginGradient"

// --- TYRO scramble (shatter handoff) ---

const SCRAMBLE_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·:/\\|<>{}[]=+-_ΞΛΔΣΩΦ◆◇△▽"
const FINAL_TEXT = "CONNECTING TO TYRO"
const FINAL_CHARS = FINAL_TEXT.split("")
const SPACE_INDICES = new Set(FINAL_CHARS.map((c, i) => (c === " " ? i : -1)).filter((i) => i >= 0))
// Timeline (designed by the cinematic-connect-handoff-design workflow):
//   0-260   ms: chrome fades out + orb inhales (scale 1.10, brightness 1.18)
//   260-620 ms: orb implodes (scale 0.72, blur 16px, opacity 0)
//   300+i*14 ms: cell i spawns inside orb radius, drifts inward over 420 ms
//   620-1340 ms: all cells settled, scrambling random glyphs
//   1340+i*46 ms: cell i locks left-to-right (spaces lock instantly)
//   2120-2380 ms: locked text holds with a micro-breath, then navigate
const GLYPH_SPAWN_DELAY = 300
const GLYPH_STAGGER = 14
const GLYPH_SETTLE_DURATION = 420
const LOCK_START_MS = 1340
const LOCK_STEP_MS = 46
const SCRAMBLE_TICK_MS = 55

// Seeded Gaussian-ish offset per cell index so initial random positions
// stay stable across re-renders during the scramble (re-sampling would
// cause the inward-drift animation to flicker).
function gaussianOffset(seed) {
  const r1 = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1
  const r2 = Math.abs(Math.sin(seed * 78.233) * 12345.6789) % 1
  const r3 = Math.abs(Math.sin(seed * 31.7172) * 91234.567) % 1
  return (r1 + r2 + r3) / 3
}

export function TyroScramble({ active, isDark }) {
  const [chars, setChars] = useState(() => FINAL_CHARS.map((c) => (c === " " ? " " : "")))
  // Stable spawn offsets per cell — computed once and frozen via useMemo
  // (a ref read during render trips react-hooks/refs-in-render).
  const offsets = useMemo(
    () =>
      FINAL_CHARS.map((_, i) => ({
        x: (gaussianOffset(i + 1) - 0.5) * 2 * 100,
        y: (gaussianOffset(i + 101) - 0.5) * 2 * 26,
      })),
    [],
  )

  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChars(FINAL_CHARS.map((c) => (c === " " ? " " : "")))
      return
    }
    const startedAt = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt
      setChars(
        FINAL_CHARS.map((finalChar, i) => {
          if (finalChar === " ") return " "
          const scrambleStart = GLYPH_SPAWN_DELAY + i * GLYPH_STAGGER + GLYPH_SETTLE_DURATION
          if (elapsed < scrambleStart) return ""
          const lockAt = LOCK_START_MS + i * LOCK_STEP_MS
          if (elapsed >= lockAt) return finalChar
          return SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)]
        }),
      )
    }, SCRAMBLE_TICK_MS)
    return () => clearInterval(interval)
  }, [active])

  return (
    <motion.div
      aria-hidden="true"
      className="select-none leading-none whitespace-nowrap"
      style={{
        fontFamily:
          '"JetBrains Mono Variable", "JetBrains Mono", "Geist Mono", "SF Mono", ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace',
        fontSize: "clamp(20px, 3.4vw, 44px)",
        fontWeight: 600,
        fontFeatureSettings: '"tnum" 1, "ss01" 1',
        fontVariantNumeric: "tabular-nums",
        textTransform: "uppercase",
      }}
      initial={{ letterSpacing: "0.18em", scale: 1 }}
      animate={
        active
          ? {
              letterSpacing: ["0.18em", "0.18em", "0.12em", "0.12em"],
              scale: [1, 1, 1, 1.012, 1],
            }
          : { letterSpacing: "0.18em", scale: 1 }
      }
      transition={{
        letterSpacing: {
          duration: 2.12,
          times: [0, LOCK_START_MS / 2120, 1, 1],
          ease: "linear",
        },
        scale: {
          duration: 2.38,
          times: [0, 0.91, 0.94, 0.97, 1],
          ease: [0.4, 0, 0.2, 1],
        },
      }}
    >
      {chars.map((c, i) => {
        if (SPACE_INDICES.has(i)) {
          return (
            <span key={i} aria-hidden="true" className="inline-block" style={{ width: "0.55ch" }}>
              {" "}
            </span>
          )
        }
        const locked = c === FINAL_CHARS[i] && c !== ""
        const off = offsets[i]
        return (
          <motion.span
            key={i}
            initial={{
              opacity: 0,
              scale: 0.55,
              x: off.x,
              y: off.y,
              filter: "blur(10px)",
            }}
            animate={
              active
                ? {
                    opacity: 0.85,
                    scale: 1,
                    x: 0,
                    y: 0,
                    filter: "blur(0px)",
                  }
                : { opacity: 0, filter: "blur(10px)" }
            }
            transition={{
              duration: GLYPH_SETTLE_DURATION / 1000,
              delay: (GLYPH_SPAWN_DELAY + i * GLYPH_STAGGER) / 1000,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block"
            style={{
              minWidth: "0.62ch",
              textAlign: "center",
              color: locked
                ? "transparent"
                : isDark
                  ? "rgba(255,255,255,0.85)"
                  : "rgba(26,26,26,0.78)",
              backgroundImage: locked ? LOGIN_GRADIENT : undefined,
              WebkitBackgroundClip: locked ? "text" : undefined,
              backgroundClip: locked ? "text" : undefined,
              WebkitTextFillColor: locked ? "transparent" : undefined,
              filter: locked ? "drop-shadow(0 0 3px rgba(221,42,123,0.22))" : "none",
              transition: "color 280ms ease-out, filter 320ms ease-out",
            }}
          >
            {c || " "}
          </motion.span>
        )
      })}
    </motion.div>
  )
}
