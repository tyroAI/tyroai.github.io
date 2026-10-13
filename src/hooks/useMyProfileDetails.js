import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { isMsalConfigured } from "@/lib/msal"
import { graphGet, STATUS } from "@/lib/graph"

/**
 * Kullanıcının KENDİ dizin kaydı — görev, departman, ofis, telefon, mail.
 *
 * MSAL id-token'ı yalnızca ad ve UPN taşır (bkz. `useMe`); "Profilim"
 * sayfasının gösterdiği geri kalan her şey Graph'ın `/me` kaydından geliyor.
 * tyroTrade'den birebir port (2026-09-08) — iki uygulama aynı kartı
 * gösteriyor, iki ayrı uygulama olmasın.
 *
 * ── ÜÇ KURAL ───────────────────────────────────────────────────────────
 *
 * **Sessiz ya da hiç.** Kapsam `User.Read` ve token `acquireTokenSilent`
 * ile alınıyor (`graphGet`); reddedilirse hook boş döner ve sayfa o
 * satırları hiç çizmez. `User.Read` giriş isteğinde zaten var — fotoğrafı
 * çeken `useMe` aynı kapsamı kullanıyor, yani bu hook yeni bir onay
 * penceresi açmıyor.
 *
 * **"Soramadım" ≠ "veri yok".** Durum dışarı veriliyor: alan boş olduğu
 * için gizlenen bir satır ile izin alınamadığı için gizlenen satır aynı
 * görünmesin. Sayfa bugün ikisinde de sessiz kalıyor ama karar sayfanın,
 * hook'un değil.
 *
 * **Kendi verisi, ama yine PII.** Kayıt bellekte, hesap kimliği başına
 * saklanıyor; aynı tarayıcıda başka biri giriş yaptığında miras almasın
 * diye çıkışta siliniyor (`clearMyProfileCache`, msal.js LOGOUT_SUCCESS).
 * localStorage'a YAZILMIYOR: fotoğrafın aksine (o bir kez indirilip
 * saklanmaya değer, yüz kilobayt), bunlar tek bir küçük istek.
 */

// homeAccountId -> { status, details }
const cache = new Map()
const inflight = new Map()

/** Çıkışta çağrılır (msal.js LOGOUT_SUCCESS). */
export function clearMyProfileCache() {
  cache.clear()
  inflight.clear()
}

const BASE_SELECT = [
  "displayName",
  "jobTitle",
  "department",
  "officeLocation",
  "mail",
  "mobilePhone",
  "businessPhones",
  "userPrincipalName",
].join(",")
// Self Servis'in profil başlığı (şirket, sicil, çalışan tipi, işe giriş) aynı `/me` kaydından:
// ikinci bir sorgu yok. Kiracı bu alanlardan birini reddederse (400) temel seçimle bir kez daha.
const SELECT = `${BASE_SELECT},givenName,companyName,employeeId,employeeType,employeeHireDate`

const EMPTY = { status: STATUS.unauthenticated, details: null }

const text = (v) => String(v ?? "").trim()

function toDetails(data) {
  if (!data) return null
  return {
    displayName: data.displayName || "",
    jobTitle: data.jobTitle || "",
    department: data.department || "",
    officeLocation: data.officeLocation || "",
    mail: data.mail || "",
    upn: data.userPrincipalName || "",
    // Cep varsa cep, yoksa ilk iş telefonu — sayfada tek satır var ve iki
    // numarayı üst üste basmak bir profil kartını rehbere çevirir.
    phone: data.mobilePhone || data.businessPhones?.[0] || "",
    givenName: text(data.givenName),
    companyName: text(data.companyName),
    employeeId: text(data.employeeId),
    employeeType: text(data.employeeType),
    // Ham ISO metni: takvim gününe çevirme `lib/selfServiceProfile.js` › `hireDayOf`.
    employeeHireDate: text(data.employeeHireDate),
  }
}

async function fetchMe(instance, account) {
  const res = await graphGet(instance, account, {
    path: `/me?$select=${SELECT}`,
    scopes: ["User.Read"],
  })
  if (res.status !== STATUS.error || res.httpStatus !== 400) return res
  return graphGet(instance, account, { path: `/me?$select=${BASE_SELECT}`, scopes: ["User.Read"] })
}

/**
 * @returns {{status: string, details: null | {displayName: string, jobTitle: string,
 *   department: string, officeLocation: string, mail: string, upn: string, phone: string,
 *   givenName: string, companyName: string, employeeId: string, employeeType: string,
 *   employeeHireDate: string}}}
 */
export function useMyProfileDetails() {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? instance.getActiveAccount() ?? null
  const key = account?.homeAccountId ?? null

  const [state, setState] = useState(() => (key ? (cache.get(key) ?? EMPTY) : EMPTY))

  useEffect(() => {
    if (!isMsalConfigured || !account || !key) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(EMPTY)
      return
    }
    const cached = cache.get(key)
    if (cached) {
      setState(cached)
      return
    }
    let cancelled = false
    // Aynı hesap için iki bileşen aynı anda mount olursa tek istek atılsın.
    let promise = inflight.get(key)
    if (!promise) {
      promise = fetchMe(instance, account).then((res) => {
        const next =
          res.status === STATUS.ready
            ? { status: STATUS.ready, details: toDetails(res.data) }
            : { status: res.status, details: null }
        cache.set(key, next)
        inflight.delete(key)
        return next
      })
      inflight.set(key, promise)
    }
    promise
      .then((next) => {
        if (!cancelled) setState(next)
      })
      .catch(() => {
        // `graphGet` reddetmez; buraya ancak beklenmeyen bir şey düşer.
        inflight.delete(key)
        if (!cancelled) setState({ status: STATUS.error, details: null })
      })
    return () => {
      cancelled = true
    }
  }, [account, instance, key])

  return state
}
