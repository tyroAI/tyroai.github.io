/**
 * Hazır istem favorileri — kullanıcının kendi seçtiği öneri kartları.
 *
 * Kayıt localStorage'da, TARAYICI BAŞINA: `favorites.js` ile aynı sınıf bir
 * tercih (tema · palet · dil gibi), kurumsal veri değil.
 *
 * ⚠️ **NEDEN `favorites.js` DEĞİL DE AYRI BİR DOSYA.** O modül bir KATALOG
 * girdisini işaretliyor ({kind, id, name}) ve `favoriteMatches` ile canlı
 * Dataverse listesine bağlanıyor. İstemlerin öyle bir kataloğu yok: kimlikleri
 * KONUMSAL üretiliyor (`prompts.js` → `${topic.id}-${i}`, `starter-${i}`) ve
 * kataloğa bir istem eklenince o kimlik BAŞKA bir istemi göstermeye başlıyor.
 * Konumsal kimliğe favori bağlamak, kullanıcının işaretini sessizce yanlış
 * karta taşımak olurdu — bu deponun en pahalı hata sınıfı.
 *
 * ⚠️ **ANAHTAR İNGİLİZCE METİNDİR** (`textEn`). Dilden bağımsız olmak
 * zorunda: Türkçe arayüzde işaretlenen kart İngilizceye geçilince de işaretli
 * kalmalı. İçerikten türediği için de KONUM değişse bile doğru kartı gösterir.
 *
 * ⚠️ **BEDELİ YAZILI**: bir istemin İngilizce metni DEĞİŞİRSE o favori öksüz
 * kalır ve listelenmez. Silinmez — katalog bir sonraki turda eski metne
 * dönerse işaret yerinde durur (`favorites.js`'in "kayıt silinmiyor"
 * kararının aynısı). Öksüz işaretin bedeli bir kartın favorilerden düşmesi;
 * alternatifi (konumsal kimlik) yanlış kartı favori göstermekti.
 */

const STORAGE_KEY = "tyro-prompt-favorites-v1"

const listeners = new Set()

/** Anlık görüntü önbelleği. */
let cachedRaw = null
let cachedList = []

const EMPTY = []

function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "[]"
  } catch {
    // Özel pencere / kapalı site verisi: favori YOK sayılır, ekran çalışır.
    return "[]"
  }
}

/**
 * ⚠️ **AYNI REFERANSI DÖNDÜRMEK ZORUNDA.** `useSyncExternalStore` okuyucunun
 * döndüğü değeri KİMLİKLE karşılaştırıyor; her çağrıda yeni bir dizi üretmek
 * React'i sonsuz döngüye sokuyor (`orbStyle.js`'te ölçülmüş tuzak). Ham dize
 * değişmedikçe aynı dizi döner.
 */
export function getPromptFavorites() {
  const raw = readRaw()
  if (raw === cachedRaw) return cachedList
  cachedRaw = raw
  try {
    const parsed = JSON.parse(raw)
    // Diskten okunan değer SAHADAN gelir: yalnız dize olanlar geçer.
    cachedList = Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string" && x) : []
  } catch {
    cachedList = []
  }
  return cachedList
}

/** SSR / ilk render anlık görüntüsü — localStorage yok. */
export function getPromptFavoritesServerSnapshot() {
  return EMPTY
}

export function subscribePromptFavorites(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function write(next) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Yazılamıyorsa sessiz kalınır: favori bir kolaylık, ekranı durdurmaz.
  }
  cachedRaw = null // bir sonraki okuma diskten tazelesin
  for (const cb of listeners) cb()
}

export function isPromptFavorite(key) {
  return !!key && getPromptFavorites().includes(key)
}

/**
 * İşareti çevirir. Yeni favori EN BAŞA girer — istek: "ilk sıraya gelsin,
 * sırayla ezebilsin". Favori şeridi bu sırayı olduğu gibi çiziyor, yani
 * en son işaretlenen kart varsayılanı ilk iten olur.
 */
export function togglePromptFavorite(key) {
  if (!key) return
  const cur = getPromptFavorites()
  const next = cur.includes(key) ? cur.filter((k) => k !== key) : [key, ...cur]
  write(next)
}

/**
 * Favori SIRASINI yeniden yazar (sürükle-bırak).
 *
 * ⚠️ Kümeyi DEĞİŞTİRMEZ, yalnız sırayı: gelen liste mevcut favorilerle aynı
 * anahtarları taşımak zorunda. Bu bir sıralama işlemi ve bir kartın favori
 * olup olmadığına kalp karar veriyor — sürüklemenin yan etkisiyle bir kart
 * favoriye girseydi, kullanıcı yalnızca yerini değiştirmek isterken
 * listesini de değiştirmiş olurdu.
 */
export function reorderPromptFavorites(keys) {
  const cur = getPromptFavorites()
  const next = keys.filter((k) => cur.includes(k))
  // Sürükleme sırasında listede olmayan bir anahtar kalırsa (başka sekmede
  // favoriden çıkarılmış olabilir) o kayıt korunur — sessizce silmek,
  // kullanıcının öteki sekmede yaptığı işi geri almak olurdu.
  for (const k of cur) if (!next.includes(k)) next.push(k)
  write(next)
}

// Başka SEKMEDE değişirse bu sekme de haberdar olsun.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return
    cachedRaw = null
    for (const cb of listeners) cb()
  })
}
