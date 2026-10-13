import { useCallback, useState } from "react"
import { BOARDS, CATALOG, DEFAULT_LAYOUT, looksOf } from "./layout"
import {
  addAll,
  addTo,
  appendTo,
  grouped,
  members,
  moveTo,
  removeMember,
  showAt,
  stackOnto,
  step,
  unstack,
} from "./layoutOps"

const has = (list, id) => list.some((x) => x.id === id)
function insertNear(list, item, anchor, after) {
  const at = list.findIndex((x) => x.id === anchor)
  list.splice(at < 0 ? list.length : at + (after ? 1 : 0), 0, item)
}
const wide = (list) => list.map((x) => `${x.id}${x.wide ? "+" : ""}`).join(" ")

// Eski varsayılanlar: kişi düzenine hiç dokunmadıysa doğrudan bugünün varsayılanı gelir.
const V6_DEFAULT =
  "weather brief+ next-meeting ask+ rhythm+ nudge week+ focus pending-mail+ planner " +
  "recent-files team-today+ suggest holiday market+ travel focus-window outcomes+ feed-picks+"
const V5_DEFAULT =
  "brief+ next-meeting rhythm+ nudge pending-mail planner recent-files suggest team-today+ " +
  "holiday travel market+ week focus outcomes+ focus-window feed-picks"

/**
 * Eski kaydı bugünün düzenine taşır; kişinin sırası ve seçimleri korunur.
 * v2: Toplantı ritmi eklendi, öneri kartı tek sütuna döndü.
 * v3: Haftam tek sütun, Seyahat yeniden görünür (v2 onu varsayılandan çıkarmıştı).
 * v4: ritim ve öneri üst bölüme çıktı; yerlerine Piyasa ve Bugünün odağı geçer
 * (yer yoksa sona — üst bölümden inen kart gizli kalmasın).
 * v5: üst bölüm de düzenin parçası — sabit dört kartı listenin başına girer.
 * v6: tek ızgara — hava ve soru kutusu da widget. Dokunulmamış düzen bugünün
 * varsayılanı olur; kişiselleştirilmişe hava başa, soru kutusu üçüncü sıraya girer.
 * v7: üç bölge (sol sütun · ana bölüm · diğer) ve yığınlar. Dokunulmamış v6
 * bugünün varsayılanı; kişiselleştirilmişte hava ve soru sol sütuna, brifing ·
 * sıradaki toplantı · ritim · öneri ana bölüme, gerisi diğerlerine.
 */
export function migrateLayout(items, v) {
  let next = items.filter(Boolean)
  if (v < 2) {
    next = next.map((x) => (x.id === "nudge" ? { ...x, wide: false } : x))
    if (!has(next, "rhythm")) insertNear(next, { id: "rhythm", wide: true }, "week", false)
  }
  if (v < 3) {
    next = next.map((x) => (x.id === "week" ? { ...x, wide: false } : x))
    if (!has(next, "travel")) insertNear(next, { id: "travel", wide: false }, "holiday", true)
  }
  if (v < 4) {
    const swap = { rhythm: { id: "market", wide: true }, nudge: { id: "focus", wide: false } }
    next = next.map((x) => (swap[x.id] && !has(next, swap[x.id].id) ? swap[x.id] : x))
    for (const item of Object.values(swap)) if (!has(next, item.id)) next.push(item)
  }
  if (v < 5) {
    const hero = [
      { id: "brief", wide: true },
      { id: "next-meeting", wide: false },
      { id: "rhythm", wide: true },
      { id: "nudge", wide: false },
    ].filter((x) => !has(next, x.id))
    next = [...hero, ...next]
  }
  if (v < 6) {
    if (wide(next) === V5_DEFAULT) return DEFAULT_LAYOUT.map((x) => ({ ...x }))
    if (!has(next, "weather")) next.unshift({ id: "weather", wide: false })
    if (!has(next, "ask")) next.splice(Math.min(3, next.length), 0, { id: "ask", wide: true })
  }
  if (v < 7) {
    if (wide(next) === V6_DEFAULT) return DEFAULT_LAYOUT.map((x) => ({ ...x }))
    const left = new Set(["weather", "ask"])
    const main = new Set(["brief", "next-meeting", "rhythm", "nudge"])
    next = grouped(
      next.map((x) => ({
        ...x,
        zone: left.has(x.id) ? "left" : main.has(x.id) ? "main" : "more",
      })),
    )
  }
  return next
}

