import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useIsAuthenticated } from "@azure/msal-react"
import { seedAgents, seedAiApps, seedBusinessApps } from "@/data/seedConfig"
import { isMsalConfigured } from "@/lib/msal"
import { applyDefaultOrder } from "@/lib/displayOrder"
import * as dv from "@/lib/dataverse"

const STORAGE_KEY = "tyro-config-v1"
const COLLECTIONS = ["agents", "aiApps", "businessApps"]

// Switched-off entries reach /settings (to be switched back on) and nowhere
// else. `isActive !== false` keeps rows that predate the column visible.
const shown = (list) => list.filter((x) => x.isActive !== false)

// Gaps between stored positions, so a row can be slotted between two others
// straight in the table without renumbering the whole list by hand.
const SORT_STEP = 10

export const ConfigContext = createContext(null)

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function readCache() {
  if (typeof window === "undefined") {
    return { agents: seedAgents, aiApps: seedAiApps, businessApps: seedBusinessApps }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { agents: seedAgents, aiApps: seedAiApps, businessApps: seedBusinessApps }
    const parsed = JSON.parse(raw)
    return {
      agents: Array.isArray(parsed.agents) ? parsed.agents : seedAgents,
      aiApps: Array.isArray(parsed.aiApps) ? parsed.aiApps : seedAiApps,
      businessApps: Array.isArray(parsed.businessApps) ? parsed.businessApps : seedBusinessApps,
    }
  } catch {
    return { agents: seedAgents, aiApps: seedAiApps, businessApps: seedBusinessApps }
  }
}

function writeCache(state) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        agents: state.agents,
        aiApps: state.aiApps,
        businessApps: state.businessApps,
      }),
    )
  } catch {
    /* quota / privacy mode — fail silently */
  }
}

// Business key for a launcher item within a collection. The collection already
// fixes the type, so name (normalized) is the per-collection half of the server's
// tyro_NameTypeKey (name + type) alternate key.
const nameKey = (x) => (x.name ?? "").trim().toLowerCase()

// Reconcile a fresh Dataverse snapshot with current local state:
// - carry forward any cached logo (tyro_logo is a file column not returned inline),
//   matching by id first then by business name (covers a local row whose id was
//   reconciled to a server GUID under the no-crypto makeId fallback path).
// - keep genuinely local-only rows (created offline, not yet on the server) so an
//   optimistic add isn't dropped on the first authenticated fetch — but exclude the
//   seed rows, whose non-GUID ids differ from the server GUIDs yet name+type-match an
//   already-imported server row (otherwise every seed item would appear twice).
function mergeServerData(prev, data) {
  const merged = {}
  for (const key of COLLECTIONS) {
    const serverList = data[key] || []
    const prevList = prev[key] || []
    const prevById = new Map(prevList.map((x) => [x.id, x]))
    const prevByName = new Map(prevList.map((x) => [nameKey(x), x]))
    const serverIds = new Set(serverList.map((x) => x.id))
    const serverNames = new Set(serverList.map(nameKey))
    const withLogos = serverList.map((row) => {
      const cached = prevById.get(row.id) || prevByName.get(nameKey(row))
      return cached?.logo ? { ...row, logo: cached.logo } : row
    })
    const localOnly = prevList.filter(
      (x) => !dv.isGuid(x.id) && !serverIds.has(x.id) && !serverNames.has(nameKey(x)),
    )
    merged[key] = [...withLogos, ...localOnly]
  }
  return merged
}

