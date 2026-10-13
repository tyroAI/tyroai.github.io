import { promptKeyForAgent } from "@/data/prompts"
import { currentUserKey } from "@/lib/chatSession"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  GÜN ÖZETİ — saatine göre değişen düğme, peşin ödenmiş tur
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Özelliğin tamamı tek kelimeyle greplenir:
 *     grep -rin "dailybrief\|briefWindow\|entry.brief" src/
 *
 * Parçalar: bu dosya (politika + saf yardımcılar) · `WarmStart.jsx`
 * (tetikleyici: ısıtma turunu özet sorusuna çevirir) · `warmStart.js`
 * (tampon: `entry.brief`) · `ChatScreen` (devralıp balona basar) ·
 * `AppLauncher` hero (etiket) · `NavMain` (sidebar rozeti).
 *
 * ── NE YAPIYOR ─────────────────────────────────────────────────────────
 *
 * Isıtma bugün zaten GERÇEK bir tur harcıyor — tek işi MCP sunucularını
 * ayağa kaldırmak olan, cevabı çöpe giden bir tur (`warmStartPolicy.js`ın
 * `warmPrompt`ı). Bu özellik o turu, sabah ve akşam pencerelerinde
 * kullanıcının ZATEN soracağı soruya çeviriyor ve cevabı saklıyor. Yani
 * yeni bir maliyet kalemi değil, var olan bir maliyetin karşılığını almak.
 *
 *   06:00-11:00 → düğme "Sabah özeti hazırla"
 *   16:00-22:00 → düğme "Gün sonu özeti hazırla"
 *   dışında     → düğme bugünkü "Yeni sohbet başlat"
 *
 * ── GERİ ALMAK TEK SATIR ───────────────────────────────────────────────
 *
 *   enabled: false
 *
 * O hâlde `prewarmConversation`a `brief` hiç geçilmez, `entry.brief` her
 * zaman `undefined` olur, ChatScreen'deki her brief dalı ölü koda döner ve
 * etiket bugünkü anahtara düşer. Başka hiçbir dosyaya dokunmak gerekmez.
 */
