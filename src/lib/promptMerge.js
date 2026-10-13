/**
 * Hazır istemin bestecideki metne nasıl girdiği — sohbetin TEK kuralı. İki
 * çağıran: düz kartlar (`ChatScreen.handlePromptPick`) ve bestecide yazı varken
 * seçilen alanlı kart (`useComposerTemplate`).
 *
 * - Besteci boşsa ya da içindeki şey son seçilen kartın DOKUNULMAMIŞ metniyse
 *   DEĞİŞTİR: kullanıcı fikrini değiştirdi, iki istem üst üste binmesin.
 * - İstem metinde ZATEN varsa dokunma: aynı karta art arda basmak onu alt alta
 *   çoğaltmasın.
 * - Değilse kullanıcının yazısı korunur, istem alt satıra EKLENİR.
 */
export function mergePromptText(current, text, last) {
  if (isUntouchedPick(current, last)) return text
  if (current.includes(String(text).trim())) return current
  return `${current.replace(/\s+$/, "")}\n\n${text}`
}

/** Bestecideki metin boş mu ya da son seçilen kartın dokunulmamış metni mi. */
export function isUntouchedPick(current, last) {
  const cur = String(current ?? "").trim()
  return !cur || cur === String(last ?? "").trim()
}

/**
 * Düz kart seçildiğinde `setInput`e verilecek güncelleyici.
 *
 * ⚠️ ÖNCEKİ KART GÜNCELLEYİCİ KURULURKEN OKUNUR, çalışırken değil. React çoğu
 * zaman güncelleyiciyi sonraki render'da çalıştırıyor; bir önceki sürüm
 * `lastRef.current`i güncelleyicinin İÇİNDE okuyordu ve o an ref zaten yeni karta
 * çevrilmiş oluyordu. Kutudaki dokunulmamış eski kart "kullanıcının yazısı"
 * sanılıyor, kartlar üst üste ekleniyordu (sahada görüldü).
 */
export function promptPickUpdater(lastRef, text) {
  const last = lastRef.current
  lastRef.current = text
  return (current) => mergePromptText(current, text, last)
}
