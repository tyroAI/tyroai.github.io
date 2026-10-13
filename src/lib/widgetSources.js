import { presenceState } from "@/hooks/usePresence"
import { STATUS, graphGet, graphPost } from "@/lib/graph"

/**
 * Widget'ların Graph okumaları — hepsi MEVCUT izinlerle (yeni onay yok):
 * posta `Mail.Read`, son belgeler `Sites.Read.All`, ekip `User.Read.All` +
 * `Mail.Read` (otomatik yanıt), Planner `Tasks.ReadWrite`. Her biri
 * `{ status, data }` döner; önbellek `useWidgetData`da.
 */

const enc = encodeURIComponent
const MAIL = ["Mail.Read"]
const SITES = ["Sites.Read.All"]
const USERS = ["User.Read.All"]
const TASKS = ["Tasks.ReadWrite"]
/** ISO tarih → Date; boş ya da bozuksa `null` (bozuk bir tarih widget'ı düşürmesin). */
function dateOf(value) {
  if (typeof value !== "string" || !value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

const MAIL_SELECT = "$select=id,subject,from,receivedDateTime,importance,webLink,flag,isRead"

function toMessage(m) {
  return {
    id: m.id,
    subject: m.subject || "",
    from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || "",
    fromAddress: m.from?.emailAddress?.address ?? "",
    received: dateOf(m.receivedDateTime),
    important: m.importance === "high",
    flagged: m.flag?.flagStatus === "flagged",
    webLink: m.webLink ?? null,
  }
}

/** Gelen kutusunun okunmamışları (en yeni 6), bayraklılar (6) ve okunmamış toplamı. */
export async function fetchPendingMail(instance, account) {
  const unreadFilter = enc("receivedDateTime ge 2000-01-01T00:00:00Z and isRead eq false")
  const [unread, flagged, inbox] = await Promise.all([
    graphGet(instance, account, {
      path: `/me/mailFolders/inbox/messages?$filter=${unreadFilter}&$orderby=receivedDateTime desc&$top=12&${MAIL_SELECT}`,
      scopes: MAIL,
    }),
    graphGet(instance, account, {
      path: `/me/messages?$filter=${enc("flag/flagStatus eq 'flagged'")}&$top=12&${MAIL_SELECT}`,
      scopes: MAIL,
    }),
    graphGet(instance, account, {
      path: "/me/mailFolders/inbox?$select=unreadItemCount",
      scopes: MAIL,
    }),
  ])
  if (unread.status !== STATUS.ready) return { status: unread.status }
  return {
    status: STATUS.ready,
    data: {
      unread: (unread.data.value ?? []).map(toMessage),
      flagged: flagged.status === STATUS.ready ? (flagged.data.value ?? []).map(toMessage) : [],
      unreadTotal: inbox.data?.unreadItemCount ?? null,
    },
  }
}

/** Son açılan belgeler (`insights/used`); web sayfaları ve klasörler düşer. */
export async function fetchRecentFiles(instance, account) {
  const res = await graphGet(instance, account, {
    path: "/me/insights/used?$top=24&$orderby=lastUsed/lastAccessedDateTime desc",
    scopes: SITES,
  })
  if (res.status !== STATUS.ready) return { status: res.status }
  const files = (res.data.value ?? [])
    .map((x) => ({
      id: x.id,
      title: x.resourceVisualization?.title || "",
      type: x.resourceVisualization?.type || "Other",
      container: x.resourceVisualization?.containerDisplayName || "",
      webUrl: x.resourceReference?.webUrl || null,
      at: dateOf(x.lastUsed?.lastAccessedDateTime),
    }))
    .filter((f) => f.title && f.webUrl && f.type !== "Web" && f.type !== "spsite")
    .slice(0, 12)
  return { status: STATUS.ready, data: files }
}

const PERSON = "$select=id,displayName,mail,userPrincipalName,jobTitle,accountEnabled"

/**
 * Ekibim: yöneticim, aynı yöneticiye bağlı olanlar, bana bağlı olanlar (en
 * çok 12; kapalı hesaplar hariç), her birinin Teams durumu ve otomatik yanıtı
 * açık mı (izin / ofis dışı — `getMailTips`).
 */
export async function fetchTeam(instance, account) {
  const me = await graphGet(instance, account, {
    path: `/me?$select=id&$expand=manager(${PERSON})`,
    scopes: USERS,
  })
  if (me.status !== STATUS.ready) return { status: me.status }
  const manager = me.data?.manager ?? null
  const [peers, reports] = await Promise.all([
    manager?.id
      ? graphGet(instance, account, {
          path: `/users/${enc(manager.id)}/directReports?${PERSON}&$top=40`,
          scopes: USERS,
        })
      : null,
    graphGet(instance, account, { path: `/me/directReports?${PERSON}&$top=40`, scopes: USERS }),
  ])
  const person = (u, role) => ({
    id: u.id,
    name: u.displayName || "",
    address: (u.mail || u.userPrincipalName || "").toLowerCase(),
    title: u.jobTitle || "",
    role,
  })
  const seen = new Set([me.data?.id])
  const people = []
  const push = (u, role) => {
    // İşten ayrılanın hesabı silinmeden KAPATILIYOR ve yöneticinin bağlı
    // listesinde kalabiliyor: kapalı hesap ekipte sayılmaz.
    if (!u?.id || seen.has(u.id) || !u.displayName || u.accountEnabled === false) return
    seen.add(u.id)
    people.push(person(u, role))
  }
  if (manager) push(manager, "manager")
  for (const u of reports?.data?.value ?? []) push(u, "report")
  for (const u of peers?.data?.value ?? []) push(u, "peer")
  const team = people.slice(0, 30)
  const tips = team.length
    ? await graphPost(instance, account, {
        path: "/me/getMailTips",
        scopes: MAIL,
        body: { EmailAddresses: team.map((p) => p.address), MailTipsOptions: "automaticReplies" },
      })
    : null
  // Durum TEK istekle, kimliklerle (`getPresencesByUserId`) — adresle tek tek
  // sormak hem yavaştı hem posta adresi UPN'den farklıysa boş dönüyordu.
  const presence = team.length
    ? await graphPost(instance, account, {
        path: "/communications/getPresencesByUserId",
        scopes: ["Presence.Read.All"],
        body: { ids: team.map((p) => p.id) },
      })
    : null
  const stateOf = new Map(
    (presence?.data?.value ?? []).map((x) => [x.id, presenceState(x.availability)]),
  )
  const away = new Set(
    (tips?.data?.value ?? [])
      .filter((x) => String(x.automaticReplies?.message ?? "").trim())
      .map((x) => String(x.emailAddress?.address ?? "").toLowerCase()),
  )
  return {
    status: STATUS.ready,
    data: team.map((p) => ({
      ...p,
      away: away.has(p.address),
      presence: stateOf.get(p.id) ?? null,
    })),
  }
}

/** Planner'da bana atanmış, bitmemiş işler (teslimi en yakın önce) ve planlarının adı. */
export async function fetchPlannerTasks(instance, account) {
  const res = await graphGet(instance, account, { path: "/me/planner/tasks", scopes: TASKS })
  if (res.status !== STATUS.ready) return { status: res.status }
  const open = (res.data.value ?? [])
    .filter((x) => (x.percentComplete ?? 0) < 100)
    .map((x) => ({
      id: x.id,
      title: x.title || "",
      planId: x.planId,
      due: dateOf(x.dueDateTime),
      started: (x.percentComplete ?? 0) > 0,
      urgent: x.priority != null && x.priority <= 1,
    }))
    .sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity))
  const plans = new Map()
  await Promise.all(
    [...new Set(open.slice(0, 15).map((x) => x.planId))].map(async (id) => {
      const plan = await graphGet(instance, account, {
        path: `/planner/plans/${enc(id)}?$select=id,title`,
        scopes: TASKS,
      })
      if (plan.status === STATUS.ready) plans.set(id, plan.data.title)
    }),
  )
  return {
    status: STATUS.ready,
    data: {
      total: open.length,
      tasks: open.slice(0, 15).map((x) => ({ ...x, plan: plans.get(x.planId) ?? "" })),
    },
  }
}