export const DAILY_BRIEF = {
  /** Ana şalter. `false` → özellik tamamen yok sayılır. */
  enabled: true,

  /**
   * Kimde çalışsın: `"*"` · `"admins"` · `["upn", …]`.
   *
   * ⚠️ **İLK SÜRÜM BİLEREK DAR** (karar: 2026-09-19). Her tetikleme,
   * kullanıcı başına ve pencere başına bir GERÇEK ağır tur demek — düğmeye
   * bassa da basmasa da M365'e gidiyor. Ölçülecek tek sayı devralma oranı;
   * tyrotrade emsali kötü (27 ısıtma turunun yalnız 1'i devralınmıştı ve
   * `maxAgents` o ölçümle 1'e indirilmişti). Bir hafta sonra `"*"`.
   *
   * ⚠️ Liste MSAL `username`i ile, yani UPN ile eşleşir — MAİL ADRESİYLE
   * DEĞİL (`warmStartPolicy.js`ın aynı uyarısı: kiracıda ikisi aynı şey
   * değil ve mail ile eşleşen bir liste yabancı iştirakleri sessizce
   * kapıda bırakır).
   */
  audience: "*",

  /**
   * Pencereler. Yarı açık aralık: `from <= h && h < to`.
   *
   * ⚠️ **HİÇBİR PENCERE GECE YARISINI GEÇMEZ.** Pencere kimliği tarih
   * damgalı; bir pencerenin ORTASINDA gün dönerse 23:30'da giren kullanıcı
   * 00:10'da ikinci bir faturalı tur tetikler.
   *
   * Akşam penceresi gece yarısına kadar uzatıldı (istek üzerine,
   * 2026-09-19) ve kural BOZULMUYOR: `to: 24` pencereyi gece yarısında
   * BİTİRİYOR, geçirmiyor. `getHours()` en fazla 23 döndürdüğü için üst
   * sınır 23:59:59'u kapsıyor, 00:00'da ise hiçbir pencere açık değil —
   * yani bir sonraki tetikleme en erken ertesi sabah 06:00.
   *
   * ⚠️ **`greetingKey`in 5/12/18/22 bantlarıyla BİLEREK ÇAKIŞMIYOR ve
   * hizalanmayacak.** Selamlama "günün hangi vaktindeyiz" sorusunu,
   * pencere "peşin ödemeye değer bir brifing var mı" sorusunu cevaplıyor.
   * 05:30 selamlama-sabahıdır ama kimsenin postası kıpırdamamıştır. Bu
   * satır silinirse bir sonraki tur bunu hata sanıp "düzeltir".
   */
  windows: [
    { id: "morning", from: 6, to: 11 },
    { id: "evening", from: 16, to: 24 },
  ],

  /**
   * Bir pencerede EN FAZLA kaç kez özet turu atılabilir.
   *
   * Normalde bir tane. İkinciye ancak birincisi kullanıcıya HİÇ
   * ulaşamadığında geçiliyor: hazırlanan özet yalnız o sayfa yüklemesinin
   * belleğinde yaşıyor, yani basit bir F5 onu siliyor. Damga "ateşlendi"
   * saydığı sürece o durumda ağır tur ödenmiş ve karşılığı kimseye
   * geçmemiş oluyordu (sahada görüldü, 2026-09-19).
   *
   * ⚠️ FREN BURADA. Damga "kullanıldı" olmadan yenileyen bir kullanıcı
   * sınırsız tur ateşleyebilirdi; iki deneme, "bir kez kaybolabilir" ile
   * "her yenilemede bir tur daha" arasındaki sınır.
   */
  maxArms: 2,

  /**
   * Tamponlanmış özetin ekrana basılabileceği AZAMİ yaş (el sıkışmadan
   * itibaren). Aşılırsa HİÇ BASILMAZ, soru canlı sorulur.
   *
   * Bu tek sayı "balona hangi saati yazacağız" sorusunu tümüyle ortadan
   * kaldırıyor: basılan her özet en fazla 15 dakika eski bir veriyi
   * gösterir, yani mesajın saati doğru kalır. Alternatifi (zaman damgası +
   * bayatlık satırı + "yeniden sor" düğmesi) aynı garantiyi dört yeni
   * sözlük anahtarı ve yeni bir balon yüzeyiyle verirdi.
   */
  freshMs: 15 * 60_000,

  /**
   * Devralınan AKAN bir özette beklemenin sert tavanı.
   *
   * Mekanizmanın 30 sn'lik tavanı bir İPTAL değil "ölçmeyi bırak"; tampon
   * arkada dolmaya devam eder. Bu ise ChatScreen'in tavanı: dolarsa balon
   * `incomplete` işaretlenir ve besteci AÇILIR. Açılmazsa kullanıcı
   * sonsuza kadar kilitli kalırdı — özelliğin gerçekten kötü tek arızası
   * bu olurdu.
   */
  streamCapMs: 180_000,

  /**
   * Ajana giden metinler, `promptKeyForAgent()` çıktısına göre.
   *
   * ⚠️ **METİN KISA VE DÜĞMEYLE AYNI** (karar: 2026-09-19). Sohbette
   * görünen cümle ile ajana giden cümle AYNI: kullanıcı neye bastıysa
   * dökümünde onu görüyor. Uzun bir yönerge göndermek (ör. "okunmamış
   * postalarımı özetle, bugün cevap isteyenleri üste al") ajana daha çok
   * bilgi verirdi ama döküm düğmeyle çelişirdi — ya da iki ayrı metin
   * tutmak gerekirdi ki o da "gönderilen ile gösterilen ayrı" demek.
   *
   * ⚠️ İlk canlı turda BAKILACAK TEK ŞEY: Office ajanı kısa komutu doğru
   * yorumluyor mu. "Hangi özeti?" diye geri sorarsa özellik boşa döner ve
   * çare tek satır — metni uzun hâline çevirmek.
   *
   * ⚠️ Metin `promptCatalogue.js`te DEĞİL, ve bu bilinçli: o katalog TEMBEL
   * yükleniyor (hero etiketi bu metni SENKRON okumak zorunda, dökümle
   * karşılaştırıyor) ve bir starter çipini arayüz gerekçesiyle düzenleyen
   * kişi, farkında olmadan 06:00'da herkese giden soruyu değiştirirdi.
   * Katalogdaki "Sabah özeti" çipi olduğu gibi KALIYOR — özelliğin kapalı
   * olduğu her durumda kullanıcının elindeki manuel yol odur.
   *
   * ⚠️ **ARACI OLMAYAN ASİSTANA İSTEM YAZILMAZ** (`promptCatalogue.js`ın
   * kendi kuralı: "listedeki en pahalı hata"). Bugün yalnız `office` var
   * (M365 posta + takvim). Eşleşmeyen asistanda özellik o kullanıcıda
   * SESSİZCE kapalı — ne etiket değişir ne tur harcanır.
   */
  prompts: {
    office: {
      morning: { tr: "Sabah özeti hazırla", en: "Prepare my morning brief" },
      evening: { tr: "Gün sonu özeti hazırla", en: "Prepare my end-of-day brief" },
    },
  },
}

