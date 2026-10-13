import { useEffect, useMemo, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { useMe } from "@/hooks/useMe"
import { useMyDirectReports } from "@/hooks/useMyDirectReports"
import { useMyManagerState } from "@/hooks/useMyManager"
import { useMyProfileDetails } from "@/hooks/useMyProfileDetails"
import { useMyTeam } from "@/hooks/useMyTeam"
import { STATUS } from "@/lib/graph"
import { isMsalConfigured } from "@/lib/msal"
import { fetchEmployment } from "@/lib/selfServiceApi"
import { buildProfile, hireDayOf } from "@/lib/selfServiceProfile"

/**
 * Self Servis profil başlığının TEK kancası. KAYNAK KURALI: Graph birincil — `/me` kaydı
 * (`useMyProfileDetails`in önbelleği: unvan, departman, ofis, şirket, sicil, çalışan tipi,
 * işe giriş), yönetici (`useMyManager`), doğrudan bağlılar (`lib/directReports`), ekip
 * (`useMyTeam`: yönetici + aynı yöneticiye bağlılar + bana bağlılar), fotoğraf (`useMe`). ERP
 * çalışan kaydı (`worker`, `useSelfService`ten) YALNIZ Graph'ta boş kalan alanı tamamlar; işe
 * giriş Graph'ta yoksa ERP istihdam satırı bir kez sorulur.
 *
 * Dönüş `buildProfile` biçimi + `team` (`{ size, reports, teammates }`; yüklenirken o ana dek
 * gelenler), `status` ("loading" · "ready") ve `pending` (`hireDate`, `manager`, `reports`,
 * `team`: cevap bekleniyor — başlık yer tutar, zıplamaz). Tarayıcı denemesinde modül bütünüyle
 * sahtelenebilir (aynı biçimi döndüren bir `useSelfServiceProfile`).
 *
 * ⚠️ ERP istihdam cevabı YALNIZ BELLEKTE ve çıkışta düşer (`clearSelfServiceProfileCache`,
 * msal.js LOGOUT zinciri). Graph önbellekleri kendi kancalarında, aynı zincirde.
 */

const employment = new Map() // sicil → { status, value } | Promise
// Çıkıştan sonra dönen cevap önbelleğe yazılmasın (bir önceki oturumun verisi).
let generation = 0

export function clearSelfServiceProfileCache() {
  employment.clear()
  generation += 1
}

function loadEmployment(personnel) {
  const hit = employment.get(personnel)
  if (hit) return hit instanceof Promise ? hit : Promise.resolve(hit)
  const gen = generation
  const job = fetchEmployment(personnel)
    .then((value) => ({ status: STATUS.ready, value }))
    // Yetki yoksa ya da tablo okunamazsa süre gösterilmez; aynı oturumda yeniden sorulmaz.
    .catch((err) => ({
      status: err?.kind === "denied" ? STATUS.denied : STATUS.error,
      value: null,
    }))
    .then((res) => {
      if (gen === generation) employment.set(personnel, res)
      return res
    })
  employment.set(personnel, job)
  return job
}

function useEmployment(personnel) {
  const [state, setState] = useState(null) // { personnel, res }
  const cached = personnel ? employment.get(personnel) : null
  const ready = cached && !(cached instanceof Promise) ? cached : null
  useEffect(() => {
    if (!personnel || ready) return undefined
    let alive = true
    loadEmployment(personnel).then((res) => alive && setState({ personnel, res }))
    return () => {
      alive = false
    }
  }, [personnel, ready])
  if (!personnel) return null
  return ready ?? (state?.personnel === personnel ? state.res : { status: "loading", value: null })
}

/**
 * @param {object|null} worker ERP çalışanı (`useSelfService().data.worker`) — yoksa yalnız Graph.
 * @param {{ erpLoading?: boolean }} [opts] ERP verisi hâlâ yükleniyorsa işe giriş yer tutar.
 */
export function useSelfServiceProfile(worker = null, { erpLoading = false } = {}) {
  const { accounts } = useMsal()
  const account = accounts[0] ?? null
  const signedIn = isMsalConfigured && Boolean(account)
  const me = useMe()
  const { status: graphStatus, details } = useMyProfileDetails()
  const mgr = useMyManagerState(signedIn)
  const direct = useMyDirectReports(signedIn)
  const team = useMyTeam(signedIn)

  // `useMyProfileDetails` istek uçuştayken de "unauthenticated" der: oturum varsa bu bekleme.
  const graphLoading = signedIn && graphStatus === STATUS.unauthenticated
  const graphHire = Boolean(hireDayOf(details?.employeeHireDate))
  const needHire = !graphLoading && !graphHire && Boolean(worker?.personnel)
  const emp = useEmployment(needHire ? worker.personnel : null)

  const managerLoading = signedIn && mgr.status === "loading"
  const reportsLoading = signedIn && direct.status === "loading"
  const reports = direct.status === STATUS.ready ? direct.people.length : null
  const teamLoading = signedIn && team.status === "loading"
  const counts = team.counts
  const photo = me.photoUrl ?? null

  return useMemo(() => {
    const profile = buildProfile({
      graph: details,
      account: { name: account?.name ?? me.fullName, username: account?.username ?? me.email },
      worker,
      employment: emp?.value ?? null,
      manager: mgr.manager,
      reports,
      photo,
    })
    return {
      ...profile,
      team: counts,
      status: graphLoading ? "loading" : "ready",
      pending: {
        hireDate:
          graphLoading || emp?.status === "loading" || (!graphHire && !worker && erpLoading),
        manager: managerLoading,
        reports: reportsLoading,
        team: teamLoading,
      },
    }
  }, [
    details,
    account,
    me.fullName,
    me.email,
    worker,
    emp,
    mgr.manager,
    reports,
    photo,
    graphLoading,
    managerLoading,
    reportsLoading,
    counts,
    teamLoading,
    graphHire,
    erpLoading,
  ])
}
