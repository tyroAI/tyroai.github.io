// Asistanın "araçları": kişiye özel veriyi uygulamanın ekranlarıyla AYNI demo
// uçlarından okur (takvim, posta, To Do, İK self servis). Böylece sohbette
// söylenen toplantı ya da izin bakiyesi, Anasayfa ve Self Servis'te görünenle
// birebir aynıdır. Uç cevap vermezse (404, boş) senaryo kendi yedeğine düşer.
import { dispatch } from "@/demo/router"
import { parseGraphDateTime } from "@/lib/graph"
import { dayFrom } from "./util"

const GRAPH = "https://graph.microsoft.com/v1.0"
const TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul"
  } catch {
    return "Europe/Istanbul"
  }
})()

async function graphJson(path) {
  try {
    const res = await dispatch({
      url: new URL(`${GRAPH}${path}`),
      method: "GET",
      body: null,
      headers: { Prefer: `outlook.timezone="${TZ}"` },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const nameOf = (r) => r?.emailAddress?.name || r?.emailAddress?.address || ""

/** Bir günün toplantıları (`offset` gün sonrası), saat sırasıyla; okunamazsa `null`. */
export async function eventsOn(offset = 0, days = 1) {
  const from = dayFrom(offset)
  const to = dayFrom(offset + days)
  const params = new URLSearchParams({
    startDateTime: from.toISOString(),
    endDateTime: to.toISOString(),
    $orderby: "start/dateTime",
    $top: "50",
  })
  const data = await graphJson(`/me/calendarView?${params.toString()}`)
  if (!data || !Array.isArray(data.value)) return null
  return data.value
    .filter((e) => !e.isCancelled)
    .map((e) => ({
      subject: e.subject || "",
      start: parseGraphDateTime(e.start),
      end: parseGraphDateTime(e.end),
      allDay: !!e.isAllDay,
      organizer: nameOf(e.organizer),
      attendees: (e.attendees ?? []).map(nameOf).filter(Boolean),
      location: e.location?.displayName || "",
      online: !!(e.isOnlineMeeting || e.onlineMeeting?.joinUrl),
    }))
    .filter((e) => e.start)
    .sort((a, b) => a.start - b.start)
}

/** Gelen kutusundaki okunmamışlar (en yeni önce); okunamazsa `null`. */
export async function unreadMail(top = 30) {
  const params = new URLSearchParams({
    $select: "id,subject,from,receivedDateTime,isRead,bodyPreview,importance,hasAttachments",
    $orderby: "receivedDateTime desc",
    $top: String(top),
  })
  const data = await graphJson(`/me/mailFolders/inbox/messages?${params.toString()}`)
  if (!data || !Array.isArray(data.value)) return null
  return data.value
    .filter((m) => m.isRead === false)
    .map((m) => ({
      from: nameOf(m.from),
      subject: m.subject || "",
      preview: (m.bodyPreview || "").replace(/\s+/g, " ").trim(),
      received: m.receivedDateTime ? new Date(m.receivedDateTime) : null,
      important: m.importance === "high",
      attachments: !!m.hasAttachments,
    }))
}

/** Açık To Do görevleri, son tarihi yakın olan önce; okunamazsa `null`. */
export async function openTasks() {
  const lists = await graphJson("/me/todo/lists")
  if (!lists || !Array.isArray(lists.value)) return null
  const out = []
  for (const list of lists.value.slice(0, 6)) {
    const data = await graphJson(`/me/todo/lists/${encodeURIComponent(list.id)}/tasks?$top=50`)
    for (const t of data?.value ?? []) {
      if (t.status === "completed") continue
      out.push({
        title: t.title || "",
        due: t.dueDateTime ? parseGraphDateTime(t.dueDateTime) : null,
        important: t.importance === "high",
        list: list.displayName || "",
      })
    }
  }
  const far = Number.MAX_SAFE_INTEGER
  return out.sort(
    (a, b) =>
      (a.due?.getTime() ?? far) - (b.due?.getTime() ?? far) ||
      Number(b.important) - Number(a.important),
  )
}

/** İK self servis verisi (bakiye, izinler, masraflar, avanslar); okunamazsa `null`. */
export async function selfService() {
  try {
    const [{ fetchSelfService }, { msalInstance }] = await Promise.all([
      import("@/lib/selfServiceApi"),
      import("@/lib/msal"),
    ])
    const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
    if (!account) return null
    const data = await fetchSelfService(account)
    return data?.worker ? data : null
  } catch {
    return null
  }
}

/** Gönderilmiş öğelerin en yenisi; okunamazsa `null`. */
export async function lastSent() {
  const params = new URLSearchParams({
    $select: "subject,toRecipients,sentDateTime,bodyPreview",
    $orderby: "sentDateTime desc",
    $top: "1",
  })
  const data = await graphJson(`/me/mailFolders/sentitems/messages?${params.toString()}`)
  const m = data?.value?.[0]
  if (!m) return null
  return {
    subject: m.subject || "",
    to: (m.toRecipients ?? []).map(nameOf).filter(Boolean),
    sent: m.sentDateTime ? new Date(m.sentDateTime) : null,
    preview: (m.bodyPreview || "").replace(/\s+/g, " ").trim(),
  }
}
