/**
 * Sidebar'daki YENİLİKLER KARTININ görünümü — kişisel bir tercih.
 *
 * Kart 2026-09-10'da istek üzerine geldi: sidebar'ın alt şeridindeki
 * "Yenilikler" düğmesi ve rozeti bir KARTA dönüştü — son yenilikler orada
 * sayfalanarak okunur, tam liste bir tık ötede. İKİ görünüm var, ikisi de
 * kullanıcının verdiği HTML tasarımların uyarlaması; hangisinin çizileceğini
 * kişi Profilim → Tercihler'den seçer.
 *
 * ⚠️ **`navy` (Derin Gradyan) 2026-09-11 AKŞAMI SİLİNDİ** (istek: "deep
 * gradient kartını kaldır, gerek yok artık") — Lansman özgün HTML'in
 * birebir hâli olunca sadeleştirilmiş yorumu gereksizleşti. İki görünüm
 * kaldı: Lansman · AI Hub.
 *
 * ⚠️ **`hub` (Akıllı Çip) VE `glacier` (Buz Camı) 2026-09-11'DE SİLİNDİ**
 * (istek üzerine: "smart chip ve frosted glass tasarımlarını kaldır").
 * `hub`, "AI Hub" HTML'inin serbest bir uyarlamasıydı; yerine aynı dosyanın
 * BİREBİR hâli `aihub` geldi — yeni kimlik, çünkü aynı kimliği yeni bir
 * tasarıma vermek, eski tercihi taşıyan tarayıcıda seçimi sessizce
 * değiştirmek olurdu. Eski kimlikler `VALID`den düştü → varsayılana döner.
 *
 * ⚠️ **DÖRDÜNCÜ BİR GÖRÜNÜM VARDI VE SİLİNDİ** (`aero`, 2026-09-11, istek
 * üzerine: "aero güzel olmamış istemiyorum sil"). Bizim Apple/iOS yorumumuzdu
 * ve tasarım turunda üç hakemin üçü de onu seçmişti — ama sahada beğenilmedi.
 * Kimlik listeden düştüğü için eski tercihi taşıyan tarayıcılar sessizce
 * varsayılana döner (`VALID` kontrolü).
 *
 * ⚠️ **İKİSİ DE AYNI VERİYİ GÖSTERİR.** Görünüm değişir, içerik değişmez:
 * aynı kayıtlar, aynı sıra, aynı okunmamış sayısı. Bir görünümün "daha az"
 * göstermesi bir tercih değil bir kusur olurdu.
 *
 * ⚠️ **KİMLİKLER DEPOLAMA DEĞERİDİR — YAYINDAN SONRA DEĞİŞTİRİLMEZ.**
 * Değiştirmek herkesi varsayılana geri düşürür. Görünen adlar sözlükte
 * (`whatsNew.card.style.<id>`), kimlik burada.
 *
 * Kapsam BU TARAYICI (tema · palet · dil ile aynı sınıf): başka cihazda
 * yeniden seçilir. Tercihler kartı bunu zaten yazıyor.
 *
 * `useSyncExternalStore` deseni: durum React'in dışında (localStorage),
 * iki tüketici var (sidebar kartı + Tercihler seçicisi) ve bir sağlayıcı
 * açmak tek bir string için fazla — `useOnline` / `chatBus` ile aynı karar.
 */
const STORAGE_KEY = "tyro-whatsnew-card-v1"
const EVENT = "tyro:whatsnew-card"

