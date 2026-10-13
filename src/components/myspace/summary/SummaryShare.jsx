import { HugeiconsIcon } from "@hugeicons/react"
import BubbleChatIcon from "@hugeicons/core-free-icons/BubbleChatIcon"
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import Share08Icon from "@hugeicons/core-free-icons/Share08Icon"
import WhatsappIcon from "@hugeicons/core-free-icons/WhatsappIcon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { outlookMail, whatsApp } from "@/lib/celebrate"
import { clip } from "@/lib/meetingInsights"
import { showResultToast } from "@/lib/refreshToast"

const BTN =
  "inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[0.8125rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
// Bağlantıların taşıyabildiği uzunluk: e-posta gövdesi ve WhatsApp metni.
const MAIL_MAX = 6000
const WA_MAX = 3000

/**
 * Özetin eylemleri: Kopyala · Paylaş (Outlook e-postası katılımcılara ·
 * Teams toplantı sohbeti · WhatsApp) · Teams'te aç. Teams'e hazır mesaj
 * gönderen bir bağlantı yok (toplantı sohbeti için): özet panoya alınır ve
 * sohbet açılır, kişi yapıştırır — bunu söyleyen bir bildirimle.
 */
export function SummaryShare({ text, subject, attendees, chatUrl, t }) {
  const copy = async (title = t("meetingSummary.copied"), detail) => {
    try {
      await navigator.clipboard.writeText(text)
      showResultToast({ title, detail })
    } catch {
      // Pano izni yoksa sessiz: metin ekranda, kişi seçip kopyalayabilir.
    }
  }
  const item = "gap-2.5 py-2 text-[0.8125rem]"
  const icon = (glyph, tone) => (
    <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${tone}`}>
      <HugeiconsIcon icon={glyph} className="size-4" strokeWidth={2} aria-hidden="true" />
    </span>
  )
  const mailHref = outlookMail(
    attendees.join(";"),
    t("meetingSummary.mailSubject", { subject }),
    clip(text, MAIL_MAX),
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => copy()}
        className={`${BTN} bg-brand text-white hover:brightness-110`}
      >
        <HugeiconsIcon icon={Copy01Icon} className="size-4" strokeWidth={2} aria-hidden="true" />
        {t("meetingSummary.copy")}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`${BTN} bg-brand/10 text-brand hover:bg-brand/15 aria-expanded:bg-brand/15`}
          >
            <HugeiconsIcon
              icon={Share08Icon}
              className="size-4"
              strokeWidth={2}
              aria-hidden="true"
            />
            {t("meetingSummary.share")}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" sideOffset={6} className="w-64 p-1.5">
          <DropdownMenuItem asChild className={item}>
            <a href={mailHref} target="_blank" rel="noopener noreferrer">
              {icon(Mail01Icon, "bg-[#0f6cbd]/12 text-[#0f6cbd] dark:text-[#6cb4f0]")}
              {t("meetingSummary.shareMail")}
            </a>
          </DropdownMenuItem>
          {chatUrl && (
            <DropdownMenuItem
              className={`${item} items-start`}
              onSelect={() => {
                copy(t("meetingSummary.copied"), t("meetingSummary.shareTeamsHint"))
                window.open(chatUrl, "_blank", "noopener,noreferrer")
              }}
            >
              {icon(BubbleChatIcon, "bg-[#5b5fc7]/12 text-[#5b5fc7] dark:text-[#a8abf0]")}
              <span className="min-w-0">
                <span className="block">{t("meetingSummary.shareTeams")}</span>
                <span className="mt-0.5 block text-[0.6875rem] leading-snug text-muted-foreground">
                  {t("meetingSummary.shareTeamsHint")}
                </span>
              </span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild className={item}>
            <a href={whatsApp(null, clip(text, WA_MAX))} target="_blank" rel="noopener noreferrer">
              {icon(WhatsappIcon, "bg-[#25d366]/15 text-[#128c7e] dark:text-[#4ade80]")}
              {t("meetingSummary.shareWhatsapp")}
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {chatUrl && (
        <a
          href={chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BTN} ms-auto text-muted-foreground hover:bg-accent hover:text-foreground`}
        >
          <HugeiconsIcon
            icon={BubbleChatIcon}
            className="size-4"
            strokeWidth={2}
            aria-hidden="true"
          />
          {t("meetingSummary.openTeams")}
        </a>
      )}
    </div>
  )
}
