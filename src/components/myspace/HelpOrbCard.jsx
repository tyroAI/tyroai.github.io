import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react"
import { BrandOrb } from "@/components/brand/BrandOrb"
import { useLocale } from "@/hooks/useLocale"
import { useCircleCelebrations } from "@/hooks/useCircleCelebrations"
import { useIntroOnce } from "@/hooks/useIntroOnce"
import { useTypewriter } from "@/hooks/useTypewriter"
import { useOrbStyle } from "@/hooks/useOrbStyle"
import { HelpCardColleagues } from "./HelpCardColleagues"
import { requestOpenChat } from "@/lib/chatBus"
import { cn } from "@/lib/utils"
import "./intro.css"

/* ─── Sana nasıl yardımcı olabilirim? ───────────────────────────────── */

/**
 * Kutunun yüksekliği / küre çapı — iki görünüm farklı: maskotun tuvali
 * 440×470 ve küre r=171 (`ORB_RATIO`), kürenin (`PastelVoiceOrb`) kutusu
 * halesi ve dalgasıyla kare ve ~1,78 kat (ölçüldü: 80 → 142px).
 */
const ORB_BOX_H = { mascot: (470 / 440) * (440 / 342), sphere: 1.775 }
/** Kutunun ALTTAN ne kadarı kartın dışında kalır — gözün hemen altı. */
const ORB_HIDDEN = 0.4
/**
 * KUTLAMA GÜNÜ (kişinin kendi doğum günü / iş yıl dönümü): kart
 * küre yerine bir SAHNE çiziyor (`CelebrationOrb` — pasta, balonlar, rakam
 * balonu). Pasta ve plaket gözlerin ALTINDA ve %40'lık kesim onları tam
 * ortadan keserdi: doğum gününde kutunun alt %20'si dışarıda (pastanın tepesi,
 * mumlar ve kremanın şeridi görünür, altı kartın kenarında "masada" kalır),
 * yıl dönümünde %21'i (plaket tam görünür). Şapkanın ve balonların tuvali
 * aşan payı da boy hesabına girer (`SCENE_TOP`, çapın %22'si).
 * ⚠️ Kısa kartta (1440×900: 232 px, başlık iki satır) taban 84 px: 96'lık
 * genel taban şapkayı başlığın satırına sokuyordu (ölçüldü: 4 px).
 */
const SCENE_HIDDEN = { birthday: 0.2, both: 0.2, anniversary: 0.21 }
const SCENE_TOP = 76 / 342
/** Açılışta TEK sevinç zıplaması (maskotun `success`i ~1,3 sn), sonra her zamanki hâl. */
const CHEER_MS = 1700
const CelebrationOrb = lazy(() => import("./CelebrationOrb"))
const CelebrationDecor = lazy(() =>
  import("./CelebrationOrb").then((m) => ({ default: m.CelebrationDecor })),
)

/**
 * Referansın "What can I help with?" kartı — paletin gradyanı, alt kenardan
 * YÜKSELEN büyük küre.
 *
 * ⚠️ **KÜRE GÖZÜN HEMEN ALTINDAN KESİLİR** (ayarın geçmişi
 * `docs/features/anasayfa-kartlar.md`de): kutunun alt %40'ı kartın dışında
 * (`ORB_HIDDEN`). Maskotun yüzü tuvalde y=243/470'te (%52, yüz animasyonunun
 * `transform-origin`i), gözlerin altı ~%55 — çizgi %60'ta, yani gözün hemen
 * altında. Küre görünümünde aynı oran kürenin üst %68'ini gösteriyor, maskotla
 * birebir aynı pay.
 *
 * ⚠️ **BOY ÖLÇÜLÜR, SABİT DEĞİL.** Kart 176px'ten (1280) 350px'e (telefon)
 * uzanıyor; sabit bir çap birinde karta sığmaz, ötekinde kaybolurdu. Çap
 * genişliğin ~%74'ü (referansın oranı), ama BAŞLIĞIN altında kalan yüksekliği
 * de aşamaz — yoksa geniş kartta küre metnin üstüne biner.
 *
 * ⚠️ **İÇ İÇE DÜĞME YOK.** `BrandOrb`un küre görünümü kökünde her zaman bir
 * `<button>` çiziyor. Kart bir `div`; tıklamayı onu kaplayan AYRI bir düğme
 * alıyor, küre onun altında `inert` + `aria-hidden` bir katmanda.
 *
 * ⚠️ **TIKLAMA RIHTIMI AÇAR, SAYFAYI DEĞİŞTİRMEZ** (`requestOpenChat` + imleç
 * besteciye). Gün özeti bu kartın işi DEĞİL — özetin kendi çipi var.
 *
 * `anchorRef`: Anasayfa sağ kenar çentiğini bu karta hizalıyor.
 */
