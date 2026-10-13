// Graph — OneDrive / SharePoint dosyaları, siteler, kitaplıklar, ekipler,
// paylaşım adresleri, son kullanılanlar ve Microsoft Search. Veri
// `src/demo/data/files-*.js`ten; hepsi kurgusal ve bellekte.

import { graph, notFound, reply } from "../router"
import { ME } from "../persona"
import { contentFor, plainTextOf } from "../data/files-content"
import { fileBlob, thumbnailSet } from "../data/files-render"
import {
  installFileLinkInterceptor,
  locationLabel,
  previewUrlForNode,
  resolveWebUrl,
} from "../data/files-links"
import {
  DRIVES,
  GROUPS,
  ITEMS,
  MY_DRIVE_ID,
  OTHER_MEMBERSHIPS,
  SITES,
  SP_HOST,
  driveById,
  driveWebUrl,
  drivesOfSite,
  isoAgo,
  itemByPath,
  itemWebUrl,
  personOf,
  rootOf,
  siteById,
  siteByKey,
  siteUrl,
} from "../data/files-tree"

installFileLinkInterceptor()

const BASE = "https://graph.microsoft.com/v1.0"

/* ─────────────────────────── Graph biçimi ─────────────────────────── */

const MIME = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  pdf: "application/pdf",
  csv: "text/csv",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  zip: "application/x-zip-compressed",
}

const userOf = (id) => {
  const p = personOf(id)
  return { user: { id: p.id, displayName: p.displayName, email: p.mail } }
}

const siteOfDrive = (drive) => (drive.site ? siteByKey(drive.site) : null)

function parentRef(node) {
  const drive = driveById(node.driveId)
  const site = siteOfDrive(drive)
  const parent = node.parentId ? ITEMS.get(node.parentId) : null
  const ref = { driveType: drive.driveType, driveId: drive.id }
  if (parent) {
    ref.id = parent.id
    ref.name = parent.isRoot ? drive.name : parent.name
    ref.path = `/drives/${drive.id}/root:${parent.rel}`
  }
  if (site) ref.siteId = site.id
  return ref
}

function itemJson(node, { now = Date.now(), children = null } = {}) {
  const drive = driveById(node.driveId)
  const base = {
    "@odata.etag": `"{${node.id}},${Math.round(node.d * 10) + 3}"`,
    id: node.id,
    name: node.isRoot ? "root" : node.name,
    size: node.size ?? 0,
    webUrl: node.isRoot ? driveWebUrl(drive) : itemWebUrl(node),
    createdDateTime: isoAgo(node.c, now),
    lastModifiedDateTime: isoAgo(node.d, now),
    createdBy: userOf(node.cby),
    lastModifiedBy: userOf(node.by),
    parentReference: parentRef(node),
    fileSystemInfo: {
      createdDateTime: isoAgo(node.c, now),
      lastModifiedDateTime: isoAgo(node.d, now),
    },
  }
  if (node.isRoot) base.root = {}
  if (node.kind === "folder") base.folder = { childCount: node.children.length }
  else
    base.file = {
      mimeType: MIME[node.ext] ?? "application/octet-stream",
      hashes: { quickXorHash: `${node.id}=` },
    }
  if (node.ext === "png" || node.ext === "jpg") base.image = { width: 1200, height: 800 }
  if (drive.id !== MY_DRIVE_ID)
    base.shared = { scope: "users", owner: drive.person ? userOf(drive.person) : undefined }
  if (children) base.children = children.map((c) => itemJson(c, { now }))
  return base
}

/** Başka bir sürücüdeki öğe, kişinin kendi listesinde (`recent`, `sharedWithMe`) `remoteItem` ile. */
function remoteJson(node, now) {
  const inner = itemJson(node, { now })
  if (node.driveId === MY_DRIVE_ID) return inner
  return {
    id: `R${node.id}`,
    name: node.name,
    size: node.size,
    webUrl: inner.webUrl,
    lastModifiedDateTime: inner.lastModifiedDateTime,
    createdDateTime: inner.createdDateTime,
    parentReference: { driveId: MY_DRIVE_ID, driveType: "business" },
    file: inner.file,
    folder: inner.folder,
    remoteItem: {
      id: node.id,
      name: node.name,
      size: node.size,
      webUrl: inner.webUrl,
      file: inner.file,
      folder: inner.folder,
      createdBy: inner.createdBy,
      lastModifiedBy: inner.lastModifiedBy,
      createdDateTime: inner.createdDateTime,
      lastModifiedDateTime: inner.lastModifiedDateTime,
      parentReference: inner.parentReference,
      shared: inner.shared,
    },
  }
}

