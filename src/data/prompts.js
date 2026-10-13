/**
 * Sohbet için hazır istem (prompt) kataloğu.
 *
 * İki yüzeyi besler: boş sohbetteki başlangıç çipleri ve İstem Laboratuvarı
 * (composer'daki ampul düğmesinin açtığı pencere).
 *
 * ÜÇ KARAR, üçü de bilinçli:
 *
 * 1. **Katalog ASİSTANA göredir.** TYRO Office'e sorulacak şeyle TYRO
 *    Trader'a sorulacak şey aynı değil; ortak bir liste ikisine de yabancı
 *    kalırdı. Eşleşme İSİMLEdir, id ile değil — katalog GUID'i ortamlar
 *    arasında değişiyor (aynı kural `src/lib/surfaceAgent.js`'te de var).
 *    Tanınmayan asistan genel listeye düşer.
 *
 * 2. **Metinler burada, `strings.*.js`'te değil.** O dosyalar arayüz
 *    metinleridir (düğme, başlık, hata); bu bir İÇERİK kataloğu ve satır
 *    sayısı yüzlerce. Aynı ayrım `seedConfig.js` ve `expenseAccounts.ts`'te
 *    de var.
 *
 * 3. **TR ve EN yazılır; RU/AR İngilizceye düşer.** Freight sayfalarının 451
 *    anahtarında verilen kararın aynısı: D365/denizcilik jargonunda makine
 *    çevirisi anlamsız çıkıyor. Yanlış bir Türkçe/Rusça istem, istem
 *    olmamasından kötüdür.
 *
 * Köşeli parantezli yer tutucular (`[proje no]`) doldurulmayı bekler:
 * arayüz istemi composer'a yazar ve İLK yer tutucuyu seçili bırakır, böylece
 * kullanıcı yazmaya başlayınca üzerine yazar.
 */

/**
 * Katalog TEMBEL yüklenir.
 *
 * 75 istem × dört alan, ölçüldü: giriş paketine ~12 KB gzip ekliyor ve o paketi
 * uygulamayı açan HERKES indiriyor — oysa istemler yalnızca sohbete girildiğinde
 * görünüyor. İlk okuma boş döner, katalog inince tüketiciler yeniden çizilir.
 */
let CATALOGUE = null
let loading = null
const listeners = new Set()

function loadCatalogue() {
  if (CATALOGUE) return Promise.resolve(CATALOGUE)
  loading ??= import("@/data/promptCatalogue")
    .then((m) => {
      CATALOGUE = m.PROMPT_CATALOGUE
      listeners.forEach((fn) => fn())
      return CATALOGUE
    })
    .catch((err) => {
      // Başarısızlık saklanmaz: bir kerelik ağ hatası, istem listesini sekme
      // boyunca kapalı tutmasın.
      loading = null
      throw err
    })
  return loading
}

/** Katalog geldiğinde haber verir; `useSyncExternalStore` için abone kancası. */
export function subscribeCatalogue(fn) {
  listeners.add(fn)
  void loadCatalogue().catch(() => {})
  return () => listeners.delete(fn)
}

const EMPTY = { topics: [], starters: [] }

/** Yer tutucu deseni — arayüz ilkini seçmek için kullanır. */
export const PLACEHOLDER_RE = /\[[^\]]+\]/

/**
 * Asistan adından katalog anahtarına. Ad KÜÇÜK HARFE indirilip aranır ve
 * "içeriyor mu" diye bakılır: katalogda "TYRO Trader" da olabiliyor
 * "tyro trader agent" da.
 */
/**
 * Asistan adı → katalog anahtarı.
 *
 * Ad önce AKSANSIZLAŞTIRILIR (`normalize("NFD")` + birleşen işaretleri at),
 * sonra küçültülür. İki sebep:
 *   · JS'in `toLowerCase()`'i Türkçe "İ"yi "i" + birleşen nokta yapıyor,
 *     yani "İnsan Kaynakları" düz bir /insan/ desenine ASLA uymuyordu.
 *   · Aynı işlem "Satış" → "satis", "Tüccar" → "tuccar" veriyor, yani
 *     desenler ASCII yazılabiliyor ve her iki yazım da tek desenle tutuluyor.
 *
 * Eşleşme ADLA yapılır, id ile değil: katalog satırının GUID'i ortamlar
 * (dev/prod Dataverse) arasında değişiyor, ad ise alternate key'in yarısı
 * olduğu için kararlı. Tanınmayan asistan genel listeye düşer.
 */
