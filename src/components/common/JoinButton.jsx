import { useLocale } from "@/hooks/useLocale"
import { notify } from "@/lib/notify"
import { joinInTeams } from "@/lib/teamsJoin"
import { cn, safeExternalUrl } from "@/lib/utils"

/**
 * Katıl düğmesi (`useJoinUrl` sonucuyla): link varsa toplantıyı Teams'te açar
 * (`joinInTeams` — önce masaüstü uygulaması). Link aranırken bekler; hiç link
 * yoksa soluk ve pasif, nedeni `title`da ve basınca bildirimde.
 * `activeClassName` yalnız tıklanabilirken eklenir (hover, vurgu gölgesi).
 */
export function JoinButton({ url, pending, className, activeClassName, onJoin, children }) {
  const { t } = useLocale()
  const href = url ? safeExternalUrl(url) : "#"
  if (href !== "#") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          joinInTeams(e, href, t)
          onJoin?.()
        }}
        className={cn(className, activeClassName)}
      >
        {children}
      </a>
    )
  }
  if (pending) {
    return (
      <span aria-disabled="true" aria-busy="true" className={cn(className, "cursor-progress")}>
        {children}
      </span>
    )
  }
  // Pasif ama odaklanabilir: dokunmatikte `title` görünmez, basınca neden yazar.
  return (
    <button
      type="button"
      aria-disabled="true"
      title={t("calendar.noJoin")}
      onClick={() => notify.info(t("calendar.noJoin"))}
      className={cn(className, "cursor-not-allowed opacity-45")}
    >
      {children}
    </button>
  )
}
