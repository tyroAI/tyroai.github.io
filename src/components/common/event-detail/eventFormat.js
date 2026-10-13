// Saat h23'e sabit: en-US "02:00 PM" yazardı; takvim dilden bağımsız 24 saat
// okunur. Tarihin parçaları yine yerele uyar.
export const OPTS_TIME = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
export const OPTS_DAY_FULL = { weekday: "long", day: "numeric", month: "long", year: "numeric" }

/**
 * Yanıt bekleyen etkinliğin rengi: paletten bağımsız koyu turuncu
 * (`--chart-4`) — her palette "dikkat" okunur, hata kırmızısı olmaz.
 */
export const ATTENTION = "var(--chart-4)"

export function duration(event, t) {
  if (event.isAllDay) return t("calendar.allDay")
  const minutes = Math.round((event.end - event.start) / 60000)
  if (minutes < 60) return t("calendar.durationMinutes", { minutes })
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!rest) return t("calendar.durationHours", { hours })
  return t("calendar.durationHoursMinutes", { hours, minutes: rest })
}

/** Kartın başındaki renk çipi — satırın şeridiyle aynı anlam (yanıt durumu). */
export function responseChip(response, cancelled) {
  if (cancelled || response === "declined") return { className: "bg-muted text-muted-foreground" }
  if (response === "organizer" || response === "accepted")
    return { className: "bg-brand text-white" }
  const tone = response === "tentativelyAccepted" ? "var(--brand-via)" : ATTENTION
  return {
    style: { backgroundColor: `color-mix(in oklab, ${tone} 15%, transparent)`, color: tone },
  }
}

// Teams'in (ve Zoom'un) davete eklediği katılma bloğu bir alt çizgi satırıyla
// başlar: link, toplantı kimliği, parola. Katıl düğmesi bunu zaten yapıyor;
// kartta yalnız düzenleyenin yazdığı gündem kalır.
const JOIN_BLOCK = /^\s*_{10,}\s*$/m

/** Etkinlik gövdesinin önizlemesinden gündem — katılma bloğu olmadan. */
export function agendaText(body) {
  const text = String(body ?? "")
  const cut = text.search(JOIN_BLOCK)
  return (cut >= 0 ? text.slice(0, cut) : text).trim()
}
