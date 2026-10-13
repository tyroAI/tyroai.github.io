import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { graphGet, STATUS } from "@/lib/graph"
import { isMsalConfigured } from "@/lib/msal"

/**
 * Kişinin KENDİ OneDrive'ı: kimlik + adres (+ kota, varsa).
 *
 * İki iş görüyor: (1) "bu dosya benim mi" kararının tek KESİN sinyali
 * (`isOwnDrive`), (2) Keşfet › Dosyalarım'da OneDrive'ı kapsayan aramanın
 * `path:` kökü. Sohbet seçicisinin `useMyDriveId`i bunun ince sarmalayıcısı.
 *
 * ⚠️ **HESAP ANAHTARLI, BELLEKTE.** Eski önbellek tek bir global değerdi ve
 * çıkışta silinmiyordu: aynı tarayıcıya giren ikinci kullanıcı birincinin
 * sürücü kimliğini devralır, kendi dosyalarını "başkasının" sayardı.
 * Başarısızlık saklanmaz — izin sonradan verilirse bir sonraki açılış
 * yeniden sorsun. `unauthenticated` ayrı bir hâl: oturum yokken sonsuz
 * iskelet çizilmesin.
 */
const cache = new Map()
const inflight = new Map()

export function clearMyDriveCache() {
  cache.clear()
  inflight.clear()
}

const SELECT = "id,webUrl,driveType,quota"
const EMPTY = { status: "loading", id: null, webUrl: "", driveType: "", quota: null }

function fetchMyDrive(instance, account) {
  const key = account.homeAccountId
  if (!inflight.has(key)) {
    const p = graphGet(instance, account, {
      path: `/me/drive?$select=${SELECT}`,
      scopes: ["Files.Read.All"],
      retry: 2,
    }).then((res) => {
      inflight.delete(key)
      if (res.status !== STATUS.ready)
        return { ...EMPTY, status: res.status, httpStatus: res.httpStatus, code: res.code }
      const d = res.data ?? {}
      const value = {
        status: STATUS.ready,
        id: d.id ?? null,
        webUrl: d.webUrl ?? "",
        driveType: d.driveType ?? "",
        quota: d.quota?.total ? { used: d.quota.used ?? 0, total: d.quota.total } : null,
      }
      cache.set(key, value)
      return value
    })
    inflight.set(key, p)
  }
  return inflight.get(key)
}

/**
 * @param {{ nonce?: number }} [opts]  yenileme sayacı: değişince, önbellekte
 *   BAŞARILI bir kayıt yoksa yeniden sorulur (başarısızlık saklanmıyor).
 *   Eski bir yenilemenin başarısızlığı, yenisi yoldayken "loading" görünür —
 *   yoksa Dosyalarım'ın kimlik basamağı (`lib/filesIdentity.js`) o eski hatayı
 *   okuyup "tekrar dene"yi boşa çıkarırdı.
 */
export function useMyDrive({ nonce = 0 } = {}) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const key = account?.homeAccountId ?? ""
  const signedIn = isMsalConfigured && Boolean(account)
  const [state, setState] = useState(() => ({ key, nonce, value: cache.get(key) ?? EMPTY }))

  useEffect(() => {
    if (!signedIn) return
    const hit = cache.get(key)
    if (hit) {
      // Modül önbelleği harici bir depo; efektte okunuyor (useMailMessages'ın muafiyeti).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((s) => (s.key === key && s.value === hit ? s : { key, nonce, value: hit }))
      return
    }
    let alive = true
    fetchMyDrive(instance, account).then((value) => {
      if (alive) setState({ key, nonce, value })
    })
    return () => {
      alive = false
    }
  }, [signedIn, key, instance, account, nonce])

  if (!signedIn) return { ...EMPTY, status: STATUS.unauthenticated }
  // Hesap değiştiyse eski hesabın değeri DÖNMEZ.
  if (state.key !== key) return EMPTY
  if (state.value.status !== STATUS.ready && state.nonce !== nonce) return EMPTY
  return state.value
}
