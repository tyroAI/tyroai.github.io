import { lazy, Suspense } from "react"
import { PastelVoiceOrb } from "@/components/brand/PastelVoiceOrb"
import { useMascotSettings, useOrbStyle } from "@/hooks/useOrbStyle"
import { useOrbIdleState } from "@/hooks/useOrbIdleState"
import { usePalette } from "@/hooks/usePalette"
import { LOGIN_PALETTE } from "@/providers/PaletteProvider"
import { cn } from "@/lib/utils"

/**
 * HAVADA SÜZÜLEN MARKA KÜRESİ — iki görünüm, seçim kullanıcının.
 *
 * İstek (2026-09-13): *"Login ekranında, dashboard'ta ve chat ekranında bizim
 * orb yuvarlağımız var. Buna ek bir alternatif orb maskotu yaptırdım. Kullanıcı
 * orb küreyi seçerse mevcuttaki çıkmaya devam edecek, orb maskot seçerse onun
 * yerine maskot çıkacak."*
 *
 * Bu bileşen o anahtarın TEK yeridir: çağrı yerleri `PastelVoiceOrb` yerine
 * bunu çağırır ve hangi görünümün çizileceğini bilmezler. İkinci bir anahtar
 * açılsaydı (ör. her sayfa kendi tercihini okusaydı) bir yüzey geride kalır ve
 * kullanıcı aynı oturumda iki farklı küre görürdü.
 *
 * ⚠️ **KÜRE YOLU TEK PİKSEL DEĞİŞMEDİ.** `sphere` seçiliyken bu bileşen
 * `PastelVoiceOrb`u AYNI prop'larla çiziyor — varsayılan da o, yani hiç seçim
 * yapmamış kullanıcı için bugüne göre hiçbir şey değişmiyor.
 *
 * ── DURUM EŞLEMESİ ─────────────────────────────────────────────────────
 *
 * Uygulamanın küresi dört durum konuşuyor (`idle` · `listening` · `thinking` ·
 * `speaking`); maskotun 17 durumu var. Üçü birebir karşılık buluyor; `idle`in
 * karşılığı YÜZEYİN kendi varsayılanı:
 *
 * | yüzey | boştayken | canlıyken |
 * |---|---|---|
 * | dashboard | `orbiting` (yörüngede) | listening/thinking/speaking |
 * | chat | `speaking` (konuşuyor) | listening/thinking/speaking |
 * | **login** | `orbiting` — HER ZAMAN | yok; bağlanırken `success` |
 *
 * ⚠️ **PANELDE BİR DE UYKU DÖNGÜSÜ VAR** (2026-09-14, istek üzerine): ekranda
 * 5 saniye aksiyon olmazsa maskot `sleeping`e geçiyor, ilk fare hareketinde
 * `greeting` oynayıp varsayılanına dönüyor. Mekanizma `useOrbIdleState`te ve
 * YALNIZ panelde + YALNIZ maskot seçiliyken bağlanıyor: sohbette küre
 * gerçekten dinliyor/düşünüyor/konuşuyor ve uyuyan bir orb o göstergeyi
 * yalanlardı; giriş ekranında ise tek ve kesintisiz bir hareket isteniyordu.
 *
 * ⚠️ **LOGIN CANLI DURUMU HİÇ OKUMAZ — SAHADA BİLDİRİLEN TAKILMA** (2026-09-13:
 * *"loginde galiba iki agent durumu oluyor, takılıyor gibi; yörüngede olacak
 * sadece ve akıcı olsun"*). Giriş ekranının `orbState`i karşılama sesi
 * çalarken `idle → speaking → idle` diye gidiyor, kulaklık kapalıysa
 * `listening` de giriyor. KÜRE için bu pürüzsüz bir `motion` geçişi; MASKOT
 * için değil — her durum SVG'yi yeni bir `<style>` bloğuyla yeniden kuruyor ve
 * 25 keyframe'in hepsi sıfırdan başlıyor. Ekranda görünen şey "iki durum
 * çekişiyor" ve takılma. Giriş ekranında maskot tek bir hareketi, kesintisiz
 * oynuyor.
 *
 * ⚠️ **"BAĞLAN"DAN SONRA `success`** (aynı istek: *"bağlan butonundan sonra orb
 * tek kalıyor, orada Tamamlandı agent durumu olabilir"*). O anda kabuğun
 * tamamı soluyor ve ekranda yalnız küre kalıyor; `success`in gövde animasyonu
 * `celebrate` ve kaynakta `count: 1`, yani BİR KEZ oynayıp duruyor — sonsuz
 * dönen bir kutlama yerine tek bir "oldu" hareketi.
 * ⚠️ İfade DEĞİŞMEZ, nötr kalır: "loginde ifade nötr olacak" ilk isteğin kendi
 * cümlesi. Anı gövde hareketi taşıyor.
 *
 * ⚠️ **KÜRE YOLU BU DEĞİŞİKLİKTEN ETKİLENMEZ.** `state` prop'u ona AYNEN
 * gidiyor; giriş ekranında handoff boyunca `speaking` kalması bilinçli bir
 * karardı (LoginPage'te yazılı: "son nefes atışı"). `connecting` yalnız
 * maskot dalının okuduğu ayrı bir işaret.
 *
 * ⚠️ **CANLI DURUM VARSAYILANI EZER — ama yalnız sohbette ve panelde.**
 * Sohbette küre gerçekten dinliyor/düşünüyor/konuşuyor ve o, ekrandaki TEK
 * ilerleme göstergesi.
 *
 * ⚠️ **`level` MASKOTA GEÇMEZ.** Küre ses seviyesiyle nefes alıyor; maskotun
 * konuşma ritmi kendi keyframe'inde (`talk` + `body-talk`) ve kaynağın böyle
 * bir girdisi yok. Uydurma bir eşleme (ör. `speed = 1 + level`) kaynağın
 * ölçülmüş ritmini bozardı.
 *
 * ── RENK ───────────────────────────────────────────────────────────────
 *
 * Palet → üç renk köprüsü `mascotPalette.js`te. Login BİLİNÇLİ İSTİSNA:
 * `usePalette()` orada hâlâ KULLANICININ paletini döndürüyor (sağlayıcı yalnız
 * `data-palette` özniteliğini sabitliyor, durumu değil), yani paleti oradan
 * okuyan bir küre giriş ekranını kişiselleştirirdi. İstek açıktı: *"login
 * hariç, loginde her zaman kurumsal uygulama rengi olacak."*
 *
 * ── PAKET AĞIRLIĞI ─────────────────────────────────────────────────────
 *
 * ⚠️ Maskot TEMBEL. `LoginPage` tembel DEĞİL (App.jsx'te düz import) ve giriş
 * paketi 510 KB gz sınırına yakın; maskot çizicisi (21 KB ham) oraya statik
 * bağlansaydı `sphere` seçen — yani varsayılandaki HERKES — hiç görmeyeceği bir
 * dosyayı indirirdi. `Suspense` boşluğunu kürenin KENDİ kutusu kadar bir yer
 * tutucu dolduruyor, yani maskot inerken düzen zıplamıyor.
 */