/**
 * Sıra = Tercihler'deki sıra.
 *
 * ⚠️ **SON İKİSİ TEK BİR TASARIMIN İKİ RENGİ** (2026-09-11'de üçtü):
 * `speakinglight` temayı izleyen açık kabuk, `speakinggravity` palet-baskın
 * koyu kabuk. İkisi de `SpeakingCore`dan çizilir — ayrı bileşen yazılmadı,
 * çünkü bir düzeltme ikiye bölünürdü. Sıra bilinçli: aile yan yana duruyor.
 *
 * ⚠️ **`speaking` (Ses — ÖZGÜN KOYU KART) 2026-09-13'TE SİLİNDİ** (istek
 * üzerine: *"voice kartını kaldır, voice light ve voice gravity kalsın"*).
 * Kullanıcının verdiği React paketinin birebir hâliydi ve iki türevi
 * çıktıktan sonra üçü de aynı kompozisyonu çiziyordu; ayrımı yalnız renkti.
 * `SpeakingCard.jsx` sarmalayıcısı da silindi — gövde (`SpeakingCore`)
 * ve ölçüler (`SpeakingCard.css`) DURUYOR, ikisi de kalan iki görünümün
 * ortak tabanı. Kimlik `VALID`den düştüğü için o tercihi taşıyan tarayıcı
 * sessizce varsayılana (`speakinglight`) döner.
 */
/**
 * ⚠️ **`aihub` BU UYGULAMADA YOK** — kayıtlı bir karar (istek: "o kartı
 * koyma"): o kart uygulamanın kendisini tanıtıyor. tyroTrade'de dört görünüm
 * var, burada üç. Kimlik listede olmadığı için eski bir tercih taşıyan
 * tarayıcı sessizce varsayılana döner (`VALID` kontrolü).
 */
/**
 * ⚠️ **`drop` (Lansman) 2026-09-15'TE SİLİNDİ** (istek üzerine: *"lansmanı
 * kaldır ... yenilik kartı seçenekleri arasından"*). Kullanıcının verdiği
 * "Lacivert" HTML'inin birebir, maddesiz hâliydi ve seçicideki ilk sıraydı.
 * `DropCard.jsx` de silindi — başka tüketicisi yoktu. Kimlik `VALID`den
 * düştüğü için o tercihi taşıyan tarayıcı sessizce varsayılana
 * (`speakinggravity`) döner.
 *
 * Geriye Ses ailesinin iki rengi kaldı, yani listedeki HER görünüm artık
 * küçültülebilir (`WHATS_NEW_MINIMIZABLE_STYLES` ile aynı küme). İkisi yine
 * de AYRI duruyor: biri "hangi tasarımlar var", öteki "hangisinin sağ üst
 * yuvasında düğme var" — bugün çakışmaları bir tesadüf, bir kural değil.
 */
/**
 * ⚠️ **ÜÇÜNCÜ ÜYE: `speakingglass` (Ses · Cam), 2026-09-20** — istek:
 * *"çentik tasarımında cam paleti çok sevdim, aynı tarzda Yenilikler kartı
 * yapalım."* Çentiğin `glassBrand` kabuğunun reçetesi (buzlu cam + paletin
 * üç durağının gradyan tint'i + ışık kenar + ağır ağır kayan parıltı) kartın
 * kabuğuna taşındı; kompozisyon yine `SpeakingCore`, çekim kuyusu açık.
 * Tokenlar `SpeakingVariants.css`te, çentiğinkiyle AYNI formüller — biri
 * değişirse öteki de değişmeli.
 */
export const WHATS_NEW_CARD_STYLES = [
  "speakinglight",
  "speakinggravity",
  "speakingglass",
  "speakingreading",
]

/**
 * Görünüm başına ÖLÇÜLEN kart yüksekliği (gerçek render, TR, 224px) — iskelet
 * ve Tercihler'deki önizleme çerçevesi bunu okur. Burada duruyor çünkü
 * tüketicilerinden biri (`SidebarWhatsNew`) giriş paketinde ve kartın tembel
 * parçasını indirmeden doğru boyda yer tutmak zorunda. Kalan iki görünüm
 * bugün AYNI boyda (268) — tablo yine de görünüm başına duruyor, çünkü
 * eşitlik bir tesadüf: boyları ayrışan bir görünüm eklenince (ör. silinen
 * Lansman 247'ydi) biri ötekinin yerini tutsa sidebar katalog inince
 * ZIPLARDI. Kart şekil değiştirirse yeniden ölçülür.
 */
