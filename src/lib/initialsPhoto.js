/**
 * Graph'tan gelen profil fotoğrafını veri adresine çevirir — "fotoğraf" diye yüklenmiş bir
 * HARF RESMİ değilse. Bazı hesapların Microsoft 365 fotoğrafı, baş harflerin açık bir
 * zemine yazıldığı bir resim; olduğu gibi çizilince bizim baş harf avatarlarımızın
 * arasında başka yazı tipi, başka boy ve bulanık bir kenarla bozuk görünüyordu. Tanınan
 * resim fotoğraf sayılmaz, avatar kendi harflerini çizer (`PersonAvatar`).
 *
 * Ölçüt: renkler 3 bitlik kutulara (512) iner. Harf resmi zemin + yazıdan ibaret, birkaç
 * kutuda toplanır; gerçek fotoğraf (yüz, saç, giysi, arka plan) onlarca kutuya yayılır.
 * Ölçüm (ekran görüntüsünden): harf resminde zemin %66 ve 6 kutu piksellerin %92'si;
 * gerçek fotoğrafta en büyük kutu %20, %92 için 18 kutu. Düz renkli bir logo da harf
 * resmi sayılır — kişiyi tanıtan zaten adı ve baş harfleri.
 */

const SIZE = 24
const MIN_TOP_SHARE = 0.4
const MAX_BINS = 8
const COVER = 0.92

/**
 * Saf ölçüt: `rgba` kare bir resmin pikselleri (`size × size × 4`). Yalnız iç çember
 * sayılır, çünkü köşeler avatarda kırpılıyor; saydam pikseller zemin sayılmaz.
 */
export function isInitialsPicture(rgba, size = SIZE) {
  const r = size / 2
  const limit = (r * 0.9) ** 2
  const bins = new Map()
  let total = 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r
      const dy = y + 0.5 - r
      if (dx * dx + dy * dy > limit) continue
      const i = (y * size + x) * 4
      if (rgba[i + 3] < 128) continue
      const key = ((rgba[i] >> 5) << 6) | ((rgba[i + 1] >> 5) << 3) | (rgba[i + 2] >> 5)
      bins.set(key, (bins.get(key) ?? 0) + 1)
      total++
    }
  }
  // Neredeyse tamamı saydam bir resim hakkında karar verilmez: fotoğraf korunur.
  if (total < size) return false
  const counts = [...bins.values()].sort((a, b) => b - a)
  if (counts[0] / total < MIN_TOP_SHARE) return false
  let covered = 0
  let used = 0
  for (const c of counts) {
    covered += c
    used++
    if (covered / total >= COVER) break
  }
  return used <= MAX_BINS
}

async function looksLikeInitials(dataUrl) {
  if (typeof document === "undefined") return false
  try {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const canvas = document.createElement("canvas")
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return false
    ctx.drawImage(img, 0, 0, SIZE, SIZE)
    return isInitialsPicture(ctx.getImageData(0, 0, SIZE, SIZE).data, SIZE)
  } catch {
    // Çözülemeyen resim hakkında karar yok: fotoğraf olduğu gibi kalır.
    return false
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(blob)
  })
}

/** Fotoğraf gövdesi → veri adresi; harf resmiyse ya da okunamazsa `null` (avatar harf çizer). */
export async function photoFromBlob(blob) {
  const dataUrl = await blobToDataUrl(blob)
  if (!dataUrl) return null
  return (await looksLikeInitials(dataUrl)) ? null : dataUrl
}
