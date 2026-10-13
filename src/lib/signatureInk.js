/**
 * İmza çizgileri: kutuda ekrana, gönderimde görüntüye aynı fonksiyonla çizilir.
 *
 * Çizgi, noktalardan geçen ikinci derece eğrilerle yumuşatılır (her iki
 * noktanın ortasından geçen eğri): fare olayları seyrek geldiğinde düz
 * çizgilerle birleştirmek imzayı köşeli gösteriyordu.
 *
 * Mürekkep tema rengi DEĞİL: kutu kâğıt gibi beyaz ve imza PDF'e aynı
 * renkte gider.
 */
export const INK = "#14306b"
export const INK_WIDTH = 2.2

/** Tüm noktaları kapsayan kutu; çizgi yoksa null. */
export function strokesBounds(strokes) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const stroke of strokes)
    for (const [x, y] of stroke) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  return minX === Infinity ? null : { minX, minY, maxX, maxY }
}

export function drawStrokes(ctx, strokes, { scale = 1, dx = 0, dy = 0 } = {}) {
  ctx.save()
  ctx.setTransform(scale, 0, 0, scale, dx * scale, dy * scale)
  ctx.strokeStyle = INK
  ctx.fillStyle = INK
  ctx.lineWidth = INK_WIDTH
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  for (const pts of strokes) {
    if (pts.length === 1) {
      ctx.beginPath()
      ctx.arc(pts[0][0], pts[0][1], INK_WIDTH / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2
      const my = (pts[i][1] + pts[i + 1][1]) / 2
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
    }
    const last = pts[pts.length - 1]
    ctx.lineTo(last[0], last[1])
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * İmzayı boşluklarından kırpıp saydam PNG'ye çevirir (3×: PDF'te net dursun).
 * @returns {string|null} `data:image/png;base64,…`
 */
export function strokesToPng(strokes, scale = 3) {
  const box = strokesBounds(strokes)
  if (!box) return null
  const pad = INK_WIDTH * 2
  const w = box.maxX - box.minX + pad * 2
  const h = box.maxY - box.minY + pad * 2
  const canvas = document.createElement("canvas")
  canvas.width = Math.ceil(w * scale)
  canvas.height = Math.ceil(h * scale)
  drawStrokes(canvas.getContext("2d"), strokes, {
    scale,
    dx: pad - box.minX,
    dy: pad - box.minY,
  })
  return canvas.toDataURL("image/png")
}
