import { DOC_FOLDERS, ORG_CHART_URL, POLICY_FOLDERS } from "@/data/companyDocs"
import { extOf } from "@/lib/driveItem"
import { fold } from "@/lib/fold"

/**
 * KURUMSAL İÇERİK — Dosyalarım'ın "Şirket" kaynağı (saf).
 *
 * Üç parça, üçü de `data/companyDocs.js`ten: CDN'deki kurumsal görseller
 * (beş klasör, 14 görsel), intranetin Politika ve Prosedürler klasörleri
 * (dört şirket) ve Organizasyon Şeması bağlantısı. Adlar KAYNAĞIN yazımıyla,
 * çevrilmez (`lang="tr"` çağıranda).
 *
 * ⚠️ **POLİTİKA KLASÖRÜ ARTIK YOLLA ÇÖZÜLÜYOR, PAYLAŞIM UCUYLA DEĞİL.**
 * Eski yol (`/shares/{u!…}/driveItem`) canlıda hiç ölçülmemişti ve
 * Microsoft'un izin tablosu o uç için en az `Files.ReadWrite` yazıyor —
 * bizim okuma kapsamlarımızla belki hiç çalışmadı. Klasörün adresi zaten
 * elimizde (`AllItems.aspx?id=/sites/intranet/Shared Documents/…`):
 * site → varsayılan kitaplık → `root:/<yol>` üç düz GET, üçü de okuma
 * kapsamıyla belgeli. Paylaşım ucu yalnız YEDEK (`hooks/usePolicyFolder.js`).
 */

/** `AllItems.aspx?id=/sites/x/Shared Documents/A/B` → parçalar; okunamazsa `null`. */
export function policyTarget(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const id = u.searchParams.get("id")
  if (!id) return null
  const parts = id.split("/").filter(Boolean)
  // ["sites", "intranet", "Shared Documents", "Politika-Prosedurler", "<şirket>"]
  if (parts.length < 4 || (parts[0] !== "sites" && parts[0] !== "teams")) return null
  return {
    host: u.host,
    sitePath: `/${parts[0]}/${parts[1]}`,
    library: parts[2],
    relPath: parts.slice(3).join("/"),
    // Klasörün SharePoint'teki çözülmüş adresi — `path:` araması ve konum satırı için.
    folderUrl: `${u.origin}/${parts.join("/")}`,
  }
}

export const POLICY_ITEMS = POLICY_FOLDERS.map((f) => ({
  id: `policy:${f.id}`,
  policyId: f.id,
  kind: "folder",
  source: "corporate",
  name: f.name,
  fallbackUrl: f.url,
  target: policyTarget(f.url),
}))

/** Politika kökünün adresi (dört şirketin ortak üstü) — aramanın `path:` kapsamı. */
export const POLICY_ROOT_URL = (() => {
  const t = POLICY_ITEMS[0]?.target
  if (!t) return ""
  return t.folderUrl.split("/").slice(0, -1).join("/")
})()

/** CDN görseli → Dosyalarım satırı (Graph adresi YOK: TYRO/posta/yıldız yok). */
function cdnItem(folder, file) {
  const ext = extOf(file.id)
  return {
    id: `cdn:${folder.id}/${file.id}`,
    lightboxId: file.id,
    kind: "file",
    source: "corporate",
    name: file.name,
    ext,
    size: null,
    modified: null,
    modifiedBy: "",
    webUrl: file.url,
    thumbUrl: file.url,
    folderId: folder.id,
    folderName: folder.name,
    driveId: null,
    itemId: null,
    cdn: true,
  }
}

export const CDN_FOLDERS = DOC_FOLDERS.map((f) => ({
  id: `cdn:${f.id}`,
  cdnFolderId: f.id,
  kind: "folder",
  source: "corporate",
  name: f.name,
  childCount: f.files.length,
  items: f.files.map((file) => cdnItem(f, file)),
  lightbox: f.files,
}))

export const CDN_IMAGE_COUNT = CDN_FOLDERS.reduce((s, f) => s + f.items.length, 0)

export const ORG_CHART_ITEM = {
  id: "org-chart",
  kind: "link",
  source: "corporate",
  webUrl: ORG_CHART_URL,
}

/**
 * İstemci tarafı kurumsal arama: görsel adı + klasör adı, Türkçe duyarsız,
 * kelimeler AND. Politika BELGELERİ sunucu aramasıyla bulunuyor (`path:`
 * kökü); burası yalnız sabit listedeki şeyler.
 *
 * @param {string} text
 * @param {{ orgLabel?: string, policyLabel?: string, imagesLabel?: string }} labels
 *   ekrandaki (çevrilmiş) adlar — "organizasyon" yazan kişi şemayı bulsun.
 */
export function searchCorporate(text, labels = {}) {
  const words = fold(text).split(/\s+/).filter(Boolean)
  if (!words.length) return { images: [], folders: [], org: false }
  const hit = (hay) => {
    const h = fold(hay)
    return words.every((w) => h.includes(w))
  }
  const images = CDN_FOLDERS.flatMap((f) =>
    f.items.filter((it) => hit(`${it.name} ${f.name} ${labels.imagesLabel ?? ""}`)),
  )
  const folders = [
    ...CDN_FOLDERS.filter((f) => hit(`${f.name} ${labels.imagesLabel ?? ""}`)),
    ...POLICY_ITEMS.filter((f) => hit(`${f.name} ${labels.policyLabel ?? ""}`)),
  ]
  const org = hit(`${labels.orgLabel ?? ""} organizasyon şeması org chart`)
  return { images, folders, org }
}
