import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import WhatsappIcon from "@hugeicons/core-free-icons/WhatsappIcon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/useLocale"
import { usePersonProfile } from "@/hooks/usePersonProfile"
import { PERSON } from "@/lib/personDirectory"
import {
  celebrateMessage,
  firstName,
  outlookMail,
  teamsChat,
  waNumber,
  whatsApp,
} from "@/lib/celebrate"

/**
 * Kutla düğmesinin seçimi: Teams mesajı · Outlook e-postası · WhatsApp — üçü
 * de aynı hazır tebrik mesajıyla (`person.msg.*`), e-postada konu da dolu.
 * WhatsApp için cep numarası dizinden gelir (menü açılınca profil istenir;
 * kişi kartı zaten çektiyse önbellekten); numara yoksa WhatsApp kişiyi
 * seçtirir ve bunu söyler.
 *
 * `children` tek düğme (tetik). `person`: { name, address, upn?, givenName?,
 * mobile? }; `kind`: birthday · anniversary · joiner.
 */
export function CelebrateMenu({ person, kind, years, align = "start", children }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const profile = usePersonProfile({ name: person.name, address: person.address }, open)
  const mobile = person.mobile ?? profile.profile?.mobile ?? null
  const given = person.givenName || profile.profile?.givenName || firstName(person.name)
  const message = celebrateMessage(t, { kind, name: given, years })
  const hasPhone = Boolean(waNumber(mobile))
  const item = "gap-2.5 py-2 text-[0.8125rem]"
  const icon = (glyph, tone) => (
    <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${tone}`}>
      <HugeiconsIcon icon={glyph} className="size-4" strokeWidth={2} aria-hidden="true" />
    </span>
  )

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} sideOffset={6} className="w-60 p-1.5">
        <DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {t("person.celebrateVia")}
        </DropdownMenuLabel>
        <DropdownMenuItem asChild className={item}>
          <a
            href={teamsChat(person.upn || person.address, message)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {icon(BubbleChatIcon, "bg-[#5b5fc7]/12 text-[#5b5fc7] dark:text-[#a8abf0]")}
            {t("person.via.teams")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={item}>
          <a
            href={outlookMail(person.address, t(`person.mailSubject.${kind}`), message)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {icon(Mail01Icon, "bg-[#0f6cbd]/12 text-[#0f6cbd] dark:text-[#6cb4f0]")}
            {t("person.via.outlook")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={`${item} items-start`}>
          <a href={whatsApp(mobile, message)} target="_blank" rel="noopener noreferrer">
            {icon(WhatsappIcon, "bg-[#25d366]/15 text-[#128c7e] dark:text-[#4ade80]")}
            <span className="min-w-0">
              <span className="block">{t("person.via.whatsapp")}</span>
              {!hasPhone && (person.mobile !== undefined || profile.status !== PERSON.loading) && (
                <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted-foreground">
                  {t("person.via.whatsappPick")}
                </span>
              )}
            </span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
