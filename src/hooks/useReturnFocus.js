import { useRef } from "react"

const OPEN_DIALOG = "[role=dialog][data-state=open],[role=alertdialog][data-state=open]"
const focusable = (el) => el instanceof HTMLElement && el.isConnected && el !== document.body

/**
 * Tetiği `…Trigger` olmayan Radix penceresi (Dialog, Sheet) kapanınca odak açanına dönsün. Radix
 * yalnız kendi tetiğine döndürür; tetik yoksa odak sayfa başına (body) düşer ve klavye kullanıcısı
 * baştan Tab'lar. Açılışta odaktaki öğe saklanır (`onOpenAutoFocus` odak pencereye geçmeden
 * çağrılır); `target()` verilirse (menüden açılan formda menünün düğmesi) o öncelikli, açan
 * öğe odaklanamıyorsa (dokunuşla açılmış, odak sayfadaydı) `fallback()`.
 * Çağıran odağı başka yere bırakıyorsa (`preventDefault`, ör. sohbete) ya da arkasından başka
 * bir pencere açıldıysa (menü çekmecesinden açılan form) dokunulmaz.
 */
export function useReturnFocus(target, fallback) {
  const opener = useRef(null)
  const onOpenAutoFocus = () => {
    opener.current = document.activeElement
  }
  const onCloseAutoFocus = (e) => {
    const el = [target?.(), opener.current, fallback?.()].find(focusable)
    opener.current = null
    if (e.defaultPrevented || !el) return
    // Açık başka bir pencere öğeyi kapsamıyorsa odak onundur (öğe formun içindeyse döner).
    const open = document.querySelectorAll(OPEN_DIALOG)
    if ([...open].some((d) => !d.contains(el))) return
    e.preventDefault()
    el.focus({ preventScroll: true })
  }
  return { onOpenAutoFocus, onCloseAutoFocus }
}
