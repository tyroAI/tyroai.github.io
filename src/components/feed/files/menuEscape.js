/** Menüdeki Escape menüyü kapatır, daha yukarı gitmez: sohbet rıhtımı pencere
 *  düzeyinde Escape dinliyor (bkz. FileRow). */
export function stopEscape(e) {
  e.stopPropagation()
}
