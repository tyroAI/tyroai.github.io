// Graph takvim uçları: calendarView (kendi ve paylaşılan takvimler), etkinlikler,
// davet yanıtları, odak bloğu oluşturma ve Teams toplantı özetleri (Copilot
// "Meeting AI Insights"). Veri `data/calendar-*`ta; burası Graph'ın biçimi.
//
// Katılma linkleri `https://meet.vegaglobal.example/j/…` — `.example` hiçbir
// zaman çözümlenmez. Teams adresi (`teams.microsoft.com/l/meetup-join/…`)
// BİLİNÇLİ olarak kullanılmadı: uygulama o adresi `msteams:` şemasıyla Teams
// masaüstünü açmaya çalışıyor ve sohbet bağlantısını gerçek Teams'e kuruyor.
// `.example` adresinde "Katıl" düğmesi görünür kalır, tıklama zararsızdır.
import { graph, notFound, reply } from "../router"
import { DEMO_DOMAIN, ME, findPerson } from "../persona"
import {
  MIN,
  addDays,
  allDayDate,
  compactKey,
  graphDate,
  hash,
  preferredZone,
  seeded,
  startOfDay,
  zonedToMs,
} from "../data/calendar-time"
import {
  eventId,
  joinUrlOf,
  parseEventId,
  parseJoinKey,
  planFor,
  seriesMasterId,
  seriesOccurrences,
  spanOf,
} from "../data/calendar-schedule"
import { insightBody } from "../data/calendar-insights"

/* ─── Oturum durumu (bellekte) ────────────────────────────────────────── */

/** Davet yanıtları: etkinlik ya da seri kimliği → yanıt. */
const overrides = new Map()
/** Bu oturumda oluşturulan etkinlikler (odak blokları). */
const created = []
/** Silinen şablon etkinlikleri. */
const deleted = new Set()
let createdSeq = 0

const RESPONSE = {
  accept: "accepted",
  decline: "declined",
  tentativelyAccept: "tentativelyAccepted",
}
const GRAPH = "https://graph.microsoft.com/v1.0"

/* ─── Yardımcılar ─────────────────────────────────────────────────────── */

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
const iso = (ms) => new Date(ms).toISOString()
const NEVER = "0001-01-01T00:00:00Z"

function myResponse(t, day) {
  if (t.organizer?.id === ME.id) return "organizer"
  const id = eventId(ME.id, day, t.slug)
  const sm = t.series ? seriesMasterId(ME.id, t.series) : null
  return overrides.get(id) ?? (sm ? overrides.get(sm) : undefined) ?? t.response ?? "accepted"
}

function attendeesOf(t, day) {
  const rnd = seeded(`att-${t.slug}-${compactKey(day)}`)
  return (t.attendees ?? []).map((p) => {
    let response
    if (p.id === ME.id) response = myResponse(t, day)
    else {
      const r = rnd()
      response = p.external
        ? r < 0.65
          ? "accepted"
          : "none"
        : r < 0.8
          ? "accepted"
          : r < 0.92
            ? "tentativelyAccepted"
            : "none"
    }
    return {
      type: "required",
      status: {
        response,
        time: response === "none" ? NEVER : iso(startOfDay(day).getTime() - 2 * 86_400_000),
      },
      emailAddress: { name: p.displayName, address: p.mail },
    }
  })
}

function teamsBlock(joinUrl, seed) {
  const rnd = seeded(seed)
  const id = Array.from({ length: 4 }, () => String(Math.floor(rnd() * 900) + 100)).join(" ")
  return (
    `<div><hr><p><b>Microsoft Teams</b> toplantısı</p>` +
    `<p><a href="${esc(joinUrl)}">Toplantıya katılmak için buraya tıklayın</a></p>` +
    `<p>Toplantı kimliği: ${id}<br>Parola: Vg${Math.floor(rnd() * 9000) + 1000}</p></div>`
  )
}

function htmlBody(text, joinUrl, seed) {
  return (
    `<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body>` +
    (text ? `<div>${esc(text)}</div>` : "") +
    (joinUrl ? teamsBlock(joinUrl, seed) : "") +
    `</body></html>`
  )
}

function locationOf(displayName) {
  return {
    displayName,
    locationType: "default",
    uniqueId: displayName || undefined,
    uniqueIdType: displayName ? "private" : "unknown",
  }
}

