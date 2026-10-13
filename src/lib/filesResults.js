import { normaliseDriveItem } from "@/lib/driveItem"
import { familyOfExt, typeFamily } from "@/lib/filesTypes"

/** Gelen sonuçlar: özet, isabet, tür sayıları, adresten klasör ve konum — `lib/filesQuery.js`in parçası. */

/**
 * `hit.summary` → `[{ text, mark }]`. Graph eşleşmeyi `<c0>…</c0>`, kesintiyi
 * `<ddd/>` ile işaretliyor. ⚠️ HTML olarak BASILMAZ: parçalar metin, işaret
 * yalnız `mark` bayrağı — özet başkasının belgesinden geliyor.
 */
export function parseSummary(summary) {
  const src = String(summary ?? "").replace(/<ddd\/>/g, "…")
  const out = []
  const re = /<c0>(.*?)<\/c0>/g
  let last = 0
  let m
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ text: stripTags(src.slice(last, m.index)), mark: false })
    out.push({ text: stripTags(m[1]), mark: true })
    last = m.index + m[0].length
  }
  if (last < src.length) out.push({ text: stripTags(src.slice(last)), mark: false })
  return out.filter((p) => p.text)
}
function stripTags(s) {
  return s.replace(/<[^>]*>/g, "")
}

/** Arama isabeti → dosya satırı (+ özet). Kaynak `resource` yoksa `null`. */
export function normaliseHit(hit) {
  const r = hit?.resource
  if (!r?.id) return null
  return { ...normaliseDriveItem(r), summary: hit.summary ?? "" }
}

/**
 * Tür süzgecinin SAYILARI (§5, §12.16).
 *
 * - Sunucu `FileType` kovası döndürdüyse (yalnız tür süzgeci BOŞKEN istenir)
 *   kovalar aileye toplanır ve sayı YAKLAŞIK (`approx: true`, "≈" +
 *   `filter.approx`): toplama bütün sonuç kümesinin tahmini.
 * - Kova yoksa (yetenek kapalı, istenmedi, tür süzgeci açık) YÜKLENEN
 *   öğeler sayılır ve sayı KESİN ama yalnız yüklenenler için
 *   (`approx: false`, `filter.countsLoaded`).
 *
 * @returns {{ counts: Record<string, number>, approx: boolean, source: "aggregation"|"loaded" }}
 */
export function typeCounts({ aggregations = null, items = [] } = {}) {
  const agg = Array.isArray(aggregations)
    ? aggregations.find((a) => String(a?.field ?? "").toLowerCase() === "filetype")
    : null
  if (Array.isArray(agg?.buckets)) {
    const counts = {}
    for (const b of agg.buckets) {
      const key = String(b?.key ?? "").trim()
      if (!key) continue
      const fam = familyOfExt(key)
      counts[fam] = (counts[fam] ?? 0) + (Number(b.count) || 0)
    }
    return { counts, approx: true, source: "aggregation" }
  }
  const counts = {}
  for (const it of items ?? []) {
    if (it?.kind !== "file") continue
    const fam = typeFamily(it)
    counts[fam] = (counts[fam] ?? 0) + 1
  }
  return { counts, approx: false, source: "loaded" }
}

/**
 * Adresten KLASÖR: `…/Documents/Finans/2026/Bütçe.xlsx` → üst klasörün
 * adresi ve adı. Arama isabetlerinde `parentReference.path` gelmiyor; konum
 * satırı ve "sonuçların bulunduğu klasörler" buradan türüyor (ek istek yok).
 */
export function folderOfUrl(webUrl) {
  if (!webUrl) return null
  let url
  try {
    url = new URL(webUrl)
  } catch {
    return null
  }
  // Office Online bağlantısı (`Doc.aspx?sourcedoc=`) klasör söylemiyor.
  if (/\/_layouts\//i.test(url.pathname)) return null
  const parts = url.pathname.split("/").filter(Boolean)
  if (parts.length < 2) return null
  const parentPath = `/${parts.slice(0, -1).join("/")}`
  let name = parts[parts.length - 2]
  try {
    name = decodeURIComponent(name)
  } catch {
    /* olduğu gibi */
  }
  return { url: `${url.origin}${parentPath}`, name }
}

/** Kitaplık kökü mü? ("Documents", "Shared Documents", "Belgeler"…) */
const LIBRARY_ROOTS = new Set(["documents", "shared documents", "belgeler", "paylaşılan belgeler"])

/**
 * Konum satırı parçaları: `{ root, segments }`. `root` kök türü
 * (`onedrive` · `sharedOnedrive` · `site`), `siteName` site kökünde site
 * adresinin kısa adı; `segments` kitaplık kökünden sonraki klasörler.
 * Çeviri çağıranda (kök etiketi dile göre değişiyor).
 *
 * @param {object} item  dosya satırı (webUrl)
 * @param {{ myRoot?: string }} ctx  `myRoot` = kişinin OneDrive kök adresi
 */
export function locationParts(item, { myRoot = "" } = {}) {
  const parent = folderOfUrl(item.webUrl)
  if (!parent) return null
  let path
  try {
    path = decodeURIComponent(new URL(parent.url).pathname)
  } catch {
    return null
  }
  const parts = path.split("/").filter(Boolean)
  const mine =
    myRoot && parent.url.toLowerCase().startsWith(myRoot.replace(/\/+$/, "").toLowerCase())
  // /personal/<kişi>/Documents/… · /sites/<site>/Shared Documents/… · /teams/<t>/…
  if (parts[0] === "personal") {
    return { root: mine ? "onedrive" : "sharedOnedrive", siteName: "", segments: parts.slice(3) }
  }
  if (parts[0] === "sites" || parts[0] === "teams") {
    const rest = parts.slice(2)
    const lib = rest[0] && LIBRARY_ROOTS.has(rest[0].toLowerCase()) ? 1 : 0
    return { root: "site", siteName: parts[1] ?? "", segments: rest.slice(lib) }
  }
  const lib = parts[0] && LIBRARY_ROOTS.has(parts[0].toLowerCase()) ? 1 : 0
  return { root: "site", siteName: "", segments: parts.slice(lib) }
}

/** "a › b › c" — üçten fazla parça ortadan kısalır: "a › … › z". */
export function joinSegments(segments, max = 3) {
  const s = segments.filter(Boolean)
  if (s.length <= max) return s.join(" › ")
  return [s[0], "…", ...s.slice(-(max - 1))].join(" › ")
}

/**
 * "Sonuçların bulunduğu klasörler": yüklenen dosyaların üst klasörleri,
 * sayıya göre (eşitlikte ada göre). Kitaplık kökü klasör sayılmaz — "Shared
 * Documents" bir yer değil. Ek istek YOK; adres satırın kendisinden.
 */
export function facetFolders(items, limit = 50) {
  const byUrl = new Map()
  for (const it of items) {
    if (it.kind !== "file") continue
    const f = folderOfUrl(it.webUrl)
    if (!f || LIBRARY_ROOTS.has(f.name.toLowerCase())) continue
    const key = f.url.toLowerCase()
    const prev = byUrl.get(key)
    if (prev) prev.count += 1
    // `sample`: klasörün kimliği bilinmiyorsa (arama isabetinde `parentReference.id`
    // gelmeyebilir) bu dosya üzerinden tek bir GET ile çözülüyor.
    else
      byUrl.set(key, {
        ...f,
        count: 1,
        driveId: it.driveId ?? null,
        parentId: it.parentId ?? null,
        sample: it,
      })
  }
  return [...byUrl.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"))
    .slice(0, limit)
}
