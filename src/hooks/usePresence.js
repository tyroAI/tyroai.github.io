import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { ensureMsalInitialized, isMsalConfigured } from "@/lib/msal"

/**
 * Canlı Teams durumu — toplantı katılımcıları için "şu an müsait mi".
 *
 * `usePeoplePhotos` ile aynı desen ve aynı sözleşme: kapsam YALNIZCA sessizce
 * istenir. Takvim paneli her rotada header'da mount oluyor ve header'ın kuralı
 * "sessiz ya da hiç" (bkz. src/lib/graph.js) — kullanıcının tıklamadığı bir
 * bileşenden çıkan etkileşimli istem, giriş duvarına dönerdi. `Presence.Read.All`
 * ADMIN ONAYI ister; onay yoksa hook hiçbir şey döndürmez ve avatarlar
 * durumsuz görünür. Uydurma yeşil nokta yok: bilinmiyorsa gösterilmez.
 *
 * Bu önbellek DİĞERLERİNDEN farklı olarak ESKİR. Fotoğraf bir kez alınıp
 * oturum boyunca saklanabilir; "müsait" bilgisi dakikalar içinde yalan olur.
 * `TTL_MS` dolunca kayıt düşer ve bir sonraki açılış yeniden sorar — panel
 * açık dururken saniye saniye yoklamıyoruz, çünkü bu bir izleme aracı değil,
 * toplantıya bakarken atılan bir göz.
 *
 * Bellekte tutulur; başkalarının durumu da PII'dır ve çıkışta silinir
 * (msal.js LOGOUT_SUCCESS).
 */

const TTL_MS = 45_000

const cache = new Map() // lowercased address -> { state, at }
const inflight = new Map()
const listeners = new Set()

/** Onay yoksa bir kez öğrenilir; her avatar için MSAL'i yeniden yormayız. */
let scopeUnavailable = false

const PRESENCE_PATH = (address) =>
  `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(address)}/presence`

/**
 * Graph'ın dokuz `availability` değeri dört duruma iner — bir avatarın
 * üstündeki nokta bundan fazlasını taşıyamaz ve kullanıcı da "BusyIdle" ile
 * "Busy" ayrımını okumaz.
 */
/** Graph `availability` → noktanın durumu (`null` = bilinmiyor, nokta yok). */
export function presenceState(availability) {
  switch (availability) {
    case "Available":
    case "AvailableIdle":
      return "available"
    case "Busy":
    case "BusyIdle":
    case "DoNotDisturb":
      return "busy"
    case "Away":
    case "BeRightBack":
      return "away"
    default:
      // Offline, PresenceUnknown ve tanımadığımız her şey. `null` "bilmiyoruz"
      // demektir ve hiç nokta çizilmez — "çevrimdışı" iddiası da bir iddiadır.
      return availability === "Offline" ? "offline" : null
  }
}

export function clearPresenceCache() {
  cache.clear()
  inflight.clear()
  scopeUnavailable = false
  notify()
}

function notify() {
  for (const cb of listeners) cb()
}

async function fetchPresence(instance, account, address) {
  try {
    if (scopeUnavailable) return
    await ensureMsalInitialized()
    let token
    try {
      token = await instance.acquireTokenSilent({ scopes: ["Presence.Read.All"], account })
    } catch (err) {
      // Yalnızca ONAY cevabı kalıcıdır; geçici ağ/sunucu hatası hiçbir şey
      // önbelleklemez, sonraki açılış yeniden dener.
      if (
        /interaction_required|consent_required|login_required|invalid_grant/.test(
          err?.errorCode ?? "",
        )
      ) {
        scopeUnavailable = true
      }
      return
    }
    const res = await fetch(PRESENCE_PATH(address), {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    })
    if (res.status === 429 || res.status >= 500) return // cevap değil, gürültü
    if (!res.ok) {
      // 403/404: bu kişinin durumu okunamıyor (dış katılımcı, politika).
      cache.set(address, { state: null, at: Date.now() })
      return
    }
    const data = await res.json()
    cache.set(address, { state: presenceState(data?.availability), at: Date.now() })
  } catch {
    // Ağ hıçkırığı — önbelleğe yazma, sonraki mount dener.
  } finally {
    inflight.delete(address)
    notify()
  }
}

/**
 * Verilen adresler için canlı durum.
 *
 * @returns `Map<küçük harfli adres, "available"|"busy"|"away"|"offline">` —
 *   yalnızca BİLİNEN durumlar; gerisi haritada hiç yoktur ve çağıran nokta
 *   çizmez.
 */
export function usePresence(addresses) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const [, bump] = useState(0)

  const key = (addresses ?? [])
    .map((a) => (a || "").trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("|")

  useEffect(() => {
    if (!isMsalConfigured || !account || !key) return
    const cb = () => bump((n) => n + 1)
    listeners.add(cb)
    const now = Date.now()
    for (const address of key.split("|")) {
      const hit = cache.get(address)
      if (hit && now - hit.at < TTL_MS) continue
      if (inflight.has(address)) continue
      inflight.set(address, fetchPresence(instance, account, address))
    }
    return () => listeners.delete(cb)
  }, [key, account, instance])

  const out = new Map()
  // Render sırasında saat okumak kural gereği safsızdır ve `react-hooks/purity`
  // haklı olarak işaretliyor — burada KASITLI: okunan tek şey bu modül
  // önbelleğinin TTL'i, ve "45 saniyeden eski kaydı gösterme" kararının
  // render'da alınması gerekiyor. State'e taşımak, her tazelikte fazladan bir
  // render turu ve bu bilgiyi iki yerde tutmak demekti. En kötü sonuç, bir
  // yeniden render'da eskimiş bir noktanın kaybolması — yani zaten istenen
  // davranış.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  for (const address of key ? key.split("|") : []) {
    const hit = cache.get(address)
    if (hit && hit.state && now - hit.at < TTL_MS) out.set(address, hit.state)
  }
  return out
}