function driveJson(drive) {
  const site = siteOfDrive(drive)
  const root = rootOf(drive.id)
  return {
    id: drive.id,
    name: drive.name,
    description: drive.description ?? "",
    driveType: drive.driveType,
    webUrl: driveWebUrl(drive),
    createdDateTime: isoAgo(site?.created ?? 1400),
    lastModifiedDateTime: isoAgo(root?.d ?? 1),
    createdBy: drive.person ? userOf(drive.person) : { user: { displayName: "Sistem Hesabı" } },
    owner: drive.person
      ? userOf(drive.person)
      : {
          group: {
            id: GROUPS.find((g) => g.drive === drive.id)?.id,
            displayName: site?.displayName,
          },
        },
    quota: drive.quota
      ? {
          total: drive.quota.total,
          used: drive.quota.used,
          remaining: drive.quota.total - drive.quota.used,
          deleted: 0,
          state: "normal",
        }
      : {
          total: 27487790694400,
          used: 8820441088,
          remaining: 27478970253312,
          deleted: 0,
          state: "normal",
        },
  }
}

function siteJson(site) {
  return {
    id: site.id,
    name: site.name,
    displayName: site.displayName,
    description: site.description,
    webUrl: siteUrl(site),
    createdDateTime: isoAgo(site.created),
    lastModifiedDateTime: isoAgo(0.3),
    siteCollection: { hostname: SP_HOST },
    ...(site.root ? { root: {} } : {}),
  }
}

function groupJson(g) {
  return {
    "@odata.type": "#microsoft.graph.group",
    id: g.id,
    displayName: g.displayName,
    description: g.description,
    groupTypes: ["Unified"],
    mail: `${g.mailNickname}@midea.com`,
    mailNickname: g.mailNickname,
    mailEnabled: true,
    securityEnabled: false,
    visibility: "Private",
  }
}

/* ─────────────────────────── listeler ─────────────────────────── */

