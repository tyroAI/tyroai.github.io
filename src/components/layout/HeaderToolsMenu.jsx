import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import FilterHorizontalIcon from "@hugeicons/core-free-icons/FilterHorizontalIcon"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  HEADER ARAÇ MENÜSÜ — dört yüzey tek düğmenin altında (gooey)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * İstek (2026-09-11): *"sağ üstteki 4 tane ikonu tek ikon altında
 * toplayacağız, radial menü yapmak istiyorum liquid gooey tarzı. Ana
 * header ikonu `FilterHorizontalIcon` olabilir, tıklayınca aşağı doğru
 * dört ikon belirsin."* Kütüphaneyi ve örneği kullanıcı verdi
 * (`liquid-gooey`, `Liquid` + `Liquid.Item` x/y + bouncy geçiş).
 *
 * Menünün içinde TEMA · RENK PALETİ · DİL · DOSYALAR var; posta · takvim ·
 * zil satırda kalır (2026-09-11, ikinci tur — ilk tur yanlış dörtlüyü
 * toplamıştı). Menü satırın SOL ucunda durur.
 *
 * ⚠️ **YAY, KOLON DEĞİL** (2026-09-11, istek üzerine: *"bu yanyana üçlü
 * yukarı doğru açıyor, bana aşağıya doğru dörtlü açılması lazım —
 * resimdekinin ters versiyonu gibi"*). Bir tur DİKEY KOLON yazılmıştı ve
 * gerekçesi "dört panel dört farklı x'ten sarkmasın"dı; kullanıcı yayı
 * istedi, karar onun. Geometri tek yerde (`fanOffsets`): yarıçap sabit,
 * komşu iki öğe arası `SPREAD` derece ve yay AŞAĞI BAKAN eksene göre
 * simetrik — yani öğe sayısı değişince dizilim kendini yeniden ortalar.
 *
 * ⚠️ **SIRA SOLDAN SAĞA OKUNUR.** `items` dizisinin sırası yayda soldan
 * sağa çizilir; dikey kolondaki yukarıdan aşağı okumanın karşılığı budur.
 *
 * ⚠️ **`filterPadding` YAYIN ERİŞİMİNİ KAPSAMAK ZORUNDA.** Sıvı filtresinin
 * bölgesi grubun kutusudur (yalnız ana düğme, 36px) + bu pay; varsayılan
 * 24px, oysa öğeler merkezden 66px uzağa gidiyor. Küçük kalırsa uçan
 * damlalar kenarda KESİLİR — hareketin tamamı zaten kutunun dışında geçiyor.
 *
 * ⚠️ **AÇIK MENÜ PORTALDA YAŞAR — `z-50`, `position: fixed`.** İlk sürümde
 * header'ın İÇİNDE, akışta duruyordu ve sahada kırıldı: *"üzerine gelince
 * tooltip çıkmıyor, tıklanmıyor, arkasına basmış gibi oluyorum… diğer
 * sayfalarda bazısında silik görünüyor, bazısında altta kalıyor."* Sebep
 * boya sırası — yay header'ın kutusunun 80px ALTINA sarkıyor, header
 * `z-index: auto` ve sayfa kabı DOM'da ondan SONRA geliyor; sayfanın
 * konumlanmış her yüzeyi yayın üstüne biniyor. Camlı bir panel altındaki
 * yayı hem bulanıklaştırıyor (silik) hem tıklamayı yutuyor.
 *
 * ⚠️ **BU HATA İZOLE HARNESS'TA GÖRÜNMEZ** ve bir tur öyle oldu: ölçüm
 * öğeleri `el.click()` ile tetikliyordu, o da isabet testini ATLAR.
 * `document.elementFromPoint(merkez)` sormak şart — bu depoda portal
 * katmanı için bir kez daha öğrenilen kural (bkz. `overlayHost.tsx`).
 *
 * ⚠️ **TETİKLEYİCİ SATIRDA KALIR, YALNIZ ÖĞELER PORTALA GİDER.** Düğmeyi de
 * taşımak onu yeniden mount ederdi: klavye odağı kaybolur ve erişilebilirlik
 * ağacında bir an iki düğme olurdu. Bedeli sıvının tetikleyiciyle
 * BİRLEŞMEMESİ — ama dinlenme hâlinde aralarında 30px var ve 6'lık bulanıklık
 * onu zaten köprülemiyordu; dört öğe kendi aralarında birleşmeye devam ediyor.
 *
 * ⚠️ **KUTU TETİKLEYİCİNİN KUTUSUDUR.** Portal sarmalayıcısı ölçülen
 * `left/top/width/height` ile çiziliyor, yani `absolute inset-x-0 top-0`
 * hâlâ tetikleyicinin kutusuna oturuyor ve yay ofsetleri DEĞİŞMİYOR. Kutu
 * `pointer-events: none` (altındaki gerçek tetikleyici tıklanabilir kalsın),
 * öğeler `pointer-events: auto`.
 *
 * ⚠️ **ÖLÇÜM TIKLAMA ANINDA, EFEKTTE DEĞİL.** Efektte `setState` yazmak
 * `react-hooks/set-state-in-effect`e takılıyor (bu depoda bir kez deploy
 * kapısını düşürdü); açılış zaten bir olay, kutuyu orada okumak hem doğru
 * hem bedava. Açıkken `resize` dinlenir — yoğunluk kuralı kök yazıyı
 * değiştirince tetikleyici de küçülüyor.
 *
 * ⚠️ **SIVI TEMBEL YÜKLENİR.** `liquid-gooey` giriş paketine binseydi
 * header ilk boyamada onu da indirirdi; menü ise çoğu oturumda hiç
 * açılmıyor. Kapalıyken yalnız ana düğme çizilir (sıvıya gerek yok),
 * modül ilk AÇILIŞTA iner. `Suspense` boşluğu düz düğmelerle doldurur —
 * yani chunk inerken bile menü ÇALIŞIR, sadece gooey birleşme gecikir.
 *
 * ⚠️ **KAPALIYKEN ÖĞELER DOM'DA YOK.** Üst üste yığılmış dört görünmez
 * düğme, sekme sırasında dört boş durak ve ekran okuyucuda dört yalan
 * demekti. Açıldığında geliyorlar, kapandığında gidiyorlar.
 *
 * ⚠️ **PANEL AÇIKKEN MENÜ KAPANMAZ.** Dört panelin hepsi PORTALDA yaşıyor;
 * "dışarı tıklandı" sayılıp menü kapansaydı panel de onunla sökülürdü.
 * `data-header-tools-layer` ve mevcut `data-files-layer` işaretleri bunun
 * için — aynı desen `FilesPopover`ın hover kartında ve "⋯" menüsünde de
 * var (bkz. `Header.jsx`).
 *
 * ⚠️ **MENÜDE ROZET TAŞIYAN HİÇBİR ŞEY YOK — ve bu bilinçli.** İlk tur
 * posta · takvim · zili buraya koymuştu ve sahada geri alındı: o üçü
 * OKUNACAK BİR ŞEY taşıyor (okunmamış posta, bugünün etkinliği, bütçe
 * aşımı) ve sayıları satırdan görünmeli. Menünün içindekiler ARA SIRA
 * açılan araçlar — tema · palet · dil · dosyalar. Ana düğmede sayaç
 * olmamasının sebebi de bu: sayacı olan hiçbir şey içeride değil.
 */
const Liquid = lazy(() => import("liquid-gooey").then((m) => ({ default: m.Liquid })))
const LiquidItem = lazy(() => import("liquid-gooey").then((m) => ({ default: m.Liquid.Item })))

/**
 * ⚠️ **İLK AÇILIŞ TAKILIYORDU — SEBEP İNDİRME DEĞİL, DEĞERLENDİRME.**
 * (2026-09-13, sahada bildirildi: *"tools butonuna tıklayınca 4'lü radial menü
 * çok yavaş açılıyor, takılarak, ilk seferde."*)
 *
 * Parça zaten `modulepreload` ile peşin iniyor, yani ağ beklemesi yok. Ama
 * `lazy()` modülü ANCAK ilk render'da DEĞERLENDİRİYOR; tıklama anında React
 * `Suspense` boşluğunu (düz düğmeler) çiziyor, modül çalışıyor, sonra gerçek
 * sıvı ikinci bir boyamada geliyor. Ekranda görünen şey iki adımlı bir açılış
 * — "takılarak". Üstüne gooey bir SVG FİLTRESİ (`feGaussianBlur` +
 * `feColorMatrix`, 96px'lik bölge) ve o filtrenin İLK rasterizasyonu da ilk
 * açılışa düşüyordu.
 *
 * ⚠️ **MODÜLÜ ÖNDEN `import()` ETMEK YETMEDİ — ÖLÇÜLDÜ.** `React.lazy` kendi
 * durumunu İLK RENDER'da kuruyor: modül kayıtta hazır olsa bile ilk çizimde
 * askıya alıyor, boşluğu gösteriyor ve ancak bir sonraki commit'te gerçek
 * bileşeni basıyor. Ölçüm bunu doğruladı — önden `import()` varken bile
 * `sawSuspenseFallback: true`.
 *
 * Çare bileşeni de ısıtmak: boşta BİR KEZ görünmez bir `<Liquid>` çizilir,
 * `lazy`nin durumu "çözüldü"ye geçer ve aynı turda gooey SVG filtresi de bir
 * kez rasterize olur (asıl pahalı ilk kare oydu). Isıtma kısa ömürlü —
 * sökülüyor, yani arkada duran bir filtre katmanı kalmıyor.
 *
 * Üç tetikleyici: mount'tan sonra BOŞTA (`requestIdleCallback`, ilk boyamayla
 * yarışmaz), tetikleyiciye imleç/odak gelince (niyet belli).
 *
 * ⚠️ Parça giriş paketine BAĞLANMIYOR: bu hâlâ dinamik `import()`, yani
 * `dist/index.html` peşin YÜKLEYEBİLİR ama bundle'a girmez ve `initial-js`
 * ölçümü değişmez.
 */
let liquidPromise = null
function preloadLiquid() {
  if (!liquidPromise) liquidPromise = import("liquid-gooey")
  return liquidPromise
}

/** Özgün örnekteki yay geçişi — `liquid-gooey`nin `bouncy` preset'i de aynı
 *  karakterde ama kullanıcının verdiği eğri birebir korunuyor. */
const SPRING = { duration: 550, ease: "cubic-bezier(0.34, 1.56, 0.64, 1)" }

/** Yayın yarıçapı (px) ve komşu iki öğe arasındaki açı (derece).
 *  Kiriş = 2·R·sin(SPREAD/2) = 38,6px > 36px düğme, yani öğeler yan yana
 *  değmiyor; yarıçap düğmenin yarıçapını iki kez aştığı için ana düğmeyle
 *  de çakışmıyor. */
const RADIUS = 66
const SPREAD = 34

/** Birleşmiş siluetin gölgesi — uygulamanın `PopoverContent`i ne taşıyorsa o:
 *  `ring-1 ring-foreground/10` + `shadow-md`. Sıvı kendi zeminini
 *  `var(--popover)` ile boyuyor ve AÇIK TEMADA o zemin sayfayla aynı beyaz;
 *  halka olmadan dört öğe boşlukta duran çıplak glifler olarak okunuyordu
 *  (ölçüldü, ilk yayda tam bu oldu). Renkler token, yani koyu temada da
 *  kendiliğinden dönüyor. */
const SURFACE_SHADOW = [
  "0 0 0 1px color-mix(in oklab, var(--foreground) 10%, transparent)",
  "0 4px 6px -1px rgb(0 0 0 / 0.10)",
  "0 2px 4px -2px rgb(0 0 0 / 0.10)",
].join(", ")

/** Aşağı bakan eksene göre simetrik yay. 0° tam aşağı; x sağa, y aşağı. */
function fanOffsets(count) {
  const mid = (count - 1) / 2
  return Array.from({ length: count }, (_, i) => {
    const rad = ((i - mid) * SPREAD * Math.PI) / 180
    return { x: Math.round(RADIUS * Math.sin(rad)), y: Math.round(RADIUS * Math.cos(rad)) }
  })
}

export function HeaderToolsMenu({ items, className }) {
  const { t } = useLocale()
  const fan = fanOffsets(items.length)
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState(null)
  const rootRef = useRef(null)

  /** Tetikleyicinin GÖRÜNEN kutusu — portal tam oraya oturur.
   *  ⚠️ Kök `div` ölçülür, ARADAKİ bir sarmalayıcı değil: `display: contents`
   *  taşıyan bir eleman kutu ÜRETMEZ ve `getBoundingClientRect()` sıfır döner
   *  (bir tur öyle yazıldı). Kök yalnız tetikleyiciyi sarıyor, yani kutusu
   *  düğmenin kutusudur. */
  const measure = useCallback(() => {
    const r = rootRef.current?.getBoundingClientRect()
    if (r) setBox({ left: r.left, top: r.top, width: r.width, height: r.height })
  }, [])

  const toggle = () => {
    if (!open) measure()
    setOpen((v) => !v)
  }

  /* Görünmez ısıtma turu: `lazy` çözülsün ve gooey filtresi bir kez
     rasterize olsun. Bitince sökülür. */
  const [warming, setWarming] = useState(false)
  const warmed = useRef(false)
  const warm = useCallback(() => {
    if (warmed.current) return
    warmed.current = true
    preloadLiquid()
    setWarming(true)
  }, [])

  useEffect(() => {
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(warm, { timeout: 2500 })
      : window.setTimeout(warm, 1200)
    return () => {
      if (window.requestIdleCallback && window.cancelIdleCallback) window.cancelIdleCallback(idle)
      else window.clearTimeout(idle)
    }
  }, [warm])

  useEffect(() => {
    if (!warming) return
    const id = window.setTimeout(() => setWarming(false), 700)
    return () => window.clearTimeout(id)
  }, [warming])

  /* Dışarı tıklama ve Escape. Radix'in kendi `onInteractOutside`ı yok —
     bu bir popover değil, kendi kabuğu. Panellerin portalı "dışarı"
     sayılmaz (yukarıdaki not). Menünün KENDİ portalı da öyle: iki kök de
     `data-header-tools-layer` taşıyor. */
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      const el = e.target
      if (!(el instanceof Element)) return
      if (rootRef.current?.contains(el)) return
      if (el.closest("[data-header-tools-layer]") || el.closest("[data-files-layer]")) return
      if (el.closest("[data-radix-popper-content-wrapper]")) return
      setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onDown, true)
    document.addEventListener("keydown", onKey)
    window.addEventListener("resize", measure)
    return () => {
      document.removeEventListener("pointerdown", onDown, true)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", measure)
    }
  }, [open, measure])

  const trigger = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("header.tools")}
          aria-expanded={open}
          onClick={toggle}
          // Niyet belli: imleç ya da odak gelince beklemeden çöz.
          onPointerEnter={warm}
          onFocus={warm}
          className={cn(
            "size-9 rounded-xl [&_svg]:!size-5 relative pointer-coarse:after:absolute pointer-coarse:after:-inset-1",
            open && "bg-accent text-foreground",
          )}
        >
          <HugeiconsIcon icon={FilterHorizontalIcon} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("header.tools")}</TooltipContent>
    </Tooltip>
  )

  /* Kapalıyken sıvı hiç kurulmaz: modül inmez, SVG filtresi çizilmez. */
  return (
    <div ref={rootRef} data-header-tools-layer="" className={cn("relative shrink-0", className)}>
      {trigger}
      {/* Isıtma: ekranın dışında, etkileşimsiz, erişilebilirlik ağacında yok. */}
      {warming && !open ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed opacity-0"
          style={{ left: -9999, top: 0, width: 36, height: 36 }}
        >
          <Suspense fallback={null}>
            <Liquid contrast={17} fill="var(--popover)" filterPadding={96} className="size-full">
              <LiquidItem x={0} y={0} transition={SPRING}>
                <span className="block size-9" />
              </LiquidItem>
            </Liquid>
          </Suspense>
        </div>
      ) : null}
      {open && box
        ? createPortal(
            <div
              data-header-tools-layer=""
              className="pointer-events-none fixed z-50"
              style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            >
              <Suspense fallback={<OpenFallback items={items} fan={fan} />}>
                <Liquid
                  contrast={17}
                  fill="var(--popover)"
                  shadow={SURFACE_SHADOW}
                  filterPadding={96}
                  className="relative size-full"
                  // Filtre kendi katmanına alınır: gooey her karede blur +
                  // eşikleme yapıyor ve katman olmadan ilk kare pahalı.
                  style={{ willChange: "filter" }}
                >
                  {items.map((item, i) => (
                    <LiquidItem
                      key={item.id}
                      x={fan[i].x}
                      y={fan[i].y}
                      transition={SPRING}
                      delay={i * 40}
                      className="pointer-events-auto absolute inset-x-0 top-0 z-20"
                    >
                      {item.node}
                    </LiquidItem>
                  ))}
                </Liquid>
              </Suspense>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

/** Sıvı chunk'ı inerken: aynı yay, sıvısız. Menü çalışır durumda kalır. */
function OpenFallback({ items, fan }) {
  return (
    <div className="relative size-full">
      {items.map((item, i) => (
        <div
          key={item.id}
          className="pointer-events-auto absolute inset-x-0 top-0 z-20"
          style={{ transform: `translate(${fan[i].x}px, ${fan[i].y}px)` }}
        >
          {item.node}
        </div>
      ))}
    </div>
  )
}
