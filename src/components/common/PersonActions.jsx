import { HugeiconsIcon } from "@hugeicons/react"
import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon"
import Call02Icon from "@hugeicons/core-free-icons/Call02Icon"
import CalendarAdd01Icon from "@hugeicons/core-free-icons/CalendarAdd01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import { useLocale } from "@/hooks/useLocale"
import { teamsChat } from "@/lib/celebrate"
import { cn } from "@/lib/utils"

/**
 * Kişi kartının dört eylemi — Sohbet · E-posta · Ara · Toplantı (Outlook'un kişi kartının satırı).
 * Kişi kartı ve Self Servis'in Ekibim bölmesi paylaşır.
 *
 * Eylemler BAĞLANTI, uygulama içi işlem değil: Teams'in belgelenmiş derin bağlantıları
 * (`/l/chat`, `/l/call`, `/l/meeting/new`) ve Outlook web'in yazma bağlantısı — yeni kapsam yok,
 * tıklama anında ağ turu yok, açılır pencere engelleyicisine takılmaz. Adres yoksa hiçbiri
 * çizilmez: hedefsiz bir düğme yalan söyler.
 */
export function PersonActions({ address, upn, className }) {
  const { t } = useLocale()
  if (!address) return null
  const id = upn || address
  return (
    <div className={cn("grid grid-cols-4 gap-1", className)}>
      <Action
        href={teamsChat(id)}
        icon={BubbleChatIcon}
        label={t("person.chat")}
        title={t("person.chatTitle")}
      />
      <Action
        href={`https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(address)}`}
        icon={Mail01Icon}
        label={t("person.mail")}
        title={t("person.mailTitle")}
      />
      <Action
        href={`https://teams.microsoft.com/l/call/0/0?users=${encodeURIComponent(id)}`}
        icon={Call02Icon}
        label={t("person.call")}
        title={t("person.callTitle")}
      />
      <Action
        href={`https://teams.microsoft.com/l/meeting/new?attendees=${encodeURIComponent(id)}`}
        icon={CalendarAdd01Icon}
        label={t("person.meet")}
        title={t("person.meetTitle")}
      />
    </div>
  )
}

function Action({ href, icon, label, title }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={title}
      className="group/act flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[0.6875rem] font-medium text-foreground/80 transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-14"
    >
      <span className="grid size-8 place-items-center rounded-full bg-brand/[0.09] text-brand-ink transition group-hover/act:bg-brand/[0.15]">
        <HugeiconsIcon icon={icon} className="size-4" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </a>
  )
}
