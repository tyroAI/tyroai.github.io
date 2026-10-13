// Demo dosyalarının ADRES katmanı:
//   · web adresi → düğüm / kitaplık / site çözümü (`/shares` ucu ve bağlantılar)
//   · önizleme sayfasının adresi (dosya ya da klasör görünümü)
//   · `*.sharepoint.example` bağlantılarını yakalayıp aynı kökenli önizleme
//     sayfasına çeviren tıklama ve `window.open` kancası — kurgusal alan adları
//     DNS'te çözülmez, yakalanmasa "SharePoint'te aç" boş bir hata sayfası açardı.

import { contentFor } from "./files-content"
import { filePreviewPayload, previewPageUrl } from "./files-render"
import {
  DRIVES,
  ITEMS,
  MY_DRIVE_ID,
  MY_HOST,
  SITES,
  SP_HOST,
  driveById,
  isoAgo,
  itemByPath,
  personOf,
  rootOf,
  siteByKey,
  siteUrl,
} from "./files-tree"

const HOSTS = new Set([SP_HOST, MY_HOST])

function decodePath(p) {
  try {
    return decodeURIComponent(p)
  } catch {
    return p
  }
}

/**
 * Web adresi → `{ type: "item", node } | { type: "site", site } | null`.
 * `…/Forms/AllItems.aspx?id=/sites/x/Shared Documents/A` görünüm adresinde
 * `id` parametresi klasörün yolu sayılır.
 */
export function resolveWebUrl(raw) {
  let u
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (!HOSTS.has(u.host)) return null
  let path = decodePath(u.pathname)
  if (/\/forms\/[^/]+\.aspx$/i.test(path) && u.searchParams.get("id"))
    path = u.searchParams.get("id")
  path = path.replace(/\/+$/, "")
  const lower = path.toLocaleLowerCase("tr")
  // En uzun eşleşen sürücü kökü.
  let best = null
  for (const d of DRIVES) {
    if (new URL(d.origin).host !== u.host) continue
    const b = d.base.toLocaleLowerCase("tr")
    if ((lower === b || lower.startsWith(`${b}/`)) && (!best || b.length > best.base.length))
      best = d
  }
  if (best) {
    const node = itemByPath(best.id, path.slice(best.base.length))
    if (node) return { type: "item", node }
  }
  if (u.host === SP_HOST) {
    const site =
      SITES.find((s) => s.path && (lower === s.path || lower.startsWith(`${s.path}/`))) ??
      (lower === "" ? siteByKey("root") : null)
    if (site) return { type: "site", site }
  }
  return null
}

/** Düğümün bulunduğu yer — "OneDrive › Satış Planlama" ya da "Satış Ekibi › Belgeler › …". */
export function locationLabel(node) {
  const drive = driveById(node.driveId)
  const head =
    drive.site != null
      ? [siteByKey(drive.site)?.displayName, drive.name]
      : drive.id === MY_DRIVE_ID
        ? ["OneDrive"]
        : [`OneDrive — ${personOf(drive.person).displayName}`]
  const folders = node.rel.split("/").filter(Boolean).slice(0, -1)
  return [...head, ...folders].filter(Boolean).join(" › ")
}

export function previewUrlForNode(node) {
  const content = contentFor(node)
  return previewPageUrl(
    filePreviewPayload(node, content, {
      modified: isoAgo(node.d),
      by: personOf(node.by).displayName,
      location: locationLabel(node),
    }),
  )
}

function folderPayload(title, location, nodes) {
  return {
    v: 1,
    kind: "folder",
    name: title,
    location,
    children: nodes.slice(0, 60).map((n) => ({
      name: n.name,
      folder: n.kind === "folder",
      ext: n.ext ?? "",
      modified: isoAgo(n.d),
      by: personOf(n.by).displayName,
      size: n.size ?? 0,
      count: n.kind === "folder" ? n.children.length : null,
    })),
  }
}

/** Herhangi bir demo web adresinin açılacağı aynı kökenli sayfa; tanınmazsa `null`. */
export function previewUrlForWebUrl(raw) {
  const hit = resolveWebUrl(raw)
  if (!hit) {
    try {
      if (!HOSTS.has(new URL(raw).host)) return null
    } catch {
      return null
    }
    return previewPageUrl({ v: 1, kind: "missing", name: raw })
  }
  if (hit.type === "item") {
    const n = hit.node
    if (n.kind === "file") return previewUrlForNode(n)
    const drive = driveById(n.driveId)
    const title = n.isRoot ? drive.name : n.name
    return previewPageUrl(
      folderPayload(
        title,
        n.isRoot ? (siteByKey(drive.site)?.displayName ?? "OneDrive") : locationLabel(n),
        n.children.map((id) => ITEMS.get(id)),
      ),
    )
  }
  // Site: ilk kitaplığın kökü.
  const site = hit.site
  const drive = DRIVES.find((d) => d.site === site.key)
  const root = drive ? rootOf(drive.id) : null
  return previewPageUrl(
    folderPayload(
      site.displayName,
      siteUrl(site),
      root ? root.children.map((id) => ITEMS.get(id)) : [],
    ),
  )
}

/* ─────────────────────────── bağlantı kancası ─────────────────────────── */

function isDemoHost(href) {
  try {
    return HOSTS.has(new URL(href, window.location.href).host)
  } catch {
    return false
  }
}

let installed = false

/**
 * Uygulamanın KENDİ tıklama işleyicileri önce çalışır (React kökte dinliyor,
 * olay pencereye kabarcıklanıyor): uygulama tıklamayı zaten karşıladıysa
 * (`defaultPrevented` — ör. düz tık uygulama içi önizlemeyi açtı) dokunulmaz.
 * Kalan durumda tarayıcı kurgusal alan adına gitmek yerine önizleme sayfası açılır.
 */
export function installFileLinkInterceptor() {
  if (installed || typeof window === "undefined") return
  installed = true
  const onClick = (e) => {
    if (e.defaultPrevented) return
    if (e.type === "click" && e.button !== 0) return
    if (e.type === "auxclick" && e.button !== 1) return
    const a = e.target?.closest?.("a[href]")
    if (!a || !isDemoHost(a.href)) return
    const target = previewUrlForWebUrl(a.href)
    if (!target) return
    e.preventDefault()
    window.open(target, "_blank", "noopener")
  }
  window.addEventListener("click", onClick)
  window.addEventListener("auxclick", onClick)

  const realOpen = window.open.bind(window)
  window.open = (url, ...rest) => {
    if (url && isDemoHost(String(url))) {
      const target = previewUrlForWebUrl(new URL(String(url), window.location.href).href)
      if (target) return realOpen(target, ...rest)
    }
    return realOpen(url, ...rest)
  }
}
