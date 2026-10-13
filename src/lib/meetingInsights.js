import { graphGet, requestGraphScopes, STATUS } from "@/lib/graph"

/**
 * Teams toplantısının yapay zekâ özeti — Microsoft 365 Copilot'un "Meeting AI
 * Insights" API'si (v1.0): konuşulanlar, yapılacaklar, kişinin anıldığı yerler.
 *
 * Şartlar (Microsoft'un): kullanıcının Microsoft 365 Copilot lisansı olmalı;
 * toplantıda transkript ya da kayıt açılmış olmalı; özet toplantı bittikten
 * sonra 4 saate kadar gecikebilir; kanal toplantıları desteklenmez. İzinler
 * `OnlineMeetings.Read` (katılma linkinden toplantıyı bulmak) ve
 * `OnlineMeetingAiInsight.Read.All` — ilk kullanımda bir kez sorulur; kiracı
 * kullanıcı onayını kapattıysa yönetici onayı gerekir. Hiçbiri yoksa sonuç
 * "soramadık" (`denied`) — "özet yok" (`none`) ile karıştırılmaz.
 *
 * Toplantının Teams sohbet bağlantısı izin gerektirmez: katılma linkinin
 * içindeki sohbet kimliğinden (`19:meeting_…@thread.v2`) kurulur.
 */
const SCOPES = ["OnlineMeetings.Read", "OnlineMeetingAiInsight.Read.All"]
export const INSIGHT = { ...STATUS, none: "none", loading: "loading" }

/** Katılma linkinden toplantı sohbetinin kimliği; yeni kısa linklerde (`/meet/…`) yok. */
export function meetingThreadId(joinUrl) {
  try {
    const m = new URL(joinUrl).pathname.match(/\/l\/meetup-join\/([^/]+)/)
    const id = m ? decodeURIComponent(m[1]) : ""
    return id.startsWith("19:") ? id : null
  } catch {
    return null
  }
}

/** Teams'te toplantı sohbetini açan bağlantı (kimlik bilinmiyorsa `null`). */
export function meetingChatUrl(joinUrl, threadId) {
  const id = threadId ?? meetingThreadId(joinUrl)
  return id ? `https://teams.microsoft.com/l/chat/${encodeURIComponent(id)}/conversations` : null
}

const HOUR = 3600000

/**
 * Tekrarlayan toplantının bütün oturumları AYNI çevrimiçi toplantıyı
 * paylaşır: özet listesinde her oturumun özeti olur. Yalnız bu oturumun
 * saatine düşen (başlangıçtan 15 dk önce → bitişten 6 saat sonra) en son özet
 * alınır — başka bir günün özetini göstermek bu ekranın en kötü hatası olurdu.
 */
export function pickInsight(list, start, end) {
  const from = start.getTime() - 0.25 * HOUR
  const to = end.getTime() + 6 * HOUR
  return (
    (list ?? [])
      .filter((x) => {
        const at = Date.parse(x.endDateTime || x.createdDateTime)
        return Number.isFinite(at) && at >= from && at <= to
      })
      .sort(
        (a, b) =>
          Date.parse(b.endDateTime || b.createdDateTime) -
          Date.parse(a.endDateTime || a.createdDateTime),
      )[0] ?? null
  )
}

const clean = (s) => String(s ?? "").trim()

/** Graph cevabından ekranın biçimi; boş başlık/metinler düşer. */
export function normalizeInsight(data) {
  const notes = (data?.meetingNotes ?? [])
    .map((n) => ({
      title: clean(n.title),
      text: clean(n.text),
      subpoints: (n.subpoints ?? [])
        .map((p) => ({ title: clean(p.title), text: clean(p.text) }))
        .filter((p) => p.title || p.text),
    }))
    .filter((n) => n.title || n.text || n.subpoints.length)
  const actions = (data?.actionItems ?? [])
    .map((a) => ({ title: clean(a.title), text: clean(a.text), owner: clean(a.ownerDisplayName) }))
    .filter((a) => a.title || a.text)
  const mentions = (data?.viewpoint?.mentionEvents ?? [])
    .map((m) => ({
      at: m.eventDateTime ? new Date(m.eventDateTime) : null,
      speaker: clean(m.speaker?.user?.displayName),
      text: clean(m.transcriptUtterance),
    }))
    .filter((m) => m.text)
  return { notes, actions, mentions }
}

