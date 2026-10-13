import { useCallback, useMemo, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { useManagerReports, useMyDirectReports } from "@/hooks/useMyDirectReports"
import { useMyManagerState } from "@/hooks/useMyManager"
import { STATUS } from "@/lib/graph"
import { buildTeam, teamCounts, teamStatus } from "@/lib/teamCircle"

const EMPTY = []
const NO_PEERS = { status: STATUS.ready, people: EMPTY }

/** Oturumdaki kişinin dizin kimlikleri ve adresleri (ekip arkadaşı listesinden çıkmak için). */
function selfOf(account) {
  const claims = account?.idTokenClaims ?? {}
  const ids = [
    account?.localAccountId,
    claims.oid,
    String(account?.homeAccountId ?? "").split(".")[0],
  ]
  const addresses = [account?.username, claims.preferred_username, claims.upn, claims.email]
  const join = (list) => [...new Set(list.map((v) => String(v ?? "").trim()).filter(Boolean))]
  return { ids: join(ids).join(" "), addresses: join(addresses).join(" ") }
}

/**
 * Kişinin EKİBİ (`lib/teamCircle.js` › `buildTeam`) — Anasayfa'daki "Çevrem"in ekip tanımı:
 * yöneticim (`useMyManagerState`), aynı yöneticiye bağlı olanlar (`useManagerReports`) ve bana
 * bağlı olanlar (`useMyDirectReports`). Üçü de uygulamanın bellekteki önbelleklerinden (hesap
 * başına, çıkışta silinir); üye başına istek yok. Kişinin kendisi dizin kimliği ve adresiyle çıkar.
 *
 * Dönüş `{ status, people, counts, failed, retry }`: `status` "loading" (bir parça bekleniyor;
 * `people` o ana dek gelenler) · "ready" (en az bir parça okundu, okunamayan parça boş sayılır)
 * · "denied" · "error" · "unauthenticated". `people`: `memberFromGraph` biçimi + `relation`;
 * `counts`: `teamCounts`. `failed`: okunamayan parçalar ("reports" · "manager" · "peers"; ekran
 * eksik listeyi söyler); `retry` yalnız onları yeniden sorar — okunan liste önbelleğe yazılınca
 * aynı ekibi gösteren bütün kancalar güncellenir.
 */
export function useMyTeam(enabled = true) {
  const { accounts } = useMsal()
  const { ids, addresses } = selfOf(accounts[0])
  const [attempt, setAttempt] = useState(0)
  const mgr = useMyManagerState(enabled, attempt)
  const reports = useMyDirectReports(enabled, attempt)
  const managerKnown = mgr.status === STATUS.ready
  const peersState = useManagerReports(managerKnown ? mgr.managerId : null, enabled, attempt)
  // Yönetici yoksa ekip arkadaşı da yok (kesin cevap); yönetici beklenirken onlar da bekler.
  const peers = !managerKnown
    ? { status: mgr.status, people: EMPTY }
    : mgr.managerId
      ? peersState
      : NO_PEERS

  const reportList = reports.status === STATUS.ready ? reports.people : EMPTY
  const manager = managerKnown ? mgr.member : null
  const peerList = peers.status === STATUS.ready ? peers.people : EMPTY
  const people = useMemo(
    () =>
      buildTeam({
        reports: reportList,
        manager,
        peers: peerList,
        self: { ids: ids.split(" "), addresses: addresses.split(" ") },
      }),
    [reportList, manager, peerList, ids, addresses],
  )

  const state = useMemo(
    () => teamStatus({ reports: reports.status, manager: mgr.status, peers: peers.status }),
    [reports.status, mgr.status, peers.status],
  )
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return useMemo(
    () => ({ ...state, people, counts: teamCounts(people), retry }),
    [state, people, retry],
  )
}
