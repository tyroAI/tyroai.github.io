/**
 * YENİLİKLER — uygulamanın changelog'u (girişteki pencere, `/whats-new` sayfası
 * ve sol menüdeki okunmamış sayacı buradan okur).
 *
 * Demo: kayıtlar ürünü tanıtır; tarihler bugüne göre hesaplanır ki demo her
 * gün güncel görünsün. Alanlar: id (sabit) · date (YYYY-AA-GG) ·
 * kind ("feature" | "improvement" | "fix") · title/body/points ({ tr, en }) ·
 * notify (girişte pencere açar) · to (uygulama içi rota).
 */

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const p = (v) => String(v).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const CHANGELOG = [
  {
    id: "demo-hos-geldin",
    date: daysAgo(0),
    kind: "feature",
    audience: "all",
    notify: true,
    to: "/myspace",
    title: { tr: "TYRO demosuna hoş geldin", en: "Welcome to the TYRO demo" },
    body: {
      tr: "Satış Müdürü Doğukan Arslan'ın çalışma alanındasın. Tüm kişi, şirket ve veriler kurgusaldır; hiçbir gerçek sisteme bağlanılmaz.",
      en: "You're in Sales Manager Doğukan Arslan's workspace. All people, companies and data are fictional; nothing connects to a real system.",
    },
    points: [
      {
        tr: "Anasayfa'da günün brifi, sıradaki toplantı ve odak görevleri",
        en: "Today's brief, your next meeting and focus tasks on Home",
      },
      {
        tr: "Sohbet'te TYRO Sales ile pipeline, tahmin ve müşteri analizi",
        en: "Pipeline, forecast and customer insights with TYRO Sales in Chat",
      },
      {
        tr: "Self Servis'te izin, masraf ve ekibinin durumu",
        en: "Leave, expenses and your team's status in Self-service",
      },
      {
        tr: "Keşfet'te iş bildirimleri, dosyalar ve takvim",
        en: "Work notifications, files and calendar in Explore",
      },
    ],
  },
  {
    id: "demo-tyro-sales",
    date: daysAgo(3),
    kind: "feature",
    audience: "all",
    to: "/chat",
    title: { tr: "Satış asistanı TYRO Sales", en: "Meet TYRO Sales" },
    body: {
      tr: "Pipeline, satış tahmini ve müşteri brifleri tek soruda; cevaplar tablo ve grafikle gelir.",
      en: "Pipeline, forecast and customer briefs in one question; answers come with tables and charts.",
    },
    points: [
      { tr: "Aşamaya göre pipeline ve risk altındaki fırsatlar", en: "Pipeline by stage and deals at risk" },
      { tr: "Ekip performansı ve hedef gerçekleşme oranı", en: "Team performance and attainment" },
      { tr: "Müşteri toplantısı öncesi tek sayfalık brif", en: "A one-page brief before a customer meeting" },
    ],
  },
  {
    id: "demo-gunun-brifi",
    date: daysAgo(6),
    kind: "improvement",
    audience: "all",
    to: "/myspace",
    title: { tr: "Güne brifle başla", en: "Start with a brief" },
    body: {
      tr: "Sabah ve akşam TYRO Office posta, takvim ve görevlerini tek özette topluyor.",
      en: "Morning and evening, TYRO Office gathers your mail, calendar and tasks into one brief.",
    },
  },
  {
    id: "demo-kesfet",
    date: daysAgo(9),
    kind: "feature",
    audience: "all",
    to: "/feed",
    title: { tr: "Keşfet'te iş bildirimleri", en: "Work updates in Explore" },
    body: {
      tr: "Onaylar, kazanılan fırsatlar, fiyat listeleri ve eğitim duyuruları kişisel bir akışta.",
      en: "Approvals, won deals, price lists and training updates in one personal feed.",
    },
  },
  {
    id: "demo-todo",
    date: daysAgo(14),
    kind: "feature",
    audience: "all",
    to: "/todo",
    title: { tr: "To-Do panosu", en: "Your To-Do board" },
    body: {
      tr: "Görevlerini listeler arasında taşı, toplantılardan görev çıkar, odağını gün gün planla.",
      en: "Move tasks across lists, turn meetings into tasks and plan your focus day by day.",
    },
  },
  {
    id: "demo-ekibim",
    date: daysAgo(18),
    kind: "improvement",
    audience: "all",
    to: "/self-service",
    title: { tr: "Ekibim görünümü", en: "My team view" },
    body: {
      tr: "Ekibinin izinlerini, bakiyelerini ve yaklaşan özel günlerini tek ekranda gör.",
      en: "See your team's leave, balances and upcoming special days on one screen.",
    },
  },
  {
    id: "demo-widgetlar",
    date: daysAgo(24),
    kind: "feature",
    audience: "all",
    to: "/widgets",
    title: { tr: "Kendi panonu kur", en: "Build your board" },
    body: {
      tr: "Hava durumu, piyasa, dünya saatleri ve ekip kartlarıyla kendi panonu düzenle.",
      en: "Arrange your own board with weather, markets, world clocks and team cards.",
    },
  },
  {
    id: "demo-tema-dil",
    date: daysAgo(30),
    kind: "improvement",
    audience: "all",
    to: "/profile",
    title: { tr: "Dört dil, iki tema", en: "Four languages, two themes" },
    body: {
      tr: "Türkçe, İngilizce, Rusça ve Arapça; açık ve koyu tema; 17 renk paleti.",
      en: "Turkish, English, Russian and Arabic; light and dark themes; 17 colour palettes.",
    },
  },
]