const AGENT_KEYS = [
  { match: /office|ofis/, key: "office" },
  { match: /trader|tuccar/, key: "trader" },
  { match: /sales|satis/, key: "sales" },
  // `hr` KELİME sınırıyla aranıyor, alt dize olarak değil: `includes` ile
  // o iki harfi içeren her ad (Ashraf, Behruz…) İK asistanı sayılırdı.
  { match: /\bhr\b|insan kaynak/, key: "hr" },
]

export function promptKeyForAgent(agentName) {
  const n = (agentName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // Noktasiz i'nin NFD ayrisimi yok: yukaridaki adim onu oldugu gibi
    // birakiyor ve "satis" deseni "satis"i kaciriyordu.
    .replace(/ı/g, "i")
  return AGENT_KEYS.find((a) => a.match.test(n))?.key ?? "general"
}

/* ─────────── Katalog ─────────── */

/* İçerik ayrı dosyada (`promptCatalogue.js`): bu dosya mantık, o dosya metin. */

/**
 * Seçili dile göre düzleştirilmiş katalog.
 *
 * `tr` dışındaki her dil İngilizceye düşer (yukarıdaki 3. karar).
 */
export function getPrompts(agentName, locale) {
  if (!CATALOGUE) return EMPTY
  const cat = CATALOGUE[promptKeyForAgent(agentName)] ?? CATALOGUE.general
  const tr = locale === "tr"
  const pick = (o, field) => (tr ? o[`${field}Tr`] : o[`${field}En`]) ?? o[`${field}En`] ?? ""
  return {
    topics: cat.topics.map((topic) => ({
      id: topic.id,
      label: pick(topic, "label"),
      blurb: pick(topic, "blurb"),
      iconHint: topic.iconHint,
      // ⚠️ BU SATIR OLMADAN ŞERİT SÜZGECİ SESSİZCE ÇALIŞMIYOR. Konu nesnesi
      // burada yeniden kuruluyor; katalogdaki `labOnly` kopyalanmazsa
      // `PromptStarters`taki `!tp.labOnly` testi her zaman doğru çıkar ve
      // yalnız laboratuvara ait konular şeritte çizilmeye devam eder.
      // Hata vermez, sadece kural hiç uygulanmaz.
      labOnly: topic.labOnly === true,
      prompts: topic.prompts.map((p, i) => ({
        id: `${topic.id}-${i}`,
        // ⚠️ `id` KONUMSAL — kataloğa bir istem eklenince başka bir istemi
        // göstermeye başlar; React anahtarı olarak yeterli ama KALICI bir
        // işaret (favori) ona bağlanamaz. `key` içerikten türer ve DİLDEN
        // BAĞIMSIZDIR: Türkçe arayüzde işaretlenen kart İngilizcede de
        // işaretli kalır. Bkz. `lib/promptFavorites.js`.
        key: p.textEn,
        title: pick(p, "title"),
        text: pick(p, "text"),
        iconHint: p.iconHint,
        template: templateOf(p),
      })),
    })),
    starters: cat.starters.map((s, i) => ({
      id: `starter-${i}`,
      key: s.textEn,
      title: pick(s, "title"),
      text: pick(s, "text"),
      iconHint: s.iconHint,
      template: templateOf(s),
    })),
  }
}

/**
 * Alanlı hazır soru (`lib/promptTemplates.js`): kart besteciye düz metin yerine
 * Anasayfa'daki gibi seçilebilir alanlı cümle açar. `preset` alanların
 * başlangıç değeri ("Mazeret izni" → izin türü mazeret).
 */
function templateOf(p) {
  return p.template ? { key: p.template, preset: p.preset ?? null } : null
}
