/**
 * ═══════════════════════════════════════════════════════════════════════
 *  GÜNDEM AKIŞI — hangi posta kutusu, hangi etiket, kaç gönderi
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Özelliğin tamamı tek kelimeyle greplenir:
 *     grep -rin "feedPolicy\|FEED_SOURCES\|gundem" src/
 *
 * Parçalar: bu dosya (POLİTİKA) · `lib/feed.js` (Graph sorgusu, MEKANİZMA) ·
 * `hooks/useFeedPosts.js` (çekme + sayfalama + önbellek) ·
 * `components/feed/FeedPage.jsx` (akış) · `FeedPostCard` · `FeedPostDialog`
 * (detay) · `FeedRail` (sağ ray).
 *
 * ── FİKİR ──────────────────────────────────────────────────────────────
 *
 * Şirketin duyuruları zaten HERKESE POSTA olarak gidiyor ve gelen kutusunda
 * günlük trafiğin arasında kayboluyor. Bu sayfa onları kendi zaman akışına
 * çıkarıyor: kaydırılabilir, etiketlenebilir, aranabilir. Yeni bir içerik
 * kaynağı YOK — yeni olan tek şey, var olan içeriğin OKUNABİLİR bir yüzeye
 * taşınması.
 *
 * ⚠️ **KAYNAK KULLANICININ KENDİ POSTA KUTUSU** (`/me/messages`), ortak bir
 * kütük değil. Sonuçları: (1) yeni bir Graph kapsamı GEREKMİYOR — `Mail.Read`
 * zaten `loginRequest`te; (2) kimse başkasının görmediği bir şeyi görmüyor;
 * (3) bir kullanıcı o postayı KALICI olarak silmişse akışında da yoktur.
 * Üçüncüsü bilinen ve kabul edilmiş bedel: alternatifi bir paylaşılan kutu
 * kapsamı istemek ve yönetici onayına bağlanmaktı.
 *
 * ⚠️ **`/me/messages` KLASÖR TANIMIYOR — ve bu bilinçli.** Posta paneli
 * `/me/mailFolders/inbox/messages` kullanıyor; akış kullanamaz, çünkü
 * kurumsal duyuru listelerini bir Outlook kuralıyla klasöre taşımak çok
 * yaygın ve o kullanıcının gündemi BOŞ görünürdü. Bedeli: Silinmiş Öğeler de
 * kapsama giriyor, yani kullanıcının sildiği bir duyuru akışta durmaya devam
 * ediyor. İkisi arasında seçim yaparken "gündemi eksik göstermek" daha ağır
 * bulundu — silinmiş bir duyuru hâlâ şirketin gündemi.
 *
 * ── GERİ ALMAK TEK SATIR ───────────────────────────────────────────────
 *
 *   enabled: false
 *
 * O hâlde sidebar satırı çizilmez, rota `/dashboard`a düşer ve hiçbir Graph
 * sorgusu atılmaz.
 */

/**
 * Akışı besleyen posta kutuları.
 *
 * ⚠️ **ADRES EŞLEŞMESİ KÜÇÜK HARFE ÇEVRİLEREK YAPILIR.** Graph `from` alanını
 * gönderenin yazdığı gibi döndürüyor (`Midea.Haberler@…`), OData `eq` ise
 * posta adreslerinde büyük/küçük harf duyarsız davranıyor — ama İSTEMCİDE
 * yaptığımız her karşılaştırma (etiket bulma, süzme) `toLowerCase()` üzerinden
 * gider. Bir adresi buraya farklı kasada yazmak, sunucuda bulunan ama
 * istemcide etiketlenemeyen gönderiler üretirdi.
 *
 * ⚠️ **`tag` SÖZLÜK ANAHTARI DEĞİL, KİMLİKTİR.** Görünen ad
 * `feed.tag.<tag>`ten geliyor (dört dil). Etiketi değiştirmek adres
 * süzgecinin URL'deki `?tag=` değerini de değiştirir — yer imi bozar.
 *
 * ⚠️ `accent` paletin hangi durağından türeyeceğini söyler; sabit bir hue
 * YAZILMAZ (deponun kuralı: "sabit hue yok, her şey palet tokenlarından").
 */