/**
 * Listenin en yenisi.
 *
 * ⚠️ Varsayılan argüman KALDIRILDI (2026-09-17). `entries = CHANGELOG` ile
 * çağrılan bir yer hem `audience` hem `surface` kapısını sessizce atlardı;
 * bugün öyle bir çağrı yok ve olmasın diye varsayılan da yok.
 */
export function latestEntryId(entries) {
  return entries?.[0]?.id ?? null
}

/** Kaydın KATALOGDAKİ yeri — yaşının tek ölçüsü. Süzülmüş listelerdeki
 *  indeksler yüzeye göre değişir, bu değişmez. */
function canonicalIndex(id) {
  return CHANGELOG.findIndex((e) => e.id === id)
}

/**
 * Bu kimlik katalogda VAR MI — yani işaret gerçekten öksüz mü?
 *
 * ⚠️ "Bu listede yok" ile "artık yok" AYRI SORULAR ve yüzey süzgeci
 * geldiğinden beri cevapları da ayrı. Onarım dalları (işaret öksüzse en
 * yeniye çek) bunu sormak zorunda: süzülmüş bir listeye sormak, yalnızca
 * o yüzeyde gizlenen bir kaydı SİLİNMİŞ sanıp işareti GERİYE çekerdi —
 * kullanıcının zaten okuduğu bir kayıt yeniden "yeni" olurdu.
 */
export function hasEntry(id) {
  return canonicalIndex(id) !== -1
}

/**
 * Kayıt türünün ekrandaki sırası — gün İÇİNDE.
 *
 * Aynı güne düşen kayıtlar dosyada yazıldıkları sırayla duruyor ve o sıra
 * geliştirme sırası: bir düzeltme, bir yenilik, bir düzeltme daha. Okuyan
 * için anlamlı olan sıra bu değil — önce ne KAZANDIĞI, sonra ne İYİLEŞTİĞİ,
 * en sonda ne DÜZELDİĞİ.
 *
 * ⚠️ Yalnız ÇİZİM sırası. Kaynak dizi asla bu sırayla yeniden dizilmez:
 * `latestEntryId` dizinin İLK elemanını "en yeni" sayıyor ve `entriesSince`
 * işareti `findIndex` ile arayıp öncesini kesiyor. Günün içinde sırayı
 * değiştirmek, o günün ilk kaydını değiştirir — yani herkesin okundu
 * işareti bir kayıt kayar ve zaten okunmuş bir şey yeniden "yeni" olur.
 * Sıralama bu yüzden `WhatsNewPage`te ve yalnız süzülmüş listenin KENDİ
 * kopyası üzerinde yapılır: aynı tarihli ardışık koşu sıralanır, günlerin
 * sırasına dokunulmaz, ve kırpmadan (`slice(limit)`) ÖNCE yapılır — sonra
 * yapılsaydı "daha fazla göster"e her basışta liste zıplardı.
 */
export const KIND_ORDER = { feature: 0, improvement: 1, fix: 2 }

/**
 * Bu kullanıcının, BU YÜZEYDE görebileceği kayıtlar.
 *
 * Üç kapı:
 *
 * 1. `audience: "admins"` — yöneticiye özel bir yeniliği herkese yazmak,
 *    olmayan bir düğmeyi vaat etmek olurdu.
 *
 * 2. `kind: "fix"` — **düzeltmeler yalnız Yenilikler SAYFASINDA ve yalnız
 *    YÖNETİCİDE** (2026-09-17, istek üzerine). Gerekçe ölçülebilir:
 *    32 kaydın 6'sı düzeltme ve bunların hiçbiri kullanıcının yapacağı bir
 *    işi değiştirmiyor — "yarım kalan yanıt uyarısı artık doğru tetikleniyor"
 *    cümlesi, o hatayı hiç yaşamamış kişi için yalnız gürültü. Pencere ve
 *    sidebar kartı kullanıcının İŞİNİ KESEN yüzeyler; oraya giren her kayıt
 *    dikkat borcu alıyor. Sayfa ise gidilen bir yer, orada yöneticinin
 *    tam dökümü görmesi gerekiyor.
 *
 * 3. `canOpen` — kişinin açamadığı bir sayfayı anlatan (`route`) ya da oraya
 *    götüren (`to`) kayıt. ÇAĞIRAN verir (`usePageAccess().canOpen`);
 *    verilmezse her yer açık sayılır. ⚠️ İşareti hesaplayan "page" listesi
 *    de bu süzgeçten geçer: işaretin anlamı "GÖREBİLDİĞİM her şeyle başa
 *    baş" — kapalı bir sayfanın kaydını saymak, rozeti hiç açamayacağı bir
 *    kayıt için yakardı. Yer yine KATALOGDAN okunduğu için (`entriesSince`,
 *    `hasEntry`) gizlenen bir kayda yazılmış eski işaret de kaymaz.
 *
 * `surface`:
 *   "page"   (varsayılan) Yenilikler sayfası — düzeltmeler yalnız yöneticiye
 *   "dialog" giriş penceresi — düzeltme YOK, kimseye
 *   "card"   sidebar kartı — düzeltme YOK, kimseye
 *
 * ⚠️ **OKUNDU İŞARETİ VE OKUNMAMIŞ SAYISI HER ZAMAN "page" YÜZEYİNDEN
 * HESAPLANIR**, hangi yüzey soruyorsa sorsun. İşaretin anlamı "sayfada
 * görebileceğim her şeyle başa baş"tır ve rozet de oraya götürüyor. Kart
 * yüzeyinden hesaplansaydı şu olurdu: yönetici sayfayı açar, işaret bir
 * DÜZELTME kaydına yazılır; kartın listesinde düzeltme olmadığı için
 * `entriesSince` işareti bulamaz (`findIndex` → -1), "hiç yeni yok" döner ve
 * o tarayıcıda rozet BİR DAHA HİÇ yanmaz. Sessiz ve bulunması zor.
 */