/**
 * TELEFONUN MİNİ KARTININ ölçülen boyu (`MiniCard`, 390px sheet).
 *
 * ⚠️ Görünümden BAĞIMSIZ tek bir sayı: mini kart iki görünümün hiçbirini
 * taklit etmiyor, kendi yatay kompozisyonu (gerekçe `MiniCard.jsx`te).
 * İskelet bunu okur — kart inince sidebar zıplamasın.
 */
export const WHATS_NEW_MINI_HEIGHT_PX = 71

export const WHATS_NEW_CARD_HEIGHT_PX = {
  speakinglight: 268,
  speakinggravity: 268,
  /* Ses · Cam: aynı kompozisyon, aynı kenarlık kalınlığı — ölçüldü 268. */
  speakingglass: 268,
  /* ⚠️ Okuyan Maskot KISA: kompozisyonu YATAY (sanat solda 76 birim, metin
     sağında), yani öteki üçünün dikey tuvali kadar yer kaplamıyor. Sayı
     ÇEVRİLMEDİ, 224px'lik kartın KENDİSİNDE ölçüldü (sidebar'da 201px →
     194px, aynı kart 224px'e açılınca 211px): iki kutuda da taban alan
     yazı boyları (`max(…, 10px)`) ölçekle küçülmediği için oranla çevirmek
     birkaç piksel şaşırıyor. Açıklama ÜÇ SATIRA kırpılı olmasa bu sayı her
     duyuruda değişirdi; kırpmanın asıl sebebi bu. */
  speakingreading: 211,
}

/**
 * ⚠️ VARSAYILAN HER ZAMAN KULLANICININ SEÇİMİDİR, benim tahminim değil.
 * Yol: `hub` (tahmin — "ilk verilen tasarım") → `navy` (2026-09-11, istek) →
 * `drop` (aynı gün: "bunu yaptıktan sonra drop varsayılan olsun") →
 * `aihub` ("varsayılan whats new kartı AI Hub olsun") →
 * `speaking` (aynı gün, istek: "bu son kartı varsayılan yap") →
 * `speakinglight` (aynı gün, istek: "voice light kart tasarımını default yap") →
 * `speakinggravity` (2026-09-14, istek: "voice gravity varsayılan olsun") →
 * `speakinglight` (2026-09-20, istek: "varsayılan whats new kartı voice
 * light olsun") — yani varsayılan İKİNCİ kez oraya dönmüştü →
 * `speakingreading` (2026-09-21, istek: "bu son yaptığımız kartı varsayılan
 * yap, gazeteli olanı"). Okuyan Maskot da açık reçetenin kabuğunu
 * kullanıyor, yani temayı izleme özelliği korunuyor; değişen yalnız sahne.
 *
 * ⚠️ **VARSAYILAN KART 268px.** Kalan iki görünümün ikisi de o boyda (silinen
 * Lansman 247'ydi); Mac'te sidebar'a kalan yer ~247px olduğu için sol menü
 * bir miktar kayar — yani bugün KAÇINILMAZ, kısa görünüm kalmadı. Bilinen ve KABUL EDİLMİŞ
 * bedel — kullanıcı sıkıştırmayı iki kez reddetti, görüntüyü seçti.
 * Sığdırmak yeniden istenirse yapılacak şey kartı SIKIŞTIRMAK DEĞİL,
 * nav'ın boyunu ya da kartın yerini tartışmaktır.
 *
 * ⚠️ **VARSAYILAN KART ANİMASYONLU.** Bugünkü varsayılan (`speakinglight`)
 * temayı İZLEYEN tek kabuk: açık temada açık, koyuda koyu. (Bir tur
 * `speakinggravity` varsayılandı — palet-baskın koyu, yani açık temada da
 * koyu duruyordu; 2026-09-20'de istek üzerine geri alındı.) Dört kapısı var
 * (azaltılmış hareket · sekme gizli · görüş alanı dışı · duraklat düğmesi),
 * yani boşta boyama yapmıyor; yine de varsayılanı animasyonlu bir karta
 * çevirmek bilinçli bir karar ve kullanıcınındır.
 *
 * ⚠️ Değişiklik YALNIZ hiç seçim yapmamış tarayıcıyı etkiler: bu modül
 * varsayılanı depoya YAZMIYOR (`readWhatsNewCardStyle` yalnız okuyor), yani
 * "seçmedim" ile "seçtim" ayrımı korunuyor ve paletteki gibi bir
 * `defaultsMigration` turuna gerek yok.
 */
