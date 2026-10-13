import { Component, lazy, Suspense } from "react"
import { MotionConfig, motion } from "motion/react"
import { HugeiconsIcon } from "@hugeicons/react"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { cn } from "@/lib/utils"
import { ArcSpinner } from "./ArcSpinner"
import {
  TOAST_BUTTON_GHOST,
  TOAST_GLYPH_BOX,
  TOAST_GLYPH_GLOW,
  TOAST_GLYPH_WRAP,
  TOAST_SURFACE,
} from "./toastSurface"

/**
 * Uygulamanın bildirim kartı: veri yenilemesi (`startRefreshToast`) ve tek atımlık sonuçlar
 * (`showResultToast`, `notify.*`) hep bunu çizer. Durumlar: loading · success · info ·
 * warning · error. Gerekçeler: docs/design-system.md › Bildirimler.
 *
 * Koyu cam yüzey iki temada da aynı: açık sayfada bir bakışta seçilir, koyu sayfaya da uyar.
 * Kök `.dark` + `data-palette` taşır: içerideki token'lar (marka mürekkebi `--brand-text`,
 * `--destructive`) uygulama açık temadayken de koyu temanın, koyu zeminde okunan tonuna döner.
 */

// Orb ve maskot TEMBEL: kart her sayfadan çağrılıyor, doğrudan import ikisini de giriş
// paketine sokardı. Maskot parçası `BrandOrb` ile ortak.
const ThinkingOrb = lazy(() => import("thinking-orbs").then((m) => ({ default: m.ThinkingOrb })))
const MascotOrb = lazy(() => import("@/components/brand/mascot/MascotOrb"))

// Durumun tonu: rozetin halesi ve mürekkebi. Marka tonu kökteki koyu kapsamdan gelir.
const TONE = {
  brand: { glow: "bg-brand/25", ink: "text-brand" },
  warning: { glow: "bg-amber-400/25", ink: "text-amber-400" },
  error: { glow: "bg-destructive/30", ink: "text-destructive" },
}
const ICON = { info: InformationCircleIcon, warning: Alert02Icon, error: Alert02Icon }

// Rozet rem ile ölçülür ve fareli alçak pencerede kök yazı 12,8 px'e iner (theme.css);
// orb ve maskot piksel alıyor, aynı oranda küçülmezlerse rozetin dışına taşıyorlar.
// Ölçek `zoom` ile, boyut prop'uyla DEĞİL: thinking-orbs yalnız 20/32/64'ü tanıyor,
// başka bir boyut paketin içinde patlayıp uygulamanın hata sınırına düşüyordu.
function rootScale() {
  if (typeof window === "undefined") return 1
  const px = parseFloat(window.getComputedStyle(document.documentElement).fontSize)
  return px > 0 ? px / 16 : 1
}

/**
 * Tembel çizim patlarsa ya da parçası inmezse (yayından sonra eski parça 404) simgeye
 * düşer: kart sonner'ın ağacında, oradan kaçan bir hata bütün uygulamayı hata ekranına
 * götürüyordu. Bir bildirim sayfayı asla düşürmemeli.
 */
class ArtBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function StateIcon({ icon }) {
  return (
    <motion.span
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 18 }}
      className="grid place-items-center"
      aria-hidden="true"
    >
      <HugeiconsIcon icon={icon} className="size-8" strokeWidth={2} />
    </motion.span>
  )
}

/**
 * Belirsiz gösterge: iş sürüyor, bitişi hakkında iddia yok — alttaki çubuk adım sayar ama
 * süreyi bilemez. `aria-valuenow` yok: ARIA'da "meşgul, miktar bilinmiyor" böyle söylenir.
 * `theme="dark"` sabit (orbun `auto` modu açık temada koyu mürekkep çizer, koyu zeminde
 * kaybolurdu); 64px, çünkü paketin 20px'lik tasarımında hareket okunmuyor.
 */
function Spinner({ label, zoom }) {
  return (
    <span role="progressbar" aria-label={label} className="grid place-items-center">
      <ArtBoundary fallback={<ArcSpinner />}>
        <Suspense fallback={<ArcSpinner />}>
          <span className="grid place-items-center" style={{ zoom }}>
            <ThinkingOrb state="solving" size={64} speed={1.15} theme="dark" aria-hidden="true" />
          </span>
        </Suspense>
      </ArtBoundary>
    </span>
  )
}

