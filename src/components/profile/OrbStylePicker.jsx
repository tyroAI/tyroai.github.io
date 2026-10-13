import { lazy, Suspense } from "react"
import { PastelVoiceOrb } from "@/components/brand/PastelVoiceOrb"
import { useLocale } from "@/hooks/useLocale"
import { useMascotSettings, useOrbStyle } from "@/hooks/useOrbStyle"
import { usePalette } from "@/hooks/usePalette"
import { DEFAULT_ORB_STYLE, ORB_STYLES, writeOrbStyle } from "@/lib/orbStyle"
import { cn } from "@/lib/utils"

/**
 * Tercihler → "Orb görünümü": iki seçenek, CANLI önizlemeyle.
 *
 * ⚠️ **ÖNİZLEME GERÇEK KÜREDİR, resmi değil** — `WhatsNewCardPicker`ın kararının
 * aynısı. Her seçenek kendi bileşenini seçili paletle çiziyor, yani kullanıcının
 * seçtiği şey tam olarak login/dashboard/sohbette göreceği şey. İkinci bir
 * "küçük resim" zamanla küreden ayrışırdı.
 *
 * ⚠️ **KÖK `<button>` DEĞİL — İÇ İÇE DÜĞME GEÇERSİZ HTML.** `PastelVoiceOrb`un
 * KÖKÜ her zaman bir `<button>`, yani seçeneği bir `<button>` ile sarmak
 * doğrudan `<button> cannot contain a nested <button>` üretiyordu (tarayıcı
 * konsolunda ölçüldü, React uyarısı). `inert` bunu ÇÖZMEZ: etkileşimi kapatır,
 * İÇ İÇELİĞİ değil.
 *
 * Çare bu depoda `MiniCard.jsx`te kullanılan GERİLMİŞ KAPLAMA deseni: kök bir
 * `div`, seçimi yapan düğme `absolute inset-0` ile kartın tamamını kaplıyor ve
 * adını `sr-only` metin veriyor; önizleme onun ALTINDA, `inert` +
 * `pointer-events-none` ile hem etkileşimsiz hem erişilebilirlik ağacının
 * dışında. Kaplama DOM'da önizlemeden SONRA gelmek zorunda, yoksa altta kalır.
 *
 * ⚠️ **ÖNİZLEMENİN DURUMU `idle`, YÜZEY VARSAYILANI DEĞİL.** Burada gösterilen
 * şey KİMLİK, bir ekranın anlık hâli değil; maskotu `orbiting` çizmek küreyle
 * yan yana "biri dönüyor, öteki durgun" diye okunurdu.
 *
 * ⚠️ **ÇERÇEVE YÜKSEKLİĞİ SABİT VE ÖLÇÜLÜ.** İki bileşenin kutusu farklı
 * (`PastelVoiceOrb` `size × 1,78`, maskot `size ÷ 0,777 × 1,068`), yani kendi
 * boylarına bırakılsalar hücreler eşitsiz olurdu. Küre 88px çapla çiziliyor →
 * kutusu 157px; maskotun kutusu 121px. Çerçeve ikisinin BÜYÜĞÜ + nefes.
 */
const MascotOrb = lazy(() => import("@/components/brand/mascot/MascotOrb"))

const PREVIEW_SIZE = 88
/** `PastelVoiceOrb`un kutusu = çap × 1,78 (bkz. `wrapperSize`). */
const FRAME_H = Math.round(PREVIEW_SIZE * 1.78)

export function OrbStylePicker() {
  const { t } = useLocale()
  const chosen = useOrbStyle()
  const settings = useMascotSettings()
  const { palette } = usePalette()

  return (
    <div
      role="radiogroup"
      aria-label={t("profile.prefs.orbStyle")}
      className="grid gap-3 @[520px]/profile:grid-cols-2"
    >
      {ORB_STYLES.map((id) => {
        const selected = id === chosen
        return (
          <div
            key={id}
            className={cn(
              "group/opt relative flex flex-col overflow-hidden rounded-xl border text-left transition",
              "focus-within:ring-2 focus-within:ring-brand/40",
              selected
                ? "border-brand/50 bg-brand-soft/30 shadow-sm"
                : "border-border bg-card hover:border-brand/30 hover:bg-foreground/[0.03]",
            )}
          >
            <div
              inert
              aria-hidden="true"
              style={{ height: FRAME_H }}
              className="pointer-events-none grid w-full place-items-center border-b border-border/60 bg-sidebar"
            >
              {id === "sphere" ? (
                <PastelVoiceOrb state="idle" size={PREVIEW_SIZE} />
              ) : (
                <Suspense fallback={<span style={{ height: FRAME_H }} />}>
                  <MascotOrb
                    state="idle"
                    expression={settings.expression}
                    paletteId={palette}
                    mesh={settings.mesh}
                    meshIntensity={settings.meshIntensity}
                    meshSpread={settings.meshSpread}
                    glow={settings.glow}
                    gloss={settings.gloss}
                    speed={settings.speed}
                    blink={settings.blink}
                    followPointer={false}
                    size={PREVIEW_SIZE}
                  />
                </Suspense>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span
                className={cn(
                  "text-[0.8125rem]",
                  // ⚠️ SEÇİLİ ETİKET MARKA MÜREKKEBİNDE DEĞİL. `text-brand-deep`
                  // (açık) ve `text-brand` (koyu) marka zemininin üstünde
                  // PALETE GÖRE düşüyor — ölçüldü: Sunset açık temada 4,2,
                  // Fiesta koyu temada 3,8. Seçili olduğunu zaten kenarlık,
                  // zemin, `aria-checked` ve kalınlık söylüyor; renk buna
                  // dördüncü kez gerek duymuyor ve 17 paletin hepsinde
                  // güvenli olmak zorunda.
                  selected ? "font-semibold text-foreground" : "font-medium text-foreground/80",
                )}
              >
                {t(`profile.prefs.orbStyle.${id}`)}
              </span>
              {id === DEFAULT_ORB_STYLE && (
                <span className="rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[0.625rem] font-medium text-muted-foreground">
                  {t("profile.prefs.whatsNewCardDefault")}
                </span>
              )}
            </div>

            {/* Gerilmiş kaplama: kartın tamamı tıklanabilir, tek sekme durağı.
                DOM'da önizlemeden SONRA gelmek zorunda, yoksa altta kalır. */}
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => writeOrbStyle(id)}
              className="absolute inset-0 rounded-xl focus-visible:outline-none"
            >
              <span className="sr-only">{t(`profile.prefs.orbStyle.${id}`)}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
