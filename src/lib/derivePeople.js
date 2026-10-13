/**
 * Kişi listesi — dizinden değil, kullanıcının KENDİ verisinden.
 *
 * `/users?$filter=` ile dizin araması `User.ReadBasic.All` ister ve o kapsam
 * `loginRequest`'te YOK (onaysız bir kapsam girişi "Approval required"
 * duvarına çevirir). Oysa toplantı katılımcıları ve gelen kutusundaki
 * göndericiler ZATEN bellekte: ikisi de ad + adres taşıyor ve sıfır ağ
 * maliyetiyle bir kişi listesi veriyor.
 *
 * Saf fonksiyon: ağ yok, hook yok, React yok. Takvim panelindeki "takvim
 * ekle" aday listesi de buradan besleniyor — iki yüzey aynı kişileri aynı
 * sırayla görsün diye.
 */

/** Toplantı katılımcıları + organizatörler, sıklığa göre. */
export function derivePeopleFromEvents(events, myAddress) {
  const mine = (myAddress ?? "").toLowerCase()
  const count = new Map()
  for (const e of events ?? []) {
    const seen = [
      ...(e.attendees ?? []),
      e.organizerAddress
        ? { name: e.organizer || e.organizerAddress, address: e.organizerAddress }
        : null,
    ].filter(Boolean)
    for (const a of seen) {
      const key = (a.address || "").toLowerCase()
      if (!key || key === mine) continue
      const hit = count.get(key)
      if (hit) hit.n += 1
      else count.set(key, { name: a.name || a.address, address: a.address, n: 1 })
    }
  }
  return [...count.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "tr"))
}

/** Gelen kutusundaki göndericiler — aynı biçim, aynı sıralama kuralı. */
export function derivePeopleFromMessages(messages, myAddress) {
  const mine = (myAddress ?? "").toLowerCase()
  const count = new Map()
  for (const m of messages ?? []) {
    const key = (m.fromAddress || "").toLowerCase()
    if (!key || key === mine) continue
    const hit = count.get(key)
    if (hit) hit.n += 1
    else count.set(key, { name: m.from || m.fromAddress, address: m.fromAddress, n: 1 })
  }
  return [...count.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "tr"))
}

/**
 * Birden fazla kaynağı ADRESE göre birleştirir.
 *
 * Aynı kişi hem toplantıda hem gelen kutusunda geçiyorsa sayaçları toplanır —
 * iki listede birer kez görünen biri, tek listede iki kez görünenden daha
 * yakın bir muhataptır. Ad olarak ilk kaynaktaki yazım korunur (takvim adları
 * genelde tam ad, posta adları bazen sadece adres).
 */
export function mergePeople(...lists) {
  const out = new Map()
  for (const list of lists) {
    for (const p of list ?? []) {
      const key = (p.address || "").toLowerCase()
      if (!key) continue
      const hit = out.get(key)
      if (hit) hit.n += p.n ?? 1
      else out.set(key, { ...p, n: p.n ?? 1 })
    }
  }
  return [...out.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "tr"))
}
