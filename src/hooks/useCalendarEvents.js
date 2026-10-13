import { useCallback, useEffect, useRef, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { isMsalConfigured } from "@/lib/msal"
import { STATUS, browserTimeZone, parseGraphDateTime } from "@/lib/graph"
import { CALENDAR_PAGE_SIZE, getCalendarPages } from "@/lib/calendarPages"
import { teamsLinkIn } from "@/lib/teamsJoin"

// Kept in memory, not localStorage: meeting subjects are other people's
// business on a possibly shared browser, and an in-memory cache also avoids
// the storage-registry obligation every `tyro-*` key carries.
const cache = new Map()
const TTL_MS = 5 * 60 * 1000
// Geçici hatada (429 · 5xx · ağ) istek iki kez daha denenir (`graphGet` › retry).
const RETRY = 2
// Hata sonrası kendiliğinden toparlanma: sekmeye dönünce ve bu aralıkla, en çok
// bu kadar deneme — sayfayı yenilemek gerekmesin, kalıcı hatada da dövmesin.
const AUTO_RETRY_MS = 30 * 1000
const AUTO_RETRY_MAX = 4

export function clearCalendarCache() {
  cache.clear()
}

// Takvimi değiştiren bir iş (davete yanıt) sonrası header, çentik ve Anasayfa
// aynı anda yeniden okusun diye: önbellek boşalır, açık her kanca tazelenir.
const listeners = new Set()
export function calendarChanged() {
  cache.clear()
  listeners.forEach((fn) => fn())
}

// calendarView, not /me/events: only calendarView expands a recurring series
// into its individual occurrences. /me/events would return one seriesMaster
// and a recurrence pattern for us to expand by hand.
const SELECT = [
  "id",
  "subject",
  "start",
  "end",
  "isAllDay",
  "isCancelled",
  "location",
  "attendees",
  "organizer",
  "isOnlineMeeting",
  "onlineMeetingProvider",
  "onlineMeeting",
  "webLink",
  // For the Outlook-style detail card: my own RSVP state ("Yanıtlamadınız" +
  // LCV), and the body's first lines under the divider.
  "responseStatus",
  "bodyPreview",
  // Tekrarlayan toplantının oturumları aynı seriye bağlanır (özetin davet sayımı).
  "seriesMasterId",
].join(",")

/** Sabit referans: varsayılan `[]` her render'da yeni dizi olurdu. */
const EMPTY_PEOPLE = []

function rangeKey(accountId, start, end, people) {
  // Kişiler anahtarın PARÇASI: aynı aralık için farklı kişi kümesi farklı
  // sonuçtur ve tek anahtar paylaşsalardı biri diğerinin verisini gösterirdi.
  const who = people
    .map((p) => p.address.toLowerCase())
    .sort()
    .join(",")
  return `${accountId}::${start.toISOString()}::${end.toISOString()}::${who}`
}

/**
 * Events between two dates for the signed-in user.
 *
 * Fetches on mount rather than on open: the header trigger shows today's
 * meeting count, and a badge that only appears once you open the panel tells
 * you nothing. `enabled` remains for callers that don't need that.
 *
 * Both bounds are sent as UTC instants (toISOString), which carry an explicit
 * offset — Graph interprets a bound WITHOUT one as UTC, so a bare local-looking
 * timestamp would silently shift the window by the local offset and drop early
 * morning events.
 */

export function useCalendarEvents(start, end, enabled = true, people = EMPTY_PEOPLE) {
  const { instance, accounts } = useMsal()
  const account = accounts[0]
  const [state, setState] = useState({ status: "loading", events: [] })
  // Bump to force a refetch past the TTL (manual refresh, window focus).
  const [nonce, setNonce] = useState(0)
  const seq = useRef(0)

  const startIso = start?.toISOString()
  const endIso = end?.toISOString()

  // Derived, not stored: "no session" is a fact about the current render, and
  // writing it into state from an effect just causes an extra render pass.
  const signedIn = isMsalConfigured && Boolean(account)

  useEffect(() => {
    if (!enabled || !signedIn || !startIso || !endIso) return
    const key = rangeKey(account.homeAccountId, new Date(startIso), new Date(endIso), people)
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL_MS && nonce === hit.nonce) {
      // Hydrating from the module cache, which is an external mutable store —
      // reading it during render would be an impure read, and the alternative
      // (useSyncExternalStore) is heavy for a two-minute TTL. Same exemption
      // useIsInGroup takes for its membership cache.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(hit.value)
      return
    }

    let cancelled = false
    const mySeq = ++seq.current
    setState((prev) => (prev.events.length ? prev : { status: "loading", events: [] }))
    ;(async () => {
      const params = new URLSearchParams({
        startDateTime: startIso,
        endDateTime: endIso,
        $select: SELECT,
        $top: String(CALENDAR_PAGE_SIZE),
        // Sıralı iste: Graph `$orderby`sız sıra vermiyor. Sayfa tavanına
        // (lib/calendarPages) dayanılırsa düşen kısım en uzak gelecek olsun,
        // gelişigüzel bir dilim değil.
        $orderby: "start/dateTime",
      })
      // Kendi takvimi + paylaşılmış takvimler AYNI ANDA. Başkasının takvimi
      // `/users/{upn}/calendarView` ile okunur ve `Calendars.Read.Shared`
      // ister; `Calendars.Read` orada 403 döner. Sıralı çekmek panelin
      // açılışını kişi sayısı kadar geciktirirdi.
      const sources = [
        { person: null, path: `/me/calendarView?${params.toString()}`, scopes: ["Calendars.Read"] },
        ...people.map((p) => ({
          person: p,
          path: `/users/${encodeURIComponent(p.address)}/calendarView?${params.toString()}`,
          scopes: ["Calendars.Read.Shared"],
        })),
      ]
      const results = await Promise.all(
        sources.map((src) =>
          getCalendarPages(instance, account, {
            path: src.path,
            scopes: src.scopes,
            retry: RETRY,
            // Ask for our own zone so `dateTime` comes back as local wall-clock.
            headers: { Prefer: `outlook.timezone="${browserTimeZone()}"` },
          }).then((res) => ({ ...src, res })),
        ),
      )
      if (cancelled || mySeq !== seq.current) return

      const mine = results[0]
      if (mine.res.status !== STATUS.ready) {
        const value = {
          status: mine.res.status,
          events: [],
          error: mine.res.error,
          unreachable: [],
        }
        setState(value)
        // Never cache a denial: an admin granting consent later must take
        // effect on the next open, not after a page reload.
        return
      }

      // Bir kişinin takvimi okunamazsa PANEL ÇÖKMEZ: kendi etkinliklerin ve
      // okunabilen diğerleri gelir, okunamayan kişi ayrıca bildirilir.
      // "Paylaşmamış" ile "iznimiz yok" farklı şeyler ama ikisi de 403 döner;
      // kullanıcıya kimin görünmediğini söylemek, sessizce eksik göstermekten
      // dürüst.
      const unreachable = results
        .slice(1)
        .filter((r) => r.res.status !== STATUS.ready)
        .map((r) => r.person)

      const events = results
        .filter((r) => r.res.status === STATUS.ready)
        .flatMap((r) => (r.res.data.value ?? []).map((e) => ({ __raw: e, __owner: r.person })))
        .map(({ __raw: e, __owner }) => ({ ...e, __owner }))
        .filter((e) => !e.isCancelled)
        .map((e) => ({
          id: e.id,
          // Kimin takviminden geldiği. `null` = kendi takvimin; paneldeki
          // ayrım buna bakıyor.
          owner: e.__owner ?? null,
          subject: e.subject?.trim() || "",
          start: parseGraphDateTime(e.start),
          end: parseGraphDateTime(e.end),
          isAllDay: Boolean(e.isAllDay),
          location: e.location?.displayName?.trim() || "",
          // Link `onlineMeeting`ta yoksa davet metninden/yerden (lib/teamsJoin).
          isOnlineMeeting: Boolean(
            e.isOnlineMeeting || teamsLinkIn(e.bodyPreview) || teamsLinkIn(e.location?.displayName),
          ),
          onlineMeetingProvider: e.onlineMeetingProvider ?? null,
          joinUrl:
            e.onlineMeeting?.joinUrl ??
            teamsLinkIn(e.bodyPreview) ??
            teamsLinkIn(e.location?.displayName) ??
            null,
          organizer: e.organizer?.emailAddress?.name ?? "",
          // The address is what the Teams chat deeplink and the photo fetch
          // key on; the display name alone can't reach either.
          organizerAddress: e.organizer?.emailAddress?.address ?? "",
          // My own copy's RSVP state: organizer | accepted |
          // tentativelyAccepted | declined | notResponded | none.
          myResponse: e.responseStatus?.response ?? "none",
          seriesMasterId: e.seriesMasterId ?? null,
          bodyPreview: (e.bodyPreview ?? "").trim(),
          attendees: (e.attendees ?? [])
            .filter((a) => a.type !== "resource")
            .map((a) => ({
              name: a.emailAddress?.name ?? a.emailAddress?.address ?? "",
              address: a.emailAddress?.address ?? "",
              response: a.status?.response ?? "none",
            }))
            .filter((a) => a.name),
          webLink: e.webLink ?? null,
        }))
        .filter((e) => e.start && e.end)
        // Server ordering isn't guaranteed for calendarView, so sort here.
        .sort((a, b) => a.start - b.start)

      const value = { status: STATUS.ready, events, unreachable }
      cache.set(key, { at: Date.now(), value, nonce })
      setState(value)
    })()

    return () => {
      cancelled = true
    }
  }, [instance, account, signedIn, startIso, endIso, nonce, enabled, people])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])
  useEffect(() => {
    listeners.add(refresh)
    return () => listeners.delete(refresh)
  }, [refresh])

  // Okunamadıysa (izin değil, hata) kendiliğinden yeniden dene: pencereye /
  // sekmeye dönünce ve aralıkla. Sayaç başarıda sıfırlanır.
  const failed = state.status === STATUS.error
  const autoTries = useRef(0)
  useEffect(() => {
    if (state.status === STATUS.ready) autoTries.current = 0
  }, [state.status])
  useEffect(() => {
    if (!failed) return undefined
    const again = () => {
      if (document.visibilityState !== "visible" || autoTries.current >= AUTO_RETRY_MAX) return
      autoTries.current += 1
      refresh()
    }
    const timer = setInterval(again, AUTO_RETRY_MS)
    window.addEventListener("focus", again)
    document.addEventListener("visibilitychange", again)
    return () => {
      clearInterval(timer)
      window.removeEventListener("focus", again)
      document.removeEventListener("visibilitychange", again)
    }
  }, [failed, refresh])
  if (!signedIn) return { status: STATUS.unauthenticated, events: [], unreachable: [], refresh }
  return { ...state, refresh }
}