export const DEFAULT_WHATS_NEW_CARD_STYLE = "speakingreading"

const VALID = new Set(WHATS_NEW_CARD_STYLES)

export function readWhatsNewCardStyle() {
  if (typeof window === "undefined") return DEFAULT_WHATS_NEW_CARD_STYLE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw && VALID.has(raw) ? raw : DEFAULT_WHATS_NEW_CARD_STYLE
  } catch {
    return DEFAULT_WHATS_NEW_CARD_STYLE
  }
}

export function writeWhatsNewCardStyle(id) {
  if (typeof window === "undefined") return
  const next = VALID.has(id) ? id : DEFAULT_WHATS_NEW_CARD_STYLE
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Depolama kapalı: seçim bu oturumda görünür, yenilemede varsayılana
    // döner. Sessiz kalmak doğru — "tercihin kaydedilemedi" ikinci bir
    // uyarı olurdu.
  }
  // Aynı sekmedeki öteki tüketici `storage` olayını GÖRMEZ (o yalnız başka
  // sekmeleri haberdar eder) — uygulama içi olay şart.
  window.dispatchEvent(new Event(EVENT))
}

export function subscribeWhatsNewCardStyle(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  KART KÜÇÜLTÜLMÜŞ MÜ — masaüstünde kişinin açıp kapattığı bir tercih
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 2026-09-13, istek üzerine: *"PC'de yani daha büyük ekranlarda sidebardaki
 * 3 voice kartında sağ üstte duraklatma butonu yerine minimize butonu olsun;
 * ona tıkladığımızda mini yenilik kartına dönüşsün, maximize butonuna
 * tıkladığımızda yine eski hâline dönsün ve bunu localStorage hatırlasın.*"
 *
 * ⚠️ **BAYRAK GÖRÜNÜMDEN BAĞIMSIZ.** Küçültülmüş hâl iki görünümün hiçbirini
 * taklit etmiyor, telefonun MİNİ KARTININ ta kendisi — yani "küçült" bir
 * altıncı tasarım açmıyor, var olanı ikinci bir yerde kullanıyor. Bu yüzden
 * bayrak da görünüm kimliğinden ayrı bir anahtarda: kişi görünüm değiştirse
 * bile küçültülmüş kaldığı yerde kalır.
 *
 * ⚠️ **DÜĞME YALNIZ SES AİLESİNDE, BAYRAK HER GÖRÜNÜMDE GEÇERLİ.** İstek üç
 * Ses kartı içindi ve düğme oraya kondu; duraklatma yuvası olmayan görünümlerin
 * (Lansman · AI Hub) yeri de yoktu. Lansman 2026-09-15'te silinince listede
 * YALNIZ Ses ailesi kaldı, yani bugün her görünümde düğme VAR — ama ayrım
 * korunuyor: düğmesiz bir görünüm yeniden eklenirse, o kişi Tercihler'den ona
 * geçtiğinde mini kartı ve BÜYÜT düğmesini görmeye devam eder. Kapıyı bayrağa
 * değil DÜĞMEYE koymak, kişiyi büyütemediği bir durumda bırakmamanın tek yolu.
 *
 * ⚠️ **TELEFONDA BAYRAĞA HİÇ BAKILMAZ.** Orada kart zaten mini; bayrağı
 * okumak, telefonda hiç gösterilmemiş bir düğmenin masaüstünde bıraktığı
 * izi telefona taşımak olurdu (ve "büyüt" düğmesi orada yok).
 */
/**
 * ⚠️ **KÜÇÜLTME YALNIZ SES AİLESİNDE.** Düğme onların sağ üst yuvasında
 * yaşıyor. Bugün liste `WHATS_NEW_CARD_STYLES` ile AYNI küme (Lansman
 * silindi) — birleştirilmedi, çünkü ikisi ayrı soruya cevap veriyor:
 * "hangi tasarımlar var" ve "hangisinin düğme yuvası var". Liste burada
 * duruyor çünkü İKİ yer okuyor:
 * `SidebarWhatsNew` (telefonda BÜYÜT düğmesini çizer mi) ve `WhatsNewCard`
 * (karta `onMinimize` verir mi).
 */
export const WHATS_NEW_MINIMIZABLE_STYLES = ["speakinglight", "speakinggravity", "speakingglass"]

export function canMinimizeWhatsNewCard(id) {
  return WHATS_NEW_MINIMIZABLE_STYLES.includes(id)
}

/**
 * ⚠️ **İKİ YÜZEY, İKİ ANAHTAR — VE 2026-09-14'TEN BERİ AYNI VARSAYILAN.**
 * Telefon 2026-09-13'te küçültülmüş açılmaya başladı; masaüstü ertesi gün
 * istek üzerine ona katıldı (*"sidebar'daki Yenilikler kartı varsayılan
 * mini hâlde gelsin"*). Yani bugün İKİSİ DE `true`.
 *
 * ⚠️ **AYNI DEĞER OLMASI ANAHTARLARI BİRLEŞTİRMEZ.** İkisinin BUGÜN
 * eşitlenmesi bir tesadüf, bir kural değil: kararlar bağımsız — dar bir
 * ekranda küçük istemek, geniş ekranda da küçük istemek demek değil ve
 * bir gün yine ayrışabilirler. Birleştirmenin ölçülmüş bedeli de duruyor:
 * tek anahtarda masaüstünde BÜYÜT'e basan kişi `"0"` yazar ve o değer
 * telefonda da "büyüt" diye okunurdu.
 *
 * ⚠️ **MASAÜSTÜNDE BÜYÜTME KOŞULSUZ VE ŞART.** Küçült düğmesi yalnız Ses
 * ailesinde. Bugün liste o aileden ibaret, ama kapı KALMALI: düğmesiz bir
 * görünüm yeniden eklenirse ve varsayılan küçültülmüş olursa, onu seçen kişi
 * küçült düğmesini HİÇ görmez ve mini karttaki BÜYÜT tek çıkış kapısı olur
 * (`SidebarWhatsNew`: `!isMobile || canMinimize`). Kapı kapanırsa kart o
 * görünümde kalıcı olarak mini kalır.
 */
const MINIMIZED_KEY = {
  desktop: "tyro-whatsnew-minimized-v1",
  mobile: "tyro-whatsnew-minimized-mobile-v1",
}
const MINIMIZED_DEFAULT = { desktop: true, mobile: true }
const MINIMIZED_EVENT = "tyro:whatsnew-minimized"

export function readWhatsNewMinimized(surface = "desktop") {
  const fallback = MINIMIZED_DEFAULT[surface] ?? false
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(MINIMIZED_KEY[surface])
    // ⚠️ `null` ile `"0"` AYRI: birincisi "hiç seçmedim" (yüzeyin
    // varsayılanı), ikincisi "büyüt dedim". Boolean'a düz çevirmek
    // telefonun varsayılanını ilk yazmada yok ederdi.
    return raw === null ? fallback : raw === "1"
  } catch {
    return fallback
  }
}

export function writeWhatsNewMinimized(surface, value) {
  if (typeof window === "undefined") return
  try {
    // "0" YAZILIR, anahtar SİLİNMEZ: büyütmek de bir seçimdir ve telefonda
    // silmek onu varsayılana (küçültülmüş) geri döndürürdü.
    window.localStorage.setItem(MINIMIZED_KEY[surface], value ? "1" : "0")
  } catch {
    // Depolama kapalı: seçim bu oturumda görünür, yenilemede geri döner.
  }
  // Aynı sekmedeki tüketici `storage` olayını GÖRMEZ — uygulama içi olay şart.
  window.dispatchEvent(new Event(MINIMIZED_EVENT))
}

export function subscribeWhatsNewMinimized(callback) {
  window.addEventListener(MINIMIZED_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(MINIMIZED_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}
