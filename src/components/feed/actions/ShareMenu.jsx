import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon"
import MailSend01Icon from "@hugeicons/core-free-icons/MailSend01Icon"
import SentIcon from "@hugeicons/core-free-icons/SentIcon"
import { BottomSheet } from "@/components/common/BottomSheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLocale } from "@/hooks/useLocale"
import { ActionButton } from "./ActionButton"
import { OPTION_ICON } from "./actionStyles"
import { ShareDialog } from "./ShareDialog"

/**
 * Paylaş — yalnız iş kanalları: Kişilere ilet (posta) · Teams'te gönder. Masaüstünde açılır
 * menü, telefonda alttan çekmece (`BottomSheet`); ikisi aynı seçenek listesini çizer.
 * WhatsApp, sistem paylaşım sayfası ve bağlantı kopyalama bilerek yok — gerekçe `lib/feedShare.js`.
 */
export function ShareMenu({ post, showLabel, className, align = "start" }) {
  const { t } = useLocale()
  const mobile = useIsMobile()
  const [sheet, setSheet] = useState(false)
  const [dialog, setDialog] = useState(null)
  // Pencere kapanınca odak tetiğe döner: pencereyi açan menü satırı o sırada yok olmuştur.
  const triggerRef = useRef(null)
  const subject = post.subject || t("feed.noSubject")
  const options = [
    {
      id: "mail",
      icon: MailSend01Icon,
      label: t("feed.share.mail"),
      hint: t("feed.share.mailHint"),
    },
    {
      id: "teams",
      icon: BubbleChatIcon,
      label: t("feed.share.teams"),
      hint: t("feed.share.teamsHint"),
    },
  ]
  const pick = (id) => setDialog(id)
  const body = (o) => (
    <>
      <span className={OPTION_ICON}>
        <HugeiconsIcon icon={o.icon} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="min-w-0 text-start">
        <span className="block font-medium text-foreground">{o.label}</span>
        <span className="block text-[0.6875rem] leading-snug text-muted-foreground">{o.hint}</span>
      </span>
    </>
  )
  const trigger = {
    ref: triggerRef,
    icon: <HugeiconsIcon icon={SentIcon} strokeWidth={1.7} />,
    label: t("feed.actions.share"),
    "aria-label": t("feed.actions.shareAria", { subject }),
    showLabel,
    className,
  }

  return (
    <>
      {mobile ? (
        <>
          <ActionButton {...trigger} aria-haspopup="dialog" onClick={() => setSheet(true)} />
          <BottomSheet open={sheet} onOpenChange={setSheet} title={t("feed.actions.share")}>
            <p className="mb-2 line-clamp-2 text-[0.8125rem] text-muted-foreground">{subject}</p>
            <ul className="space-y-1">
              {options.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSheet(false)
                      pick(o.id)
                    }}
                    className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-[0.875rem] transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    {body(o)}
                  </button>
                </li>
              ))}
            </ul>
          </BottomSheet>
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ActionButton {...trigger} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align} sideOffset={6} className="w-64 p-1.5">
            {options.map((o) => (
              <DropdownMenuItem
                key={o.id}
                onSelect={() => pick(o.id)}
                className="gap-2.5 py-2 text-[0.8125rem] pointer-coarse:min-h-11"
              >
                {body(o)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <ShareDialog
        post={post}
        mode={dialog}
        onClose={() => setDialog(null)}
        returnFocus={triggerRef}
      />
    </>
  )
}
