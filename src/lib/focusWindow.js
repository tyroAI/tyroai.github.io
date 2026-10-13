import { STATUS, browserTimeZone, graphPost, requestGraphScopes } from "@/lib/graph"

/**
 * Odak penceresi — mesai içinde (09:00–18:00) toplantısız boşluklar ve tek
 * tıkla takvime "Odak zamanı" bloğu. Hesap saf (`freeWindows`, testli);
 * yazma `Calendars.ReadWrite` ile (izin zaten var; ilk yazmada sorulabilir).
 */

const STEP = 15 * 60_000

/** Bir günün boş pencereleri: `[{ start, end, minutes }]`, en az `min` dakika. */
export function freeWindows(events, day, now, { from = 9, to = 18, min = 60 } = {}) {
  const start = new Date(day)
  start.setHours(from, 0, 0, 0)
  const end = new Date(day)
  end.setHours(to, 0, 0, 0)
  // Bugünse şimdiden sonrası, çeyrek saate yuvarlanmış.
  const nowMs = typeof now === "number" ? now : now?.getTime?.()
  const floor = nowMs && nowMs > start.getTime() ? Math.ceil(nowMs / STEP) * STEP : start.getTime()
  const busy = (events ?? [])
    .filter(
      (e) =>
        !e.owner && !e.isAllDay && e.myResponse !== "declined" && e.start < end && e.end > start,
    )
    .map((e) => [
      Math.max(e.start.getTime(), start.getTime()),
      Math.min(e.end.getTime(), end.getTime()),
    ])
    .sort((a, b) => a[0] - b[0])
  const out = []
  let cursor = floor
  for (const [s, e] of busy) {
    if (s - cursor >= min * 60_000) out.push([cursor, s])
    cursor = Math.max(cursor, e)
  }
  if (end.getTime() - cursor >= min * 60_000) out.push([cursor, end.getTime()])
  return out.map(([s, e]) => ({
    start: new Date(s),
    end: new Date(e),
    minutes: Math.round((e - s) / 60_000),
  }))
}

const pad = (n) => String(n).padStart(2, "0")
const local = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`

/** Takvime "meşgul" görünen bir odak bloğu yazar. */
export async function createFocusBlock(instance, account, { start, end, subject }) {
  const zone = browserTimeZone()
  const send = () =>
    graphPost(instance, account, {
      path: "/me/events",
      scopes: ["Calendars.ReadWrite"],
      body: {
        subject,
        start: { dateTime: local(start), timeZone: zone },
        end: { dateTime: local(end), timeZone: zone },
        showAs: "busy",
        isReminderOn: false,
        sensitivity: "private",
      },
    })
  const first = await send()
  if (first.status !== STATUS.denied || first.httpStatus) return first
  const granted = await requestGraphScopes(instance, account, ["Calendars.ReadWrite"])
  return granted ? send() : first
}
