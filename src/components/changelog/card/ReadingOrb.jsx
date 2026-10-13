import { useEffect, useRef, useState } from "react"
import MascotOrb from "@/components/brand/mascot/MascotOrb"
import { mascotColorsForPalette } from "@/components/brand/mascot/mascotPalette"
import { usePalette } from "@/hooks/usePalette"
import "./ReadingOrb.css"

/**
 * OKUYAN MASKOT — küre elinde gazete (ya da telefon) tutuyor.
 *
 * Kullanıcının verdiği paketten uyarlandı
 * (`tyro-whats-new-mascot-reading 2`, istek 2026-09-21: *"orb maskot gazete
 * okuyor, renk paletine göre orbun rengini ayarlarsın, sadece bizim
 * kelimeler metinler değişsin"*).
 *
 * ⚠️ **PAKETİN `mascot.mjs`i ALINMADI.** Kaynak 239 satırlık kendi çizicisini
 * getiriyor; bu depoda o çizici ZATEN var (`brand/mascot/mascot.mjs`, aynı
 * paketin daha önce alınmış hâli) ve kartlardan sohbete kadar her yerde o
 * çiziliyor. İkinci bir kopya iki maskot demekti: biri stüdyodan ayarlanan,
 * öteki bu kartta donmuş. Buraya yalnız ÇEVRESİ (gazete, telefon, tutuş,
 * hareketler) taşındı.
 *
 * ⚠️ **RENK PALETTEN, PAKETİN KENDİ PALET ADINDAN DEĞİL.** Kaynak
 * `palette='ocean-breeze-v2'` diye sabit bir ad geçiyor. Burada `usePalette`
 * okunup `MascotOrb`a veriliyor; o da `mascotColorsForPalette` ile üç hex'e
 * çeviriyor — yani küre 14 paletin hangisi seçiliyse onun rengini alıyor.
 * ⚠️ `MascotOrb` bir TEMBEL SINIR: çiziciyi doğrudan import etmek onu giriş
 * paketine bindiriyor (gerekçe MascotOrb.jsx'te). Bu dosya kartın tembel
 * parçasında, o yüzden güvenli — ama sınır yine `MascotOrb`dan geçiyor.
 *
 * ⚠️ **`size` KÜRENİN ÇAPI, KUTUNUN GENİŞLİĞİ DEĞİL** (bu deponun kuralı,
 * `TyroMascot`ta yazılı). Maskotun tuvali küreden geniş: kutu `size/0.777`.
 * Gazetenin konumu kaynakta KUTUNUN yüzdesi, o yüzden burada kutu boyu
 * veriliyor ve küreye `box * ORB_RATIO` geçiliyor — aksi hâlde kâğıt kürenin
 * altında değil yanında dururdu.
 *
 * ⚠️ **KUTU ÖLÇÜLÜR, SABİT PİKSEL VERİLMEZ — ve bu bir taşma hatasıydı.**
 * İlk sürüm `size={132}` geçiyordu; kartın görsel yuvası ise kart birimiyle
 * ölçekleniyor (`height: calc(128 * var(--v))`, `--v` kart genişliğinden
 * türüyor) ve 201px'lik sidebar kartında ~92px'e iniyordu. Gazete yuvadan
 * taşıp kaş satırının ("İYİLEŞTİRME") üstüne biniyordu. Artık kutu
 * `ResizeObserver` ile ölçülüyor ve küreye `kutu * ORB_RATIO` veriliyor:
 * kart hangi boyda çizilirse çizilsin sahne yuvanın içinde kalıyor ve
 * kartın boyu kardeşleriyle aynı (268) oluyor.
 *
 * ⚠️ **PAKETİN `.reader-eyes` KURALLARI TAŞINMADI.** Kaynağın CSS'inde
 * duruyorlar ama JSX'inde öyle bir eleman YOK — ölü kod. Bizim maskotun
 * gözleri zaten SVG'nin içinde ve ifadeyi `expression` belirliyor.
 */

/** Maskot tuvalinin küreye oranı — `TyroMascot` ile AYNI sayı olmak zorunda. */
const ORB_RATIO = 342 / 440

export function ReadingOrb({ mode = "newspaper", paused = false }) {
  const { palette } = usePalette()
  /* ⚠️ Eller kürenin KENDİ üç rengini alıyor (gerekçe ReadingOrb.css).
     `mascotColorsForPalette` doğrudan import ediliyor ve bu TEMBEL SINIRI
     bozmuyor: bu dosya zaten `MascotOrb`u çiziyor, yani aynı parçada.
     Denetim: `grep -l "Yörüngede" dist/assets/*.js` çıkan parça
     `index.html`in preload listesinde olmamalı. */
  const [handA, handB, handC] = mascotColorsForPalette(palette)
  const boxRef = useRef(null)
  const [box, setBox] = useState(0)

  useEffect(() => {
    const node = boxRef.current
    if (!node || typeof ResizeObserver === "undefined") return
    // Durum YALNIZ gözlemcinin geri çağrısından yazılıyor, efektin gövdesinden
    // değil (`react-hooks/set-state-in-effect`).
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.height)
      setBox((current) => (next > 0 && next !== current ? next : current))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    /* ⚠️ `aria-hidden`: sahne SÜS. Yerini aldığı tuvalin bir `aria-label`ı
       vardı ("konuşan küre") ama okuyan maskot kartın metnine hiçbir şey
       eklemiyor — kartın adı zaten başlıkta ve kaş düğmesinde. Kaynak da
       kökü gizliyor. */
    <div
      ref={boxRef}
      className="tyro-reader"
      aria-hidden="true"
      data-reading={mode}
      data-still={paused || undefined}
      style={{ "--reader-a": handA, "--reader-b": handB, "--reader-c": handC }}
    >
      <div className="reader-head">
        {box > 0 && (
          <MascotOrb
            paletteId={palette}
            size={box * ORB_RATIO}
            state="idle"
            expression="attentive"
            mesh
            glow={0.4}
            gloss={0.8}
            motion={!paused}
          />
        )}
      </div>
      {mode === "phone" ? (
        <div className="reader-phone" aria-hidden="true">
          <div className="reader-screen">
            <span className="reader-camera" />
            <div className="reader-feed">
              <b />
              <i />
              <i />
              <b />
              <i />
              <i />
            </div>
            <span className="reader-home" />
          </div>
          <span className="reader-thumb" />
        </div>
      ) : (
        <div className="reader-paper" aria-hidden="true">
          {/* ⚠️ Kaynakta sayfa başlıkları "TYRO" ve "NEWS". İkincisi bizim
              kelimemiz değil: uygulamanın wordmark'ı "tyroAI" ve kart dört
              dilde yaşıyor, yani İngilizce bir manşet burada yabancı durur.
              Bunlar SÜS (`aria-hidden`), o yüzden çeviriye de bağlanmadı —
              çevrilen bir gazete başlığı, ekranda 5px yüksekliğinde bir
              dizgi sorunu olurdu. */}
          <div className="reader-page reader-left">
            <strong>tyro</strong>
            <b />
            <i />
            <i />
            <i />
          </div>
          <div className="reader-page reader-right">
            <strong>AI</strong>
            <i />
            <i />
            <b />
            <i />
          </div>
          <span className="reader-grip reader-grip-left" />
          <span className="reader-grip reader-grip-right" />
        </div>
      )}
    </div>
  )
}