/** Şablon + gün → Graph etkinliği. `ownerId` takvimin sahibi. */
function materialize(t, day, ownerId, zone) {
  const id = eventId(ownerId, day, t.slug)
  const { start, end } = spanOf(t, day)
  const joinUrl = joinUrlOf(t, day, ownerId)
  const attendees = attendeesOf(t, day)
  const isOrganizer = t.organizer?.id === ownerId
  let response
  if (ownerId === ME.id) response = myResponse(t, day)
  else if (isOrganizer) response = "organizer"
  else {
    const owner = findPerson(ownerId)
    response =
      attendees.find((a) => a.emailAddress.address === owner?.mail)?.status.response ?? "accepted"
    if (response === "none") response = "accepted"
  }
  const created0 = start - 9 * 86_400_000 - (hash(id) % 600) * MIN
  return {
    "@odata.etag": `W/"${hash(`${id}|${response}`).toString(36)}"`,
    id,
    createdDateTime: iso(created0),
    lastModifiedDateTime: iso(created0 + 3 * 3_600_000),
    changeKey: hash(id).toString(36),
    categories: t.categories ?? [],
    transactionId: null,
    originalStartTimeZone: "Turkey Standard Time",
    originalEndTimeZone: "Turkey Standard Time",
    iCalUId: `040000008200E00074C5B7101A82E0080000000${hash(`ical-${t.series ?? id}`).toString(16)}`,
    reminderMinutesBeforeStart: t.allDay ? 1080 : 15,
    isReminderOn: Boolean(t.isReminderOn),
    hasAttachments: false,
    subject: t.subject,
    bodyPreview: String(t.body ?? "").slice(0, 255),
    importance: "normal",
    sensitivity: t.sensitivity ?? "normal",
    isAllDay: Boolean(t.allDay),
    isCancelled: false,
    isOrganizer,
    responseRequested: true,
    seriesMasterId: t.series ? seriesMasterId(ownerId, t.series) : null,
    showAs: t.showAs ?? "busy",
    type: t.series ? "occurrence" : "singleInstance",
    webLink: `https://outlook.${DEMO_DOMAIN}/calendar/item/${encodeURIComponent(id)}`,
    onlineMeetingUrl: null,
    isOnlineMeeting: Boolean(joinUrl),
    onlineMeetingProvider: joinUrl ? "teamsForBusiness" : "unknown",
    allowNewTimeProposals: true,
    isDraft: false,
    hideAttendees: false,
    responseStatus: {
      response,
      time: response === "organizer" || response === "notResponded" ? NEVER : iso(created0),
    },
    body: { contentType: "html", content: htmlBody(t.body, joinUrl, id) },
    start: t.allDay ? allDayDate(day, zone) : graphDate(start, zone),
    end: t.allDay ? allDayDate(addDays(day, t.days ?? 1), zone) : graphDate(end, zone),
    location: locationOf(t.location ?? ""),
    locations: t.location ? [locationOf(t.location)] : [],
    recurrence: null,
    attendees,
    organizer: {
      emailAddress: {
        name: t.organizer?.displayName ?? ME.displayName,
        address: t.organizer?.mail ?? ME.mail,
      },
    },
    onlineMeeting: joinUrl ? { joinUrl } : null,
  }
}

function materializeCreated(c, zone) {
  return {
    "@odata.etag": `W/"${hash(c.id + c.modified).toString(36)}"`,
    id: c.id,
    createdDateTime: iso(c.createdAt),
    lastModifiedDateTime: iso(c.modified),
    categories: [],
    reminderMinutesBeforeStart: 15,
    isReminderOn: c.isReminderOn,
    hasAttachments: false,
    subject: c.subject,
    bodyPreview: c.body.slice(0, 255),
    importance: "normal",
    sensitivity: c.sensitivity,
    isAllDay: false,
    isCancelled: false,
    isOrganizer: true,
    responseRequested: true,
    seriesMasterId: null,
    showAs: c.showAs,
    type: "singleInstance",
    webLink: `https://outlook.${DEMO_DOMAIN}/calendar/item/${encodeURIComponent(c.id)}`,
    onlineMeetingUrl: null,
    isOnlineMeeting: false,
    onlineMeetingProvider: "unknown",
    responseStatus: { response: "organizer", time: NEVER },
    body: { contentType: "html", content: htmlBody(c.body, null, c.id) },
    start: graphDate(c.start, zone),
    end: graphDate(c.end, zone),
    location: locationOf(c.location),
    locations: c.location ? [locationOf(c.location)] : [],
    recurrence: null,
    attendees: [],
    organizer: { emailAddress: { name: ME.displayName, address: ME.mail } },
    onlineMeeting: null,
  }
}

