// Posta kutusunun bellekteki hâli: tanımlardan (gelen kutusu, gönderilmiş öğeler,
// Keşfet gönderileri) Graph `message` nesneleri kurulur. Tarihler her istekte `now`a
// göre yeniden hesaplanır; kullanıcının yaptığı değişiklikler (okundu, bayrak) ve
// demo içinde gönderdiği postalar bu sekme boyunca bir üst katmanda tutulur.
import { ME } from "../persona"
import { at, previewOf } from "./mail-compose"
import { feedSpecs } from "./mail-feed"
import { inboxSpecs } from "./mail-inbox"

export const FOLDERS = [
  { id: "fld-inbox", name: "inbox", displayName: "Gelen Kutusu", parentFolderId: "fld-root" },
  { id: "fld-duyurular", name: "duyurular", displayName: "Şirket Duyuruları", parentFolderId: "fld-inbox" },
  { id: "fld-sent", name: "sentitems", displayName: "Gönderilmiş Öğeler", parentFolderId: "fld-root" },
  { id: "fld-drafts", name: "drafts", displayName: "Taslaklar", parentFolderId: "fld-root" },
  { id: "fld-deleted", name: "deleteditems", displayName: "Silinmiş Öğeler", parentFolderId: "fld-root" },
  { id: "fld-junk", name: "junkemail", displayName: "Gereksiz E-posta", parentFolderId: "fld-root" },
  { id: "fld-archive", name: "archive", displayName: "Arşiv", parentFolderId: "fld-root" },
  { id: "fld-outbox", name: "outbox", displayName: "Giden Kutusu", parentFolderId: "fld-root" },
]

export function findFolder(idOrName) {
  const key = String(idOrName ?? "").toLowerCase()
  return FOLDERS.find((f) => f.id.toLowerCase() === key || f.name === key) ?? null
}

const addr = (p) => ({ emailAddress: { name: p.displayName ?? p.contact ?? p.mail, address: p.mail } })

const OUTLOOK = "https://outlook.midea.com/owa/"

/** Kullanıcının değişiklikleri: kimlik → { isRead, flag, … } */
const overlay = new Map()
/** Demo içinde gönderilen postalar (tam nesne). */
const sent = []

function build(spec, now) {
  const id = `AAMkADvega-${spec.key}`
  const when = at(now, ...spec.when)
  const iso = when.toISOString().replace(/\.\d{3}Z$/, "Z")
  const atts = (spec.attachments ?? []).map((a, i) => ({ ...a, id: `${spec.key}-att${i + 1}` }))
  const folder = findFolder(spec.folder)
  const message = {
    "@odata.etag": `W/"CQAAABYAAAD${spec.key}"`,
    id,
    createdDateTime: iso,
    lastModifiedDateTime: iso,
    changeKey: `CQAAABYAAAD${spec.key}`,
    categories: [],
    receivedDateTime: iso,
    sentDateTime: iso,
    hasAttachments: atts.some((a) => !a.inline),
    internetMessageId: `<${spec.key}.${when.getTime().toString(36)}@midea.com>`,
    subject: spec.subject,
    bodyPreview: previewOf(spec.html),
    importance: spec.importance ?? "normal",
    parentFolderId: folder?.id ?? "fld-inbox",
    conversationId: `AAQkADvega-conv-${spec.key}`,
    isDeliveryReceiptRequested: false,
    isReadReceiptRequested: false,
    isRead: Boolean(spec.isRead),
    isDraft: false,
    webLink: `${OUTLOOK}?ItemID=${encodeURIComponent(id)}&exvsurl=1&viewmodel=ReadMessageItem`,
    inferenceClassification: "focused",
    body: { contentType: "html", content: spec.html },
    sender: addr(spec.from),
    from: addr(spec.from),
    toRecipients: (spec.to ?? []).filter(Boolean).map(addr),
    ccRecipients: (spec.cc ?? []).filter(Boolean).map(addr),
    bccRecipients: [],
    replyTo: [],
    flag: { flagStatus: spec.flag ?? "notFlagged" },
    // Outlook'un "sabitle"si: PR_RENEW_TIME (0x0F02) = 4500-09-01 (lib/feed.js).
    singleValueExtendedProperties: spec.pinned
      ? [{ id: "SystemTime 0xf02", value: "4500-09-01T00:00:00Z" }]
      : [],
    __attachments: atts,
  }
  return { ...message, ...(overlay.get(id) ?? {}) }
}

/** Posta kutusunun tamamı (en yeni önce). */
export function allMessages(now = new Date()) {
  const list = [...inboxSpecs(now), ...feedSpecs(now)].map((s) => build(s, now))
  return [...sent, ...list].sort((a, b) => b.receivedDateTime.localeCompare(a.receivedDateTime))
}

export function findMessage(id, now = new Date()) {
  return allMessages(now).find((m) => m.id === id) ?? null
}

export function patchMessage(id, changes) {
  const allowed = {}
  if (typeof changes?.isRead === "boolean") allowed.isRead = changes.isRead
  if (changes?.flag?.flagStatus) allowed.flag = { flagStatus: changes.flag.flagStatus }
  if (Array.isArray(changes?.categories)) allowed.categories = changes.categories
  if (changes?.importance) allowed.importance = changes.importance
  const own = sent.find((m) => m.id === id)
  if (own) Object.assign(own, allowed)
  else overlay.set(id, { ...(overlay.get(id) ?? {}), ...allowed })
}

let seq = 0

/** `sendMail` ve `forward`: gönderilmiş öğelere eklenir (alıcı önerileri de görür). */
export function recordSent({ subject, html, to = [], cc = [] }) {
  seq += 1
  const now = new Date()
  const iso = now.toISOString().replace(/\.\d{3}Z$/, "Z")
  const id = `AAMkADvega-sent-local-${seq}`
  sent.unshift({
    "@odata.etag": `W/"local${seq}"`,
    id,
    createdDateTime: iso,
    lastModifiedDateTime: iso,
    categories: [],
    receivedDateTime: iso,
    sentDateTime: iso,
    hasAttachments: false,
    internetMessageId: `<local-${seq}.${now.getTime().toString(36)}@midea.com>`,
    subject: subject ?? "",
    bodyPreview: previewOf(html),
    importance: "normal",
    parentFolderId: "fld-sent",
    conversationId: `AAQkADvega-conv-local-${seq}`,
    isRead: true,
    isDraft: false,
    webLink: `${OUTLOOK}?ItemID=${encodeURIComponent(id)}`,
    body: { contentType: "html", content: html ?? "" },
    sender: addr(ME),
    from: addr(ME),
    toRecipients: to,
    ccRecipients: cc,
    bccRecipients: [],
    replyTo: [],
    flag: { flagStatus: "notFlagged" },
    singleValueExtendedProperties: [],
    __attachments: [],
  })
  return id
}