export function ConfigProvider({ children }) {
  // Data lives in `state`; transient status (loading/error/source) is kept separate
  // so a loading flip doesn't churn the localStorage write or re-render every consumer.
  const [state, setState] = useState(readCache)
  // Mirrors `state` for the two actions that must READ the current list before
  // writing (reorder's "what changed?" diff, upsert's "what comes last?").
  // Reading `state` there would close over the value from the render that
  // created the callback, and both are called from event handlers well after
  // that render. Kept in sync from an effect rather than during render — a
  // ref written while rendering is an impure render — which is safe here
  // because effects run at commit, i.e. before any click can read it.
  const stateRef = useRef(state)
  const [status, setStatus] = useState({ loading: false, error: null, source: "local" })
  const isAuthed = useIsAuthenticated()
  const useDataverse = isMsalConfigured && isAuthed

  // ⚠️ AGENT KİLİDİ KALDIRILDI (2026-09-10, istek üzerine). Bir zamanlar
  // burada Entra yönetici zinciri okunuyordu (belirli yöneticilere bağlı olanlar) ve
  // kurala uymayan kullanıcıda agent `locked: true` işaretleniyordu. Artık
  // KATALOGDA AÇIK OLAN HER AGENT HERKESE AÇIK: tek kapı `active` bayrağı,
  // yani /settings'ten yönetilen katalog. Kaldırılanlar: `agentVisibility.js`,
  // `markAgentAccess`, `TRADER_AGENT_ALIASES` / `ITMGR_AGENT_ALIASES` /
  // `TRADER_MANAGER_KEYS` / `ITMGR_MANAGER_KEYS`, `AgentAccessToast` ve
  // tüketicilerdeki `locked` dalları.

  // Fetch from Dataverse when authenticated; fall back to cached/seed on failure.
  useEffect(() => {
    if (!useDataverse) return
    let cancelled = false
    setStatus((s) => ({ ...s, loading: true, error: null }))
    dv.fetchAllItems()
      .then((data) => {
        if (cancelled) return
        // Merge rather than replace — preserve cached logos and local-only rows.
        setState((prev) => mergeServerData(prev, data))
        setStatus({ loading: false, error: null, source: "dataverse" })
        // Agent avatarları Copilot Studio'nun `bot` tablosundan ÇEKİLMİYOR
        // (2026-08-21, istek üzerine — tyroTrade'de de aynısı yapıldı).
        // Gösterilen şey katalogda seçilmiş ikondur — /settings'te görünen
        // ikonun ta kendisi — ve o dashboard kartlarında, sohbetteki asistan
        // seçicisinde ve mesaj avatarlarında aynı kalır. `dv.fetchBotIcons`
        // duruyor ama artık çağıran yok.
      })
      .catch((err) => {
        if (cancelled) return
        console.warn("[Dataverse] fetch failed, using cached/seed:", err.message)
        // Kod ile birlikte taşınır: arayüz "ne oldu"yu değil "ne yapmalı"yı
        // söylemek zorunda ve o kararı ancak koddan verebilir (bkz.
        // dataverse.js › DV_SESSION_EXPIRED). Ham mesaj teknik ayrıntı
        // bloğunda kalır, manşette değil.
        setStatus({
          loading: false,
          error: { code: err.code ?? null, message: err.message },
          source: "local",
        })
      })
    return () => {
      cancelled = true
    }
  }, [useDataverse])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Persist local cache so the next session sees the same data offline.
  useEffect(() => {
    writeCache(state)
  }, [state])

  const upsert = useCallback(
    async (collection, item) => {
      // Optimistic local update
      const id = item.id || makeId()
      const next = { ...item, id }
      // A brand-new row with no order lands at the FRONT of every list, because
      // Dataverse sorts nulls first on an ascending $orderby — so a freshly
      // added agent would displace an arrangement someone deliberately set.
      // Give it a position past the current last instead; it announces itself
      // at the bottom. Only on create: an edit must not renumber anything.
      if (!item.id && !Number.isFinite(next.sortOrder)) {
        const existing = (stateRef.current[collection] ?? [])
          .map((x) => x.sortOrder)
          .filter(Number.isFinite)
        next.sortOrder = (existing.length ? Math.max(...existing) : -SORT_STEP) + SORT_STEP
      }
      setState((prev) => {
        const list = prev[collection]
        const idx = list.findIndex((x) => x.id === id)
        const updated = idx >= 0 ? list.map((x, i) => (i === idx ? next : x)) : [...list, next]
        return { ...prev, [collection]: updated }
      })
      // Remote write. Decide create-vs-update by whether the id is a real Dataverse
      // GUID — a non-GUID id is a local-only/seed row that must be POSTed, never
      // PATCHed (PATCH on a non-GUID key 400s).
      if (!useDataverse) return next
      try {
        const saved = dv.isGuid(item.id)
          ? await dv.updateItem(collection, next)
          : await dv.createItem(collection, next)
        // Reconcile id if the server assigned one (insert case).
        if (saved.id && saved.id !== id) {
          setState((prev) => ({
            ...prev,
            [collection]: prev[collection].map((x) => (x.id === id ? saved : x)),
          }))
        }
        return saved
      } catch (err) {
        console.warn("[Dataverse] upsert failed:", err.message)
        setStatus((s) => ({ ...s, error: err.message }))
        throw err
      }
    },
    [useDataverse],
  )

  const remove = useCallback(
    async (collection, id) => {
      // Optimistic local remove
      setState((prev) => ({
        ...prev,
        [collection]: prev[collection].filter((x) => x.id !== id),
      }))
      // Local-only rows (non-GUID id) were never persisted — nothing to delete remotely.
      if (!useDataverse || !dv.isGuid(id)) return
      try {
        await dv.deleteItem(id)
      } catch (err) {
        console.warn("[Dataverse] delete failed:", err.message)
        setStatus((s) => ({ ...s, error: err.message }))
        throw err
      }
    },
    [useDataverse],
  )

  /**
   * Sets the display order of one collection from a list of ids.
   *
   * The order is stored on the server (`tyro_sortorder`), not per browser:
   * this app OWNS the catalog, and an arrangement only one person can see
   * would be a worse answer than no arrangement at all. The list query
   * already sorts by that column, so a successful write is what everyone
   * else sees on their next load.
   *
   * Rows are renumbered in steps of ten and only the ones whose stored number
   * actually changed are written — the first reorder of a never-ordered list
   * writes every row (they are all null), later ones usually write two.
   * Local-only rows (non-GUID id: seed data, or an add made while offline)
   * are reordered locally and skipped remotely; PATCHing a non-GUID key 400s.
   *
   * On a failed write the local order is put BACK. Leaving the new order on
   * screen would show an arrangement the server never accepted, i.e. one that
   * nobody else will see and that vanishes on reload.
   *
   * The writes are parallel PATCHes, not a $batch, so a failure partway can
   * leave the server holding some of the new numbers. That is why the revert
   * is only about not LYING on screen — the authority is the next fetch, and
   * repeating the reorder converges. If a torn order ever becomes a real
   * problem, the fix is a single $batch changeset, not more retry logic here.
   */
  const reorder = useCallback(
    async (collection, ids) => {
      const before = stateRef.current[collection] ?? []
      const rank = new Map(ids.map((id, i) => [String(id), i]))
      // Ids the caller didn't mention keep their relative order at the end,
      // rather than being dropped from the list entirely.
      const ordered = [...before].sort((a, b) => {
        const ra = rank.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER
        const rb = rank.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER
        return ra - rb
      })
      const renumbered = ordered.map((item, i) => ({ ...item, sortOrder: i * SORT_STEP }))
      setState((prev) => ({ ...prev, [collection]: renumbered }))

      if (!useDataverse) return
      const changed = renumbered.filter(
        (item) =>
          dv.isGuid(item.id) && before.find((x) => x.id === item.id)?.sortOrder !== item.sortOrder,
      )
      if (!changed.length) return
      try {
        await Promise.all(changed.map((item) => dv.updateSortOrder(item.id, item.sortOrder)))
      } catch (err) {
        console.warn("[Dataverse] reorder failed:", err.message)
        setState((prev) => ({ ...prev, [collection]: before }))
        setStatus((st) => ({ ...st, error: err.message }))
        throw err
      }
    },
    [useDataverse],
  )

  /**
   * Switches a catalog entry on or off.
   *
   * Server-side (`tyro_isactive`), like the order — and unlike tyroTrade,
   * which keeps a hidden-ids list in localStorage because it does not own the
   * table. Here a switched-off entry is off for everyone, which is what the
   * column has always meant: the list query used to filter on it. Note that
   * this reaches OTHER consumers of the same table (tyroTrade filters on the
   * same column), which is the intended meaning of deactivating a catalog
   * row — it is not "hide it from me".
   *
   * Deliberately not a delete: ids, logo and description stay, so switching it
   * back on restores exactly what was there. That is the difference between
   * this checkbox and the bin next to it.
   */
  const setActive = useCallback(
    async (collection, id, isActive) => {
      const before = stateRef.current[collection] ?? []
      setState((prev) => ({
        ...prev,
        [collection]: prev[collection].map((x) => (x.id === id ? { ...x, isActive } : x)),
      }))
      if (!useDataverse || !dv.isGuid(id)) return
      try {
        await dv.updateActive(id, isActive)
      } catch (err) {
        console.warn("[Dataverse] visibility write failed:", err.message)
        setState((prev) => ({ ...prev, [collection]: before }))
        setStatus((st) => ({ ...st, error: err.message }))
        throw err
      }
    },
    [useDataverse],
  )

  const reset = useCallback((collection) => {
    setState((prev) => {
      if (collection === "agents") return { ...prev, agents: seedAgents }
      if (collection === "aiApps") return { ...prev, aiApps: seedAiApps }
      if (collection === "businessApps") return { ...prev, businessApps: seedBusinessApps }
      return {
        ...prev,
        agents: seedAgents,
        aiApps: seedAiApps,
        businessApps: seedBusinessApps,
      }
    })
  }, [])

  // The default order applies to the SETTINGS list as well as the surfaces,
  // so what an admin drags is what everyone sees — a Settings list in a
  // different starting order than the dashboard would make the first drag a
  // guess. Once any row carries a stored position this is a no-op.
  const orderedAgents = useMemo(() => applyDefaultOrder(state.agents), [state.agents])
  const orderedAllAgents = useMemo(() => applyDefaultOrder(state.agents), [state.agents])

  const value = useMemo(
    () => ({
      // Katalogda AÇIK olan her agent, herkese. Erişim kapısı yok.
      agents: shown(orderedAgents),
      // Ham liste — /settings agent CRUD'u, sıralaması ve aç/kapa'sı bunu
      // okur, o yüzden KAPALI olanlar da içinde; `locked` gibi türetilmiş
      // alanlar Dataverse'e sızmasın.
      allAgents: orderedAllAgents,
      aiApps: shown(state.aiApps),
      businessApps: shown(state.businessApps),
      allAiApps: state.aiApps,
      allBusinessApps: state.businessApps,
      loading: status.loading,
      error: status.error,
      source: status.source,
      // Katalog SON hâlinde mi: Dataverse'ten geldi, okunamadı (tohuma düştü)
      // ya da oturum yok ve tohum listesi zaten son hâl. ⚠️ `!loading` tek
      // başına YETMEZ: oturumlu ilk karede istek henüz atılmadığı için
      // `loading` da false. Tüketici: park edilmiş sorunun asistanını ADIYLA
      // arayan ChatScreen — katalog son hâlindeyse bulunamayan ad bir daha
      // gelmeyecek ve beklemek yalnız gecikme demek.
      settled:
        !status.loading && (status.source === "dataverse" || !!status.error || !useDataverse),
      upsertAgent: (item) => upsert("agents", item),
      removeAgent: (id) => remove("agents", id),
      upsertAiApp: (item) => upsert("aiApps", item),
      removeAiApp: (id) => remove("aiApps", id),
      upsertBusinessApp: (item) => upsert("businessApps", item),
      removeBusinessApp: (id) => remove("businessApps", id),
      reorder,
      setActive,
      reset,
      // Bilinmeyen ya da KAPALI bir id ilk açık agent'a düşer: elle yazılan
      // /chat?agent=<yok-böyle-bir-şey> sohbeti boş bırakmasın.
      getAgent: (id) => {
        const open = shown(orderedAgents)
        return open.find((a) => a.id === id) ?? open[0]
      },
    }),
    [
      state,
      orderedAgents,
      orderedAllAgents,
      status,
      useDataverse,
      upsert,
      remove,
      reorder,
      setActive,
      reset,
    ],
  )

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}
