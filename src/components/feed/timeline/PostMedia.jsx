import { useEffect, useState } from "react"

// Çerçeve oranı görselin kendi oranı, uçlarda sınırlı: dikey afiş akışı boydan boya
// kaplamasın, ince şerit (e-posta başlığı) çizgiye dönmesin.
const MIN_RATIO = 4 / 5
const MAX_RATIO = 4

/** Görselin doğal oranı — `data:` dizgesi bellekte, çözümleme anlık. */
function useNaturalRatio(src) {
  const [state, setState] = useState(null)
  useEffect(() => {
    let alive = true
    const img = new Image()
    img.onload = () => {
      if (alive && img.naturalHeight) setState({ src, ratio: img.naturalWidth / img.naturalHeight })
    }
    img.src = src
    return () => {
      alive = false
    }
  }, [src])
  return state?.src === src ? state.ratio : null
}

/**
 * Akış kartının kapak görseli. Kurumsal görseller çoğu zaman metin taşır (afiş,
 * takvim): görsel KIRPILMAZ (`object-contain`); çerçeveye sığmayan payı görselin
 * bulanık kopyası doldurur. Oran bilinene kadar çizilmez — kart iki kez zıplamasın.
 */
export function PostMedia({ src }) {
  const ratio = useNaturalRatio(src)
  if (!ratio) return null
  const frame = Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio))
  return (
    <div
      className="relative mt-2.5 max-h-[26rem] overflow-hidden rounded-2xl border border-border/60 bg-muted/40"
      style={{ aspectRatio: frame }}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-2xl"
      />
      <img src={src} alt="" className="relative size-full object-contain" />
    </div>
  )
}
