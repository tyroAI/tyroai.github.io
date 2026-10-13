import { memo, useEffect, useId, useMemo, useRef } from "react"
import { renderMascot } from "./mascot.mjs"
import { MascotMesh } from "./MascotMesh"

/**
 * MASKOT KÜRE — kullanıcının verdiği "tyroTrade Mascot Studio" paketinin
 * React sarmalayıcısı (2026-09-13, istek üzerine).
 *
 * ⚠️ **ÇİZİM KODU BİREBİR KOPYA.** `mascot.mjs` kaynaktan HİÇ DEĞİŞTİRİLMEDEN
 * alındı (noktalı virgülleri, iki boşluklu girintisi, Türkçe etiketleri dahil).
 * Bu dosyanın da iskeleti kaynağın `TyroMascot.jsx`i. Bu depoda üç kez
 * öğrenilen kural: *verilen bir tasarımda uyarlanan eksen SAYILIDIR — boyut ve
 * renk; üçüncü bir eksene dokunmak uyarlama değil, yeniden tasarımdır.*
 *
 * Kaynaktan sapan üç şey ve gerekçeleri:
 *
 * 1. **`size` GÖRÜNEN KÜRENİN ÇAPIDIR**, kutunun genişliği değil. Kaynakta
 *    `size` doğrudan sarmalayıcının genişliği; ama maskotun tuvali 440×470 ve
 *    kürenin kendisi (r=171 → 342) genişliğin **%77,7**'si. Bugünkü küre
 *    (`PastelVoiceOrb`) `size`ı ÇAP olarak alıyor, yani iki bileşen aynı sayıyı
 *    aynı anlamda kullanmak zorunda — yoksa görünüm değiştiren kişinin küresi
 *    ekranda %22 küçülürdü. Kutu bu yüzden `size / 0.777` genişlikte çiziliyor.
 * 2. **`memo` + `useMemo`** — sohbette küre konuşurken `ChatScreen` her 95 ms
 *    `speakingLevel` yazıyor (saniyede ~10,5 render) ve maskot o değeri hiç
 *    kullanmıyor. `useMemo` TEK BAŞINA YETMEDİ — ölçüldü: 11 ebeveyn render'ı
 *    11 SVG DEĞİŞİMİ üretti (`sameSvgNode: false`), yani 25 keyframe'in hepsi
 *    saniyede on kez baştan başlıyordu ve küre donuyordu. Sebep bu bileşenin
 *    YENİDEN ÇİZİLMESİ: her render yeni bir `{__html}` nesnesi, yeni bir
 *    `style` nesnesi ve yeni bir `onPointerMove` kapanışı üretiyor.
 *    `memo` render'ın kendisini durduruyor — prop'lar değişmedikçe DOM'a hiç
 *    dokunulmuyor.
 * 3. **`aria-hidden` geçişi** — çağrı yerlerinin çoğunda maskot zaten adı olan
 *    bir düğmenin içinde (`aria-label="Yeni sohbet başlat"` gibi). SVG'nin
 *    kendi `role="img"` + Türkçe `<title>`ı orada ikinci bir ad olurdu ve
 *    uygulama dört dilli. Stüdyoda geçilmez: orada başlık bilginin kendisi.
 *
 * ⚠️ **KİMLİK ÇAKIŞMASI GERÇEK BİR RİSKTİ.** Maskot her gradyanı, filtreyi ve
 * keyframe'i `id` ön ekiyle isimlendiriyor; aynı sayfada iki maskot aynı `id`
 * ile çizilirse ikincisinin tanımları birincisininkileri gölgeler ve iki küre
 * de tek bir renge düşer. Stüdyo sayfasında AYNI ANDA beş maskot var (sahne +
 * iki yerleşim önizlemesi + Tercihler'deki iki seçenek). Çare kaynağın kendi
 * çözümü: `useId()`. Ölçüldü (kurulu `react-dom@19.2.6`): çıktı `_r_0_`
 * (istemci) / `_R_1_` (hidrasyon) ve regex süzgeci hiçbir karakterini
 * düşürmüyor — benzersizliği taşıyan taban-32 sayaç zaten
 * `[a-zA-Z0-9_-]` içinde. Aynı süzgeç React 18'in `:r0:`ında ve 19.0/19.1'in
 * `«r0»`ında da yalnız ayraçları atıyordu, yani sürümden bağımsız güvenli.
 */

/** Kürenin tuvaldeki oranı: r=171 → çap 342, viewBox genişliği 440. */
const ORB_RATIO = 342 / 440

/**
 * SAYFA BOYU TAKİP (`followPointer="page"`, 2026-09-29). Yüzün en çok ne
 * kadar kayacağı (tuval birimi, 440×470 — kutunun takibi ±11/±8) ve tam
 * sapmanın başladığı uzaklık (px). Kutunun takibinden büyük, çünkü o yalnız
 * imleç kürenin ÜSTÜNDEYKEN çalışıyor; burada imleç ekranın öbür ucunda da
 * olabilir ve bakışın YÖNÜ okunmalı (istek: *"mouse'u sol çaprazımda
 * tutuyorsam o tarafa baksın"*).
 */
