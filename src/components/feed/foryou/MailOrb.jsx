import { useEffect, useRef, useState } from "react"
import MascotOrb from "@/components/brand/mascot/MascotOrb"
import { mascotColorsForPalette } from "@/components/brand/mascot/mascotPalette"
import { usePalette } from "@/hooks/usePalette"
import "./MailOrb.css"

/**
 * ZARFLI MASKOT — küre iki eliyle bir zarf destesi tutuyor (Sana özel
 * panosunun karşılaması, 2026-10-01).
 *
 * To-Do'nun panolu küresinin (`ChecklistOrb`) kardeşi; aynı kurallar: maskot depodaki TEK çizici (`MascotOrb`),
 * renk paletten (eller ve mühür), kâğıt kâğıt renginde, kutu GENİŞLİKTEN
 * ölçülür (`size = kutu × 342/440`), eller destenin ÇOCUĞU.
 *
 * ⚠️ **ZARFLAR ÖLÇÜ**: deste takip bekleyen postaların sayısı (en çok 3) —
 * bayraklı bir posta varsa öndeki zarfta kırmızı flama, hepsi To-Do'ya
 * devredildiyse mühür yeşil onaya döner, hiç posta yoksa tek AÇIK zarf.
 * ⚠️ Deste kutunun %67'sinden başlıyor ve arka zarflar en çok %62'ye
 * çıkıyor: gözler kutunun ~%48–61'inde (panolu kürenin dersi).
 * ⚠️ Gözlük YOK (To-Do'nun karakteri).
 */
const ORB_RATIO = 342 / 440

export function MailOrb({
  envelopes = 1,
  flag = false,
  tick = false,
  state = "idle",
  celebrate = false,
}) {
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

  const count = Math.max(0, Math.min(3, envelopes))
  const open = count === 0

  return (
    <div
      ref={boxRef}
      className="tyro-mail-orb"
      aria-hidden="true"
      data-celebrate={celebrate || undefined}
      data-open={open || undefined}
      data-tick={tick || undefined}
      style={{ "--mail-a": a, "--mail-b": b, "--mail-c": c }}
    >
      <div className="mail-head">
        {box > 0 && (
          <MascotOrb
            paletteId={palette}
            size={box * ORB_RATIO}
            state={celebrate ? "success" : state}
            mesh
            glow={0.45}
            gloss={0.8}
            followPointer="page"
            expression="attentive"
          />
        )}
      </div>
      <div className="mail-stack">
        {/* Arkadan öne: önce arka zarflar (DOM sırası = boyama sırası). */}
        {count >= 3 && <span className="mail-env" data-i="2" />}
        {count >= 2 && <span className="mail-env" data-i="1" />}
        <span className="mail-env mail-front" data-i="0">
          <span className="mail-seal">
            <svg viewBox="0 0 12 12">
              <path d="M3 6.3l2 2 4-4.6" />
            </svg>
          </span>
        </span>
        {/* Destenin çocuğu (zarfın değil): zarfın kenarı onu kırpmasın. */}
        {flag && !open && <span className="mail-flag" />}
        <span className="mail-grip mail-grip-left" />
        <span className="mail-grip mail-grip-right" />
      </div>
      <div className="mail-sparks">
        <i />
        <i />
        <i />
      </div>
    </div>
  )
}
