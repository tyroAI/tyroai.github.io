import { useCallback, useEffect, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Eraser01Icon from "@hugeicons/core-free-icons/Eraser01Icon"
import { useLocale } from "@/hooks/useLocale"
import { drawStrokes } from "@/lib/signatureInk"

/**
 * Fareyle, parmakla ya da kalemle imza kutusu.
 *
 * Çizgiler üst bileşende durur (`strokes`), kutu yalnız çizer. Çizilmekte olan
 * çizgi bir ref'te birikir ve parmak kalkınca tek seferde eklenir: her fare
 * hareketinde durum yazmak saniyede onlarca yeniden çizim demekti.
 * `touch-action: none` dokunmatikte kaydırmayı keser — yoksa imza atarken
 * kutu kayar.
 */
export function SignaturePad({ strokes, onChange }) {
  const { t } = useLocale()
  const canvasRef = useRef(null)
  const liveRef = useRef(null)
  const strokesRef = useRef(strokes)

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const ctx = canvas.getContext("2d")
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const done = strokesRef.current
    drawStrokes(ctx, liveRef.current ? [...done, liveRef.current] : done, { scale: dpr })
  }, [])

  useEffect(() => {
    strokesRef.current = strokes
    paint()
  }, [strokes, paint])

  // Tuvalin piksel boyu kutunun gerçek boyundan: pencere ya da kutu boyu
  // değişince çizgiler bulanıklaşmasın.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      paint()
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [paint])

  const pointOf = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    liveRef.current = [pointOf(e)]
    paint()
  }
  const onPointerMove = (e) => {
    if (!liveRef.current) return
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
    for (const ev of events) liveRef.current.push(pointOf(ev))
    paint()
  }
  const finish = () => {
    if (!liveRef.current) return
    const stroke = liveRef.current
    liveRef.current = null
    onChange([...strokes, stroke])
  }

  const empty = strokes.length === 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[0.71875rem] text-muted-foreground">{t("chat.sign.padLabel")}</span>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={empty}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.71875rem] text-muted-foreground transition hover:text-foreground disabled:opacity-40"
        >
          <HugeiconsIcon icon={Eraser01Icon} className="size-3.5" strokeWidth={1.8} />
          {t("chat.sign.clear")}
        </button>
      </div>
      <div className="relative h-36 overflow-hidden rounded-xl border border-border bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={t("chat.sign.padAria")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          className="absolute inset-0 size-full cursor-crosshair touch-none"
        />
        {/* İmza çizgisi: formdaki "Personel İmzası" çizgisinin karşılığı. */}
        <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-slate-300" />
        {empty && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-[0.78125rem] text-slate-400">
            {t("chat.sign.padHint")}
          </p>
        )}
      </div>
    </div>
  )
}
