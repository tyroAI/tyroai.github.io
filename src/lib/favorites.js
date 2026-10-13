// Favoriler — kullanıcının dashboard'dan işaretlediği agent / AI çözümü /
// iş uygulaması, sol menüde "Favoriler" başlığı altında listelenir.
//
// Neden provider değil de modül store: favorileri okuyan iki yer var
// (sidebar listesi ve kartın kalbi) ve ikisi de sağlayıcı ağacının farklı
// dallarında. `useSyncExternalStore` ile ikisi de aynı anlık görüntüyü
// okuyor, prop zinciri DashboardLayout → Sidebar → NavFavorites üzerinden
// bir state taşımaya gerek kalmıyor. chatBus'taki okunmamış sayacı da
// aynı sebeple böyle.
//
// Kayıt localStorage'da, TARAYICI BAŞINA: bir favori tercih, kurumsal veri
// değil — Dataverse'e yazmak her tıklamayı bir ağ çağrısına çevirirdi ve
// çevrimdışı açılışta liste boş gelirdi.

const STORAGE_KEY = "tyro-favorites-v1"
const KINDS = new Set(["agent", "aiApp", "businessApp"])

// Girdi hem `id` hem `name` taşır ve çözüm ÖNCE id'ye bakar, tutmazsa
// isme. Sebebi ConfigProvider'ın kendi birleştirme kuralıyla aynı: aynı
// kayıt seed listesinde yerel bir id, Dataverse'te bir GUID taşıyor. Yalnız
// id ile saklasaydık, kullanıcı oturum açtığı anda favorileri sessizce
// kaybolurdu — favori duruyor, işaret ettiği kayıt bulunamıyor olurdu.
const nameKey = (name) => (name ?? "").trim().toLowerCase()

const EMPTY = []

let snapshot = read()
const listeners = new Set()

function read() {
  if (typeof window === "undefined") return EMPTY
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]")
    if (!Array.isArray(parsed)) return EMPTY
    const seen = new Set()
    const clean = []
    for (const entry of parsed) {
      if (!entry || !KINDS.has(entry.kind) || typeof entry.id !== "string") continue
      const key = entry.kind + ":" + entry.id
      if (seen.has(key)) continue
      seen.add(key)
      clean.push({
        kind: entry.kind,
        id: entry.id,
        name: typeof entry.name === "string" ? entry.name : "",
      })
    }
    return clean
  } catch {
    return EMPTY
  }
}

function write(next) {
  snapshot = next
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* quota / gizli mod — sessiz geç, liste bu oturumda yine çalışır */
    }
  }
  for (const cb of listeners) cb()
}

/** Bir favori girdisi ile bir katalog kaydı aynı şeyi mi gösteriyor. */
export function favoriteMatches(entry, kind, item) {
  if (!entry || entry.kind !== kind || !item) return false
  if (entry.id === item.id) return true
  return !!entry.name && nameKey(entry.name) === nameKey(item.name)
}

export function subscribeFavorites(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getFavorites() {
  return snapshot
}

/** SSR / ilk render anlık görüntüsü — localStorage yok. */
export function getFavoritesServerSnapshot() {
  return EMPTY
}

export function isFavorite(kind, item) {
  return snapshot.some((entry) => favoriteMatches(entry, kind, item))
}

export function addFavorite(kind, item) {
  if (!KINDS.has(kind) || !item?.id || isFavorite(kind, item)) return
  // Sona eklenir: liste "eklenme sırası", çünkü kullanıcının kendi kurduğu
  // sıra alfabetik bir sıralamadan daha anlamlı.
  write([...snapshot, { kind, id: item.id, name: item.name ?? "" }])
}

export function removeFavorite(kind, item) {
  const next = snapshot.filter((entry) => !favoriteMatches(entry, kind, item))
  if (next.length !== snapshot.length) write(next)
}

/** @returns {boolean} işlemden sonra favori mi. */
export function toggleFavorite(kind, item) {
  if (isFavorite(kind, item)) {
    removeFavorite(kind, item)
    return false
  }
  addFavorite(kind, item)
  return isFavorite(kind, item)
}

// İkinci sekmede eklenen favori bu sekmede de görünsün. `storage` olayı
// yalnızca DİĞER sekmelerde tetiklenir, yani kendi yazdığımız değeri geri
// okuma döngüsü oluşmaz.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return
    snapshot = read()
    for (const cb of listeners) cb()
  })
}
