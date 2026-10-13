import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Add01Icon from "@hugeicons/core-free-icons/Add01Icon"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import MoreHorizontalIcon from "@hugeicons/core-free-icons/MoreHorizontalIcon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Mail01Icon as AnimatedMailIcon } from "@/components/ui/mail-01"
import { useAnimatedIcon } from "@/hooks/useAnimatedIcon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { PanelFooterAction } from "@/components/common/PanelFooterAction"
import { PanelStateMessage } from "@/components/common/PanelStateMessage"
import { Skeleton } from "@/components/ui/skeleton"
import { useMsal } from "@azure/msal-react"
import { useLocale } from "@/hooks/useLocale"
import { usePeoplePhotos } from "@/hooks/usePeoplePhotos"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { useMailMessages } from "@/hooks/useMailMessages"
import { STATUS, requestGraphScopes } from "@/lib/graph"
import { MailReaderDialog } from "./mail/MailReaderDialog"
import { MailRow } from "./mail/MailRow"
import { OPTS_DAY_LONG, groupByDay, startOfDay } from "./mail/mailFormat"

/**
 * `trigger` verilirse panel o elemandan açılır ve header'daki düğme
 * ÇİZİLMEZ — sağ kenar çentiği bunu kullanıyor. İçerik TEK: iki yüzey aynı
 * paneli açıyor, çatal yok. `side`/`align` konum içindir — çentik sola açar.
 */
