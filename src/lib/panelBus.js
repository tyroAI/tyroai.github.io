/**
 * Posta ve takvim panellerini sayfanın içinden açmak (Anasayfa özetinin
 * "Postayı aç" · "Takvimi aç"ı).
 *
 * ⚠️ İSTEK BİR ÖRNEĞE DEĞİL BİR ADA GİDER. Panelin aynı anda tek canlı örneği
 * var: masaüstünde çentik ekrandayken çentikte, değilse (telefon, rıhtım açık,
 * çentiksiz sayfa) header'da (bkz. `Header` › `notchOnScreen`). O an paneli
 * gerçekten çizen sahip isteği üstlenir ve `true` döner; ötekiler geçer.
 * Kimse üstlenmezse `false` — çağıran başka bir şey yapmaz.
 */
const owners = new Map() // ad → Set<() => boolean>

export function onPanelRequest(name, claim) {
  let set = owners.get(name)
  if (!set) owners.set(name, (set = new Set()))
  set.add(claim)
  return () => set.delete(claim)
}

export function requestPanel(name) {
  for (const claim of owners.get(name) ?? []) if (claim()) return true
  return false
}
