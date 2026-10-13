import { useEffect, useRef, useState } from "react"
import MascotOrb from "@/components/brand/mascot/MascotOrb"
import { mascotColorsForPalette } from "@/components/brand/mascot/mascotPalette"
import { usePalette } from "@/hooks/usePalette"
import "./ChecklistOrb.css"

/**
 * PANOLU MASKOT — küre elinde bir yapılacaklar panosu tutuyor (To-Do
 * sayfasının karşılaması, 2026-09-30; istek: *"to-do'ya uygun yaratıcı bir orb
 * maskot bento karşılama bul"*).
 *
 * `ReadingOrb`un (Yenilikler'in gazete okuyan küresi) kardeşi ve aynı
 * kuralları taşıyor — gerekçeleri orada yazılı:
 * - maskotun kendisi depodaki TEK çizici (`MascotOrb` tembel sınırı);
 * - renk paletten (`usePalette` → `mascotColorsForPalette`), eller de;
 * - `size` KÜRENİN çapı, kutu ölçülüp `kutu × ORB_RATIO` veriliyor.
 *
 * ⚠️ **PANONUN ÜÇ SATIRI ÖLÇÜ** (`checked`, 0–3): bugünün ilerlemesi üç
 * satıra yuvarlanmış hâli. İş bitince bir satır daha işaretleniyor; süs
 * değil, halkadaki oranın elle tutulur hâli.
 *
 * ⚠️ **DURUM İŞİN KENDİSİNDEN**: bir iş bitince `celebrate` (maskotun
 * `success` durumu — kısa bir sevinç, pano havaya kalkar), eklenirken `busy`
 * (`working`), gerisinde `idle` ve gözler sayfadaki imleci izliyor
 * (`followPointer="page"` — Akışım'ın yardım küresinin aynısı).
 *
 * ⚠️ **YUVARLAK GÖZLÜKLÜ** (aynı gün, istek: *"yuvarlak gözlüğü ile
 * baksın"*): gözlük maskotun KENDİ çizicisinde (`glasses`), bakış grubunun
 * içinde — üstüne bindirilmiş bir HTML katmanı imleci izleyen gözlerden
 * ayrışırdı.
 */
const ORB_RATIO = 342 / 440

export function ChecklistOrb({ checked = 0, celebrate = false, busy = false }) {
  const { palette } = usePalette()
  const [a, b, c] = mascotColorsForPalette(palette)
  const boxRef = useRef(null)
  const [box, setBox] = useState(0)

  useEffect(() => {
    const node = boxRef.current
    if (!node || typeof ResizeObserver === "undefined") return undefined
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width)
      setBox((current) => (next > 0 && next !== current ? next : current))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const state = celebrate ? "success" : busy ? "working" : "idle"

  return (
    // Süs: sayılar kartın metninde ve halkada yazılı; sahne onları tekrar
    // etmiyor, `aria-hidden`.
    <div
      ref={boxRef}
      className="tyro-todo-orb"
      aria-hidden="true"
      data-celebrate={celebrate || undefined}
      style={{ "--todo-a": a, "--todo-b": b, "--todo-c": c }}
    >
      <div className="todo-head">
        {box > 0 && (
          <MascotOrb
            paletteId={palette}
            size={box * ORB_RATIO}
            state={state}
            mesh
            glow={0.45}
            gloss={0.8}
            followPointer="page"
            glasses
          />
        )}
      </div>
      <div className="todo-board">
        <span className="todo-clip" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="todo-row" data-on={i < checked || undefined}>
            <span className="todo-box">
              <svg viewBox="0 0 12 12">
                <path d="M2.4 6.4l2.4 2.4 4.8-5" />
              </svg>
            </span>
            <span className="todo-line" />
          </div>
        ))}
        {/* Eller PANONUN çocuğu: pano sallanınca ve sevinçte havaya kalkınca
            onunla birlikte gitsinler (okuyan maskotun gazetesiyle aynı). */}
        <span className="todo-grip todo-grip-left" />
        <span className="todo-grip todo-grip-right" />
      </div>
      <div className="todo-sparks">
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}