export function MailPopover({ trigger, side, align = "end", open, onOpenChange } = {}) {
  const { t, locale } = useLocale()
  const today = startOfDay(new Date())
  // Calendar arithmetic, not `today - 86400000`: on a DST transition the
  // local day is 23 or 25 hours long and the subtraction misses midnight.
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const { status, messages, unread, refresh, error } = useMailMessages(12)
  // Okuma bölmesi kartın hizalanacağı kenar (bkz. MailRow).
  const panelRef = useRef(null)
  // Geniş okuma penceresinin postası. Durum KÖKTE, satırda değil: pencere
  // panel kapandıktan sonra da ayakta kalmak zorunda (bkz. MailReaderDialog).
  const [reader, setReader] = useState(null)
  // A session older than the consent reports interaction/login_required; an
  // unapproved permission reports consent_required. Different fix, different
  // message.
  const staleSession = error && error !== "consent_required"
  const { instance, accounts } = useMsal()

  // Sender photos for every listed message — one hook call for the whole
  // panel, deduped by the module cache the calendar avatars already share.
  const photos = usePeoplePhotos(messages.map((m) => m.fromAddress))
  const photoOf = (address) => photos.get((address || "").toLowerCase())

  // Popup first, then refetch — the user stays exactly where they were.
  async function connect() {
    const ok = await requestGraphScopes(instance, accounts[0], ["Mail.Read"])
    if (ok) refresh()
  }
  const showBadge = status === STATUS.ready && unread > 0
  // Zarf, DÜĞMENİN üstüne gelince oynar. Düğmedeki `[&_svg]:!size-5`
  // hareketli bileşenin svg'sini de yakalar, boyut ayrıca verilmez.
  const { icon: mailIcon, hoverProps: mailHover } = useAnimatedIcon({
    icon: Mail01Icon,
    animatedIcon: AnimatedMailIcon,
  })

  return (
    <>
      <Popover open={open} onOpenChange={onOpenChange}>
        {trigger ? (
          <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("header.mail")}
                  {...mailHover}
                  className="size-9 shrink-0 rounded-xl [&_svg]:!size-5 relative pointer-coarse:after:absolute pointer-coarse:after:-inset-1"
                >
                  {mailIcon}
                  {/* --badge, not the brand token: see index.css for why a badge
                  is deliberately fixed rather than palette-derived. */}
                  {showBadge && (
                    <span className="absolute top-0.5 right-0.5 grid h-[0.9375rem] min-w-[0.9375rem] place-items-center rounded-full bg-badge px-1 text-[0.5625rem] font-bold leading-none text-badge-foreground ring-2 ring-background">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>{t("header.mail")}</TooltipContent>
          </Tooltip>
        )}

        {/* Ölçü tarifi — DÖRT panel aynı reçeteyi paylaşır. `align="end"` panelin
           sağ kenarını tetikleyiciye çivilediği için boşluğun tamamı tek yana
           düşer: `100vw-3rem` telefonda iki yana 24px bırakır, 26rem'den geniş
           ekranda 23rem kapağı kazanır. Telefonda yükseklik 26rem /
           `100dvh-8rem` (panel header'ın altında başlıyor); `sm:` dalı
           masaüstünün değerleri. Ölçümler: docs/features/header-panelleri.md. */}
        <PopoverContent
          ref={panelRef}
          side={side}
          align={align}
          sideOffset={side ? 14 : 8}
          collisionPadding={24}
          className="flex max-h-[min(26rem,calc(100dvh-8rem))] sm:max-h-[min(36rem,calc(100dvh-5rem))] w-[min(23rem,calc(100vw-3rem))] flex-col overflow-hidden gap-0 p-0"
        >
          {/* Same header grammar as the calendar panel: bold title on the left,
            + and … on the right, so the two dropdowns read as siblings. */}
          <div className="flex shrink-0 items-center gap-0.5 px-3 pt-3 pb-2">
            <h3 className="text-[0.9375rem] font-bold tracking-tight">{t("mail.title")}</h3>
            {showBadge && (
              <span className="ml-1.5 rounded-full bg-badge px-1.5 py-0.5 text-[0.625rem] font-semibold text-badge-foreground">
                {t("mail.unreadToday", { count: unread })}
              </span>
            )}
            <div className="ml-auto flex items-center gap-0.5">
              <a
                href="https://outlook.office.com/mail/deeplink/compose"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("mail.newMail")}
                title={t("mail.newMail")}
                className="grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
              >
                <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
              </a>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("mail.moreOptions")}
                    className="grid size-6 place-items-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
                  >
                    <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" strokeWidth={2} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[10rem]">
                  <DropdownMenuItem asChild>
                    <a
                      href="https://outlook.office.com/mail/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("mail.openOutlook")}
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={refresh}>{t("mail.refresh")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <Separator className="shrink-0" />

          <div className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/15">
            {status === "loading" && (
              <div className="space-y-3 px-4 py-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Names the permission so whoever reads it knows what to ask for,
              and offers a retry — the moment an admin grants it, the panel
              must be recoverable without the user knowing to reload. What it
              deliberately does NOT offer is a "grant access" button: that
              would fire an interactive redirect and, if user consent is
              disabled tenant-wide, land on an "Approval required" wall. */}
            {status === STATUS.denied && (
              <PanelStateMessage
                icon={Alert02Icon}
                title={staleSession ? t("mail.staleTitle") : t("mail.permissionTitle")}
                body={staleSession ? t("mail.staleBody") : t("mail.permissionBody")}
                action={staleSession ? t("mail.connect") : t("mail.retry")}
                onAction={staleSession ? connect : refresh}
              />
            )}
            {status === STATUS.error && (
              <PanelStateMessage
                icon={Alert02Icon}
                title={t("mail.error")}
                body={t("mail.errorBody")}
                action={t("mail.retry")}
                onAction={refresh}
              />
            )}
            {status === STATUS.unauthenticated && <PanelStateMessage title={t("mail.signedOut")} />}

            {status === STATUS.ready && messages.length === 0 && (
              <PanelStateMessage title={t("mail.noMessages")} />
            )}

            {status === STATUS.ready &&
              messages.length > 0 &&
              groupByDay(messages).map((group) => (
                <section key={group.key}>
                  {/* The calendar's grey day band, reused verbatim — the two
                    panels sit two icons apart and must not invent two
                    different ways of saying "today". */}
                  <h4 className="sticky top-0 z-10 flex items-baseline gap-1.5 border-b border-border/40 bg-muted/80 px-3 py-1.5 text-[0.6875rem] font-semibold text-foreground/75 backdrop-blur">
                    <span className="inline-block [&::first-letter]:uppercase">
                      {!group.day
                        ? t("mail.earlier")
                        : group.day.getTime() === today.getTime()
                          ? t("calendar.today")
                          : group.day.getTime() === yesterday.getTime()
                            ? t("mail.yesterday")
                            : getDateTimeFormat(locale, OPTS_DAY_LONG).format(group.day)}
                    </span>
                  </h4>
                  <ul className="divide-y divide-border/30">
                    {group.items.map((m) => (
                      <MailRow
                        key={m.id}
                        m={m}
                        photo={photoOf(m.fromAddress)}
                        panelRef={panelRef}
                        onExpand={setReader}
                      />
                    ))}
                  </ul>
                </section>
              ))}
          </div>

          <Separator className="shrink-0" />
          <PanelFooterAction as="a" external href="https://outlook.office.com/mail/">
            {t("mail.openOutlook")}
          </PanelFooterAction>
        </PopoverContent>
      </Popover>
      <MailReaderDialog
        mail={reader}
        photo={reader ? photoOf(reader.fromAddress) : undefined}
        onOpenChange={() => setReader(null)}
      />
    </>
  )
}
