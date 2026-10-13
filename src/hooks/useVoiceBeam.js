import { useMemo } from "react"
import { resolveBrandBeamColors } from "@/lib/voiceBeam"
import { usePalette } from "@/hooks/usePalette"
import { useTheme } from "@/hooks/useTheme"

/**
 * Palet + tema başına ÇÖZÜLMÜŞ renkler, modül düzeyinde saklanıyor.
 *
 * ⚠️ Çözüm bir DOM ÖLÇÜMÜ ve bilerek render sırasında yapılıyor — efekt
 * içinde `setState` bu depoda lint ile YASAK
 * (`react-hooks/set-state-in-effect`) ve o yolun karşılığı fazladan bir
 * render turu olurdu. Ölçüm salt okunur ve sonucu burada önbelleğe
 * alınıyor: palet başına bir kez çalışıyor, StrictMode'un çift render'ında
 * bile ikinci ölçüm olmuyor. Emsali `AdaptiveCardView` (host config'ini
 * canlı CSS değişkenlerinden kuruyor).
 */
const colorCache = new Map()

function brandColorsFor(key) {
  if (!colorCache.has(key)) colorCache.set(key, resolveBrandBeamColors())
  return colorCache.get(key)
}

/**
 * `<VoiceBeam>`e verilecek renk prop'ları — her zaman aktif paletten.
 *
 * `theme` de geçiyor: paket koyu ve açık zeminde farklı yoğunluk kullanıyor
 * ve bizim temamız `prefers-color-scheme` ile aynı olmak zorunda değil
 * (kullanıcı elle seçebiliyor), o yüzden paketin `"auto"`suna bırakmak
 * yanlış olurdu.
 */
export function useVoiceBeamColors() {
  const { palette } = usePalette()
  const { theme } = useTheme()

  return useMemo(() => {
    const base = { theme: theme === "dark" ? "dark" : "light" }
    const colors = brandColorsFor(`${palette}|${theme}`)
    // Ölçüm yapılamadıysa (tarayıcı kısıtı, DOM yok) paketin varsayılanı
    // kalıyor: renksiz bir hüzme yerine gökkuşağı, sessiz bir arızadan iyi.
    return colors ? { ...base, colors } : base
  }, [palette, theme])
}