const PAGE_LOOK = { x: 26, y: 20, reach: 260 }
/** Yüzün kutudaki dikey yeri: y=243/470 (yüz animasyonlarının `transform-origin`i). */
const FACE_Y = 243 / 470

function TyroMascotImpl({
  expression,
  state = "idle",
  palette = "ocean-breeze-v2",
  colors,
  mesh = false,
  size = 240,
  accent,
  glow = 0.55,
  gloss = 0.8,
  speed = 1,
  blink = true,
  motion = true,
  /**
   * `true`: imleç KUTUNUN üstündeyken gözler onu izler (kaynağın davranışı).
   * `"page"`: imleç SAYFANIN neresinde olursa olsun gözler o YÖNE bakar
   * (Akışım'ın yardım kartı — kürenin üstü `pointer-events-none`, kutu
   * takibi orada hiç tetiklenmiyordu). Tek pencere dinleyicisi, kare başına
   * bir yazma (`requestAnimationFrame`), yumuşak geçiş CSS ile. Yalnız fare
   * ve kalem: dokunmatikte `pointermove` kaydırmanın kendisi, gözler
   * parmağın peşinden titrerdi. Hareketi azalt tercihinde çalışmaz.
   */
  followPointer = true,
  /**
   * OKUMA kipi: küre profilden SAĞA döner ve gözleri yanındaki metnin
   * satırlarını yukarıdan aşağı tarar (`index.css` › `[data-mascot-read]`).
   * İlk kullanıcı Akışım'ın özet balonu (istek: *"orb sağa, profilden bakmalı;
   * gözleri aşağı yukarı hareket etmeli, özet metnine bakmalı — karşıya, bize
   * bakmamalı"*). Açıkken imleç takibi kapanır: ikisi aynı grubu sürüyor.
   *
   * ⚠️ Kaynağın `lookX`/`lookY`i BU İŞ İÇİN YETMİYOR ve bir tur denendi:
   * ±12 birimle sınırlı, 440'lık tuvalde 40px'lik bir kürede ~1,3 piksel —
   * ekranda küre hâlâ karşıya bakıyordu (sahada görüldü). Okuma kipi aynı
   * `[data-look]` grubunu CSS ile sürüyor; kaynak dosyaya dokunulmuyor.
   */
  reading = false,
  meshIntensity = 1,
  meshSpread = 1,
  className,
  style,
  decorative = false,
  /** Yuvarlak gözlük (bakışla kayar, göz kırpınca ezilmez) — `mascot.mjs` › `specsMarkup`. */
  glasses = false,
  /**
   * Kutlama kıyafeti `{ hat: "party"|"tophat", outfit: "bowtie"|"medal", years }`
   * — `mascot.mjs` › `costumeMarkup` (Akışım'ın yardım kartı, kişinin kendi günü).
   * Şapka tuvalin ÜSTÜNE taşar; yer açmak çağıranın işi.
   */
  costume = null,
}) {
  const id = `tyro-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  const container = useRef(null)

  // Bakış sıfırlama DOM'a doğrudan yazar — `data-look` grubu her yeniden
  // çizimde `translate(0 0)` ile geliyor zaten; bu satır imleç kutunun
  // dışındayken kalan eski ötelemeyi de siler.
  const resetLook = () =>
    container.current?.querySelector("[data-look]")?.setAttribute("transform", "translate(0 0)")

  useEffect(() => {
    resetLook()
  }, [followPointer, motion, expression, state])

  function onPointerMove(event) {
    if (
      !followPointer ||
      followPointer === "page" ||
      reading ||
      !motion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 22
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 16
    container.current
      ?.querySelector("[data-look]")
      ?.setAttribute("transform", `translate(${x} ${y})`)
  }

  const costumeHat = costume?.hat ?? null
  const costumeOutfit = costume?.outfit ?? null
  const costumeYears = costume?.years ?? null
  const html = useMemo(
    () =>
      renderMascot({
        id,
        expression,
        state,
        palette,
        colors,
        // ⚠️ Kaynağın KENDİ mesh'i KAPALI: ayarlanabilir olanı `MascotMesh`
        // çiziyor (gerekçe orada). Kaynağın üç elipsi sabit, iki çarpanı yok
        // ve `mascot.mjs` birebir kopya olduğu için ona dokunulmuyor.
        mesh: false,
        accent,
        glow,
        gloss,
        speed,
        blink,
        motion,
        glasses,
        costume:
          costumeHat || costumeOutfit
            ? { hat: costumeHat, outfit: costumeOutfit, years: costumeYears }
            : null,
      }),
    // ⚠️ `colors` bir DİZİ, yani karşılaştırma KİMLİKLE yapılıyor. Çağıranlar
    // donmuş tablolardan veriyor (`mascotPalette.js`: hem maskotun kendi
    // `palettes` girdisi hem `SOLID_COLORS` modül düzeyinde sabit) ya da
    // durumdan (stüdyonun özel renkleri), yani kimlik gerçekten kararlı.
    // Her render'da yeni bir dizi üreten bir çağıran memoyu bozar — ölçüsü
    // `renderMascot`ın ~10 KB'lık dizesi, çıktı aynı kaldığı sürece DOM'a
    // dokunulmuyor ama dizeyi kurmak boşa gider.
    // ⚠️ Kıyafet İLKEL alanlarıyla karşılaştırılıyor: çağıran her render'da
    // yeni bir nesne verse de çizim (10 KB'lık dize) yeniden kurulmasın.
    [
      id,
      expression,
      state,
      palette,
      colors,
      accent,
      glow,
      gloss,
      speed,
      blink,
      motion,
      glasses,
      costumeHat,
      costumeOutfit,
      costumeYears,
    ],
  )

  const boxWidth = Math.round(size / ORB_RATIO)

  // ── Sayfa boyu takip ────────────────────────────────────────────────
  // ⚠️ Bakış CSS `transform`u ile yazılıyor, SVG niteliğiyle DEĞİL: yalnız
  // CSS özelliği `transition` alıyor (okuma kipinin de yolu). Birim `px` ama
  // SVG'nin içinde tuval birimi demek — `viewBox` ölçekliyor.
  const pageFollow = followPointer === "page" && !reading && motion
  const lookRef = useRef({ x: 0, y: 0 })
  useEffect(() => {
    if (!pageFollow) return undefined
    // Kap mount boyunca aynı eleman; içindeki `[data-look]` her çizimde
    // değişiyor, o yüzden o her seferinde kaptan yeniden aranıyor.
    const node = container.current
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    let raf = 0
    let pending = null
    const apply = () => {
      raf = 0
      const look = node?.querySelector("[data-look]")
      if (!node || !look || !pending) return
      const rect = node.getBoundingClientRect()
      const dx = pending.x - (rect.left + rect.width / 2)
      const dy = pending.y - (rect.top + rect.height * FACE_Y)
      const dist = Math.hypot(dx, dy)
      // YÖN birim vektörden, BÜYÜKLÜK uzaklıktan: imleç kürenin hemen
      // yanındayken yüz az döner, `reach`ten ötede tam döner.
      const k = dist ? Math.min(1, dist / PAGE_LOOK.reach) / dist : 0
      const x = Math.round(dx * k * PAGE_LOOK.x * 10) / 10
      const y = Math.round(dy * k * PAGE_LOOK.y * 10) / 10
      lookRef.current = { x, y }
      look.style.transition = "transform .35s cubic-bezier(.2,.7,.2,1)"
      look.style.transform = `translate(${x}px, ${y}px)`
    }
    const onMove = (event) => {
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return
      if (media.matches) return
      pending = { x: event.clientX, y: event.clientY }
      if (!raf) raf = requestAnimationFrame(apply)
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      cancelAnimationFrame(raf)
      const look = node?.querySelector("[data-look]")
      if (look) {
        look.style.transform = ""
        look.style.transition = ""
      }
    }
  }, [pageFollow])
  // ⚠️ Durum değişince SVG YENİDEN KURULUYOR (`html`) ve `[data-look]` yeni
  // bir eleman — bakış ortaya sıçrardı (ör. kartın üstüne gelince `listening`e
  // geçerken imleç duruyorsa). Son bakış yeni elemana GEÇİŞSİZ yazılır.
  useEffect(() => {
    if (!pageFollow) return
    const look = container.current?.querySelector("[data-look]")
    if (!look) return
    const { x, y } = lookRef.current
    look.style.transform = `translate(${x}px, ${y}px)`
  }, [html, pageFollow])

  // Mesh, kürenin ARKASINDA ve aynı `viewBox`ta: iki katman piksel piksel
  // hizalı. Sarmalayıcı `position: relative` olmak zorunda, yoksa mutlak
  // konumlu mesh sayfaya göre çözülür.
  const meshColors = colors ?? null

  return (
    <div
      ref={container}
      className={className}
      aria-hidden={decorative ? "true" : undefined}
      data-mascot-read={reading ? "" : undefined}
      style={{
        position: "relative",
        width: boxWidth,
        maxWidth: "100%",
        ...style,
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={resetLook}
    >
      {mesh && meshColors ? (
        <MascotMesh
          colors={meshColors}
          intensity={meshIntensity}
          spread={meshSpread}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        />
      ) : null}
      <div style={{ position: "relative" }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

/**
 * ⚠️ **`memo` ŞART, SÜS DEĞİL.** Ölçüldü (gerçek `TyroMascot`, headless):
 * memo'suz 11 ebeveyn render'ı 11 SVG değişimi; memo'lu 11 render'da SVG
 * düğümü AYNI kalıyor ve animasyonlar hiç kesilmiyor. `colors` bir dizi ama
 * kimliği kararlı (`mascotPalette.js` donmuş tablolardan veriyor), yani sığ
 * karşılaştırma yeterli — her render'da yeni dizi üreten bir çağıran memo'yu
 * bozar ve bu dosyanın tek sözleşmesi odur.
 */
const TyroMascot = memo(TyroMascotImpl)
export default TyroMascot
