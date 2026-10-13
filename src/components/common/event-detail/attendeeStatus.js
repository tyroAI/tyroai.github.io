// Katılımcının kartta gösterilen yanıtı. Düzenleyen ayrı; yanıt gelmemiş her
// durum (none · notResponded) tek grupta.
export const ATTENDEE_GROUPS = [
  { key: "organizer", label: "calendar.att.organizer", dot: "bg-brand" },
  { key: "accepted", label: "calendar.att.accepted", dot: "bg-emerald-500" },
  { key: "tentativelyAccepted", label: "calendar.att.tentative", dot: "bg-amber-500" },
  { key: "declined", label: "calendar.att.declined", dot: "bg-red-500" },
  { key: "none", label: "calendar.att.none", dot: "bg-muted-foreground/40" },
]

/** Katılımcıları yanıta göre gruplar; boş grup dönmez. */
export function groupAttendees(people, organizerAddress) {
  const org = (organizerAddress || "").toLowerCase()
  const statusOf = (a) => {
    if (a.response === "organizer" || (org && (a.address || "").toLowerCase() === org))
      return "organizer"
    return ["accepted", "tentativelyAccepted", "declined"].includes(a.response)
      ? a.response
      : "none"
  }
  return ATTENDEE_GROUPS.map((g) => ({
    ...g,
    people: people.filter((a) => statusOf(a) === g.key),
  })).filter((g) => g.people.length > 0)
}

/** Katılan sayısı: düzenleyen ve kabul edenler (Graph düzenleyeni çoğu kez yanıtsız yazar). */
export function goingCount(people, organizerAddress) {
  return groupAttendees(people, organizerAddress)
    .filter((g) => g.key === "organizer" || g.key === "accepted")
    .reduce((n, g) => n + g.people.length, 0)
}