/** `$select` izdüşümü — Graph her zaman `id` ve etag'i de döndürür. */
function project(ev, select) {
  if (!select) return ev
  const keys = select
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  const out = { "@odata.etag": ev["@odata.etag"], id: ev.id }
  for (const k of keys) if (k in ev) out[k] = ev[k]
  return out
}

/** Pencere ile kesişen etkinlikler: `{ t, day, start, end }` ya da oluşturulmuşlar. */
function occurrences(ownerId, fromMs, toMs, now) {
  const out = []
  const first = addDays(startOfDay(new Date(fromMs)), -3)
  const last = startOfDay(new Date(toMs))
  let day = first
  for (let i = 0; day <= last && i < 400; i += 1) {
    for (const t of planFor(ownerId, day, now)) {
      const span = spanOf(t, day)
      if (!(span.start < toMs && span.end > fromMs)) continue
      if (ownerId === ME.id) {
        if (deleted.has(eventId(ME.id, day, t.slug))) continue
        // Reddedilen davet takvimden düşer (Outlook'un varsayılanı).
        if (myResponse(t, day) === "declined") continue
      }
      out.push({ t, day, ...span })
    }
    day = addDays(day, 1)
  }
  if (ownerId === ME.id) {
    for (const c of created)
      if (c.start < toMs && c.end > fromMs) out.push({ c, start: c.start, end: c.end })
  }
  return out
}

const render = (o, ownerId, zone) =>
  o.c ? materializeCreated(o.c, zone) : materialize(o.t, o.day, ownerId, zone)

function parseBound(value) {
  const raw = String(value ?? "")
  if (!raw) return NaN
  return Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`)
}

function page(ctx, items, defaultTop = 10) {
  const top = Math.max(1, Math.min(Number(ctx.query.get("$top")) || defaultTop, 1000))
  const skip = Math.max(0, Number(ctx.query.get("$skip")) || 0)
  const slice = items.slice(skip, skip + top)
  let nextLink
  if (skip + top < items.length) {
    const next = new URL(ctx.url.href)
    next.searchParams.set("$skip", String(skip + top))
    nextLink = next.toString()
  }
  return { slice, nextLink }
}

function sortBy(items, orderby) {
  const desc = /desc/i.test(orderby ?? "")
  return items.sort((a, b) => (desc ? b.start - a.start : a.start - b.start) || 0)
}

function calendarView(ctx, ownerId, context) {
  const from = parseBound(ctx.query.get("startDateTime"))
  const to = parseBound(ctx.query.get("endDateTime"))
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return reply(
      {
        error: {
          code: "ErrorInvalidParameter",
          message:
            "This request requires a time window specified by the query string parameters StartDateTime and EndDateTime.",
        },
      },
      { status: 400 },
    )
  }
  const zone = preferredZone(ctx.headers)
  const items = sortBy(occurrences(ownerId, from, to, new Date()), ctx.query.get("$orderby"))
  const { slice, nextLink } = page(ctx, items)
  const select = ctx.query.get("$select")
  return reply(
    {
      "@odata.context": `${GRAPH}/$metadata#${context}`,
      value: slice.map((o) => project(render(o, ownerId, zone), select)),
      ...(nextLink ? { "@odata.nextLink": nextLink } : {}),
    },
    { headers: { "Preference-Applied": `outlook.timezone="${zone}"` } },
  )
}

const denied = () =>
  reply(
    {
      error: {
        code: "ErrorAccessDenied",
        message: "Access is denied. Check credentials and try again.",
      },
    },
    { status: 403 },
  )

/** Kendi takvimimdeki bir etkinlik: `{ t, day }` ya da `{ c }`. */
function findMine(id) {
  const c = created.find((x) => x.id === id)
  if (c) return { c }
  const parsed = parseEventId(id)
  if (!parsed || parsed.ownerId !== ME.id || deleted.has(id)) return null
  const t = planFor(ME.id, parsed.day).find((x) => x.slug === parsed.slug)
  return t ? { t, day: parsed.day } : null
}

