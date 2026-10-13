import { useEffect, useState } from "react"

// Subscribe to window.visualViewport so the chat composer (and any other
// keyboard-pinned element) can know the on-screen keyboard's height. iOS
// Safari does NOT shrink window.innerHeight when the keyboard opens — only
// visualViewport.height changes. Without this hook the composer ends up
// behind the keyboard.
//
// Returns `{ height, offsetTop, keyboardOffset, keyboardUp }`:
// - height: visualViewport.height (excludes keyboard)
// - offsetTop: how far the VISIBLE viewport has scrolled down inside the
//   layout viewport. iOS scrolls the layout viewport to reveal the focused
//   input when the keyboard opens, and a `position: fixed` element is laid
//   out against the LAYOUT viewport — so it stays put and ends up ABOVE the
//   visible area. A fixed panel must therefore be offset by this much, or it
//   drifts off the top of the screen together with its safe-area padding,
//   and its content is drawn under the status bar. Consumers that pin to the
//   visible viewport need `top: offsetTop` AND `height`, not height alone.
// - keyboardOffset: window.innerHeight - vv.height - vv.offsetTop
//   (positive when the keyboard is up, 0 otherwise)
// - keyboardUp: whether a software keyboard is covering part of the viewport.
//
//   It matters because `env(safe-area-inset-bottom)` must be dropped while
//   the keyboard is open: that inset clears the home indicator, and the
//   keyboard is already covering the indicator. Reserving it anyway leaves a
//   dead band between the composer and the keyboard.
//
// Older WebViews lack visualViewport — we degrade silently to offsetTop=0,
// keyboardOffset=0, keyboardUp=false and height=innerHeight, so consumers can
// still render.

const KEYBOARD_MIN_PX = 100

// ⚠️ Klavyenin açık olduğu `innerHeight - height` ile ÖLÇÜLEMEZ, ve bu tam
// olarak kurulu PWA'da — yani şikâyetin geldiği yerde — çöküyor: standalone
// modda iOS klavyeyi açarken DÜZEN görüntü alanını da kısaltıyor, yani
// `window.innerHeight` de küçülüyor ve fark ~0 kalıyor. Tarayıcı sekmesinde
// innerHeight sabit kaldığı için aynı test orada ÇALIŞIYOR: kural doğru
// göründüğü hâlde ana kullanım biçiminde hiç tetiklenmiyordu, ve klavye
// açıkken bırakılan alt güvenli alan payı ölü bir bant olarak kalıyordu.
//
// Bunun yerine görülen EN BÜYÜK görüntü alanı yüksekliğini taban olarak
// saklıyoruz: klavye yalnızca KISALTIR, hiç uzatmaz. Tarayıcıdaki URL
// çubuğunun toplanıp açılması da yüksekliği oynatır ama ~60-80px'dir,
// 100px'lik eşiğin altında kalır.
//
// Modül düzeyinde: taban tek bir fiziksel ekranın özelliği, kancayı kaç
// bileşenin çağırdığının değil.
let baselineHeight = 0

function read() {
  const vv = window.visualViewport
  if (!vv) {
    return { height: window.innerHeight, offsetTop: 0, keyboardOffset: 0, keyboardUp: false }
  }
  // Parmakla yakınlaştırma da `height`i küçültür (ve çok daha fazla). Onu
  // klavye sanmak paneli ortasından kesiyordu; tabanı da bozardı.
  const zoomed = (vv.scale ?? 1) > 1.05
  if (!zoomed) baselineHeight = Math.max(baselineHeight, vv.height)
  // İki ölçünün BÜYÜĞÜ: taban henüz oluşmadıysa (ilk okuma klavye açıkken
  // yapıldıysa) innerHeight testi hâlâ tarayıcı sekmesinde doğru cevabı
  // veriyor.
  const shrink = Math.max(window.innerHeight - vv.height, baselineHeight - vv.height)
  return {
    height: vv.height,
    offsetTop: vv.offsetTop,
    keyboardOffset: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
    keyboardUp: !zoomed && shrink > KEYBOARD_MIN_PX,
  }
}

// Yazılımsal klavye yalnızca bir yazı alanı odaktayken açılır. Bu test
// tabanın ne zaman SIFIRLANABİLECEĞİNİ söylüyor: pencere yüksekliği
// değiştiğinde odakta yazı alanı yoksa değişimin sebebi klavye olamaz.
function editableFocused() {
  const el = typeof document === "undefined" ? null : document.activeElement
  if (!el) return false
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable === true
}

function same(a, b) {
  return (
    a.height === b.height &&
    a.offsetTop === b.offsetTop &&
    a.keyboardOffset === b.keyboardOffset &&
    a.keyboardUp === b.keyboardUp
  )
}

export function useVisualViewport() {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") {
      return { height: 0, offsetTop: 0, keyboardOffset: 0, keyboardUp: false }
    }
    return read()
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    const vv = window.visualViewport
    if (!vv) return
    // Aynı değerle yeni bir nesne döndürmek her `scroll` olayında tüketiciyi
    // yeniden çizdiriyordu — iOS bu olayı sayfa kaydırma boyunca her karede
    // atıyor, tüketicilerden biri de bütün sohbet ekranı.
    function update() {
      setState((prev) => {
        const next = read()
        return same(prev, next) ? prev : next
      })
    }
    // Ekran döndürülünce taban artık başka bir eksenin yüksekliği: portreden
    // yatayda geçince saklanan uzun değer "klavye açık" olarak okunur ve
    // yatayda kalıcı hâle gelirdi. Yalnızca yönelim değişiminde sıfırlıyoruz;
    // `window.resize` KULLANILAMAZ, çünkü standalone modda klavye de onu
    // tetikliyor ve tabanı klavyeli yükseklikle yeniden kurardı.
    const orientation = window.matchMedia?.("(orientation: portrait)")
    function onOrientation() {
      baselineHeight = 0
      update()
    }
    // Pencere GERÇEKTEN değiştiyse taban başka bir yüksekliğin ölçüsüdür:
    // masaüstünde pencereyi 100px'den fazla kısaltmak, saklanan uzun tabanla
    // "klavye açık" olarak okunurdu. Odakta bir yazı alanı varsa
    // DOKUNMUYORUZ — standalone PWA'da klavyenin kendisi de bu olayı
    // tetikliyor ve taban klavyeli yükseklikle yeniden kurulsa kural bir daha
    // hiç tetiklenmezdi.
    function onWindowResize() {
      if (editableFocused()) return
      baselineHeight = 0
      update()
    }
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    window.addEventListener("resize", onWindowResize)
    orientation?.addEventListener?.("change", onOrientation)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
      window.removeEventListener("resize", onWindowResize)
      orientation?.removeEventListener?.("change", onOrientation)
    }
  }, [])

  return state
}