/** Kopyalama ve paylaşma için düz metin. `labels`: { notes, actions, owner(name) }. */
export function insightText(insight, { title, when }, labels) {
  const lines = [title, when, ""]
  if (insight.notes.length) {
    lines.push(labels.notes)
    for (const n of insight.notes) {
      lines.push(`• ${[n.title, n.text].filter(Boolean).join(": ")}`)
      for (const p of n.subpoints)
        lines.push(`   – ${[p.title, p.text].filter(Boolean).join(": ")}`)
    }
    lines.push("")
  }
  if (insight.actions.length) {
    lines.push(labels.actions)
    for (const a of insight.actions) {
      const body = [a.title, a.text].filter(Boolean).join(": ")
      lines.push(`☐ ${body}${a.owner ? ` (${labels.owner(a.owner)})` : ""}`)
    }
  }
  return lines.join("\n").trim()
}

/** Uzun metni bağlantıya sığdırır (e-posta ve WhatsApp bağlantılarının sınırı). */
export const clip = (text, max, more = "…") =>
  text.length > max ? `${text.slice(0, max - more.length).trimEnd()}${more}` : text

// Kişinin kimliği oturum boyunca aynı: toplantı başına yeniden sorulmaz.
const meIds = new Map()
export function forgetMeetingIdentity() {
  meIds.clear()
}
function myId(instance, account) {
  const key = account?.homeAccountId ?? ""
  if (!meIds.has(key)) {
    const p = graphGet(instance, account, { path: "/me?$select=id", scopes: ["User.Read"] })
    meIds.set(key, p)
    p.then((r) => r.status !== STATUS.ready && meIds.delete(key))
  }
  return meIds.get(key)
}

// Aynı anda en çok üç özet sorgusu: bir liste sekiz toplantıyı birden
// sorunca Graph kısıtlamaya (429) düşüyor, satırlar sessizce kayboluyordu.
const MAX_PARALLEL = 3
let running = 0
const waiting = []
function limited(task) {
  return new Promise((resolve, reject) => {
    const run = () => {
      running += 1
      task()
        .then(resolve, reject)
        .finally(() => {
          running -= 1
          waiting.shift()?.()
        })
    }
    if (running < MAX_PARALLEL) run()
    else waiting.push(run)
  })
}

async function runOnce(instance, account, event) {
  const me = await myId(instance, account)
  if (me.status !== STATUS.ready) return { status: me.status }
  const filter = encodeURIComponent(`JoinWebUrl eq '${event.joinUrl.replace(/'/g, "''")}'`)
  const om = await graphGet(instance, account, {
    path: `/me/onlineMeetings?$filter=${filter}`,
    scopes: SCOPES,
    retry: 1,
  })
  if (om.status !== STATUS.ready) return { status: om.status, httpStatus: om.httpStatus }
  const meeting = om.data?.value?.[0]
  if (!meeting) return { status: INSIGHT.none }
  const threadId = meeting.chatInfo?.threadId ?? null
  const base = `/copilot/users/${encodeURIComponent(me.data.id)}/onlineMeetings/${encodeURIComponent(meeting.id)}/aiInsights`
  const list = await graphGet(instance, account, { path: base, scopes: SCOPES, retry: 1 })
  if (list.status !== STATUS.ready)
    return { status: list.status, httpStatus: list.httpStatus, threadId }
  const picked = pickInsight(list.data?.value, event.start, event.end)
  if (!picked) return { status: INSIGHT.none, threadId }
  const detail = await graphGet(instance, account, {
    path: `${base}/${encodeURIComponent(picked.id)}`,
    scopes: SCOPES,
    retry: 1,
  })
  if (detail.status !== STATUS.ready)
    return { status: detail.status, httpStatus: detail.httpStatus, threadId }
  const insight = normalizeInsight(detail.data)
  const empty = !insight.notes.length && !insight.actions.length
  return { status: empty ? INSIGHT.none : STATUS.ready, threadId, insight }
}

/**
 * Bir takvim etkinliğinin özeti. Sonuç `{ status, insight?, threadId?,
 * needsConsent? }`: belirteç sessizce alınamadıysa `needsConsent` — izin
 * KULLANICININ BASTIĞI düğmeyle istenir (`grantMeetingScopes`); kendiliğinden
 * açılan bir pencere tarayıcı engeline takılıp sayfayı yönlendirmeye atardı.
 * Graph'ın kendisi reddettiyse (403 — lisans ya da yönetici izni) sorulmaz.
 */
export async function fetchMeetingInsight(instance, account, event) {
  if (!event?.joinUrl) return { status: INSIGHT.none }
  const res = await limited(() => runOnce(instance, account, event))
  return res.status === STATUS.denied && !res.httpStatus ? { ...res, needsConsent: true } : res
}

/** "İzin ver" düğmesinden: özet izinlerini bir kez sorar. */
export const grantMeetingScopes = (instance, account) =>
  requestGraphScopes(instance, account, SCOPES)