/* ─── calendarView ────────────────────────────────────────────────────── */

graph("GET", /^\/me(?:\/calendar)?\/calendarView$/, (ctx) =>
  calendarView(ctx, ME.id, "users('me')/calendarView"),
)

graph("GET", /^\/users\/([^/]+)(?:\/calendar)?\/calendarView$/, (ctx) => {
  const who = findPerson(ctx.match[1])
  // Şirket dışı ya da tanınmayan kişi: takvimi bana açık değil (Graph'ın 403'ü).
  if (!who) return denied()
  return calendarView(ctx, who.id, `users('${who.mail}')/calendarView`)
})

/* ─── Etkinlikler ─────────────────────────────────────────────────────── */

graph("GET", /^\/me(?:\/calendar)?\/events$/, (ctx) => {
  const now = Date.now()
  const zone = preferredZone(ctx.headers)
  const items = sortBy(
    occurrences(ME.id, now - 30 * 86_400_000, now + 14 * 86_400_000, new Date()),
    ctx.query.get("$orderby") ?? "start/dateTime desc",
  )
  const { slice, nextLink } = page(ctx, items)
  const select = ctx.query.get("$select")
  return {
    "@odata.context": `${GRAPH}/$metadata#users('me')/events`,
    value: slice.map((o) => project(render(o, ME.id, zone), select)),
    ...(nextLink ? { "@odata.nextLink": nextLink } : {}),
  }
})

graph("GET", /^\/me(?:\/calendar)?\/events\/([^/]+)$/, (ctx) => {
  const hit = findMine(ctx.match[1])
  if (!hit) return notFound("The specified object was not found in the store.")
  const zone = preferredZone(ctx.headers)
  return project(
    hit.c ? materializeCreated(hit.c, zone) : materialize(hit.t, hit.day, ME.id, zone),
    ctx.query.get("$select"),
  )
})

// Odak bloğu (`lib/focusWindow.js`) ve genel etkinlik oluşturma.
graph("POST", /^\/me(?:\/calendar)?\/events$/, ({ body, headers }) => {
  const start = zonedToMs(body?.start)
  const end = zonedToMs(body?.end)
  if (!body?.subject || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return reply(
      {
        error: {
          code: "ErrorInvalidRequest",
          message: "Your request can't be completed. Check start and end.",
        },
      },
      { status: 400 },
    )
  }
  createdSeq += 1
  const now = Date.now()
  const c = {
    id: `ev.created.${createdSeq}`,
    subject: String(body.subject),
    start,
    end,
    showAs: body.showAs ?? "busy",
    sensitivity: body.sensitivity ?? "normal",
    isReminderOn: body.isReminderOn !== false,
    body: String(body.body?.content ?? ""),
    location: String(body.location?.displayName ?? ""),
    createdAt: now,
    modified: now,
  }
  created.push(c)
  // Prefer başlığı yoksa Graph, oluşturan isteğin bölgesiyle cevaplar.
  const asked = Object.keys(headers ?? {}).some((k) => k.toLowerCase() === "prefer")
  const zone = asked ? preferredZone(headers) : body.start?.timeZone || "UTC"
  return reply(materializeCreated(c, zone), { status: 201 })
})

graph("PATCH", /^\/me(?:\/calendar)?\/events\/([^/]+)$/, ({ match, body, headers }) => {
  const c = created.find((x) => x.id === match[1])
  if (!c) {
    const hit = findMine(match[1])
    if (!hit) return notFound()
    return materialize(hit.t, hit.day, ME.id, preferredZone(headers))
  }
  if (body?.subject) c.subject = String(body.subject)
  if (body?.start) c.start = zonedToMs(body.start)
  if (body?.end) c.end = zonedToMs(body.end)
  if (body?.showAs) c.showAs = body.showAs
  c.modified = Date.now()
  return materializeCreated(c, preferredZone(headers))
})

graph("DELETE", /^\/me(?:\/calendar)?\/events\/([^/]+)$/, ({ match }) => {
  const i = created.findIndex((x) => x.id === match[1])
  if (i >= 0) created.splice(i, 1)
  else if (findMine(match[1])) deleted.add(match[1])
  else return notFound()
  return reply(null, { status: 204 })
})

