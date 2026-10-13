/**
 * "Yenilikler"in okundu işareti.
 *
 * Saklanan şey KAYIT KİMLİĞİdir (`changelog.js` › `id`), sürüm numarası ya
 * da tarih değil. Üçünün de denenmeye değer olduğu yerde gerekçe şu:
 *
 *  • **Sürüm olmaz.** Sürüm damgası git sha'sı; README değişse bile
 *    değişiyor. Deploy ≠ kullanıcıya görünen yenilik.
 *  • **Tarih olmaz.** Kayıt tarihleri elle yazılıyor ve aynı güne birden
 *    çok kayıt düşebiliyor; "şu tarihten sonrası" hangi kaydın okunduğunu
 *    tam söylemiyor.
 *  • **Kimlik olur.** Hangi kayıtların yeni olduğu birebir hesaplanır.
 *
 * ⚠️ **İLK ZİYARETTE İŞARET EN YENİ KAYDA KURULUR VE HİÇBİR ŞEY
 * GÖSTERİLMEZ.** Yeni bir kullanıcının yakalayacağı bir geçmiş yok; ilk gün
 * yirmi maddelik bir pencere açmak, özelliğin kendisini gürültüye
 * çevirirdi. Aynı sebeple işaret okunamadığında da (gizli pencere,
 * temizlenmiş site verisi) sessizce ilk ziyaret gibi davranılır.
 *
 * Kapsam BU TARAYICIDIR — kullanıcı başına sunucuda tutulacak bir yer yok
 * ve bir "yenilikler penceresi" için Dataverse'e yazmak, tercih verisini
 * ilk kez uzağa taşımak olurdu.
 */
const KEY = "tyro-changelog-seen-v1"

/**
 * ⚠️ **BU TARAYICI UYGULAMAYI DAHA ÖNCE AÇMIŞ MI?**
 *
 * "İlk ziyarette pencere açılmaz" kuralının ödenmemiş bedeli var: özellik
 * YAYINA GİRDİĞİ GÜN herkesin işareti boş, yani HİÇ KİMSEYE pencere çıkmaz
 * ve kimse böyle bir sayfanın varlığını öğrenmez. Kural yeni KULLANICIYI
 * korumak için yazıldı, mevcut kullanıcıyı susturmak için değil.
 *
 * İkisi ayırt edilebilir: uygulamayı daha önce açmış bir tarayıcıda
 * `tyro-` anahtarları vardır (tema · palet · dil · katalog önbelleği,
 * sağlayıcılar bunları ilk açılışta yazıyor). Bomboş bir tarayıcı gerçekten
 * ilk ziyarettir.
 *
 * ⚠️ Kendi anahtarımız SAYILMAZ — o zaten bu kararın konusu.
 */
const PREFIX = "tyro-"

export function isReturningBrowser() {
  if (typeof window === "undefined") return false
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(PREFIX) && k !== KEY) return true
    }
    return false
  } catch {
    // Depolama okunamıyorsa "yeni kullanıcı" say: sessiz kalmak, hiç
    // tanımadığımız bir tarayıcıya pencere açmaktan iyidir.
    return false
  }
}

export function readSeenId() {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/**
 * ⚠️ **YAZIM BİR OLAY YAYINLAR.** Okundu işaretini üç yer okuyor — sidebar
 * kartı, daraltılmış kipteki rozet ve Yenilikler penceresi — ve üçü de AYNI
 * sekmede yaşıyor. Tarayıcının `storage` olayı yalnız BAŞKA sekmeleri
 * haberdar eder; olay olmadan `/whats-new`e giden kullanıcının rozeti sayfa
 * yenilenene kadar yanmaya devam ediyordu (sidebar rota değişiminde yeniden
 * mount olmuyor).
 *
 * Ad uygulamanın kendi alanında: tyroTrade `tyrotrade:` kullanıyor, burası
 * `tyro:` — iki uygulama aynı tarayıcıda açıkken birbirinin işaretini
 * tazelemesin.
 */
const EVENT = "tyro:changelog-seen"

export function writeSeenId(id) {
  if (typeof window === "undefined" || !id) return
  try {
    // Aynı kimlik yeniden yazılmaz: her yazım bir olay yayınlıyor ve
    // değişmeyen bir işaret için abonelerin hepsini uyandırmak boşuna.
    if (window.localStorage.getItem(KEY) === id) return
    window.localStorage.setItem(KEY, id)
  } catch {
    // Depolama kapalı: pencere her açılışta bir kez daha çıkar. Sessiz
    // kalmak doğru — kullanıcıya "tercihin kaydedilemedi" demek, hiç
    // istemediği bir konuda ikinci bir uyarı olurdu.
  }
  window.dispatchEvent(new Event(EVENT))
}

/** Okundu işaretini izle — aynı sekme (`EVENT`) ve başka sekme (`storage`). */
export function subscribeSeenId(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}
