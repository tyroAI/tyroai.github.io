// Graph — posta: klasörler, ileti listeleri (süzgeç · sıralama · sayfalama · sayım),
// tek ileti ve gövdesi, ekler ve baytları, gönderme ve iletme. Veri `data/mail-*.js`.
import { accepted, graph, reply } from "../router"
import { attachmentBytes, toBase64 } from "../data/mail-media"
import {
  ODataError,
  compileFilter,
  compileOrderBy,
  parseExpand,
  searchTerm,
  selectList,
} from "../data/mail-odata"
import { textOf } from "../data/mail-compose"
import { FOLDERS, allMessages, findFolder, findMessage, patchMessage, recordSent } from "../data/mail-store"

const badRequest = (message) =>
  reply({ error: { code: "BadRequest", message } }, { status: 400 })

const itemNotFound = () =>
  reply(
    { error: { code: "ErrorItemNotFound", message: "The specified object was not found in the store." } },
    { status: 404 },
  )

/** `Prefer: outlook.body-content-type="text"` istenmiş mi (başlık adı büyük/küçük harfsiz). */
function wantsText(headers) {
  const prefer = Object.entries(headers ?? {}).find(([k]) => k.toLowerCase() === "prefer")?.[1] ?? ""
  return /body-content-type\s*=\s*"?text/i.test(prefer)
}

/** İç alanları atar, `$select` ve `$expand=singleValueExtendedProperties(...)` uygular. */
function shapeMessage(m, query, headers) {
  const select = selectList(query.get("$select"))
  const expand = parseExpand(query.get("$expand"))
  const out = {}
  const keys = select ?? Object.keys(m).filter((k) => !k.startsWith("__") && k !== "singleValueExtendedProperties")
  out["@odata.etag"] = m["@odata.etag"]
  out.id = m.id
  for (const k of keys) {
    if (k.startsWith("__") || k === "singleValueExtendedProperties") continue
    out[k] = m[k] === undefined ? null : m[k]
  }
  if (out.body && wantsText(headers)) out.body = { contentType: "text", content: textOf(m.body.content) }
  const ext = expand.singleValueExtendedProperties
  if (ext) {
    let props = m.singleValueExtendedProperties ?? []
    if (ext.$filter) {
      try {
        props = props.filter(compileFilter(ext.$filter))
      } catch {
        /* çözülemeyen iç süzgeç: hepsi */
      }
    }
    if (props.length) out.singleValueExtendedProperties = props
  }
  return out
}

/** İleti koleksiyonu: süzgeç → arama → sıralama → sayım → sayfa. */
function listMessages(ctx, source) {
  const { query } = ctx
  let list = source
  try {
    list = list.filter(compileFilter(query.get("$filter")))
  } catch (err) {
    if (err instanceof ODataError) {
      if (import.meta.env.DEV) console.warn(`[demo] posta süzgeci çözülemedi: ${query.get("$filter")}`)
      return badRequest(`Invalid filter clause: ${err.message}`)
    }
    throw err
  }
  const search = searchTerm(query.get("$search"))
  if (search?.text) {
    const term = search.text.toLocaleLowerCase("tr")
    list = list.filter((m) =>
      [m.subject, m.bodyPreview, m.from?.emailAddress?.name, m.from?.emailAddress?.address]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(term),
    )
  }
  const order = compileOrderBy(query.get("$orderby") || "receivedDateTime desc")
  list = [...list].sort(order)
  const total = list.length
  const top = Math.max(1, Number(query.get("$top")) || 10)
  const skip = Math.max(0, Number(query.get("$skip")) || 0)
  const page = list.slice(skip, skip + top)
  const out = {
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users('demo')/messages",
  }
  if (query.get("$count") === "true") out["@odata.count"] = total
  out.value = page.map((m) => shapeMessage(m, query, ctx.headers))
  if (skip + top < total) {
    const next = new URL(ctx.url)
    next.searchParams.set("$skip", String(skip + top))
    out["@odata.nextLink"] = next.toString()
  }
  return out
}

function folderJson(f, messages) {
  const inFolder = messages.filter((m) => m.parentFolderId === f.id)
  return {
    id: f.id,
    displayName: f.displayName,
    parentFolderId: f.parentFolderId,
    childFolderCount: FOLDERS.filter((x) => x.parentFolderId === f.id).length,
    unreadItemCount: inFolder.filter((m) => !m.isRead).length,
    totalItemCount: inFolder.length,
    sizeInBytes: inFolder.length * 48_000,
    isHidden: false,
  }
}

function pick(obj, query) {
  const select = selectList(query.get("$select"))
  if (!select) return obj
  const out = { id: obj.id }
  for (const k of select) out[k] = obj[k] ?? null
  return out
}