/**
 * Başarı rozeti maskotun "thumbs-up" hâli ("Aksiyon başarıyla tamamlandı"); jest onayı tek
 * bakışta söyler. İnene kadar onay işareti durur — dönen çember başarıda "sürüyor" derdi.
 * 52 görünen küre çapı (kutu 52/0.777 ≈ 67px) 72px rozete payıyla sığar. İmleç takibi
 * kapalı: saniyelik bir yüzeyde her fare hareketine hesap yaptırmaya değmez.
 */
function Mascot({ paletteId, zoom }) {
  return (
    <ArtBoundary fallback={<StateIcon icon={Tick02Icon} />}>
      <Suspense fallback={<StateIcon icon={Tick02Icon} />}>
        <span className="grid place-items-center" style={{ zoom }}>
          <MascotOrb
            paletteId={paletteId}
            state="thumbs-up"
            size={52}
            followPointer={false}
            decorative
          />
        </span>
      </Suspense>
    </ArtBoundary>
  )
}

function Glyph({ state, label, paletteId }) {
  const tone = TONE[state] ?? TONE.brand
  const zoom = rootScale()
  return (
    <div className={TOAST_GLYPH_WRAP}>
      <span aria-hidden="true" className={cn(TOAST_GLYPH_GLOW, tone.glow)} />
      <span className={cn(TOAST_GLYPH_BOX, tone.ink)}>
        {state === "loading" ? (
          <Spinner label={label} zoom={zoom} />
        ) : state === "success" ? (
          <Mascot paletteId={paletteId} zoom={zoom} />
        ) : (
          <StateIcon key={state} icon={ICON[state] ?? InformationCircleIcon} />
        )}
      </span>
    </div>
  )
}

export function DataRefreshToast({
  state = "loading",
  title,
  detail = "",
  current = 0,
  total = 0,
  action,
}) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0
  const showBar = state === "loading" && total > 0
  // Palet sağlayıcı kancasıyla değil öznitelikten: kart sonner'ın ağacında çiziliyor ve
  // orada bir kanca patlarsa bildirim hiç görünmez. Paletin tek yazıldığı yer bu öznitelik.
  const paletteId =
    typeof document === "undefined" ? undefined : document.documentElement.dataset.palette

  return (
    <MotionConfig reducedMotion="user">
      {/* Kökte `role` yok: sonner her bildirimi zaten `aria-live` bir bölgede çiziyor;
          iç içe canlı bölge bazı ekran okuyucularda metni iki kez okutur. */}
      <div data-palette={paletteId} className={cn(TOAST_SURFACE, "dark")}>
        <Glyph state={state} label={title} paletteId={paletteId} />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            {/* Başlık da kırpılmaz: açıklamasız bildirimde mesajın tamamı başlıkta duruyor
                (hata metinlerinin çoğu böyle) ve kesilen yer yönlendirmenin kendisiydi. */}
            <p className="min-w-0 text-[0.9375rem] leading-snug font-semibold tracking-tight text-white [overflow-wrap:anywhere]">
              {title}
            </p>
            {showBar && (
              <span className="shrink-0 text-[0.78125rem] font-semibold tabular-nums text-white/70">
                {current}
                <span className="text-white/50">/{total}</span>
              </span>
            )}
          </div>

          {/* Açıklama HİÇ kırpılmaz: bildirimin tek işi ne olduğunu söylemek ve kesilen yer
              hep bilginin durduğu yerdi. `anywhere`: boşluksuz uzun adresler ve sunucu
              kimlikleri kutudan taşmasın. Hata metni seçilebilir: BT'ye iletilecek. */}
          {detail && (
            <p
              className={cn(
                "mt-1 text-[0.78125rem] leading-snug [overflow-wrap:anywhere]",
                state === "error" ? "select-text text-destructive" : "text-white/60",
              )}
            >
              {detail}
            </p>
          )}

          {/* Eylem ("Tekrar dene", "Geri al"): kullanıcıyı bildirimle çaresiz bırakmamak için. */}
          {action && state !== "loading" && (
            <button
              type="button"
              onClick={action.onClick}
              className={cn("mt-2.5", TOAST_BUTTON_GHOST)}
            >
              {action.label}
            </button>
          )}

          {showBar && (
            <div
              aria-hidden="true"
              className="relative mt-3 h-[0.3125rem] overflow-hidden rounded-full bg-white/10"
            >
              <motion.div
                className="relative h-full rounded-full bg-brand"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Dolu kısımda gezen ışık: uzun adımlarda çubuk dururken "çalışıyor" der. */}
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
                />
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </MotionConfig>
  )
}
