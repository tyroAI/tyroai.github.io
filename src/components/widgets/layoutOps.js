/**
 * Düzenin saf işlemleri. Liste HER ZAMAN bölge sırasına göre gruplu tutulur
 * (sol sütun · ana bölüm · diğer); bölge içi sıra ızgaradaki sıradır.
 */
import { ZONES } from "./layout"

const rank = (zone) => ZONES.indexOf(zone)

/** Bölge sırasına göre dizer; bölge içi sıra korunur (sıralama kararlı). */
export const grouped = (items) => [...items].sort((a, b) => rank(a.zone) - rank(b.zone))

/** `from`daki kimliği `to`ya taşır, aradakiler kayar. */
export function moveIds(ids, from, to) {
  const next = [...ids]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * Sürükle-bırak: kart hedefin bölgesine geçer. Aynı bölgede liste taşıması
 * (öne taşınan hedefin ardına düşer — son karta bırakmak sona taşır); başka
 * bölgeden gelen hedefin YERİNE girer, hedef kayar.
 */
export function moveTo(items, id, targetId) {
  const from = items.findIndex((x) => x.id === id)
  const to = items.findIndex((x) => x.id === targetId)
  if (from < 0 || to < 0 || from === to) return items
  const zone = items[to].zone
  if (items[from].zone === zone) return moveIds(items, from, to)
  const rest = items.filter((x) => x.id !== id)
  const at = rest.findIndex((x) => x.id === targetId)
  rest.splice(at, 0, { ...items[from], zone })
  return grouped(rest)
}

/** Bölgenin sonuna taşır (boş alana bırakma, "bölgeye ekle"). */
export function appendTo(items, id, zone) {
  const item = items.find((x) => x.id === id)
  if (!item) return items
  return grouped([...items.filter((x) => x.id !== id), { ...item, zone }])
}

/**
 * Oklar: bölge içinde komşuyla yer değiştirir; bölgenin ucunda kart sıradaki
 * bölgeye geçer (boş bölgeye de) — sırası değişmez, gruplu listede zaten sınırda.
 * `zones`: panonun bölgeleri (Anasayfa'da "diğer" yok).
 */
export function step(items, id, dir, zones = ZONES) {
  const i = items.findIndex((x) => x.id === id)
  if (i < 0) return items
  const zone = items[i].zone
  const j = i + dir
  if (items[j] && items[j].zone === zone) return moveIds(items, i, j)
  const nextZone = zones[zones.indexOf(zone) + dir]
  if (!nextZone) return items
  return items.map((x) => (x.id === id ? { ...x, zone: nextZone } : x))
}

/** Okların ucu: ilk bölgenin ilk kartı geri, son bölgenin son kartı ileri gidemez. */
export function edges(items, id, zones = ZONES) {
  const i = items.findIndex((x) => x.id === id)
  const zone = items[i]?.zone
  const inZone = items.filter((x) => x.zone === zone)
  return {
    first: zone === zones[0] && inZone[0]?.id === id,
    last: zone === zones[zones.length - 1] && inZone[inZone.length - 1]?.id === id,
  }
}

/*
 * YIĞIN: bir yuvada birden çok widget (`stack`, ilki yuvanın kimliği), biri
 * görünür (`at`). Yığın olmayan yuvada ikisi de yok.
 */
export const members = (item) => item.stack ?? [item.id]
export const shownId = (item) => {
  const list = members(item)
  return list[Math.min(item.at ?? 0, list.length - 1)]
}
const slotOf = (list, base, at = 0) =>
  list.length > 1
    ? { ...base, id: list[0], stack: list, at: Math.min(at, list.length - 1) }
    : { id: list[0], zone: base.zone, wide: base.wide }

/** Bırakılan yuvayı (yığınıyla) hedefin yığınına ekler; hedefte görünen değişmez. */
export function stackOnto(items, id, targetId) {
  const src = items.find((x) => x.id === id)
  const dst = items.find((x) => x.id === targetId)
  if (!src || !dst || src === dst) return items
  const merged = slotOf([...members(dst), ...members(src)], dst, dst.at ?? 0)
  return items.filter((x) => x.id !== id).map((x) => (x.id === targetId ? merged : x))
}

/** Yığından bir widget'ı ayırır: yığının hemen ardında kendi yuvasına çıkar. */
export function unstack(items, slotId, memberId) {
  const i = items.findIndex((x) => x.id === slotId)
  const slot = items[i]
  if (!slot || members(slot).length < 2 || !members(slot).includes(memberId)) return items
  const rest = members(slot).filter((x) => x !== memberId)
  const next = [...items]
  next.splice(i, 1, slotOf(rest, slot, slot.at ?? 0), {
    id: memberId,
    zone: slot.zone,
    wide: slot.wide,
  })
  return next
}

/** Kaldırır: yığındaysa yalnız o widget (tek kalınca yığın çözülür), değilse yuva. */
export function removeMember(items, slotId, memberId) {
  const slot = items.find((x) => x.id === slotId)
  if (!slot) return items
  const rest = members(slot).filter((x) => x !== memberId)
  if (!rest.length) return items.filter((x) => x.id !== slotId)
  return items.map((x) => (x.id === slotId ? slotOf(rest, slot, slot.at ?? 0) : x))
}

/** Yığında görünen widget'ı seçer — konum düzende saklanır (bir sonraki açılışta o gelir). */
export const showAt = (items, slotId, at) =>
  items.map((x) => (x.id === slotId && x.stack ? { ...x, at } : x))

/**
 * Ekler: katalogda bölgesi olan widget (Karşılama → sol sütun) o bölgenin
 * BAŞINA, öteki istenen bölgenin sonuna. Sol sütunda genişlik yok.
 */
export function addTo(items, id, zone, catalogEntry = {}) {
  const z = catalogEntry.zone ?? zone
  const item = { id, zone: z, wide: z !== "left" && Boolean(catalogEntry.wide) }
  return grouped(catalogEntry.zone ? [item, ...items] : [...items, item])
}

/** Katalogdan çoklu ekleme: seçim sırasıyla, her biri `addTo` kuralıyla. */
export const addAll = (items, ids, zone, catalog) =>
  ids.reduce((list, id) => addTo(list, id, zone, catalog[id]), items)
