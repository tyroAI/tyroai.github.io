/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ÇENTİĞİN GEOMETRİSİ — ray, Tercihler önizlemesi ve dikey konum
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Neden ayrı dosya: kabuk sınıfı `EdgeNotch` ile `EdgeNotchDesignPicker`da
 * BİREBİR KOPYAYDI ve önizlemenin "seçilen şey tam olarak görülecek şey"
 * sözü kopyanın güncellenmesine bağlıydı. Bir de bileşen dosyasından sabit
 * ihraç etmek fast refresh'i bozuyor (deponun kuralı).
 *
 * ⚠️ **ÖLÇÜLER REM, PX DEĞİL — ÖLÇÜLMÜŞ HATA** (2026-09-21, sahada
 * bildirildi: *"MacBook'ta şöyle duran çentik Dell'de böyle duruyor, her
 * PC'de Mac'teki gibi dursun"*). Çentik baştan px yazılmıştı; oysa
 * `index.css` alçak pencerede kök yazıyı 16 → 12,8px'e indiriyor ve
 * uygulamanın geri kalanı (419 literal, 77 dosya) o yüzden rem. Sonuç
 * ölçüldü:
 *
 *   MacBook 1651×921  → kök 15,85px · ray 298px = 18,8rem eşdeğeri
 *   Dell    1518×718  → kök 12,80px · ray 298px = 23,3rem eşdeğeri
 *
 * Yani ray, ÇEVRESİNDEKİ arayüze göre Dell'de %24 büyük duruyordu. Ölçüler
 * rem olunca iki makinede de 18,625rem: aynı ekran, aynı oran.
 *
 * ⚠️ **KAPALI HÂLİN KAYMASI YÜZDE, PİKSEL DEĞİL.** Eski yorum px'i
 * "kapalı hâlin kayması px, rem'e çevrilirse şerit hesabı kayar" diye
 * savunuyordu ve o gerekçe gerçekti — ama çare rem'den kaçmak değil,
 * kaymayı rayın KENDİ genişliğinin yüzdesi olarak yazmak: motion `x`i
 * elemanın kendi kutusuna göre çözer, yani birim ne olursa olsun şerit
 * tam `NOTCH_HANDLE_STRIP_REM` kadar kalır.
 */

/** Rayın genişliği (referansın 90px'i). */
export const NOTCH_RAIL_REM = 5.625
/**
 * Daraltılmış hâlde ekranda kalan şerit — tutamak burada yaşıyor.
 * 22px @16: 16'lık şerit kenarda bir gölge gibi duruyordu, çentiği
 * daraltan kullanıcı onu bir daha nasıl açacağını bulamıyordu.
 */
export const NOTCH_HANDLE_STRIP_REM = 1.375
/** Silüetin gövdenin üstüne/altına taşan omuz payı (referansın 52px'i). */
export const NOTCH_BLEED_REM = 3.25

/** Rayın dolu yüksekliği: 2×py + 2×gap + 3×düğme. */
export const NOTCH_RAIL_H_REM = 2 * 1.5625 + 2 * 0.625 + 3 * 4.75 // 18.625

/**
 * Kapalıyken `translateX` — rayın KENDİ genişliğinin yüzdesi (yukarıdaki
 * not). Açılış animasyonu da yüzde: motion px ile % arasında birim
 * dönüşümü yapmak zorunda kalmasın.
 */
export const NOTCH_COLLAPSED_X = `${(((NOTCH_RAIL_REM - NOTCH_HANDLE_STRIP_REM) / NOTCH_RAIL_REM) * 100).toFixed(4)}%`
export const NOTCH_ENTER_X = "40%"

/**
 * DİKEY KONUM — ortalama değil, tabanlı-tavanlı.
 *
 * `50% - 4.125rem`   ortalamaya yakın duruş (4,125rem ≈ rayın %22'si)
 * `max(…, 25.25rem)` TABAN: dashboard hero'sunun orb'unun altını geçsin.
 *                    Orb SAYFANIN üstüne bağlı, çentik SABİT; ortalanan bir
 *                    çentik ekran kısaldıkça YUKARI çıkıp orb'a biniyordu
 *                    (1440×900'de 48px, 720'de 118px — ölçüldü).
 * `min(…, 100dvh - <taban>)` TAVAN: alttan taşmasın.
 *
 * ⚠️ **TAVAN OMUZU DA SAYAR — ÖLÇÜLMÜŞ HATA.** Eski tavan `100dvh - 320px`
 * yalnız gövdeyi kolluyordu; oysa silüetin omzu gövdenin 3,25rem ALTINA
 * taşıyor. Dell'de (718px) tavan bağlayıcı oluyor, ray dipten 22px'te
 * duruyor ve alt kavis ekranın **30px dışında** kalıyordu — kullanıcının
 * ikinci ekran görüntüsündeki "çentik farklı duruyor" tam olarak buydu.
 * Tavan artık gövde + omuz + 1,5rem nefes.
 *
 * ⚠️ Üç terim de REM: px bir taban, kök küçülürken küçülmeyen tek şey olur
 * ve kısa ekranda yine tavana çarpardı.
 */
const NOTCH_TOP_FLOOR_REM = 25.25
const NOTCH_TOP_CEIL_REM = NOTCH_RAIL_H_REM + NOTCH_BLEED_REM + 1.5 // 23.375
export const NOTCH_TOP = `min(max(50% - 4.125rem, ${NOTCH_TOP_FLOOR_REM}rem), calc(100dvh - ${NOTCH_TOP_CEIL_REM}rem))`

/**
 * Kabuğun yerleşim sınıfı — ray ve Tercihler önizlemesi AYNI dizeyi
 * kullanır. Genişliği çağıran verir (ray `w-full`, önizleme sabit).
 */
export const NOTCH_SHELL_CLASS =
  "flex flex-col items-center gap-[0.625rem] px-[0.5625rem] py-[1.5625rem] text-[var(--notch-ink)]"
