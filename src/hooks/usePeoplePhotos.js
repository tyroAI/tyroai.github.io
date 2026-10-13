import { useEffect, useState } from "react"
import { useMsal } from "@azure/msal-react"
import { photoFromBlob } from "@/lib/initialsPhoto"
import { ensureMsalInitialized, isMsalConfigured } from "@/lib/msal"

/**
 * Profile photos for OTHER people — meeting attendees and organizers.
 *
 * `useMe` already fetches MY photo with User.Read; that scope cannot read
 * anyone else's. Colleagues' photos need `User.ReadBasic.All`, which this
 * hook requests SILENTLY and only silently: the calendar popover mounts in
 * the header on every route, and the header's contract (see src/lib/graph.js)
 * is "silent or nothing" — an interactive prompt from a widget the user
 * didn't click would be a sign-in wall. If the tenant hasn't consented the
 * scope, every avatar simply falls back to initials, which is the exact
 * behaviour the design asks for ("fotoğraf yoksa ad soyad harf kombini").
 *
 * Cache is a module-level Map, IN MEMORY ONLY. Attendee photos are other
 * people's PII on a possibly shared browser — same rule as the calendar and
 * mail caches, and cleared with them on sign-out (msal.js LOGOUT_SUCCESS).
 * Three cache states per address: absent = never tried; string = data URL;
 * null = tried and there is nothing there (404, denied) — don't retry.
 */

const cache = new Map() // lowercased address -> dataURL | null
const inflight = new Map() // lowercased address -> Promise
const listeners = new Set()

/** One denied silent-token attempt means every later one fails the same way
 *  this session — remember it instead of asking MSAL again per avatar. */
let scopeUnavailable = false

/** 48px is the largest size the 24px row avatars and 28px popup avatars need
 *  at 2× DPR, and small enough that a 10-person meeting stays cheap. */
const PHOTO_PATH = (address) =>
  `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(address)}/photos/48x48/$value`

export function clearPeoplePhotoCache() {
  cache.clear()
  inflight.clear()
  scopeUnavailable = false
  notify()
}

function notify() {
  for (const cb of listeners) cb()
}

async function fetchPhoto(instance, account, address) {
  try {
    if (scopeUnavailable) {
      cache.set(address, null)
      return
    }
    await ensureMsalInitialized()
    let token
    try {
      token = await instance.acquireTokenSilent({ scopes: ["User.ReadBasic.All"], account })
    } catch (err) {
      // Only a CONSENT answer latches the session-wide "no photos" flag — the
      // tenant saying no is final for this session. A transient network or
      // server error caches nothing, so a later mount simply retries.
      if (
        /interaction_required|consent_required|login_required|invalid_grant/.test(
          err?.errorCode ?? "",
        )
      ) {
        scopeUnavailable = true
        cache.set(address, null)
      }
      return
    }
    const res = await fetch(PHOTO_PATH(address), {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    })
    // Throttling and server errors are not answers — leave the cache slot
    // empty so the next open retries instead of showing initials all session.
    if (res.status === 429 || res.status >= 500) return
    if (!res.ok) {
      // 404 = no photo set; 403 = blocked by policy. Both mean initials.
      cache.set(address, null)
      return
    }
    // Harf resmi (baş harflerin yazıldığı "fotoğraf") null döner: avatar harf çizer.
    cache.set(address, await photoFromBlob(await res.blob()))
  } catch {
    // Network hiccup — cache nothing so a later mount can retry.
  } finally {
    inflight.delete(address)
    notify()
  }
}

/**
 * Photos for a list of addresses. Returns `Map<lowercased address, dataURL>`
 * containing only the addresses that actually have one — callers fall back to
 * initials for the rest.
 */
export function usePeoplePhotos(addresses) {
  const { instance, accounts } = useMsal()
  const account = accounts[0] ?? null
  const [, bump] = useState(0)

  // Stable identity for the effect: the set of addresses, not the array.
  const key = (addresses ?? [])
    .map((a) => (a || "").trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("|")

  useEffect(() => {
    if (!isMsalConfigured || !account || !key) return
    const cb = () => bump((n) => n + 1)
    listeners.add(cb)
    for (const address of key.split("|")) {
      if (cache.has(address) || inflight.has(address)) continue
      inflight.set(address, fetchPhoto(instance, account, address))
    }
    return () => listeners.delete(cb)
  }, [key, account, instance])

  const out = new Map()
  for (const address of key ? key.split("|") : []) {
    const hit = cache.get(address)
    if (hit) out.set(address, hit)
  }
  return out
}
