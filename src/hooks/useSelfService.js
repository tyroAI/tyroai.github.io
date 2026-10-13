import { useCallback, useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { isMsalConfigured } from "@/lib/msal"
import { fetchSelfService } from "@/lib/selfServiceApi"

/**
 * Self Servis verisi: `status` — "loading" · "ready" · "notFound" (ERP'de çalışan kaydı yok)
 * · "denied" (izin/onay yok) · "error" · "signedOut". Hazırken `data` = `{ worker, balance,
 * leaves, expenses, advances, failed, truncated }` (bölüm düşerse `null`); `updatedAt` son
 * başarılı okumanın zamanı (ms) — dönem çubuğundaki "Güncellendi 14:32".
 *
 * ⚠️ Önbellek YALNIZ BELLEKTE, hesap başına ve çıkışta silinir (`clearSelfServiceCache`, msal.js
 * LOGOUT zinciri): izin ve masraf kayıtları kişisel veri. Çıkıştan sonra dönen cevap yazılmaz
 * (`generation`). 5 dakika taze; sayfaya dönüşte beklemeden çizilir, "Yenile" zorlar.
 *
 * `poll()`: arka plan yoklaması (yeni kayıt gözcüsü). Düşerse yüklü sayfa kalır, yalnız
 * `pollFailed` işaretlenir — kullanıcının bir şey yapmadığı istek sayfayı hata ekranına çevirmez.
 */
const TTL_MS = 5 * 60 * 1000
let cache = null // { key, at, value }
let inflight = null // { key, promise }
let generation = 0

export function clearSelfServiceCache() {
  cache = null
  inflight = null
  generation += 1
}

function load(account, { force = false, interactive = false } = {}) {
  const key = account.homeAccountId
  if (!force && cache?.key === key && Date.now() - cache.at < TTL_MS)
    return Promise.resolve(cache.value)
  if (inflight?.key === key && !interactive) return inflight.promise
  const gen = generation
  const promise = fetchSelfService(account, { interactive })
    .then((data) => {
      const updatedAt = Date.now()
      const value = data.worker
        ? { status: "ready", data, updatedAt }
        : { status: "notFound", data: null, updatedAt }
      if (gen === generation) cache = { key, at: Date.now(), value }
      return value
    })
    .catch((err) => ({
      status: err?.kind === "denied" ? "denied" : "error",
      data: null,
      detail: err?.message,
    }))
    .finally(() => {
      if (inflight?.promise === promise) inflight = null
    })
  inflight = { key, promise }
  return promise
}

export function useSelfService() {
  const { accounts } = useMsal()
  const account = accounts[0] ?? null
  const signedIn = isMsalConfigured && Boolean(account)
  const key = signedIn ? account.homeAccountId : null
  // { key, value, pollFailed } — yalnız aynı hesabın durumu gösterilir.
  const [state, setState] = useState(() =>
    key && cache?.key === key ? { key, value: cache.value } : null,
  )
  const [busy, setBusy] = useState(false)

  const run = useCallback(
    (opts = {}) => {
      if (!signedIn) return
      const owner = account.homeAccountId
      setBusy(true)
      load(account, opts).then((value) => {
        setState((prev) => {
          const keep =
            opts.quiet &&
            value.status !== "ready" &&
            prev?.key === owner &&
            prev.value.status === "ready"
          return keep ? { ...prev, pollFailed: true } : { key: owner, value }
        })
        setBusy(false)
      })
    },
    [account, signedIn],
  )

  // Açılışta ve hesap değişince okunur (`busy` işareti eşzamanlı kalkar).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run()
  }, [run])

  const current =
    key && state?.key === key
      ? state.value
      : { status: signedIn ? "loading" : "signedOut", data: null }
  return {
    ...current,
    pollFailed: Boolean(key && state?.key === key && state.pollFailed),
    busy,
    refresh: () => run({ force: true }),
    poll: () => run({ force: true, quiet: true }),
    connect: () => run({ force: true, interactive: true }),
  }
}
