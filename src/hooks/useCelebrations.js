import { useEffect, useState } from "react"
import { fetchCelebrations, narrowToToday } from "@/lib/celebrations"
import { STATUS } from "@/lib/graph"
import { msalInstance } from "@/lib/msal"

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  TEBRİKLER — 12 SAATLİK KAYIT
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ **NEDEN DİSKE YAZIYORUZ.** Sorgu ~3 sn sürüyor (ölçüldü) ve liste
 * günde en fazla bir kez değişiyor — doğum tarihi hiç değişmiyor, kadro
 * yavaş. Her sekme açılışında yeniden çekmek o 3 saniyeyi bedelsiz sanmaktı
 * (istek, 2026-09-22: *"localStorage'ta tutup 12 saatte bir çekebilirsin"*).
 *
 * ⚠️ **AMA BU BAŞKALARININ VERİSİ — ÜÇ KORUMA ŞART:**
 *
 * 1. **HAM SATIR YAZILMAZ, TÜRETİLMİŞ DİLİM YAZILIR.** Diske giden: ad ·
 *    ünvan · doğum gününün GÜN-AYı · işe giriş tarihi. Giden ağdan 70 alanlık
 *    satır değil, ekranda zaten görünen dört bilgi. **DOĞUM YILI YAZILMAZ**
 *    (türetme onu zaten taşımıyor) — yani kayıt kimsenin yaşını bilmiyor.
 *    İşe giriş yılı YAZILIR ve bu bilinçli: "15. yıl" cümlesi onsuz
 *    kurulamıyor, ve kıdem yılı zaten kartın kendisinde görünüyor.
 * 2. **KAYIT SAHİBİNE BAĞLI** (`owner`, oturum adresinin kısa karması;
 *    adresin kendisi yazılmaz). Ortak makinede ikinci kullanıcı birincinin
 *    listesini OKUYAMAZ. Emsal: tyroTrade'in uyarı özeti.
 * 3. **ÇIKIŞTA SİLİNİR** (`clearCelebrationsCache`, msal.js zinciri) ve
 *    depolama envanterinde görünür (`appMeta.js`), yani "Tümünü temizle"
 *    onu da siliyor.
 *
 * ⚠️ **BAYAT KAYIT EKRANA ÇIKAR, AMA "BUGÜNE" ÇEVRİLEREK.** `narrowToToday`
 * her okumada `inDays` ve kaçıncı yıl olduğunu YENİDEN hesaplıyor; kayıt 12
 * saat önce "yarın" diyorsa bugün "bugün" der. Pencereye eklenen 2 günlük
 * pay da bunun için (gerekçe `WINDOW_SLACK_DAYS`).
 */
const KEY = "tyro-celebrations-v1"
const TTL_MS = 12 * 60 * 60 * 1000
/**
 * ⚠️ **ALAN EKLENİNCE SÜRÜM ARTAR.** 1 → 2: kayda `joiners` (bugün işe
 * başlayanlar) eklendi. Artırılmasaydı eski bir kayıt `joiners`sız okunur
 * ve tarih hapının rozeti, kayıt bayatlayana kadar (12 saat) eksik sayardı —
 * ekranda hiçbir hata görünmeden. Sürüm uyuşmayan kayıt yok sayılır, bir
 * sonraki okuma ağdan gelir.
 */
const VERSION = 2

/** Oturum adresinin kısa karması — adresin kendisi depoya YAZILMAZ. */
function ownerHash(identity) {
  let h = 5381
  const s = String(identity || "")
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function currentOwner() {
  return ownerHash(msalInstance.getActiveAccount()?.username ?? "")
}

function readStored(now) {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const snap = JSON.parse(raw)
    if (snap?.v !== VERSION) return null
    // ⚠️ Sahip uymuyorsa YOK SAYILIR, SİLİNMEZ: asıl sahibi geri döndüğünde
    // kendi kaydını bulsun (uyarı özetinin kuralının aynısı).
    if (snap.owner !== currentOwner()) return null
    if (!Array.isArray(snap.birthdays) || !Array.isArray(snap.anniversaries)) return null
    if (!Array.isArray(snap.joiners)) return null
    if (!(now - snap.at < TTL_MS)) return null
    return {
      status: STATUS.ready,
      birthdays: snap.birthdays,
      anniversaries: snap.anniversaries,
      joiners: snap.joiners,
    }
  } catch {
    // Depolama kapalı / kota dolu — kayıt yokmuş gibi davran.
    return null
  }
}

function writeStored(data, now) {
  if (data?.status !== STATUS.ready) return
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        v: VERSION,
        owner: currentOwner(),
        at: now,
        birthdays: data.birthdays ?? [],
        anniversaries: data.anniversaries ?? [],
        joiners: data.joiners ?? [],
      }),
    )
  } catch {
    // Sessiz: kayıt bir hızlandırma, yazılamaması özelliği bozmuyor.
  }
}

let cache = null

export function clearCelebrationsCache() {
  cache = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    // yoksay
  }
}

/**
 * İsteği React'tan ÖNCE başlatır — kabuk mount olurken çağrılır.
 *
 * ⚠️ **KAYIT TAZEYSE AĞA HİÇ ÇIKILMAZ.** Ölçüldü: sorgu ~3 sn (eskiden ~12);
 * 12 saat içinde ikinci kez ödemenin karşılığı yok.
 */
export function primeCelebrations() {
  if (cache) return
  const now = Date.now()
  const stored = readStored(now)
  if (stored) {
    cache = { promise: Promise.resolve(stored), data: stored }
    return
  }
  cache = { promise: fetchCelebrations(now), data: null }
  cache.promise.then((data) => {
    if (cache) cache.data = data
    writeStored(data, now)
  })
}

export function useCelebrations() {
  const [state, setState] = useState(() => cache?.data ?? { status: "loading" })

  useEffect(() => {
    let alive = true
    primeCelebrations()
    cache.promise.then((data) => {
      if (alive) setState(data)
    })
    return () => {
      alive = false
    }
  }, [])

  // ⚠️ HER RENDER'DA DEĞİL, veri değişince: `narrowToToday` saf ve ucuz
  // (en fazla ~50 satır), ama "bugün"ü okuduğu için memo'lanmaz — gece
  // yarısını geçen bir sekmede eski gün donardı.
  return state.status === STATUS.ready ? narrowToToday(state) : state
}

export { STATUS }
