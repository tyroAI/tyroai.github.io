import { useEffect, useRef, useState } from "react"

/**
 * PANELDEKİ MASKOTUN UYKU DÖNGÜSÜ (2026-09-14, istek üzerine).
 *
 * Kullanıcının sözü: *"sadece dashboard'da orb maskotu, mouse 5 sn hareket
 * etmeyince ve ekranda aksiyon olmayınca agent durumu uyku moduna geçsin;
 * uyku modundayken mouse hareket edince selamlıyor modunu yapıp varsayılan
 * moduna geri dönsün."*
 *
 * Üç durum, tek yön:
 *
 *   awake ──(5 sn aksiyon yok)──▶ asleep ──(aksiyon)──▶ greeting ──(2,4 sn)──▶ awake
 *
 * `awake` bir durum DEĞİL, "karışma" demek: çağıran kendi varsayılanını çizer
 * (panelde `orbiting`). Kanca yalnız `sleeping` ve `greeting` döndürür.
 *
 * ⚠️ **YALNIZ PANELDE VE YALNIZ MASKOTTA.** `enabled` kapalıyken hiçbir
 * dinleyici bağlanmıyor, hiçbir zamanlayıcı dönmüyor — küreyi seçen kişi bu
 * kodun varlığını hiç ödemiyor. Sohbette de kapalı: orada küre GERÇEKTEN
 * dinliyor/düşünüyor/konuşuyor ve uyuyan bir orb o göstergeyi yalanlardı.
 *
 * ⚠️ **HER FARE HAREKETİNDE `setState` YOK.** `pointermove` saniyede onlarca
 * kez tetikleniyor; olay yalnız bir REF'e zaman damgası yazıyor (kayıt
 * maliyeti sabit) ve saniyede BİR kez dönen tek bir sayaç eşiği kontrol
 * ediyor. Uyanma tek istisna: uyurken gelen ilk aksiyon anında durumu
 * değiştiriyor, çünkü orada gecikme kullanıcının hissedeceği şeyin ta kendisi.
 *
 * ⚠️ **SEKME GİZLİYKEN UYKUYA GEÇİLMEZ VE SAYAÇ İŞLEMEZ.** Maskotun kendi
 * kapısı sekme gizliyken boyamayı zaten durduruyor; orada geçen süreyi
 * "hareketsizlik" saymak, sekmeye dönen kişiyi hep uyanma animasyonuyla
 * karşılamak olurdu. Sekmeye dönmek AKSİYON sayılır.
 *
 * ⚠️ **SELAMLAMA SÜRESİ KAYNAĞIN KENDİ SÜRESİ.** `mascot.mjs`te
 * `greeting: ['greet', 2.4, '1']` — 2,4 sn ve BİR KEZ. Kullanıcının hız ayarı
 * animasyonu da bölüyor (`duration/speed`), o yüzden bekleme de bölünür;
 * yoksa hızlı ayarda maskot selamlamayı bitirip donuk bekler.
 */

/** Aksiyon sayılan olaylar. Hepsi pasif: hiçbiri varsayılanı engellemiyor. */
const ACTIVITY = ["pointermove", "pointerdown", "keydown", "wheel", "scroll", "touchstart"]

/** İstekte yazılı: 5 saniye. */
const SLEEP_AFTER_MS = 5000

/** Kaynağın `greet` animasyonu 2,4 sn ve bir kez oynuyor. */
const GREET_MS = 2400

export function useOrbIdleState({ enabled, speed = 1 }) {
  const [phase, setPhase] = useState("awake")
  const lastRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    lastRef.current = performance.now()

    /* ⚠️ **GÜNCEL DURUM GÜNCELLEYİCİDEN OKUNUR, REF AYNASINDAN DEĞİL.** Bir
       tur `phaseRef.current = phase` render sırasında yazılıyordu ve lint
       haklı olarak düştü ("Cannot access refs during render"). Güncelleyici
       biçimi hem o ihtiyacı ortadan kaldırıyor hem bedava bir kazanç veriyor:
       değer değişmiyorsa React yeniden çizmiyor, yani saniyede onlarca kez
       gelen `pointermove` uyanıkken HİÇBİR render üretmiyor. */
    const onActivity = () => {
      lastRef.current = performance.now()
      setPhase((p) => (p === "asleep" ? "greeting" : p))
    }
    const onVisible = () => {
      // Gizliyken geçen süre hareketsizlik değil; dönüş aksiyon sayılır.
      if (!document.hidden) onActivity()
    }

    for (const type of ACTIVITY) {
      window.addEventListener(type, onActivity, { passive: true })
    }
    document.addEventListener("visibilitychange", onVisible)

    const tick = window.setInterval(() => {
      if (document.hidden) return
      setPhase((p) =>
        p === "awake" && performance.now() - lastRef.current >= SLEEP_AFTER_MS ? "asleep" : p,
      )
    }, 1000)

    return () => {
      for (const type of ACTIVITY) window.removeEventListener(type, onActivity)
      document.removeEventListener("visibilitychange", onVisible)
      window.clearInterval(tick)
    }
  }, [enabled])

  // Selamlama bitince varsayılana dön. Ayrı bir efekt, çünkü süresi
  // `speed`e bağlı ve o değiştiğinde yeniden kurulmalı.
  useEffect(() => {
    if (phase !== "greeting") return
    const ms = GREET_MS / Math.max(0.4, Math.min(2, speed || 1))
    const id = window.setTimeout(() => setPhase("awake"), ms)
    return () => window.clearTimeout(id)
  }, [phase, speed])

  /* ⚠️ Kapalıyken durum TÜRETMEDE susturulur, efektte SIFIRLANMAZ: efekt
     gövdesinde `setState` `react-hooks/set-state-in-effect`e takılıyor (bu
     depoda bir kez deploy kapısını düşürmüş bir kural). Bedeli küçük ve
     bilinçli: maskotu uykudayken kapatıp geri açan kişi ilk fare hareketine
     kadar uyuyan küreyi görebilir — o hareket de zaten garanti, çünkü ayarı
     yeni tıkladı. */
  if (!enabled) return null
  return phase === "asleep" ? "sleeping" : phase === "greeting" ? "greeting" : null
}
