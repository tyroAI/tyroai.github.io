/**
 * Büyük görseli kart kapağı boyuna indirir (tarayıcıda, tuvalle). Kapak kartta en çok ~700 px
 * genişlikte çiziliyor; 2× ekranda 1400 px yeter. Tasarlanmış tebrik kartları gibi birkaç
 * MB'lık ekler böylece hem kapak olabiliyor hem bellekte küçük duruyor (önbellek 40 kapak).
 * Çözülemeyen görsel olduğu gibi döner.
 */
export async function shrinkDataUrl(dataUrl, { maxWidth = 1400, quality = 0.85 } = {}) {
  if (typeof document === "undefined") return dataUrl
  try {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const scale = Math.min(1, maxWidth / (img.naturalWidth || maxWidth))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return dataUrl
    ctx.drawImage(img, 0, 0, w, h)
    // WebP desteklenmiyorsa tarayıcı PNG'ye düşer; o zaman JPEG daha küçük.
    const webp = canvas.toDataURL("image/webp", quality)
    const out = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality)
    return out.length < dataUrl.length ? out : dataUrl
  } catch {
    return dataUrl
  }
}