/**
 * Groups events into day buckets, repeating an event on every day it covers.
 *
 * All-day events are midnight-to-midnight with an EXCLUSIVE end — a one-day
 * event ends at 00:00 the next morning — so the last covered day is stepped
 * back, otherwise every all-day event would also appear on the day after it.
 */
export function groupEventsByDay(events, fromDay, dayCount) {
  const buckets = []
  for (let i = 0; i < dayCount; i++) {
    const day = new Date(fromDay)
    day.setDate(day.getDate() + i)
    day.setHours(0, 0, 0, 0)
    buckets.push({ day, events: [] })
  }
  for (const event of events) {
    const first = new Date(event.start)
    first.setHours(0, 0, 0, 0)
    const lastMoment = new Date(event.end.getTime() - (event.isAllDay ? 1 : 0))
    const last = new Date(lastMoment)
    last.setHours(0, 0, 0, 0)
    for (const bucket of buckets) {
      if (bucket.day >= first && bucket.day <= last) bucket.events.push(event)
    }
  }
  return buckets
}

/** Day keys (yyyy-mm-dd) that carry at least one event — for the month dots. */
export function daysWithEvents(events) {
  const set = new Set()
  for (const event of events) {
    const cursor = new Date(event.start)
    cursor.setHours(0, 0, 0, 0)
    const lastMoment = new Date(event.end.getTime() - (event.isAllDay ? 1 : 0))
    while (cursor <= lastMoment) {
      set.add(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  return set
}