const HOME_DROPPED = new Set(["day-summary", "focus"])

/**
 * Anasayfa düzeni göçü (`BOARDS.home`). v2: üst sırada Günün brifingi (geniş) + sıradaki
 * toplantı; özet balonu ve Bugünün odağı çıktı (yığınlardan da). Kişinin eklediği öteki
 * kartlar yerinde kalır.
 */
export function migrateHomeLayout(items, v) {
  let next = items.filter(Boolean)
  if (v < 2) {
    next = next
      .map((x) => {
        const ids = (Array.isArray(x.stack) ? x.stack : [x.id]).filter(
          (id) => !HOME_DROPPED.has(id),
        )
        if (!ids.length) return null
        return ids.length > 1
          ? { ...x, id: ids[0], stack: ids, at: 0 }
          : { ...x, id: ids[0], stack: undefined }
      })
      .filter(Boolean)
    const hero = new Set(["brief", "next-meeting"])
    const rest = next.filter((x) => !hero.has(x.id))
    next = [
      ...rest.filter((x) => x.zone === "left"),
      { id: "brief", zone: "main", wide: true },
      { id: "next-meeting", zone: "main", wide: false },
      ...rest.filter((x) => x.zone !== "left"),
    ]
  }
  return next
}

const MIGRATIONS = { pano: migrateLayout, home: migrateHomeLayout }

/**
 * Kayıttan gelen düzeni temizler: tanınmayan ya da ikinci kez geçen widget
 * düşer, bölgesi panoda yoksa yeni widget'ın bölgesine (Pano "diğer", Anasayfa
 * ana bölüm), yığın tek kalırsa çözülür.
 */
export function sanitizeLayout(list, board = BOARDS.pano) {
  const seen = new Set()
  const out = []
  for (const x of list) {
    if (!x) continue
    const ids = (Array.isArray(x.stack) ? x.stack : [x.id]).filter(
      (id) => CATALOG[id] && !seen.has(id) && seen.add(id),
    )
    if (!ids.length) continue
    const zone = board.zones.includes(x.zone) ? x.zone : board.addZone
    const base = { id: ids[0], zone, wide: Boolean(x.wide) }
    out.push(
      ids.length > 1
        ? { ...base, stack: ids, at: Math.min(Math.max(0, Number(x.at) || 0), ids.length - 1) }
        : base,
    )
  }
  return grouped(out)
}

/**
 * Kayıtlı görünümler `{ [widget]: görünüm }`: tanınmayan widget ya da seçenek düşer,
 * varsayılan (listenin ilki) saklanmaz.
 */
export function sanitizeLooks(raw) {
  const out = {}
  if (!raw || typeof raw !== "object") return out
  for (const [id, look] of Object.entries(raw)) {
    const options = looksOf(id)
    if (CATALOG[id] && options.includes(look) && look !== options[0]) out[id] = look
  }
  return out
}

/** Kayıtlı düzen ve görünümler; bozuk ya da tanınmayan kimlik ayıklanır, yoksa varsayılan. */
function load(board) {
  const fresh = { items: board.defaults, looks: {} }
  try {
    const raw = JSON.parse(localStorage.getItem(board.key) ?? "null")
    const v = Number(raw?.v)
    if (!Array.isArray(raw?.items) || !(v >= 1 && v <= board.version)) return fresh
    const migrate = MIGRATIONS[board.id]
    const items = migrate && v < board.version ? migrate(raw.items, v) : raw.items
    return { items: sanitizeLayout(items, board), looks: sanitizeLooks(raw.looks) }
  } catch {
    return fresh
  }
}