export const FEED_SOURCES = [
  {
    tag: "haberler",
    address: "haberler@midea.com",
    accent: "from",
  },
  {
    tag: "duyuru",
    address: "duyuru@midea.com",
    accent: "via",
  },
  {
    tag: "ik",
    address: "insankaynaklari@midea.com",
    accent: "to",
  },
  {
    tag: "egitim",
    address: "egitim@midea.com",
    accent: "deep",
  },
  {
    tag: "akademi",
    address: "dijitalakademi@midea.com",
    accent: "text",
  },
  {
    /* Altıncı kutu (istek, 2026-09-20). Paletin HAZIR durakları burada
       bitti — gerekçe `ACCENT_VAR`da. */
    tag: "kulup",
    address: "kulup@midea.com",
    accent: "shade",
  },
]

/**
 * Kanal noktasının rengi — TEK KAYNAK.
 *
 * ⚠️ **İKİ YERDE İKİ FARKLI MEKANİZMA VARDI ve sessiz bir hata üretti.**
 * `FeedRail` `var(--brand-${accent})` diye dizeyi kuruyordu, `FeedTag` ise
 * kendi içinde dört girdilik bir harita taşıyordu; beşinci kanal eklenince
 * ray onu doğru boyadı, çipin noktası ise haritada bulamayıp varsayılana
 * düştü — yani AYNI kanal iki yüzeyde iki renk. Artık ikisi de buradan
 * okuyor: kanal eklemek TEK dosyaya dokunmak.
 *
 * ⚠️ **ALTINCI TON PALETTEN TÜRETİLİR, YENİ HUE DEĞİL.** Dört kanal
 * `from · via · to · deep`i, beşincisi `text`i aldı. `soft` bir DOLGU tonu
 * (açık kartta nokta da oran çubuğu da görünmez), o yüzden altıncı
 * `--brand-shade`: paletin orta durağının temaya göre koyulaştırılmış ya da
 * açılmış hâli (index.css). Emsal, içgörü kartlarının `--series-3..5`i —
 * orada da fazladan seriler paletin kendi renklerinden türetiliyor.
 *
 * ⚠️ **NOKTA KANALIN KİMLİĞİ DEĞİL, AKSANI.** Tek tonlu beş palette
 * (black · amber · navy · sky · violet) `from = via = to` ve ilk üç kanal
 * ZATEN aynı rengi taşıyor; kanalı söyleyen şey etiketin kendisi. Bu yüzden
 * türetilmiş bir ton bir şeyi bozmuyor — bir aksanı çoğaltıyor.
 */
export const ACCENT_VAR = {
  from: "var(--brand-from)",
  via: "var(--brand-via)",
  to: "var(--brand-to)",
  deep: "var(--brand-deep)",
  text: "var(--brand-text)",
  shade: "var(--brand-shade)",
}

/** Tanınmayan aksan paletin orta durağına düşer — renksiz bir nokta olmaz. */
export function accentColor(accent) {
  return ACCENT_VAR[accent] ?? ACCENT_VAR.via
}

/**
 * Görsel tipleri: Outlook `image/jpg` ve `image/x-png` gibi tarayıcının anladığı ama standart
 * olmayan tipler yazabiliyor; listede olmayan tip = indirilmeyen görsel. SVG YOK (script taşır).
 */
const IMAGE_TYPES = [
  "image/png",
  "image/x-png",
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/avif",
]