// ── Klasörler ───────────────────────────────────────────────────────────
graph("GET", "/me/mailFolders", ({ query }) => {
  const messages = allMessages()
  return {
    value: FOLDERS.filter((f) => f.parentFolderId === "fld-root").map((f) => pick(folderJson(f, messages), query)),
  }
})

graph("GET", /^\/me\/mailFolders\/([^/]+)\/childFolders$/, ({ match, query }) => {
  const f = findFolder(match[1])
  if (!f) return itemNotFound()
  const messages = allMessages()
  return { value: FOLDERS.filter((x) => x.parentFolderId === f.id).map((x) => pick(folderJson(x, messages), query)) }
})

graph("GET", /^\/me\/mailFolders\/([^/]+)$/, ({ match, query }) => {
  const f = findFolder(match[1])
  return f ? pick(folderJson(f, allMessages()), query) : itemNotFound()
})

graph("GET", /^\/me\/mailFolders\/([^/]+)\/messages$/, (ctx) => {
  const f = findFolder(ctx.match[1])
  if (!f) return itemNotFound()
  return listMessages(
    ctx,
    allMessages().filter((m) => m.parentFolderId === f.id),
  )
})

// ── İleti listesi (bütün klasörler) ─────────────────────────────────────
graph("GET", "/me/messages", (ctx) => listMessages(ctx, allMessages()))

// ── Tek ileti ───────────────────────────────────────────────────────────
graph("GET", /^\/me\/(?:mailFolders\/[^/]+\/)?messages\/([^/]+)$/, ({ match, query, headers }) => {
  const m = findMessage(match[1])
  return m ? shapeMessage(m, query, headers) : itemNotFound()
})

graph("PATCH", /^\/me\/(?:mailFolders\/[^/]+\/)?messages\/([^/]+)$/, ({ match, body, query, headers }) => {
  if (!findMessage(match[1])) return itemNotFound()
  patchMessage(match[1], body ?? {})
  return shapeMessage(findMessage(match[1]), query, headers)
})

// ── Ekler ───────────────────────────────────────────────────────────────
async function attachmentJson(m, att, withBytes) {
  const { bytes, contentType } = await attachmentBytes(`${m.id}/${att.id}`, att)
  const out = {
    "@odata.type": "#microsoft.graph.fileAttachment",
    "@odata.mediaContentType": contentType,
    id: att.id,
    lastModifiedDateTime: m.receivedDateTime,
    name: att.name,
    contentType,
    size: bytes.length,
    isInline: Boolean(att.inline),
    contentId: att.cid ?? null,
    contentLocation: null,
  }
  if (withBytes) out.contentBytes = toBase64(bytes)
  return out
}

graph("GET", /^\/me\/messages\/([^/]+)\/attachments$/, async ({ match }) => {
  const m = findMessage(match[1])
  if (!m) return itemNotFound()
  return { value: await Promise.all(m.__attachments.map((a) => attachmentJson(m, a, false))) }
})

graph("GET", /^\/me\/messages\/([^/]+)\/attachments\/([^/]+)$/, async ({ match }) => {
  const m = findMessage(match[1])
  const att = m?.__attachments.find((a) => a.id === match[2])
  return att ? attachmentJson(m, att, true) : itemNotFound()
})

graph("GET", /^\/me\/messages\/([^/]+)\/attachments\/([^/]+)\/\$value$/, async ({ match }) => {
  const m = findMessage(match[1])
  const att = m?.__attachments.find((a) => a.id === match[2])
  if (!att) return itemNotFound()
  const { bytes, contentType } = await attachmentBytes(`${m.id}/${att.id}`, att)
  return new Blob([bytes], { type: contentType })
})

// ── Gönderme, iletme, yanıtlama ─────────────────────────────────────────
graph("POST", /^\/(me|users\/[^/]+)\/sendMail$/, ({ body }) => {
  const msg = body?.message
  if (!msg?.toRecipients?.length) {
    return reply(
      { error: { code: "ErrorInvalidRecipients", message: "At least one recipient is not valid." } },
      { status: 400 },
    )
  }
  if (body?.saveToSentItems !== false) {
    recordSent({
      subject: msg.subject,
      html: msg.body?.content ?? "",
      to: msg.toRecipients,
      cc: msg.ccRecipients ?? [],
    })
  }
  return accepted()
})

graph("POST", /^\/me\/messages\/([^/]+)\/(forward|reply|replyAll)$/, ({ match, body }) => {
  const m = findMessage(match[1])
  if (!m) return itemNotFound()
  const prefix = match[2] === "forward" ? "İLT" : "YNT"
  recordSent({
    subject: `${prefix}: ${m.subject}`,
    html: `<p>${String(body?.comment ?? "").replace(/</g, "&lt;")}</p>${m.body.content}`,
    to: body?.toRecipients ?? (match[2] === "forward" ? [] : [m.from]),
  })
  return accepted()
})

