import { notify } from "@/lib/notify"

const TEAMS_HOST = /(^|\.)teams\.(microsoft|live)\.com$/
const TEAMS_LINK =
  /https:\/\/teams\.(?:microsoft|live)\.com\/(?:l\/meetup-join|meet)\/[^\s<>"')\]]+/i

/**
 * Metinde (davetin önizlemesi, yer alanı) geçen Teams katılma linki. Outlook'un
 * klasik Teams eklentisiyle kurulan toplantı Graph'ta "çevrimiçi" işaretlenmiyor
 * (`onlineMeeting` boş); link yalnız davet metninde duruyor.
 */
export function teamsLinkIn(text) {
  // HTML'den gelen metinde "&" kaçışlı kalabiliyor; Graph JoinWebUrl araması tam eşleşme ister.
  return (
    String(text ?? "")
      .match(TEAMS_LINK)?.[0]
      ?.replace(/&amp;/gi, "&") ?? null
  )
}

/** Teams katılma linkinin masaüstü uygulama karşılığı (`msteams:`); Teams değilse null. */
export function teamsAppUrl(joinUrl) {
  try {
    const u = new URL(joinUrl)
    return TEAMS_HOST.test(u.hostname) ? `msteams:${u.pathname}${u.search}${u.hash}` : null
  } catch {
    return null
  }
}

/**
 * "Katıl" tıklaması: önce Teams masaüstü uygulaması (`msteams:`, Outlook'un
 * yolu). Uygulamanın kurulu olup olmadığı tarayıcıdan güvenilir bilinemiyor;
 * web'i kendiliğinden açmak iki kez katılmaya yol açabilirdi — bu yüzden
 * bildirimde "Tarayıcıda katıl". Cmd/Ctrl/Shift/orta tık eskisi gibi web'de
 * yeni sekme. Firefox bilinmeyen protokolde sayfayı hata sayfasına götürür:
 * orada doğrudan web.
 */
export function joinInTeams(e, joinUrl, t) {
  const app = teamsAppUrl(joinUrl)
  if (!app || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return false
  if (/Firefox\//.test(navigator.userAgent)) return false
  e.preventDefault()
  window.location.href = app
  notify.info(t("teams.opening"), {
    description: t("teams.notOpened"),
    action: {
      label: t("teams.openWeb"),
      onClick: () => window.open(joinUrl, "_blank", "noopener,noreferrer"),
    },
    duration: 9000,
  })
  return true
}
