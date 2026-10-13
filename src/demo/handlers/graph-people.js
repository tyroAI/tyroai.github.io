// Graph — kişiler: profil (`/me`), dizin (`/users`), yönetici ve bağlılar, People API,
// grup üyeliği, Teams durumu ve otomatik yanıtlar. Veri `data/people-directory.js`.
import { graph, notFound, reply } from "../router"
import {
  AUTO_REPLIES,
  CONTACTS,
  DIRECTORY,
  ME_USER,
  lookupUser,
  managerOf,
  presenceOf,
  reportsOf,
  shapeUser,
} from "../data/people-directory"
import { ODataError, compileFilter, parseExpand, searchTerm } from "../data/mail-odata"

const fold = (s) =>
  String(s ?? "")
    .replace(/[İI]/g, "i")
    .replace(/ı/g, "i")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")

const userNotFound = (who) =>
  reply(
    {
      error: {
        code: "Request_ResourceNotFound",
        message: `Resource '${who}' does not exist or one of its queried reference-property objects are not present.`,
      },
    },
    { status: 404 },
  )

const badRequest = (message) =>
  reply({ error: { code: "Request_BadRequest", message } }, { status: 400 })

/** Yönetici zinciri: `$levels=max` (ya da sayı) iç içe `manager.manager…` kurar. */
function managerChain(user, select, levels, depth = 0) {
  const m = managerOf(user)
  if (!m || depth > 10) return null
  const shaped = { "@odata.type": "#microsoft.graph.user", ...shapeUser(m, select) }
  const more = levels === "max" || Number(levels) > 1
  if (more) {
    const up = managerChain(m, select, levels === "max" ? "max" : Number(levels) - 1, depth + 1)
    if (up) shaped.manager = up
  }
  return shaped
}

/** Tek kullanıcı cevabı: `$select` + `$expand` (manager, directReports). */
function userResponse(user, query) {
  const out = { ...shapeUser(user, query.get("$select")) }
  for (const [name, opts] of Object.entries(parseExpand(query.get("$expand")))) {
    if (name === "manager") {
      const chain = managerChain(user, opts.$select, opts.$levels)
      if (chain) out.manager = chain
    } else if (name === "directReports") {
      out.directReports = reportsOf(user).map((u) => ({
        "@odata.type": "#microsoft.graph.user",
        ...shapeUser(u, opts.$select),
      }))
    }
  }
  return out
}

function listResponse(users, query, extra = {}) {
  const select = query.get("$select")
  const top = Number(query.get("$top")) || 100
  const value = users.slice(0, top).map((u) => ({
    "@odata.type": "#microsoft.graph.user",
    ...shapeUser(u, select),
  }))
  const out = { ...extra, value }
  if (query.get("$count") === "true") out["@odata.count"] = users.length
  return out
}

const userOf = (raw) => (raw === "me" ? ME_USER : lookupUser(raw))

// ── Profil ──────────────────────────────────────────────────────────────
graph("GET", "/me", ({ query }) => userResponse(ME_USER, query))

graph("GET", /^\/users\/([^/]+)$/, ({ match, query }) => {
  const user = lookupUser(match[1])
  return user ? userResponse(user, query) : userNotFound(match[1])
})

// ── Yönetici ve bağlılar ────────────────────────────────────────────────
graph("GET", /^\/(me|users\/([^/]+))\/manager$/, ({ match, query }) => {
  const user = userOf(match[2] ?? "me")
  const m = user && managerOf(user)
  if (!m) return userNotFound("manager")
  return { "@odata.type": "#microsoft.graph.user", ...shapeUser(m, query.get("$select")) }
})

graph("GET", /^\/(me|users\/([^/]+))\/directReports$/, ({ match, query }) => {
  const user = userOf(match[2] ?? "me")
  if (!user) return userNotFound(match[2])
  return listResponse(reportsOf(user), query)
})

