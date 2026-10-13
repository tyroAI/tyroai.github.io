/**
 * DOSYALARIM — OTURUMUN HAFIZASI (yalnız bellekte; çıkışta `clearFilesNav`).
 *
 * Adreste yalnız opak belirteç duruyor (`lib/filesLocation.js`); klasörün
 * ADI, kırıntı yolu ve kutudaki arama metni burada. Diske yazılmaz: dosya
 * ve klasör adları başkalarının belgeleri, paylaşılan bir tarayıcıda kalmaz.
 *
 * - `lastQuery`   Dosyalarım'dan başka sekmeye geçip dönen kişinin araması
 * - `stash`       sekmeden çıkarken adresten sökülen f* parametreleri
 * - `metas`       belirteç → { name, webUrl, parentToken? } (tıklamadan bilinen)
 * - `trails`      belirteç → [{ token, name }] (kök hariç atalar, tıklama izinden)
 */
const state = { lastQuery: "", stash: null, metas: new Map(), trails: new Map() }

export const FILES_PARAMS = ["fsrc", "floc", "ft", "fd", "fp", "fs"]

/**
 * Oturum boyunca birikiyor (her klasör tıklaması bir kayıt); tavan olmasa
 * uzun bir oturum yüzlerce klasörün adını bellekte tutardı. En eskisi düşer
 * — düşen konuma dönülürse ad tek bir GET ile yeniden çözülür (`useLocationMeta`).
 */
const NAV_CAP = 500

function capped(map, key, value) {
  map.delete(key)
  map.set(key, value)
  while (map.size > NAV_CAP) map.delete(map.keys().next().value)
}

export function clearFilesNav() {
  state.lastQuery = ""
  state.stash = null
  state.metas.clear()
  state.trails.clear()
}

/** Teşhis/sınama: bellekte ne kaldı (çıkıştan sonra 0 olmalı — U16). */
export function filesNavSize() {
  return state.metas.size + state.trails.size + (state.lastQuery ? 1 : 0) + (state.stash ? 1 : 0)
}

export function lastQuery() {
  return state.lastQuery
}
export function rememberQuery(q) {
  state.lastQuery = q
}

/** Sekmeden çıkarken: f* parametrelerini söker ve saklar (yeni bir `URLSearchParams` döner). */
export function stashFilesParams(params) {
  const next = new URLSearchParams(params)
  const kept = {}
  for (const k of FILES_PARAMS) {
    if (next.has(k)) kept[k] = next.get(k)
    next.delete(k)
  }
  state.stash = Object.keys(kept).length ? kept : null
  return next
}

/** Sekmeye dönerken: adreste f* yoksa saklananı geri koyar. */
export function restoreFilesParams(params) {
  const next = new URLSearchParams(params)
  if (!state.stash || FILES_PARAMS.some((k) => next.has(k))) return next
  for (const [k, v] of Object.entries(state.stash)) next.set(k, v)
  return next
}

export function rememberMeta(token, meta) {
  if (!token || !meta?.name) return
  capped(state.metas, token, { ...state.metas.get(token), ...meta })
}
export function metaFor(token) {
  return token ? (state.metas.get(token) ?? null) : null
}

/** `from`dan `to`ya tıklandı: `to`nun izi = `from`un izi + `from`. */
export function rememberStep(from, to) {
  if (!to?.token || !from?.token || from.token === to.token) return
  const parent = state.trails.get(from.token) ?? []
  // Döngü koruması: `to` zaten izin içindeyse (geri gidildi) iz o noktada kesilir.
  const cut = parent.findIndex((c) => c.token === to.token)
  capped(
    state.trails,
    to.token,
    cut >= 0 ? parent.slice(0, cut) : [...parent, { token: from.token, name: from.name }],
  )
}
export function trailFor(token) {
  return token ? (state.trails.get(token) ?? []) : []
}