function sortNodes(nodes, orderby) {
  const ob = String(orderby ?? "")
    .trim()
    .toLowerCase()
  const desc = /\sdesc$/.test(ob)
  const key = ob.replace(/\s+(asc|desc)$/, "")
  // Doğal artan sıra; `desc` tersine çevirir. Klasörler OneDrive'daki gibi önde.
  const asc =
    key === "lastmodifieddatetime"
      ? (a, b) => b.d - a.d
      : key === "size"
        ? (a, b) => (a.size ?? 0) - (b.size ?? 0)
        : (a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base", numeric: true })
  return [...nodes].sort((a, b) => {
    const fa = a.kind === "folder" ? 0 : 1
    const fb = b.kind === "folder" ? 0 : 1
    if (fa !== fb) return fa - fb
    return asc(a, b) * (desc ? -1 : 1) || a.name.localeCompare(b.name, "tr")
  })
}

/** `$top` + `$skiptoken` sayfalaması; `nextLink` mutlak adres. */
function paged(ctx, values, toJson) {
  const top = Math.max(1, Math.min(Number(ctx.query.get("$top")) || 200, 999))
  const skip = Number(ctx.query.get("$skiptoken")) || 0
  const page = values.slice(skip, skip + top)
  const out = { "@odata.context": `${BASE}/$metadata`, value: page.map(toJson) }
  if (skip + top < values.length) {
    const q = new URLSearchParams(ctx.query)
    q.set("$skiptoken", String(skip + top))
    out["@odata.nextLink"] = `${BASE}${ctx.path}?${q.toString()}`
  }
  return out
}

/** Doğukan'ın son dokunduğu dosyalar: kendi değiştirdikleri/oluşturdukları + açtıkları. */
function recentNodes() {
  const at = (n) =>
    Math.min(
      n.by === ME.id ? n.d : Infinity,
      n.viewed ?? Infinity,
      n.cby === ME.id ? n.c : Infinity,
    )
  return [...ITEMS.values()]
    .filter((n) => n.kind === "file" && Number.isFinite(at(n)))
    .sort((a, b) => at(a) - at(b))
    .map((n) => ({ node: n, at: at(n) }))
}

/* ─────────────────────────── içerik önbelleği ─────────────────────────── */

const blobCache = new Map() // node.id → Promise<Blob|null>
const urlCache = new Map() // node.id → blob: adresi

function blobFor(node) {
  if (!blobCache.has(node.id))
    blobCache.set(
      node.id,
      fileBlob(node, contentFor(node)).catch(() => null),
    )
  return blobCache.get(node.id)
}

async function downloadUrlFor(node) {
  if (urlCache.has(node.id)) return urlCache.get(node.id)
  const blob = await blobFor(node)
  const url = blob ? URL.createObjectURL(blob) : null
  urlCache.set(node.id, url)
  return url
}

const textCache = new Map()
function textOf(node) {
  if (!textCache.has(node.id))
    textCache.set(node.id, node.kind === "file" ? plainTextOf(contentFor(node)) : "")
  return textCache.get(node.id)
}

/* ─────────────────────────── uçlar: sürücü ─────────────────────────── */

graph("GET", "/me/drive", () => driveJson(driveById(MY_DRIVE_ID)))
graph("GET", /^\/drives\/([^/:]+)$/, ({ match }) => {
  const drive = driveById(match[1])
  return drive ? driveJson(drive) : notFound("Drive not found")
})

graph("GET", "/me/drive/recent", (ctx) => {
  const now = Date.now()
  const list = recentNodes()
  return paged(ctx, list, ({ node }) => remoteJson(node, now))
})

graph("GET", "/me/drive/sharedWithMe", (ctx) => {
  const now = Date.now()
  const shared = [...ITEMS.values()].filter(
    (n) => n.kind === "file" && driveById(n.driveId).person && n.driveId !== MY_DRIVE_ID,
  )
  return paged(ctx, sortNodes(shared, "lastModifiedDateTime desc"), (n) => remoteJson(n, now))
})

/**
 * Öğe adresleme — `/me/drive` ve `/drives/{d}` altında:
 *   root · items/{id} · root:/yol[:] · items/{id}:/yol[:]
 *   + /children · /thumbnails · /preview (POST) · /content
 */
const ITEM_ROUTE =
  /^\/(?:me\/drive|drives\/([^/:]+))\/(root|items\/([^/:]+))(?::(\/[^:]*))?:?(\/children|\/thumbnails(?:\/\d+\/\w+)?|\/preview|\/content)?$/

function resolveItem(match) {
  const driveId = match[1] ?? MY_DRIVE_ID
  let node
  if (match[2] === "root") node = rootOf(driveId)
  else {
    const raw = match[3]
    node = ITEMS.get(raw) ?? (raw.startsWith("R") ? ITEMS.get(raw.slice(1)) : null)
  }
  if (!node) return null
  if (match[4]) {
    const rel = `${node.rel}${match[4]}`
    node = itemByPath(node.driveId, rel)
  }
  return node
}

graph("*", ITEM_ROUTE, async (ctx) => {
  const node = resolveItem(ctx.match)
  if (!node) return notFound("The resource could not be found.")
  const action = ctx.match[5] ?? ""
  const now = Date.now()

  if (action === "/preview") {
    if (ctx.method !== "POST") return undefined
    const content = node.kind === "file" ? contentFor(node) : null
    if (!content) {
      return reply(
        { error: { code: "notSupported", message: "Preview is not supported for this item." } },
        { status: 400 },
      )
    }
    return { getUrl: previewUrlForNode(node), postUrl: null, postParameters: null }
  }
  if (ctx.method !== "GET") return undefined

  if (action === "/children") {
    if (node.kind !== "folder") return { value: [] }
    const kids = node.children.map((id) => ITEMS.get(id))
    return paged(ctx, sortNodes(kids, ctx.query.get("$orderby")), (n) => itemJson(n, { now }))
  }
  if (action.startsWith("/thumbnails")) {
    const set = node.kind === "file" ? thumbnailSet(contentFor(node)) : null
    if (action !== "/thumbnails") {
      // /thumbnails/0/large → tek boy
      const size = action.split("/").pop()
      return set?.[size] ? set[size] : notFound("Thumbnail not found")
    }
    return { value: set ? [set] : [] }
  }
  if (action === "/content") {
    if (node.kind !== "file") return notFound("Item is a folder")
    const blob = await blobFor(node)
    if (blob) return blob
    return new Blob([`${node.name}\n\nMidea — demo içerik.\n`], {
      type: MIME[node.ext] ?? "text/plain",
    })
  }

  const expand = ctx.query.get("$expand") ?? ""
  const children =
    /children/.test(expand) && node.kind === "folder"
      ? node.children.map((id) => ITEMS.get(id))
      : null
  const json = itemJson(node, { now, children })
  const select = ctx.query.get("$select")
  if (node.kind === "file" && (!select || /downloadUrl/i.test(select))) {
    const url = await downloadUrlFor(node)
    if (url) json["@microsoft.graph.downloadUrl"] = url
  }
  return json
})

/* ─────────────────────────── uçlar: siteler, ekipler ─────────────────────────── */

graph("GET", "/sites/root", () => siteJson(siteByKey("root")))
graph("GET", "/sites", (ctx) => {
  const q = (ctx.query.get("search") ?? "").replace(/^\*$/, "").toLocaleLowerCase("tr")
  const hits = SITES.filter(
    (s) => !q || `${s.displayName} ${s.description}`.toLocaleLowerCase("tr").includes(q),
  )
  return { value: hits.map(siteJson) }
})
graph("GET", "/me/followedSites", (ctx) =>
  paged(
    ctx,
    SITES.filter((s) => s.followed),
    siteJson,
  ),
)

/** `/sites/{id}`, `/sites/root`, `/sites/{host}:{yol}[:]` + `/drives` · `/drive`. */
graph("GET", /^\/sites\/([^/:]+)(?::(\/[^:]*))?:?(\/drives|\/drive)?$/, ({ match }) => {
  const [, head, sitePath, action] = match
  let site
  if (sitePath !== undefined) {
    if (head !== SP_HOST) return notFound("Site not found")
    const p = sitePath.replace(/\/+$/, "").toLocaleLowerCase("tr")
    site = p === "" ? siteByKey("root") : SITES.find((s) => s.path.toLocaleLowerCase("tr") === p)
  } else site = head === "root" ? siteByKey("root") : siteById(head)
  if (!site) return notFound("Requested site could not be found")
  if (action === "/drives") return { value: drivesOfSite(site.key).map(driveJson) }
  if (action === "/drive") return driveJson(drivesOfSite(site.key)[0])
  return siteJson(site)
})

graph("GET", /^\/me\/(?:transitive)?[mM]emberOf(?:\/microsoft\.graph\.group)?$/, (ctx) => {
  const values = [...GROUPS.map(groupJson), ...OTHER_MEMBERSHIPS]
  return paged(ctx, values, (x) => x)
})

graph("GET", /^\/groups\/([^/]+)(\/drive|\/drives)?$/, ({ match }) => {
  const g = GROUPS.find((x) => x.id === match[1])
  if (!g) return notFound("Group not found")
  if (match[2] === "/drive") return driveJson(driveById(g.drive))
  if (match[2] === "/drives") return { value: [driveJson(driveById(g.drive))] }
  return groupJson(g)
})

/* ─────────────────────────── paylaşım adresi ─────────────────────────── */

function decodeShareId(id) {
  if (!id.startsWith("u!")) return null
  try {
    const b64 = id.slice(2).replace(/-/g, "+").replace(/_/g, "/")
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4))
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
  } catch {
    return null
  }
}

