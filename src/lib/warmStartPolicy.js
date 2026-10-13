/**
 * ═══════════════════════════════════════════════════════════════════════
 *  SICAK BAŞLANGIÇ (warm start) — özelliğin TEK KUMANDA NOKTASI
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Özelliğin tamamı `warmStart` adıyla greplenir:
 *     grep -rin "warmstart" src/
 *
 * Parçalar: bu dosya (politika), `src/components/chat/WarmStart.jsx`
 * (tetikleyici, `DashboardLayout`ta mount edilir), `src/lib/warmStart.js`
 * (mekanizma), `ChatScreen`in `awaitWarmConversation` devralması,
 * `ChatMessage`teki başlangıç rozeti, `copilot.js`teki `prewarmToken` +
 * `loadSdk`.
 *
 * ── İKİ İŞLEM, İKİSİ DE TEK SATIR ──────────────────────────────────────
 *
 *   GERİ ALMAK   →  enabled: false
 *                   Hiçbir şey ısınmaz, ChatScreen devralacak bir şey
 *                   bulamaz ve bugünkü yoluna düşer. Başka hiçbir dosyaya
 *                   dokunmak gerekmez.
 *
 *   DARALTMAK    →  audience: "admins" ya da [ "upn", … ]
 */
export const WARM_START = {
  /** Ana şalter. `false` → özellik tamamen yok sayılır. */
  enabled: true,
  /**
   * Kimde çalışsın:
   *
   *   "*"          → giriş yapmış herkes (bugünkü hâl)
   *   "admins"     → yalnız ADMIN_GROUP_ID üyeleri
   *   [ "upn", … ] → yalnız bu kullanıcılar
   *
   * `"*"` tyrotrade'de kalite testinden sonra açıldı ve buraya da öyle
   * geldi: ısıtma bir hızlanmaysa herkes için hızlanmadır, kişiye özel bir
   * yol kimsenin bakmadığı ikinci bir kod dalı bırakır. Maliyet freni
   * kapıda değil, `maxAgents`ta (aşağıda) — tek asistan, tek tur.
   *
   * ⚠️ Liste MSAL `username`i ile, yani UPN ile eşleşir — MAİL ADRESİYLE
   * DEĞİL. kurumda ikisi aynı şey değil (yabancı iştiraklerde mail
   * `@kurum.example` iken UPN başka bir alan adı olabiliyor), ve mail ile
   * eşleşen bir liste o kullanıcıları sessizce kapıda bırakır. Eşleşme
   * küçük-büyük harf duyarsız.
   */
  audience: "*",
  /**
   * Hangi asistanlar ısınsın.
   *
   *   "*"         → katalogda AÇIK asistanlar, kullanıcının gördüğü sırayla
   *                 (varsayılan)
   *   [ "ad", … ] → yalnız bu adlar (ADLA eşleşir, id ile değil: katalog
   *                 GUID'i ortamlar arasında değişiyor, ad değişmiyor)
   *
   * ⚠️ Bir zamanlar burada KİLİTLİ asistanların ısıtılmadığı yazılıydı;
   * agent kilidi 2026-09-10'da kaldırıldı (katalogda açık olan her agent
   * herkese açık), o yüzden tek süzgeç katalogdaki `active` bayrağı.
   */
  agents: "*",
  /**
   * ⚠️ ISITILACAK AZAMİ ASİSTAN — maliyet freni, ve 1 olması ÖLÇÜLMÜŞ bir
   * karar.
   *
   * tyrotrade'de sahada ölçüldü (2026-09-08, 64 konuşma / 115 tur): her
   * açılışta ÜÇ asistan ısıtılıyordu, kullanıcı birini kullanıyordu ve
   * **27 ısıtma turunun yalnız 1'i devralındı**. Isıtma turu gerçek bir
   * turdur (kotadan düşer, transcript'e girer), yani 26'sı israftı.
   *
   * tyro'da liste kullanıcının kendi katalog sırası ve ChatScreen açılışta
   * `agents[0]`ı — listenin ilk asistanını — açıyor. Yani "1" tam olarak
   * AÇILACAK OLAN asistan demek; ikinci sıra bir tahmindir ve ölçüm o
   * tahminin pahalı olduğunu söylüyor.
   */
  maxAgents: 1,
  /**
   * AŞAMA 3 — ısıtma TURU. Kapatmak `warmTurn: false` (Aşama 1-2 kalır).
   *
   * Neden ayrı bir şalter: Aşama 1-2 ajanla hiç konuşmuyor, bedeli yok.
   * Aşama 3 ise GERÇEK bir tur — konuşma geçmişine giriyor, Copilot Studio
   * transcript'inde görünüyor ve mesaj kotasından düşüyor. İkisini tek
   * şaltere bağlamak, ucuz olanı pahalı olanla birlikte kapatmak olurdu.
   *
   * Bedelinin karşılığı ölçüldü (tyrotrade, araç çağıran turlar): MCP
   * başlatması o turda olan sorular medyan 27,9 sn, başlatması önceden
   * ödenmiş olanlar 19,6 sn.
   */
  warmTurn: true,
  /**
   * ISITMA ROZETİ — "bu cevap ısıtılmış konuşmadan mı geldi?"
   *
   *   false      → hiç çizilmez
   *   "admins"   → yalnız ADMIN_GROUP_ID üyeleri (bugünkü hâl)
   *   "*"        → herkes
   *
   * Rozet, konuşmanın İLK GERÇEK CEVABININ eylem satırında, kopyala
   * düğmesinin SOLUNDA duran bir glif; ölçülen faz süreleri balonunda
   * yazar (ateş = ısıtıldı, arşiv = kayıtlı oturum sürdü, kar = sıfırdan).
   *
   * ⚠️ Bir zamanlar ısıtma turu SOHBETTE iki mesaj olarak çiziliyordu ve
   * kaldırıldı: kullanıcının sormadığı bir soruyu dökümüne yazmak
   * konuşmayı yalan söyletir. Aynı bilgi artık mesajın DIŞINDA, bir
   * rozette duruyor — döküm temiz kalıyor, teşhis kaybolmuyor.
   *
   * ⚠️ Varsayılan "admins", çünkü ısıtma bir HIZLANDIRMADIR, kullanıcının
   * izlemesi gereken bir durum değil: "el sıkışma 1,2 sn" satırı bir
   * tüccara hiçbir şey söylemez. Herkese açmak tek satır.
   */
  badge: "admins",
  /**
   * Isıtma turunda ajana giden metin.
   *
   * ⚠️ SELAMLAMA İLE BAŞLAMAZ. Isıtmanın tek işi turu ORKESTRATÖRE
   * ulaştırmak (MCP sunucuları ancak orada ayağa kalkıyor) ve "merhaba"
   * tam da bir selamlama KONUSUNUN yakalaması en muhtemel metin:
   * yakalanırsa tur orkestratöre hiç gitmez, init olmaz ve ısıtma sessizce
   * boşa gider — hata vermez, yalnız kazanç sıfırlanır. tyrotrade'de
   * ölçüldü: TYRO Trader'ın selamlama konusu "Merhaba," ile başlayan
   * mesajı yakalayıp sabit bir cevap dönüyordu. Bugünkü metin bir SORU
   * soruyor, yani smalltalk kalıbına düşmüyor.
   *
   * ⚠️ AĞIR BİR SORGU DA DEĞİL. "Dönem performansı özeti ver" gibi bir
   * metin de işe yarardı ama gerçek araçları çalıştırır: asistan başına
   * 10-40 sn ajan işi ve ERP turu — üstelik cevap saklanmadan çöpe gidiyor.
   * Ölçülmüştü: Copilot Studio bağlı TÜM MCP sunucularını, o turda gerekip
   * gerekmediğine bakmadan ayağa kaldırıyor — yani hafif bir tur da aynı
   * işi görüyor.
   *
   * ⚠️ Metni değiştirirsen Copilot Studio activity'sinde ısıtma turunda
   * `DynamicServerInitialize` hâlâ çıkıyor mu diye BAK.
   */
  warmPrompt: "hangi araçlara erişimin var, kısaca neler yapabilirsin?",
}