// Davete yanıt — tek oturum ya da serinin tamamı (`sm.…`).
graph(
  "POST",
  /^\/me(?:\/calendar)?\/events\/([^/]+)\/(accept|decline|tentativelyAccept)$/,
  ({ match }) => {
    const [, id, action] = match
    const isSeries = /^sm\.u-[a-z0-9-]+\.[a-z0-9-]+$/.test(id)
    if (!isSeries && !findMine(id)) return notFound()
    overrides.set(id, RESPONSE[action])
    return reply(null, { status: 202 })
  },
)

/* ─── Teams toplantıları ve Copilot özetleri ──────────────────────────── */

function subjectOfKey(parsed, now) {
  if (parsed.series) return seriesOccurrences(parsed.series, now, 7)[0]?.t.subject ?? ""
  return planFor(ME.id, parsed.day, now).find((t) => t.slug === parsed.slug)?.subject ?? ""
}

graph("GET", "/me/onlineMeetings", (ctx) => {
  const filter = ctx.query.get("$filter") ?? ""
  const m = /joinWebUrl\s+eq\s+'((?:[^']|'')*)'/i.exec(filter)
  const joinUrl = m ? m[1].replace(/''/g, "'") : ""
  const parsed = parseJoinKey(joinUrl)
  if (!parsed || parsed.foreign) return { value: [] }
  const now = new Date()
  const subject = subjectOfKey(parsed, now)
  if (!subject) return { value: [] }
  return {
    "@odata.context": `${GRAPH}/$metadata#users('${ME.id}')/onlineMeetings`,
    value: [
      {
        id: `om.${parsed.key}`,
        subject,
        joinWebUrl: joinUrl,
        joinUrl,
        creationDateTime: iso(now.getTime() - 30 * 86_400_000),
        isBroadcast: false,
        allowedPresenters: "everyone",
        allowMeetingChat: "enabled",
        recordAutomatically: false,
        // Sohbet kimliği YOK: uygulama onunla gerçek Teams'e bağlantı kurardı.
        chatInfo: { messageId: "0", replyChainMessageId: null },
        participants: { organizer: { upn: ME.mail, role: "presenter" } },
      },
    ],
  }
})

/** Toplantının özetli, bitmiş oturumları. */
function summarized(meetingId, now) {
  const parsed = parseJoinKey(`/j/${String(meetingId).replace(/^om\./, "")}`)
  if (!parsed || parsed.foreign) return []
  const ended = (o) => o.t.summary && o.end <= now.getTime()
  if (parsed.series) return seriesOccurrences(parsed.series, now, 21).filter(ended)
  const t = planFor(ME.id, parsed.day, now).find((x) => x.slug === parsed.slug)
  if (!t) return []
  const o = { t, day: parsed.day, ...spanOf(t, parsed.day) }
  return ended(o) ? [o] : []
}

const insightMeta = (o, meetingId) => {
  const tag = hash(`${meetingId}-${compactKey(o.day)}`)
    .toString(16)
    .padStart(8, "0")
  return {
    id: `ins.${compactKey(o.day)}`,
    callId: `${tag}-6b1e-4c2a-9f3d-${tag}${tag.slice(0, 4)}`,
    contentCorrelationId: `${tag.slice(0, 6)}-ccid-${compactKey(o.day)}`,
    createdDateTime: iso(o.end + 9 * MIN),
    endDateTime: iso(o.end),
  }
}

graph("GET", /^\/copilot\/users\/([^/]+)\/onlineMeetings\/([^/]+)\/aiInsights$/, ({ match }) => {
  const list = summarized(match[2], new Date())
  return {
    "@odata.context": `${GRAPH}/$metadata#copilot/users('${match[1]}')/onlineMeetings('${match[2]}')/aiInsights`,
    value: list.map((o) => insightMeta(o, match[2])),
  }
})

graph(
  "GET",
  /^\/copilot\/users\/([^/]+)\/onlineMeetings\/([^/]+)\/aiInsights\/([^/]+)$/,
  ({ match }) => {
    const key = String(match[3]).replace(/^ins\./, "")
    const o = summarized(match[2], new Date()).find((x) => compactKey(x.day) === key)
    if (!o) return notFound()
    const body = insightBody(o.t, o.day, o.start)
    if (!body) return notFound()
    return { ...insightMeta(o, match[2]), ...body }
  },
)