if (import.meta.env?.DEV) {
  // ⚠️ `notify: true` bir DÜZELTMEDE hiçbir şey yapmaz: pencere yüzeyi
  // düzeltmeleri hiç almıyor. Sessizce yutmak yerine yazana söylenir —
  // kayıt gerçekten pencere açmalıysa türü "improvement" olmalı.
  const silent = CHANGELOG.filter((e) => e.notify && e.kind === "fix")
  if (silent.length) {
    console.warn(
      "[changelog] `notify` düzeltme kaydında etkisiz — pencere düzeltme göstermiyor:",
      silent.map((e) => e.id).join(", "),
    )
  }
}

const OPEN_EVERYWHERE = () => true

export function visibleEntries({
  isAdmin = false,
  surface = "page",
  canOpen = OPEN_EVERYWHERE,
} = {}) {
  return CHANGELOG.filter((e) => {
    if (e.audience === "admins" && !isAdmin) return false
    if (e.kind === "fix" && (surface !== "page" || !isAdmin)) return false
    // 3. kapı — rota (bkz. dosya başı). İkisi de sorulur: anlattığı sayfa
    // açık olup götürdüğü yer kapalıysa da kayıt bir söz verip tutmuyor.
    if (e.route && !canOpen(e.route)) return false
    if (e.to && !canOpen(e.to)) return false
    return true
  })
}

/**
 * `seenId`den SONRAKİ kayıtlar.
 *
 * ⚠️ **YER KATALOGDAN OKUNUR, VERİLEN LİSTEDEN DEĞİL** (2026-09-17). Eskiden
 * işaret verilen listede `findIndex` ile aranıyordu; bulunamazsa "hiç yeni
 * yok" deniyordu. Düzeltme kayıtları yüzeylerden çekilince bu kural sessiz
 * bir veri kaybına dönüştü ve ÖNEMLİSİ: bu, yayına çıkar çıkmaz SAHADAKİ
 * tarayıcıları vururdu, yeni kayıtları değil.
 *
 * Somut: `2026-09-07-alinti-isaretleri` (kind: fix) o tarihin TEK kaydıydı,
 * yani 07→08 penceresinde uygulamayı açan herkesin işareti tam olarak o id.
 * Düzeltmeler yönetici olmayana kapanınca o id artık kimsenin listesinde
 * değil → `findIndex` −1 → sayaç 0 yazıyor, oysa 10 kayıt gerçekten
 * okunmamış ve 6'sı pencere açacak (`notify`) kayıt. Üstüne pencerenin
 * onarım dalı işareti EN YENİYE çekip `notify` kontrolüne varmadan
 * dönüyordu — birikimin tamamı tek bir sessiz yazışla silinirdi.
 *
 * Artık işaretin yeri KATALOGDA aranıyor ve verilen liste o yere göre
 * süzülüyor. İşaret hangi yüzeyde görünmez olursa olsun, "ondan sonrası"
 * doğru hesaplanır.
 *
 * Katalogda HİÇ yoksa (kayıt silinmiş ya da kimliği değişmiş) eski kural
 * aynen geçerli: hiçbir kayıt yeni sayılmaz. Bilinmeyen bir işaretle "hepsi
 * yeni" demek, kullanıcıya okuduğu her şeyi bir daha göstermek olurdu.
 */
export function entriesSince(seenId, entries) {
  if (!seenId) return []
  const at = canonicalIndex(seenId)
  if (at === -1) return []
  const seenIds = new Set(CHANGELOG.slice(at).map((e) => e.id))
  return entries.filter((e) => !seenIds.has(e.id))
}