const MascotOrb = lazy(() => import("@/components/brand/mascot/MascotOrb"))

/** Yüzey boştayken maskotun oynadığı durum — istekte yazılı. */
const IDLE_STATE = {
  login: "orbiting",
  dashboard: "orbiting",
  chat: "speaking",
}

/**
 * Canlı ajan durumunu maskota TAŞIYAN yüzeyler. Login listede YOK: orada
 * durum tek ve kesintisiz (gerekçe yukarıda).
 */
const LIVE_SURFACES = new Set(["chat", "dashboard"])

/** Uygulamanın dört durumu → maskotun karşılıkları. `idle` yüzeye düşer. */
const LIVE_STATE = {
  listening: "listening",
  thinking: "thinking",
  speaking: "speaking",
}

/** Maskotun tuvalindeki küre oranı — yer tutucu kutu da onu kullanmalı. */
const ORB_RATIO = 342 / 440

export function BrandOrb({
  surface = "chat",
  state = "idle",
  /**
   * ⚠️ **İFADEYİ DURUM SEÇSİN** — kullanıcının kayıtlı tercihi DEĞİL.
   *
   * `mascot.mjs:79` geçerli bir `expression` verildiğinde durumun kendi
   * ifadesini EZİYOR ve tercihin varsayılanı `neutral`. Sonuç: küre
   * `thinking` durumundayken yüzü nötr kalıyordu — "Düşünüyor, Nötr".
   * Ekranda durumun kendisi okunmuyordu (aynı tuzak uyku ve selamlamada
   * da vardı ve orada `idleState` ile çözülmüştü).
   *
   * ⚠️ Bu BİR YÜZEY KARARI, genel bir kural değil. Sohbette küre asistanın
   * YÜZÜ ve kullanıcının seçtiği ifade onundur — orada ezmek, kişinin
   * stüdyoda yaptığı seçimi görmezden gelmek olurdu. Kutularda ise küre
   * bir DURUM GÖSTERGESİ: tek işi "bekliyor mu, cevap geldi mi" demek, ve
   * bunu ancak ifadesi durumdan gelirse söyleyebilir.
   */
  expressive = false,
  /**
   * ⚠️ **MASKOTUN KENDİ DURUMU — dört durumun eşlemesini ATLAR.**
   *
   * Uygulamanın küresi dört durum konuşuyor, maskotun 17 durumu var ve
   * eşleme tablosu (`LIVE_STATE`) yalnız üçünü karşılıyor. Geri kalan 14'ü
   * bugüne kadar hiçbir çağrı yerinden istenemiyordu: `syncing`,
   * `waiting`, `searching`, `working`, `error`… hepsi kaynakta duruyor ve
   * hiçbiri ekranda çıkmıyordu.
   *
   * Bir yüzey kendi işini dört durumdan daha iyi biliyorsa onu söyleyebilir.
   * İlk kullanıcısı izin bekleme örtüsü: orada olan şey "düşünmek" değil,
   * kullanıcı adına iki tarafın izinlerini karşılıklı kurmak — yani
   * `syncing` ("iki ışık akışı birbirini yakalar").
   *
   * ⚠️ **KÜRE YOLU BUNU HİÇ OKUMAZ.** `state` ona aynen gidiyor; küreyi
   * seçen kullanıcı için tek piksel değişmiyor. O yüzden çağrı yeri İKİSİNİ
   * de verir: küre için `state`, maskot için `mascotState`.
   *
   * ⚠️ **UYKUYU DA EZER** (`idleState`in üstünde). Uyku panelde 5 saniye
   * hareketsizlikte geliyor; açıkça bir iş bildiren bir durumun üstüne
   * uyumak, ekranda dönen işi yalanlamak olurdu.
   *
   * ⚠️ Tanınmayan bir ad sessizce `idle`a düşer (`renderV2Mascot` geçerli
   * durumlar dışındakini kabul etmiyor) — yani yazım hatası ekranı boş
   * bırakmaz.
   */
  mascotState: mascotStateProp,
  // Yalnız giriş ekranı verir ve yalnız MASKOT dalı okur: "Bağlan"a basıldı,
  // kabuk soluyor, ekranda tek başına küre kalıyor.
  connecting = false,
  level = 0,
  size = 220,
  onClick,
  className,
  showIcon = false,
  /**
   * Maskotun OKUMA kipi: profilden sağa dönüp yanındaki metnin satırlarını
   * tarar (`TyroMascot` › `reading`). Açıkken imleç takibi o örnekte kapanır.
   * Küre görünümünde göz yok — orada yok sayılır.
   */
  reading = false,
  /**
   * Gözler imleci SAYFANIN her yerinde izler (`TyroMascot` › `"page"`), yalnız
   * kürenin üstündeyken değil. İlk kullanıcı Akışım'ın yardım kartı (istek,
   * 2026-09-29: *"orbun gözleri sayfadaki mouse hareketlerimi takip etsin"*).
   * Kullanıcının stüdyodaki "imleci izle" ayarı yine geçerli.
   */
  trackPage = false,
  /**
   * Uyanıkken maskotun durumu — `mascotState`ten FARKI uykuyu EZMEMESİ:
   * `mascotState` her şeyin üstünde (uyku dahil), `restState` uykunun ve
   * selamlamanın ALTINDA. Yüzeyin varsayılanı panelde `orbiting` ve o durum
   * yüzü kendi animasyonuyla sağa sola çeviriyor (`yaw`) — sayfa boyu takiple
   * aynı yüzü iki şey sürerdi.
   */
  restState,
  // ⚠️ İKİ GÖRÜNÜM AYNI ADI SÖYLEMEK ZORUNDA. Küre kökü her zaman bir
  // <button> ve adı sabit İngilizceydi; maskot dalı kendi düğmesini
  // çiziyor. Ad burada tek yerden veriliyor, yoksa görünüm değiştiren
  // kişinin ekran okuyucusu aynı düğmeyi iki farklı adla okurdu.
  ariaLabel,
}) {
  const style = useOrbStyle()
  const settings = useMascotSettings()
  const { palette } = usePalette()
  // ⚠️ Kanca KOŞULSUZ çağrılır (kuralın kendisi), ama `enabled` kapalıyken
  // içeride hiçbir dinleyici ve zamanlayıcı kurulmuyor — küre seçiliyken
  // maliyeti sıfır.
  const idleState = useOrbIdleState({
    enabled: style === "mascot" && surface === "dashboard",
    speed: settings.speed,
  })

  if (style !== "mascot") {
    return (
      <PastelVoiceOrb
        state={state}
        level={level}
        size={size}
        onClick={onClick}
        className={className}
        showIcon={showIcon}
        ariaLabel={ariaLabel}
      />
    )
  }

  // ⚠️ Palet KİMLİĞİ geçiyor, çözülmüş renk DEĞİL: rengi çözen tablo
  // `mascot.mjs`i okuyor ve bu dosya giriş paketinde — çözümü burada yapmak
  // 21 KB'lık çiziciyi ilk yüke bindirirdi (ölçüldü, bkz. `MascotOrb.jsx`).
  const paletteId = surface === "login" ? LOGIN_PALETTE : palette
  // Uyku/selamlama HER ŞEYİ EZER: o iki durum kullanıcının o anda ekranda
  // gördüğü şeyin kendisi ve yalnız panelde doğabiliyor.
  const mascotState =
    mascotStateProp ??
    idleState ??
    restState ??
    (LIVE_SURFACES.has(surface)
      ? (LIVE_STATE[state] ?? IDLE_STATE[surface] ?? "idle")
      : connecting
        ? "success"
        : (IDLE_STATE[surface] ?? "idle"))
  const boxWidth = Math.round(size / ORB_RATIO)

  const mascot = (
    <Suspense
      fallback={
        // Yer tutucu maskotun KUTUSU kadar (470/440 oranında), kürenin kendisi
        // kadar değil: parça inince satırın yüksekliği değişmesin.
        <span
          aria-hidden="true"
          className="block"
          style={{ width: boxWidth, height: Math.round((boxWidth * 470) / 440) }}
        />
      }
    >
      <MascotOrb
        decorative
        state={mascotState}
        /* ⚠️ **UYKU VE SELAMLAMADA İFADE KAYNAĞA BIRAKILIR.** Ölçüldü: kayıtlı
           ifade (varsayılan `neutral`) geçilince başlık "Uyku, Nötr" çıkıyor,
           yani küre GÖZLERİ AÇIK uyuyordu — durumun kendisi okunmuyordu.
           `expression` verilmeyince `renderMascot` durumun kendi varsayılanını
           seçiyor (`sleeping` → kapalı gözler, `greeting` → mutlu), ki bu
           stüdyodaki kuralın da aynısı. Kullanıcının seçtiği ifade öteki tüm
           durumlarda aynen geçerli. */
        expression={idleState || expressive ? undefined : settings.expression}
        paletteId={paletteId}
        mesh={settings.mesh}
        meshIntensity={settings.meshIntensity}
        meshSpread={settings.meshSpread}
        glow={settings.glow}
        gloss={settings.gloss}
        speed={settings.speed}
        blink={settings.blink}
        followPointer={reading ? false : settings.follow ? (trackPage ? "page" : true) : false}
        reading={reading}
        size={size}
      />
    </Suspense>
  )

  // Tıklanabilirlik ÇAĞIRANIN kararı: küre bazı yerlerde düğmenin kendisi
  // (sohbet), bazı yerlerde adı olan bir sarmalayıcının içinde (login,
  // dashboard). `onClick` yoksa düğme de çizilmez — boş bir sekme durağı
  // bırakmamak için.
  if (!onClick) {
    return <div className={cn("grid place-items-center", className)}>{mascot}</div>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? "TYRO"}
      className={cn(
        "relative grid place-items-center rounded-full border-0 bg-transparent p-0 outline-none",
        "appearance-none focus-visible:ring-2 focus-visible:ring-brand-via/40",
        className,
      )}
      // iOS Safari'nin düğme dolgusunu ve dokunma vurgusunu söndürür —
      // `PastelVoiceOrb`ta da aynı satır var, aynı sebeple.
      style={{
        WebkitAppearance: "none",
        WebkitTapHighlightColor: "transparent",
        background: "transparent",
      }}
    >
      {mascot}
    </button>
  )
}