graph("GET", /^\/shares\/([^/]+)\/(driveItem|root)(\/children)?$/, (ctx) => {
  const url = decodeShareId(ctx.match[1])
  const hit = url ? resolveWebUrl(url) : null
  let node = hit?.type === "item" ? hit.node : null
  if (hit?.type === "site") node = rootOf(drivesOfSite(hit.site.key)[0]?.id)
  if (!node) return notFound("The sharing link could not be resolved.")
  const now = Date.now()
  if (ctx.match[3]) return { value: node.children.map((id) => itemJson(ITEMS.get(id), { now })) }
  const expand = ctx.query.get("$expand") ?? ""
  const children =
    /children/.test(expand) && node.kind === "folder"
      ? node.children.map((id) => ITEMS.get(id))
      : null
  return itemJson(node, { now, children })
})

/* ─────────────────────────── son kullanılanlar (insights) ─────────────────────────── */

const VIS_TYPE = {
  xlsx: "Excel",
  docx: "Word",
  pptx: "PowerPoint",
  pdf: "Pdf",
  csv: "Csv",
  png: "Image",
  txt: "Text",
  zip: "Zip",
}

graph("GET", /^\/me\/insights\/(used|trending|shared)$/, (ctx) => {
  const now = Date.now()
  const list = recentNodes()
  return paged(ctx, list, ({ node, at }) => {
    const drive = driveById(node.driveId)
    const site = siteOfDrive(drive)
    const containerUrl = itemWebUrl(node).replace(/\/[^/]*$/, "")
    return {
      id: `INS${node.id}`,
      lastUsed: {
        lastAccessedDateTime: isoAgo(at, now),
        lastModifiedDateTime: isoAgo(node.d, now),
      },
      resourceVisualization: {
        title: node.name.replace(/\.[^.]+$/, ""),
        type: VIS_TYPE[node.ext] ?? "Other",
        mediaType: MIME[node.ext] ?? "application/octet-stream",
        previewImageUrl: "",
        previewText: textOf(node).slice(0, 180),
        containerWebUrl: containerUrl,
        containerDisplayName: site
          ? site.displayName
          : drive.id === MY_DRIVE_ID
            ? "OneDrive"
            : `OneDrive — ${personOf(drive.person).displayName}`,
        containerType: site ? "Site" : "OneDriveBusiness",
      },
      resourceReference: {
        webUrl: itemWebUrl(node),
        id: `drives/${drive.id}/items/${node.id}`,
        type: "microsoft.graph.driveItem",
      },
    }
  })
})