// ── Dizin araması ───────────────────────────────────────────────────────
graph("GET", "/users", ({ query }) => {
  let users = DIRECTORY
  try {
    const keep = compileFilter(query.get("$filter"))
    users = users.filter(keep)
  } catch (err) {
    if (err instanceof ODataError) return badRequest(err.message)
    throw err
  }
  const search = searchTerm(query.get("$search"))
  if (search?.text) {
    const term = fold(search.text)
    const fields = search.field ? [search.field] : ["displayName", "mail", "jobTitle"]
    users = users.filter((u) =>
      fields.some((f) =>
        fold(u[f])
          .split(/[\s.@-]+/)
          .some((w) => w.startsWith(term)),
      ),
    )
  }
  return listResponse(users, query)
})

// ── Fotoğraflar: demo kişilerinin fotoğrafı yok → uygulama baş harf avatarı çizer ──
graph("GET", /^\/(me|users\/[^/]+)\/photos?(\/[^/]+)?(\/\$value)?$/, () =>
  reply(
    { error: { code: "ImageNotFound", message: "Exception of type 'Microsoft.Fast.Profile.Core.Exception.ImageNotFoundException' was thrown." } },
    { status: 404 },
  ),
)

// ── People API (alıcı önerileri) ────────────────────────────────────────
function personOf(u, external = false) {
  return {
    id: u.id ?? `contact-${u.mail}`,
    displayName: u.displayName,
    givenName: u.givenName ?? u.displayName.split(" ")[0],
    surname: u.surname ?? u.displayName.split(" ").slice(1).join(" "),
    jobTitle: u.jobTitle ?? null,
    companyName: u.companyName ?? null,
    department: u.department ?? null,
    officeLocation: u.officeLocation ?? null,
    userPrincipalName: external ? null : u.userPrincipalName,
    imAddress: external ? null : `sip:${u.mail}`,
    scoredEmailAddresses: [{ address: u.mail, relevanceScore: 8, selectionLikelihood: "notSpecified" }],
    phones: [],
    personType: { class: "Person", subclass: external ? "PersonalContact" : "OrganizationUser" },
  }
}

graph("GET", /^\/(me|users\/[^/]+)\/people$/, ({ query }) => {
  const people = [
    ...DIRECTORY.filter((u) => u.id !== ME_USER.id).map((u) => personOf(u)),
    ...CONTACTS.map((c) => personOf(c, true)),
  ]
  const search = searchTerm(query.get("$search"))
  const term = fold(search?.text ?? "")
  const hits = term
    ? people.filter((p) =>
        [p.displayName, p.scoredEmailAddresses[0].address, p.companyName]
          .map(fold)
          .some((s) => s.split(/[\s.@-]+/).some((w) => w.startsWith(term)) || s.startsWith(term)),
      )
    : people
  const top = Number(query.get("$top")) || 10
  return { value: hits.slice(0, top) }
})

// ── Grup üyeliği: demo kişisi hiçbir yönetici grubunda değil ────────────
graph("POST", /^\/(me|users\/[^/]+)\/(checkMemberGroups|getMemberGroups|checkMemberObjects|getMemberObjects)$/, () => ({
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#Collection(Edm.String)",
  value: [],
}))

// ── Teams durumu ────────────────────────────────────────────────────────
graph("GET", /^\/(me|users\/([^/]+))\/presence$/, ({ match }) => {
  const user = userOf(match[2] ?? "me")
  return user ? presenceOf(user) : notFound("presence")
})

graph("GET", /^\/communications\/presences\/([^/]+)$/, ({ match }) => {
  const user = lookupUser(match[1])
  return user ? presenceOf(user) : notFound("presence")
})

graph("POST", "/communications/getPresencesByUserId", ({ body }) => ({
  value: (body?.ids ?? []).map((id) => lookupUser(id)).filter(Boolean).map(presenceOf),
}))

// ── Posta ipuçları (otomatik yanıt / ofis dışı) ─────────────────────────
graph("POST", /^\/(me|users\/[^/]+)\/getMailTips$/, ({ body }) => ({
  value: (body?.EmailAddresses ?? body?.emailAddresses ?? []).map((address) => {
    const user = lookupUser(address)
    const message = user ? (AUTO_REPLIES[user.id] ?? "") : ""
    return {
      emailAddress: { name: user?.displayName ?? "", address },
      automaticReplies: message ? { message, messageLanguage: { locale: "tr-TR", displayName: "Türkçe" } } : { message: "" },
    }
  }),
}))
