import { NEUTRAL_TONE } from "@/lib/fileMeta"
import { TYPE_FAMILIES, folderOfUrl } from "@/lib/filesQuery"

/**
 * DOSYALARIM'IN SAF HESABI — ağ YOK, JSX YOK. Sayılar yüklenmiş sayfadan
 * türüyor; ek istek yok: son dosyaların tür karışımı (açılışın tür çipleri,
 * aramanın sayıları), OneDrive kotası, bir klasörün özeti, aynı adlı
 * klasörlerin ayrımı.
 */

const FAMILY_ORDER = [...TYPE_FAMILIES.map((f) => f.id), "other"]
const FAMILY_TONE = Object.fromEntries([
  ...TYPE_FAMILIES.map((f) => [f.id, f.tone]),
  ["other", NEUTRAL_TONE],
])

/**
 * Son dosyaların tür karışımı: `[{ id, n, tone }]`, çoktan aza; eşitlikte
 * süzgecin sırası, "Diğer" her zaman sonda (en az anlatan kapı).
 *
 * @param {{ counts?: Record<string, number> }|null} tc  `typeCounts` sonucu
 */
export function recentTypeMix(tc) {
  const counts = tc?.counts ?? {}
  return FAMILY_ORDER.filter((id) => counts[id] > 0)
    .map((id) => ({ id, n: counts[id], tone: FAMILY_TONE[id] }))
    .sort(
      (a, b) =>
        Number(a.id === "other") - Number(b.id === "other") ||
        b.n - a.n ||
        FAMILY_ORDER.indexOf(a.id) - FAMILY_ORDER.indexOf(b.id),
    )
}

/**
 * OneDrive kotası: `{ used, total, pct, tone }` ya da `null`. Eşikler
 * Graph'ın kendi bantları (`nearing` %90, `critical` %99).
 */
export function quotaInfo(q) {
  if (!q || !(Number(q.total) > 0)) return null
  const used = Math.max(0, Number(q.used) || 0)
  const total = Number(q.total)
  const pct = Math.min(1, used / total)
  return { used, total, pct, tone: pct >= 0.99 ? "full" : pct >= 0.9 ? "nearing" : "normal" }
}

/** Bir klasör listesinin özeti: `{ folders, files, more, latest }` (`latest` ms ya da `null`). */
export function placeFacts(items, hasMore = false) {
  let folders = 0
  let files = 0
  let latest = null
  for (const it of items ?? []) {
    if (it.kind === "file") files += 1
    else folders += 1
    const t = Date.parse(it.modified)
    if (Number.isFinite(t) && (latest == null || t > latest)) latest = t
  }
  return { folders, files, more: Boolean(hasMore), latest }
}

/**
 * Aynı adlı iki klasör kutucuğu ayırt edilsin: ad çakışınca üst klasörün adı
 * da verilir (`parentName`). Çakışmayan klasöre dokunulmaz.
 */
export function disambiguate(folders) {
  const key = (f) => String(f?.name ?? "").toLocaleLowerCase("tr")
  const counts = new Map()
  for (const f of folders ?? []) counts.set(key(f), (counts.get(key(f)) ?? 0) + 1)
  return (folders ?? []).map((f) =>
    counts.get(key(f)) > 1 ? { ...f, parentName: folderOfUrl(f.url)?.name ?? "" } : f,
  )
}