export function HelpOrbCard({ className, anchorRef, scene = null }) {
  const { t } = useLocale()
  const [live, setLive] = useState(false)
  const [box, setBox] = useState(null)
  const hostRef = useRef(null)
  const titleRef = useRef(null)
  const label = t("myspace.help.title")
  // İlk açılışta küre dışarıdan zıplar (1,5 sn), ardından başlık harf harf yazılır.
  const intro = useIntroOnce("help-orb")
  const typed = useTypewriter(label, intro, { delay: 1450 })
  // Ekipten/departmandan biri kutlanıyorsa kart o güne döner: başlık çekilir,
  // maskot kenardan tebrik kartı uzatır. Kişinin kendi günü (sahne) önceliklidir.
  const colleagues = useCircleCelebrations()
  const takeover = colleagues.length > 0 && !scene
  const chosen = useOrbStyle() === "mascot" ? "mascot" : "sphere"
  // ⚠️ Sahne varken KÜRE SEÇEN KİŞİDE DE MASKOT: pastayı tutacak eller ve
  // şapkayı giyecek bir baş yalnız maskotta var. İstisna yalnız O GÜN; tercih
  // değişmez, ertesi gün küre geri gelir.
  const kind = scene ? "mascot" : chosen
  const hidden = scene ? SCENE_HIDDEN[scene.scene] : ORB_HIDDEN
  const topRoom = scene ? SCENE_TOP : 0

  const setHost = useCallback(
    (node) => {
      hostRef.current = node
      if (anchorRef) anchorRef.current = node
    },
    [anchorRef],
  )

  useEffect(() => {
    const el = hostRef.current
    if (!el || typeof ResizeObserver === "undefined") return undefined
    const measure = () => {
      const title = titleRef.current
      setBox({
        w: el.offsetWidth,
        h: el.offsetHeight,
        textBottom: title ? title.offsetTop + title.offsetHeight : 0,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // Kutlama satırları sonradan gelir: başlık bloğu uzayınca küre yeniden ölçülür.
    if (titleRef.current) ro.observe(titleRef.current)
    return () => ro.disconnect()
  }, [])

  let orbSize = 0
  if (box) {
    const byWidth = box.w * (kind === "mascot" ? 0.74 : 0.62)
    const byHeight = (box.h - box.textBottom - 14) / ((1 - hidden) * ORB_BOX_H[kind] + topRoom)
    orbSize = Math.round(Math.max(scene ? 84 : 96, Math.min(220, byWidth, byHeight)))
    // Kutlamada maskot kenarda, tebrik kartını uzatan köşede: boy genişliğe göre.
    if (takeover) orbSize = Math.round(Math.min(108, box.w * 0.36))
  }

  // ⚠️ SEVİNÇ BİR KEZ, ve kıyafet değişirse (önizlemede) yeniden. Zamanlayıcı
  // efektin İÇİNDE durum yazıyor — eşzamanlı `setState` değil (deponun lint
  // kuralı). Hareketi azaltmayı seçen kişide zıplama zaten yok (maskotun CSS'i),
  // yalnız ~1,7 sn mutlu gözler.
  const cheerKey = scene ? scene.scene : null
  const [cheered, setCheered] = useState(null)
  const cheering = !!cheerKey && cheered !== cheerKey && orbSize > 0
  useEffect(() => {
    if (!cheering) return undefined
    const id = setTimeout(() => setCheered(cheerKey), CHEER_MS)
    return () => clearTimeout(id)
  }, [cheering, cheerKey])

  return (
    <div
      ref={setHost}
      data-tour="helporb"
      onPointerEnter={() => setLive(true)}
      onPointerLeave={() => setLive(false)}
      className={cn(
        "group relative isolate flex min-h-[15rem] min-w-0 flex-col overflow-hidden rounded-[1.75rem]",
        takeover ? "p-3" : "p-5",
        "shadow-[0_18px_40px_-24px_var(--brand-via)] transition-transform duration-300 hover:-translate-y-0.5",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-from via-brand-via to-brand-to"
      />
      {/* Kürenin arkasındaki ışık, alt kenara oturmuş — küre paletin kendi
          renklerinden, zemin de; ışık olmasa aynı tonun üstünde kaybolurdu. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-3/4 bg-[radial-gradient(60%_55%_at_50%_100%,rgb(255_255_255/0.5),transparent_75%)]"
      />
      {scene && (
        <Suspense fallback={null}>
          <CelebrationDecor scene={scene.scene} years={scene.years} />
        </Suspense>
      )}
      {/* Başlık ya da yakın çevrenin kutlaması ölçülür: küre altına sığar.
          Kap tıklamayı alttaki düğmeye bırakır; kutlama bloğu almaz. */}
      <div ref={titleRef} className="pointer-events-none relative z-20 min-w-0">
        {takeover ? (
          <HelpCardColleagues people={colleagues} />
        ) : (
          <p
            aria-hidden="true"
            className="max-w-[11rem] text-[1.3125rem] font-semibold leading-[1.15] tracking-[-0.02em] text-brand-on-brand [text-shadow:0_1px_2px_rgb(0_0_0/0.18)]"
          >
            {/* Tam metin yer tutar (küre başlığın boyuna göre ölçülür), yazılan üstünde. */}
            <span className="relative block">
              <span className={intro && !typed.done ? "invisible" : undefined}>{label}</span>
              {intro && !typed.done && (
                <span className="absolute inset-0">
                  {typed.shown}
                  <span className="ms-caret" />
                </span>
              )}
            </span>
          </p>
        )}
      </div>
      <div
        aria-hidden="true"
        inert={true}
        className={cn(
          "pointer-events-none absolute bottom-0 transition-transform duration-500",
          takeover
            ? "end-0 z-30 translate-x-[26%] translate-y-[40%] group-hover:translate-y-[34%] rtl:-translate-x-[26%]"
            : "left-1/2 -translate-x-1/2",
          takeover
            ? null
            : !scene
              ? "translate-y-[40%] group-hover:translate-y-[35%]"
              : scene.scene === "anniversary"
                ? "translate-y-[21%] group-hover:translate-y-[17%]"
                : "translate-y-[20%] group-hover:translate-y-[16%]",
        )}
      >
        {/* Ölçülmeden ÇİZİLMEZ: önce yanlış boyda doğup sonra büyüyen bir küre
            açılışta zıplardı. */}
        {/* ⚠️ GÖZLER SAYFADAKİ İMLECİ İZLİYOR, 5 SN DURGUNLUKTA UYUYOR,
            HAREKETTE SEVİNİYOR — dashboard küresi gibi.
            - Takip: `trackPage` — kürenin üstü `pointer-events-none` (tıklamayı
              kaplama düğmesi alıyor), yani kutunun kendi takibi burada
              tetiklenmez; bakış pencere dinleyicisinden.
            - Uyku ve selamlama: panelin `useOrbIdleState` döngüsü (dashboard
              küresinin AYNISI); sabit bir `mascotState` onu ezmemeli.
            - Uyanıkken `idle` (`restState`), yüzeyin `orbiting`i DEĞİL: o
              durum yüzü kendi animasyonuyla sağa sola çeviriyor ve takiple
              aynı yüzü iki şey sürerdi.
            - Üstüne gelince `listening` — `mascotState` olarak, yani uykuyu da
              ezer: imleci kartın üstünde tutan kişi uyuyan bir küre görmemeli.
            - Göz kırpma maskotun kendi döngüsü (7,6 sn), `settings.blink`. */}
        <div className={intro ? "ms-orb-enter" : undefined}>
          {orbSize > 0 && scene && (
            // Kutlama günü: o günün SAHNESİ (tembel parça — yılda iki gün lazım).
            // Gözler sevinçten kısık (`happy`), üstüne gelince dinler.
            <Suspense fallback={null}>
              <CelebrationOrb
                size={orbSize}
                scene={scene.scene}
                years={scene.years}
                state={live ? "listening" : cheering ? "success" : "idle"}
                expression={live ? undefined : "happy"}
              />
            </Suspense>
          )}
          {orbSize > 0 && !scene && (
            <BrandOrb
              surface="dashboard"
              state={live ? "listening" : "idle"}
              mascotState={live ? "listening" : undefined}
              restState="idle"
              trackPage
              size={orbSize}
            />
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label={label}
        onClick={() => requestOpenChat({ focusComposer: true })}
        onFocus={() => setLive(true)}
        onBlur={() => setLive(false)}
        className="absolute inset-0 z-10 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-brand-on-brand/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
    </div>
  )
}