export const FEED = {
  /** Ana şalter. `false` → sidebar satırı yok, rota yok, sorgu yok. */
  enabled: true,

  /**
   * Kimde açık: `"*"` · `"admins"` · `["upn", …]` (sözlük `lib/audience.js`).
   *
   * ⚠️ **ŞİMDİLİK ÖNİZLEME EKİBİNDE** (istek, 2026-09-28: *"keşfet ve
   * akışım sayfasını sadece önizleme ekibi görsün şimdilik"*).
   * Sayfa 2026-09-20'den beri herkese açıktı; bu kapı onu geri daralttı.
   * Kapı TEK yerden okunuyor (`lib/pageAccess.js`) ve kapalı olana dokunan
   * her yüzey birlikte kapanıyor: sidebar satırı + rozeti (Graph `$count`
   * sorgusu da atılmıyor), arama, komut paleti, dashboard'daki "Keşfete göz
   * at", rota (`/dashboard`a düşer) ve Keşfet'i anlatan Yenilikler kayıtları.
   *
   * ⚠️ **ETİK HATTI DA BU SAYFADA** (`EthicsHotline`), yani kapı onu da
   * daraltıyor. Hattın herkese açık kalması gerekiyorsa başka bir yüzeye
   * taşınmalı — bu kapıyı gevşetmek değil.
   *
   * ⚠️ **TYRA'DA YENİDEN HERKESE AÇIK** (2026-10-04, istek: *"herkese aç
   * çünkü o sayfalar kişisel maile göre çalışıyor zaten. tyro da kapamıştık
   * ama tyra da açacağız"*). Tyra canlı site, Tyro UAT/dev; önizleme kapısı
   * Tyro'da kalıyor. Daraltmak tek satır: `audience: PREVIEW_UPNS`
   * (`lib/audience.js`).
   */
  audience: "*",

  /**
   * İlk açılışta kaç gönderi ve "daha fazla" her basışta kaç tane.
   *
   * ⚠️ **SAYFA BOYU GRAPH'IN `$top`'U, İSTEMCİ KIRPMASI DEĞİL.** Yenilikler
   * sayfası bütün kataloğu elinde tutup `slice(limit)` yapıyor; orada veri
   * pakette gömülü. Burada her satır bir ağ turu: 400 gönderiyi çekip 20'sini
   * göstermek kullanıcıyı ilk boyamada bekletirdi. `@odata.nextLink` takip
   * ediliyor, yani "daha fazla" gerçekten bir sonraki SAYFAYI istiyor.
   *
   * 20: sahada dört kutunun toplamı haftada ~10-15 gönderi (kullanıcı
   * ölçeği notu: günlük 10-20 aktif kullanıcı), yani ilk sayfa tipik olarak
   * son bir-iki ayı kapsıyor ve çoğu ziyaret "daha fazla"ya hiç basmıyor.
   */
  pageSize: 20,

  /**
   * Akışın geriye bakış ufku (ay).
   *
   * ⚠️ İKİ İŞ BİRDEN YAPIYOR. (1) `$filter`in İLK yan tümcesi SIRALANAN
   * özellik oluyor (`receivedDateTime ge … and (gönderenler)`) — Graph'ın
   * karmaşık filtre + farklı özellikte sıralamayı `ErrorInefficientFilter`
   * ile reddettiği bilinen bir tuzak var ve kabul edilen şekil bu.
   * (2) `nextLink` zincirini SONLANDIRIYOR: ufuksuz bir sorguda zincir posta
   * kutusu kadar uzun olur ve "daha fazla"ya basan kullanıcı, filtreye uyan
   * hiçbir şey içermeyen boş sayfalar görebilirdi.
   *
   * 18 ay: iki yıllık arşiv değil ama geçen yılın aynı dönemini kapsıyor.
   */
  lookbackMonths: 18,

  /**
   * Bir oturumda en fazla kaç sayfa çekilebilir.
   *
   * ⚠️ FREN. `nextLink` zinciri kullanıcının posta kutusu kadar uzun; bir
   * kullanıcının "daha fazla"ya basılı tutması yüzlerce tur açabilirdi.
   * 10 × 20 = 200 gönderi ≈ iki yıllık arşiv — o noktadan sonrası arama
   * işidir, kaydırma işi değil.
   */
  maxPages: 10,

  /**
   * Sağ raydaki "aramıza yeni katılanlar" ve "doğum günü" panelleri.
   *
   * ⚠️ **BUNLAR AYRI BİR VERİ KAYNAĞI DEĞİL, AYNI AKIŞA BAKAN BİR MERCEK.**
   * Dizinden çekmek (`/users?$filter=createdDateTime…`, `$select=birthday`)
   * `User.Read.All` isterdi — YÖNETİCİ ONAYLI bir kapsam ve bu depoda
   * `Presence.Read.All` tam bu yüzden `loginRequest`e KONMADI (CLAUDE.md).
   * Üstelik `birthday` alanı Exchange'de çoğu hesapta boş. Yani o yol hem
   * pahalı hem boş dönerdi.
   *
   * Bunun yerine paneller İK kutusundan gelen gönderileri konu kalıbıyla
   * ayırıyor. Gösterilen şey İK'nın kendi duyurusu, bizim çıkarımımız değil;
   * kart tıklanınca o duyurunun kendisi açılıyor. Kalıp tutmazsa panel
   * ÇİZİLMEZ — boş bir "yeni katılan yok" satırı, kimsenin katılmadığını
   * söylerdi, oysa bilmediğimiz şey duyurunun nasıl yazıldığı.
   *
   * ⚠️ Kalıplar TÜRKÇE aksanları katlanmış metin üzerinde aranır
   * (`lib/feed.js` › `foldTr`): "Katıldı" ile "katildi" aynı şey sayılsın.
   */
  people: {
    /**
     * Kişi satırının altına dizinden ÜNVAN yazılsın mı (istek, 2026-09-20).
     * Geri alma tek satır. Kapalı olmasa bile kapsam onaylı değilse hiçbir
     * şey değişmez — gerekçe `usePeopleTitles` başlığında.
     */
    titles: true,
    /** Panelde en fazla kaç kişi. Fazlası "tümünü gör" ile akışa süzgeç. */
    limit: 6,
    /** Kaç gün geriye bakılır — "yeni" katılan üç ay öncekini kapsamamalı. */
    joinerDays: 45,
    /** Doğum günü duyuruları daha sık; iki hafta yeter. */
    birthdayDays: 14,
    joinerPatterns: [
      "aramiza katil",
      "aramiza hos geldin",
      "hos geldin",
      "ise baslad",
      "yeni ekip arkadas",
      "yeni katilan",
      "welcome aboard",
      "joins us",
      "new joiner",
    ],
    birthdayPatterns: ["dogum gunu", "iyi ki dogdun", "nice yillara", "happy birthday"],
  },

  /**
   * Gönderi görseli.
   *
   * ⚠️ **GÖRSEL TEMBEL ÇEKİLİR, LİSTE SORGUSUNDA DEĞİL.** Gömülü görseller
   * (`cid:`) Graph'ta ayrı bir uç noktada (`/messages/{id}/attachments`) ve
   * base64 gövdeyle geliyor: 20 gönderi için peşin çekmek ilk boyamaya
   * megabaytlar eklerdi. Kart görüş alanına girince isteniyor
   * (IntersectionObserver). ⚠️ Kapı `hasAttachments` DEĞİL — o bayrak yalnız
   * satır içi OLMAYAN ekler için doğru ve kapağı ona bağlamak bültenlerin
   * çoğunu sessizce görselsiz bırakırdı; ayrıntı `FeedPostCard`ta.
   *
   * ⚠️ `maxBytes`: bir posta eki 20 MB olabilir; kapak görseli olarak
   * indirilecek şeyin tavanı var. Aşan ek atlanır, bir sonrakine bakılır.
   */
  hero: {
    limit: 1,
    /** Ayraç pikseli ve imza logosu kapak olmasın. */
    minBytes: 8_000,
    /**
     * Pencereyle aynı tavan: pencerede görünen görsel kartta da kapak olabilsin (3 MB'lık
     * tavan tasarlanmış tebrik kartlarını kartta kapaksız bırakıyordu). Büyük olan indirilince
     * kart boyuna küçültülür (`shrinkAbove`, `lib/imageShrink.js`), önbellekte küçük durur.
     */
    maxBytes: 8_000_000,
    shrinkAbove: 500_000,
    /** Kapak için kabul edilen tipler — SVG YOK (script taşıyabilir). */
    // Pencereyle aynı liste: pencerede görünen görsel kartta da kapak olabilsin.
    types: IMAGE_TYPES,
  },

  /**
   * Okuma penceresinin görselleri — KAPAKTAN AYRI BÜTÇE.
   *
   * ⚠️ **KAPAK BÜTÇESİYLE OKUMA BÜTÇESİ AYNI OLAMAZ, ve sahada bu KIRIK
   * GÖRSEL olarak göründü** (bildirildi: *"içine tıklayınca aramıza
   * katılanlar için resimler kırık çıkıyor"*). Kapak TEK ve KÜÇÜK bir görsel
   * arıyor; okuma penceresi gövdedeki HER `cid:` referansını karşılamak
   * zorunda, çünkü karşılanmayan bir referans çerçevede yırtık ikon çiziyor.
   * İK'nın "aramıza katılanlar" duyurusu tam da bu ikisinin çeliştiği yer:
   * on beş-yirmi kişi fotoğrafı, çoğu telefondan yapıştırılmış ve tanesi
   * 3 MB'ı aşıyor — kapak tavanı ve 12'lik sınır o postanın görsellerinin
   * çoğunu daha indirmeden eliyordu.
   *
   * ⚠️ `totalBytes` bir güvenlik değil BELLEK freni: base64 gövde ham
   * baytın ~1,33 katı ve hepsi tek bir `srcDoc` dizesine giriyor. Tavan
   * aşılınca kalan ekler indirilmez — indirilmeyen görsel yırtık değil
   * MÜHÜRLÜ çizilir (gerekçe `sealUnloadableImages`).
   */
  body: {
    limit: 40,
    minBytes: 0,
    maxBytes: 8_000_000,
    totalBytes: 24_000_000,
    /**
     * Gövdede tip listesi GENİŞ: burada "en iyi kapağı seç" değil "postanın
     * kendi görselini göster" işi var. Outlook `image/jpg` ve `image/x-png`
     * gibi tarayıcının anladığı ama standart olmayan tipler yazabiliyor;
     * listede olmayan tip = indirilmeyen görsel = yırtık ikon. SVG yine YOK.
     */
    types: IMAGE_TYPES,
  },

  /**
   * Okundu işareti: sidebar rozetinin saydığı sınır.
   *
   * ⚠️ **YALNIZ BİR ZAMAN DAMGASI SAKLANIR** (`tyro-feed-seen-v1`), gönderi
   * kimliği ya da konusu DEĞİL. Konu başka insanların işi; bu depoda posta
   * içeriği localStorage'a HİÇ yazılmıyor (CLAUDE.md: önbellekler yalnız
   * bellekte). Bir ISO damgası ise kullanıcının kendi ziyaret bilgisi.
   */
  seenKey: "tyro-feed-seen-v1",
}

/** Adres → kaynak kaydı. Bilinmeyen adres `null` döner. */
export function sourceForAddress(address) {
  if (!address) return null
  const key = String(address).toLowerCase().trim()
  return FEED_SOURCES.find((s) => s.address === key) ?? null
}

/** Etiket kimliği → kaynak kaydı. */
export function sourceForTag(tag) {
  if (!tag) return null
  return FEED_SOURCES.find((s) => s.tag === tag) ?? null
}