/* ─────────────────────────── Microsoft Search ─────────────────────────── */

const FOLD = { ı: "i", ğ: "g", ü: "u", ş: "s", ö: "o", ç: "c", â: "a", î: "i", û: "u" }
const fold = (s) =>
  String(s ?? "")
    .toLocaleLowerCase("tr")
    .replace(/[ığüşöçâîû]/g, (c) => FOLD[c])

const decodeUrl = (u) => {
  try {
    return decodeURI(u)
  } catch {
    return u
  }
}

/** KQL → süzgeç. Yalnız uygulamanın gerçekten gönderdiği kalıplar tanınır; kalanı metin. */
function parseKql(raw) {
  let q = ` ${raw} `
  const f = {
    terms: [],
    include: null,
    exclude: new Set(),
    paths: [],
    mine: [],
    notEditor: [],
    folders: null,
    after: null,
    before: null,
  }
  const take = (re, fn) => {
    q = q.replace(re, (...m) => {
      fn(m)
      return " "
    })
  }
  take(/\(\s*EditorOWSUSER:"([^"]*)"\s+OR\s+AuthorOWSUSER:"([^"]*)"\s*\)/gi, (m) =>
    f.mine.push(m[1].toLowerCase()),
  )
  take(/-EditorOWSUSER:"([^"]*)"/gi, (m) => f.notEditor.push(m[1].toLowerCase()))
  take(/(?:Editor|Author)OWSUSER:"([^"]*)"/gi, (m) => f.mine.push(m[1].toLowerCase()))
  take(/path:"([^"]*)"/gi, (m) => f.paths.push(fold(decodeUrl(m[1])).replace(/\/+$/, "")))
  take(/path:(\S+)/gi, (m) => f.paths.push(fold(decodeUrl(m[1])).replace(/\/+$/, "")))
  take(/\(\s*(filetype:\w+(?:\s+OR\s+filetype:\w+)*)\s*\)/gi, (m) => {
    f.include = new Set([...m[1].matchAll(/filetype:(\w+)/gi)].map((x) => x[1].toLowerCase()))
  })
  take(/-filetype:(\w+)/gi, (m) => f.exclude.add(m[1].toLowerCase()))
  take(/filetype:(\w+)/gi, (m) => {
    f.include = f.include ?? new Set()
    f.include.add(m[1].toLowerCase())
  })
  take(/IsDocument:true/gi, () => (f.folders = false))
  take(/IsContainer:true/gi, () => (f.folders = true))
  take(/LastModifiedTime(>=|>|<=|<)(\S+)/gi, (m) => {
    const t = Date.parse(m[2])
    if (Number.isNaN(t)) return
    if (m[1].startsWith(">")) f.after = t
    else f.before = t
  })
  f.terms = q
    .replace(/[()"]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(AND|OR|NOT)$/.test(w) && !w.includes(":"))
    .map((w) => fold(w.replace(/\*+$/, "").replace(/^[+-]/, "")))
    .filter((w) => w.length > 0)
  return f
}

function score(node, terms) {
  if (!terms.length) return 1
  const name = fold(node.name)
  const where = fold(locationLabel(node))
  const body = fold(textOf(node))
  let total = 0
  for (const t of terms) {
    const s = (name.includes(t) ? 6 : 0) + (where.includes(t) ? 2 : 0) + (body.includes(t) ? 1 : 0)
    if (!s) return 0
    total += s
  }
  return total
}

function summaryFor(node, terms) {
  const text = textOf(node) || node.name
  const folded = fold(text)
  const t = terms.find((x) => folded.includes(x))
  if (!t) return `${text.slice(0, 160)}${text.length > 160 ? "<ddd/>" : ""}`
  const at = folded.indexOf(t)
  const start = Math.max(0, at - 60)
  const end = Math.min(text.length, at + t.length + 100)
  const esc = (s) => s.replace(/</g, " ").replace(/>/g, " ")
  return `${start > 0 ? "<ddd/>" : ""}${esc(text.slice(start, at))}<c0>${esc(text.slice(at, at + t.length))}</c0>${esc(text.slice(at + t.length, end))}${end < text.length ? "<ddd/>" : ""}`
}

function searchDriveItems(req, now) {
  const qs = req.query?.queryString ?? ""
  const full = req.query?.queryTemplate ? req.query.queryTemplate.replace("{searchTerms}", qs) : qs
  const f = parseKql(full)
  const all = [...ITEMS.values()].filter((n) => !n.isRoot)
  const scored = []
  for (const n of all) {
    if (f.folders === true && n.kind !== "folder") continue
    if (f.folders === false && n.kind !== "file") continue
    if (n.kind === "file") {
      if (f.include && !f.include.has(n.ext)) continue
      if (f.exclude.has(n.ext)) continue
    }
    if (f.paths.length) {
      const url = fold(decodeUrl(itemWebUrl(n)))
      if (!f.paths.every((p) => url === p || url.startsWith(`${p}/`))) continue
    }
    const modified = now - n.d * 86400000
    if (f.after != null && modified < f.after) continue
    if (f.before != null && modified >= f.before) continue
    const editor = personOf(n.by).mail.toLowerCase()
    const author = personOf(n.cby).mail.toLowerCase()
    if (f.mine.length && !f.mine.some((m) => m === editor || m === author)) continue
    if (f.notEditor.length && f.notEditor.includes(editor)) continue
    const s = score(n, f.terms)
    if (!s) continue
    scored.push({ n, s })
  }
  const sp = req.sortProperties?.[0]
  const key = String(sp?.name ?? "").toLowerCase()
  if (key === "lastmodifieddatetime" || key === "lastmodifiedtime")
    scored.sort((a, b) => (a.n.d - b.n.d) * (sp.isDescending === false ? -1 : 1))
  else if (key === "name")
    scored.sort((a, b) => a.n.name.localeCompare(b.n.name, "tr") * (sp.isDescending ? -1 : 1))
  else if (key === "size")
    scored.sort(
      (a, b) => ((b.n.size ?? 0) - (a.n.size ?? 0)) * (sp.isDescending === false ? -1 : 1),
    )
  else scored.sort((a, b) => b.s - a.s || a.n.d - b.n.d)

  const from = Math.max(0, Number(req.from) || 0)
  const size = Math.max(1, Math.min(Number(req.size) || 25, 500))
  const page = scored.slice(from, from + size)
  const container = {
    hits: page.map(({ n }, i) => ({
      hitId: n.id,
      rank: from + i + 1,
      summary: summaryFor(n, f.terms),
      resource: { "@odata.type": "#microsoft.graph.driveItem", ...itemJson(n, { now }) },
    })),
    total: scored.length,
    moreResultsAvailable: from + size < scored.length,
  }
  if (Array.isArray(req.aggregations) && req.aggregations.some((a) => /filetype/i.test(a.field))) {
    const counts = new Map()
    for (const { n } of scored)
      if (n.kind === "file") counts.set(n.ext, (counts.get(n.ext) ?? 0) + 1)
    container.aggregations = [
      {
        field: "FileType",
        buckets: [...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([k, count]) => ({
            key: k,
            count,
            aggregationFilterToken: `"ǂǂ${[...k].map((c) => c.charCodeAt(0).toString(16)).join("")}"`,
          })),
      },
    ]
  }
  return container
}

function searchSites(req) {
  const f = parseKql(req.query?.queryString ?? "")
  const hits = SITES.filter((s) =>
    f.terms.every((t) => fold(`${s.displayName} ${s.description}`).includes(t)),
  )
  return {
    hits: hits.map((s, i) => ({
      hitId: s.id,
      rank: i + 1,
      summary: s.description,
      resource: { "@odata.type": "#microsoft.graph.site", ...siteJson(s) },
    })),
    total: hits.length,
    moreResultsAvailable: false,
  }
}

function searchDrives(req) {
  const f = parseKql(req.query?.queryString ?? "")
  const hits = DRIVES.filter(
    (d) =>
      d.site &&
      f.terms.every((t) => fold(`${d.name} ${siteByKey(d.site)?.displayName}`).includes(t)),
  )
  return {
    hits: hits.map((d, i) => ({
      hitId: d.id,
      rank: i + 1,
      summary: "",
      resource: { "@odata.type": "#microsoft.graph.drive", ...driveJson(d) },
    })),
    total: hits.length,
    moreResultsAvailable: false,
  }
}

graph("POST", "/search/query", ({ body }) => {
  const now = Date.now()
  const requests = Array.isArray(body?.requests) ? body.requests : []
  return {
    value: requests.map((req) => {
      const types = (req.entityTypes ?? []).map((t) => String(t).toLowerCase())
      const container = types.includes("driveitem")
        ? searchDriveItems(req, now)
        : types.includes("site")
          ? searchSites(req)
          : types.includes("drive")
            ? searchDrives(req)
            : // message · event · listItem · list · chatMessage · person: bu demoda
              // arama dizini yalnız dosya ve siteleri tanıyor — boş ama doğru biçimde.
              { hits: [], total: 0, moreResultsAvailable: false }
      return {
        searchTerms: parseKql(req.query?.queryString ?? "").terms,
        hitsContainers: [container],
      }
    }),
  }
})

/** Sitenin listeleri (nadiren soruluyor) — boş değil, kitaplıklar. */
graph("GET", /^\/sites\/([^/]+)\/lists$/, ({ match }) => {
  const site = match[1] === "root" ? siteByKey("root") : siteById(match[1])
  if (!site) return notFound("Site not found")
  return {
    value: drivesOfSite(site.key).map((d) => ({
      id: d.id.replace(/[^A-Za-z0-9]/g, ""),
      name: d.name,
      displayName: d.name,
      webUrl: driveWebUrl(d),
      list: { template: "documentLibrary" },
    })),
  }
})
