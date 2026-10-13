/**
 * Ok tuşlarıyla tek seçimli grupta gezinme (sekme listesi, bölmeli seçim, seçim çipleri):
 * sağ/aşağı sonraki, sol/yukarı önceki (uçlarda başa/sona sarar), Home ilk, End son. Sağdan
 * sola dilde yatay oklar yer değiştirir. Tuş gezinme tuşu değilse -1 (çağıran olayı bırakır).
 *
 * @param {string} key `KeyboardEvent.key`
 * @param {number} at şu anki sıra
 * @param {number} count seçenek sayısı
 * @param {boolean} [rtl]
 * @returns {number}
 */
export function rovingIndex(key, at, count, rtl = false) {
  if (count < 1) return -1
  const last = count - 1
  const next = rtl ? "ArrowLeft" : "ArrowRight"
  const prev = rtl ? "ArrowRight" : "ArrowLeft"
  if (key === next || key === "ArrowDown") return at >= last ? 0 : at + 1
  if (key === prev || key === "ArrowUp") return at <= 0 ? last : at - 1
  if (key === "Home") return 0
  if (key === "End") return last
  return -1
}

/** Öğenin yazı yönü sağdan sola mı (oklar ters çalışsın). */
export const isRtl = (el) => Boolean(el) && getComputedStyle(el).direction === "rtl"