/**
 * Bir panonun kişisel düzeni (`board`: `BOARDS.pano` · `BOARDS.home`): bölge, sıra,
 * genişlik, yığın, yığında görünen ve widget başına görünüm (standart · cam …). Bu
 * tarayıcıda saklanır (yalnız widget kimlikleri — kişisel veri değil); cihazlar arası
 * taşımak ayrı bir iş. `available`: bu kişiye açık widget'lar. Geri alma ve varsayılana
 * dönüş düzenle görünümü BİRLİKTE taşır (`remove` · `reset` önceki hâli döndürür,
 * `restore` kurar).
 */
export function useWidgetLayout(available, board = BOARDS.pano) {
  const [state, setState] = useState(() => load(board))
  const { items, looks } = state
  const save = useCallback(
    (next) => {
      setState(next)
      try {
        localStorage.setItem(board.key, JSON.stringify({ v: board.version, ...next }))
      } catch {
        /* gizli pencere: düzen yalnız bu oturumda */
      }
    },
    [board],
  )
  const commit = (nextItems, nextLooks = looks) => save({ items: nextItems, looks: nextLooks })

  const open = (x) => members(x).some((id) => available.has(id))
  const visible = items.filter(open)
  const placed = new Set(items.flatMap(members))
  const hidden = Object.keys(CATALOG).filter((id) => available.has(id) && !placed.has(id))
  // İşlem görünenler üzerinde; şu an açık olmayanlar (ör. Keşfet erişimi gidip
  // gelen) bölgelerinin sonunda düzende kalır.
  const apply = (fn) => commit(grouped([...fn(visible), ...items.filter((x) => !open(x))]))
  const lookOf = (id) => looks[id] ?? looksOf(id)[0]
  return {
    items: visible,
    hidden,
    looks,
    lookOf,
    /** Panoda cam görünümlü bir kart var mı — varsa arkaya ortam zemini gelir. */
    hasGlass: Object.entries(looks).some(([id, look]) => look === "glass" && placed.has(id)),
    zones: board.zones,
    addZone: board.addZone,
    labels: board.labels,
    tour: board.tour,
    isDefault:
      !Object.keys(looks).length && JSON.stringify(items) === JSON.stringify(board.defaults),
    moveTo: (id, targetId) => apply((list) => moveTo(list, id, targetId)),
    appendTo: (id, zone) => apply((list) => appendTo(list, id, zone)),
    step: (id, dir) => apply((list) => step(list, id, dir, board.zones)),
    stackOnto: (id, targetId) => apply((list) => stackOnto(list, id, targetId)),
    unstack: (slotId, memberId) => apply((list) => unstack(list, slotId, memberId)),
    show: (slotId, at) => apply((list) => showAt(list, slotId, at)),
    setLook(id, look) {
      const next = { ...looks }
      if (look === looksOf(id)[0]) delete next[id]
      else next[id] = look
      commit(items, next)
    },
    /** Geri alınabilsin diye önceki hâli döndürür; kaldırılanın görünümü de düşer. */
    remove(slotId, memberId) {
      const gone = memberId ?? slotId
      const rest = { ...looks }
      delete rest[gone]
      commit(
        grouped([...removeMember(visible, slotId, gone), ...items.filter((x) => !open(x))]),
        rest,
      )
      return state
    },
    restore(prev) {
      save(prev)
    },
    add(id, zone = board.addZone) {
      commit(addTo(items, id, zone, CATALOG[id]))
    },
    /** Katalogdan çoklu ekleme, tek kayıtta (art arda `add` eski listeyi görürdü). */
    addMany(ids, zone = board.addZone) {
      commit(addAll(items, ids, zone, CATALOG))
    },
    resize(slotId) {
      commit(items.map((x) => (x.id === slotId ? { ...x, wide: !x.wide } : x)))
    },
    reset() {
      try {
        localStorage.removeItem(board.key)
      } catch {
        /* yok say */
      }
      setState({ items: board.defaults, looks: {} })
      return state
    },
  }
}