/** Şu an açık pencere, yoksa `null`. */
export function resolveBriefWindow(now = new Date()) {
  if (!DAILY_BRIEF.enabled) return null
  const h = now.getHours()
  return DAILY_BRIEF.windows.find((w) => h >= w.from && h < w.to) ?? null
}

/**
 * Pencere kimliği: `"2026-09-19:morning"`.
 *
 * ⚠️ **`toISOString()` YASAK — ve sebebi Istanbul'da GÖRÜNMEZ.** UTC+3'te
 * pencere saatlerinde (06-11, 16-22) ISO tarihi ile yerel tarih her zaman
 * aynı çıkıyor, yani hata burada hiç ısırmıyor. NEGATİF ofsette ısırıyor:
 * New York'ta (UTC-4) yerel 21:00, UTC'de ERTESİ GÜN 01:00 — damga yarının
 * akşamına yazılır ve kullanıcı ertesi akşam özetini kaybeder. Ölçüldü
 * (izole harness, üç saat dilimi): kural yerel parçalarla üç dilimde de
 * doğru, `toISOString`e çevrilince New York'ta düşüyor.
 */
export function briefWindowId(now = new Date(), win = resolveBriefWindow(now)) {
  if (!win) return null
  const p = (n) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}:${win.id}`
}

/** Pencerenin başlangıç anı (ms) — "bu pencerede başka soru soruldu mu". */
export function briefWindowStart(now = new Date(), win = resolveBriefWindow(now)) {
  if (!win) return null
  const d = new Date(now)
  d.setHours(win.from, 0, 0, 0)
  return d.getTime()
}

/** Pencere kimliğinden pencere adı: `"2026-09-19:morning"` → `"morning"`. */
export function briefWindowName(windowId) {
  return typeof windowId === "string" ? windowId.split(":")[1] : null
}

/** Asistan + pencere + dil → ajana gidecek metin, yoksa `null`. */
export function briefPromptFor(agentName, windowId, locale) {
  // Şalter BURADA da sorulur. `briefWindowId` kapalıyken zaten `null`
  // döndüğü için bugün buraya geçerli bir kimlik ulaşamıyor — ama "geri alma
  // tek satır" sözü, o satıra güvenen her yolun da kapalı olmasını
  // gerektiriyor. İleride kimliği başka bir yerden (URL, test, kayıt) alan
  // bir çağıran çıkarsa şalter yine tutar.
  if (!DAILY_BRIEF.enabled) return null
  const name = briefWindowName(windowId)
  if (!name) return null
  const slot = DAILY_BRIEF.prompts[promptKeyForAgent(agentName)]?.[name]
  if (!slot) return null
  return locale === "tr" ? slot.tr : slot.en
}

/* ═══════════════════════════════════════════════════════════════════════
 *  DAMGA — "bu pencere bu tarayıcıda ateşlendi"
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ `useSyncExternalStore` modül store'u DEĞİL, ve bu ölçülmüş bir karar:
 * damgayı YAZAN ve OKUYAN tek yer `WarmStart.jsx`in aynı efekti. Abonesi
 * olmayan bir store ölü altyapıdır; hero etiketinin ihtiyaç duyduğu
 * dinamik (saat + döküm) zaten TÜRETİLİYOR.
 *
 * ⚠️ Temizlik GEREKMEZ: ertesi günün kimliği kendiliğinden eşleşmez
 * (`changelogSeen`in KİMLİK saklama kuralı — tarih aritmetiği ya da gece
 * yarısında silen bir zamanlayıcı yazmaya gerek yok).
 *
 * ⚠️ Çıkışta SİLİNMEZ: silmek, aynı kullanıcının yeniden girişinde faturalı
 * bir turu tekrar ateşlerdi. Ortak tarayıcıyı `userKey` çözüyor.
 *
 * ⚠️ `appMeta.localStorageRegistry`e EKLENMEZ: envanterin "Tümünü temizle"si
 * bu damgayı silince, temasını temizleyen herkes o sabahki AĞIR turu
 * yeniden ateşler. En yakın iki emsal (`tyro-favorites-v1`,
 * `tyro-changelog-seen-v1`) de o listede değil.
 */
const FIRED_KEY = "tyro-daily-brief-v1"

/**
 * Damganın şekli: `{ windowId, userKey, tries, used }`.
 *
 * ⚠️ **"ATEŞLENDİ" DEĞİL "KULLANILDI".** İlk hâli yalnız pencere kimliği
 * tutuyordu ve tur atılır atılmaz "bu pencere bitti" diyordu. Oysa
 * hazırlanan özet YALNIZ o sayfa yüklemesinin belleğinde yaşıyor
 * (`clearWarmCache` çıkışta siliyor, modül durumu da yenilemede ölüyor):
 * kullanıcı basmadan F5'lerse özet kayboluyor, damga hâlâ "ateşlendi"
 * diyor ve bir daha hazırlanmıyordu — ağır tur ödenmiş, karşılığı kimseye
 * geçmemiş oluyordu. Sahada görüldü (2026-09-19).
 *
 * `used` ancak özet GERÇEKTEN ekrana basılınca yazılıyor (ChatScreen'in
 * brief dalı). `tries` ise freni tutuyor (`DAILY_BRIEF.maxArms`).
 *
 * ⚠️ ESKİ ŞEKİL SESSİZCE OKUNUR: `tries`i olmayan bir kayıt "bir kez
 * denendi, kullanılmadı" sayılır. Anahtar sürümlemek (v2) de olurdu ama
 * geride okunmayan bir çöp anahtar bırakırdı.
 */
function readStamp(windowId) {
  if (!windowId) return null
  try {
    const raw = localStorage.getItem(FIRED_KEY)
    if (!raw) return { tries: 0, used: false }
    const saved = JSON.parse(raw)
    // Kullanıcı ya da pencere uyuşmuyorsa bu damga bizim değil: ortak
    // tarayıcıda A'nın sabahı B'yi kapıda bırakmasın.
    if (saved?.windowId !== windowId || saved?.userKey !== currentUserKey()) {
      return { tries: 0, used: false }
    }
    // ⚠️ `Number(x) || 1` DEĞİL: `tries` SIFIR olduğunda (geri verilmiş bir
    // deneme) o ifade 1 döndürür ve geri verme sessizce kaybolurdu. Ayrım
    // "alan yok mu" (eski şekil → 1) ile "alan sıfır mı" arasında.
    return {
      tries: Number.isFinite(saved.tries) ? saved.tries : 1,
      used: saved.used === true,
    }
  } catch {
    // Okunamıyorsa hiçbir şey denenmez: bozuk bir kayıt yüzünden her
    // açılışta faturalı bir tur atmak, özelliği hiç çalıştırmamaktan kötü.
    return null
  }
}

function writeStamp(windowId, stamp) {
  try {
    localStorage.setItem(
      FIRED_KEY,
      JSON.stringify({ windowId, userKey: currentUserKey(), ...stamp }),
    )
    return true
  } catch {
    return false
  }
}

/** Bu pencerede bir özet turu daha atılabilir mi? */
export function canArmBrief(windowId) {
  const stamp = readStamp(windowId)
  if (!stamp) return false
  return !stamp.used && stamp.tries < DAILY_BRIEF.maxArms
}

/**
 * Bir deneme harca. Yazılamazsa `false` döner ve çağıran turu HİÇ
 * başlatmaz — kaybolan bir işaret, her sekmede bir ağır tur demek.
 */
export function markBriefArmed(windowId) {
  const stamp = readStamp(windowId)
  if (!stamp) return false
  return writeStamp(windowId, { tries: stamp.tries + 1, used: stamp.used })
}

/**
 * Taşıma hiç kurulamadı, yani HİÇBİR tur harcanmadı: denemeyi geri ver.
 * Silmek değil AZALTMAK — aynı pencerede daha önce gerçekten harcanmış bir
 * deneme varsa o durmalı.
 */
export function releaseBriefArm(windowId) {
  const stamp = readStamp(windowId)
  if (!stamp) return
  writeStamp(windowId, { tries: Math.max(0, stamp.tries - 1), used: stamp.used })
}

/**
 * Özet EKRANA BASILDI — pencerenin işi bitti.
 *
 * Damganın tek kalıcı anlamı bu. Çıkışta silinmiyor: silmek, aynı
 * kullanıcının yeniden girişinde faturalı bir turu tekrar ateşlerdi.
 */
export function markBriefUsed(windowId) {
  const stamp = readStamp(windowId)
  writeStamp(windowId, { tries: Math.max(1, stamp?.tries ?? 1), used: true })
}
