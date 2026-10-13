import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon"
import Attachment01Icon from "@hugeicons/core-free-icons/Attachment01Icon"
import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon"
import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon"
import SquareArrowExpand01Icon from "@hugeicons/core-free-icons/SquareArrowExpand01Icon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
import { Separator } from "@/components/ui/separator"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { useLocale } from "@/hooks/useLocale"
import { useMailBody } from "@/hooks/useMailMessages"
import { setPendingAsk, requestOpenChat } from "@/lib/chatBus"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { OPTS_FULL_STAMP, mailFrameDoc } from "./mailFormat"

/**
 * The hover card: the message opened just far enough to decide.
 *
 * Everything on it is already in hand from the list fetch — bodyPreview is
 * Graph's own first-lines snippet — so hovering costs nothing and never
 * fires a second read. The two real actions are the same pair the calendar
 * card offers: open the thing where it lives (OWA), or hand it to the
 * in-app assistant through the pending-ask channel to draft the reply.
 */
export function MailDetailCard({ m, photo, footer }) {
  const { t, locale } = useLocale()
  // Lazy by construction: this component only mounts while the card is open.
  // Until the full text lands (or if the fetch is denied) the 255-char
  // bodyPreview keeps the card useful.
  const fullBody = useMailBody(m.id)

  function draftWithAssistant() {
    // t(key, vars), never a .replace() chain: subjects and previews are free
    // text, and String.replace expands $-patterns in its replacement — a
    // subject like "Bütçe $$4M" would reach the assistant mangled.
    setPendingAsk({
      question: t("mail.assistPrompt", {
        from: m.from || t("mail.unknownSender"),
        subject: m.subject || t("mail.noSubject"),
        preview: m.preview || "—",
      }),
      // Mail work belongs to the office agent when the catalog carries it;
      // ChatScreen falls back to the current agent when it doesn't.
      agent: "tyro office",
    })
    requestOpenChat({ focusComposer: true })
  }

  const toLine = m.to?.length
    ? m.to.slice(0, 3).join(", ") + (m.to.length > 3 ? ` +${m.to.length - 3}` : "")
    : ""

  return (
    <div className="flex min-h-0 flex-col text-[0.75rem]">
      <div className="shrink-0 p-3.5 pb-3">
        <div className="flex items-start gap-2.5">
          <PersonAvatar name={m.from || "?"} photo={photo} className="mt-0.5 size-9" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 truncate text-[0.8125rem] font-semibold">
                {m.from || t("mail.unknownSender")}
              </span>
              {!m.isRead && (
                <span className="shrink-0 rounded-full bg-brand/10 px-1.5 py-0.5 text-[0.59375rem] font-semibold text-brand-deep">
                  {t("mail.unreadTag")}
                </span>
              )}
            </div>
            {m.fromAddress && (
              <p className="truncate text-[0.6875rem] text-muted-foreground">{m.fromAddress}</p>
            )}
          </div>
          {m.webLink && (
            <a
              href={m.webLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("mail.openOutlook")}
              title={t("mail.openOutlook")}
              className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-accent/60 hover:text-foreground"
            >
              <HugeiconsIcon icon={SquareArrowExpand01Icon} className="size-3.5" strokeWidth={2} />
            </a>
          )}
        </div>

        <p className="mt-2.5 text-[0.875rem] font-semibold leading-snug">
          {m.subject || t("mail.noSubject")}
        </p>

        <div className="mt-2 space-y-1.5 text-foreground/85">
          {m.received && (
            <p className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Clock01Icon}
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.8}
              />
              <span className="inline-block min-w-0 truncate [&::first-letter]:uppercase">
                {getDateTimeFormat(locale, OPTS_FULL_STAMP).format(m.received)}
              </span>
            </p>
          )}
          {toLine && (
            <p className="flex items-center gap-2">
              <HugeiconsIcon
                icon={UserGroupIcon}
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={1.8}
              />
              <span className="min-w-0 truncate">{t("mail.to", { names: toLine })}</span>
            </p>
          )}
          {(m.hasAttachments || m.importance === "high") && (
            <p className="flex items-center gap-3">
              {m.importance === "high" && (
                <span className="flex items-center gap-1 font-semibold text-destructive">
                  <HugeiconsIcon icon={Alert02Icon} className="size-3.5" strokeWidth={2} />
                  {t("mail.important")}
                </span>
              )}
              {m.hasAttachments && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <HugeiconsIcon icon={Attachment01Icon} className="size-3.5" strokeWidth={1.8} />
                  {t("mail.hasAttachment")}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {(fullBody?.html || fullBody?.text || m.preview) && (
        <>
          <Separator className="shrink-0" />
          {fullBody?.html ? (
            /* Postanın KENDİ biçimi — tablolar, alıntılar, imza. Düz metne
               indirmek postayı okunur kılan şeyi atıyordu.
               Sandbox BOŞ: script yok, form yok, same-origin yok. Üstüne
               iframe'in içine bir içerik politikası konuyor — `default-src
               'none'` uzaktaki her şeyi keser, yani takip pikselleri de
               yüklenmez (posta istemcilerinin varsayılanı budur); yalnızca
               satır içi stil ve gömülü görsel geçer. Böylece sanitize
               kütüphanesi olmadan da postanın HTML'i uygulamaya dokunamaz. */
            <iframe
              title={m.subject || t("mail.noSubject")}
              sandbox=""
              /* Yükseklik de ekranın: 932px'lik bir ekranda 320px, 722px'lik
                 bir dizüstünde 303px — sabit 260px ikisinde de aynı küçük
                 pencereyi veriyordu. */
              className="h-[min(20rem,42vh)] min-h-0 w-full shrink border-0 bg-white"
              srcDoc={mailFrameDoc(fullBody.html)}
            />
          ) : (
            /* Metin gövde ya da henüz gelmemiş: kırpma YOK, kendi içinde
               kayar — "devamını göreyim" isteğinin karşılığı. */
            <div className="min-h-0 max-h-[min(20rem,42vh)] shrink overflow-y-auto overscroll-contain p-3.5 py-3">
              <p className="whitespace-pre-line text-[0.71875rem] leading-relaxed text-muted-foreground">
                {fullBody?.text || m.preview}
              </p>
            </div>
          )}
        </>
      )}

      <Separator className="shrink-0" />
      {/* `footer`: çağıranın kendi eylemi (ör. Keşfet bildirimi → "Keşfet'te aç"). */}
      {footer ? (
        <div className="shrink-0 p-3.5 py-3">{footer}</div>
      ) : (
        <div className="flex shrink-0 items-center gap-2 p-3.5 py-3">
          <a
            href={m.webLink ?? "https://outlook.office.com/mail/"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[0.75rem] font-semibold text-white transition hover:brightness-110"
          >
            <HugeiconsIcon icon={Mail01Icon} className="size-3.5" strokeWidth={2} />
            {t("mail.openOutlook")}
          </a>
          <button
            type="button"
            onClick={draftWithAssistant}
            className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-brand/30 bg-brand/5 px-3 py-1.5 text-[0.75rem] font-semibold text-brand transition hover:bg-brand/10"
          >
            <HugeiconsIcon icon={AiChat02Icon} className="size-3.5 shrink-0" strokeWidth={2} />
            {t("mail.assist")}
          </button>
          {/* ⚠️ ETİKETSİZ "genişlet" glifi BURADAN KALKTI: satırın kendisi
            artık geniş okuyucuyu açıyor, yani glif önündeki satırla aynı
            işi yapan ikinci bir hedefti. Keşfet kartında da aynı gerekçeyle
            temizlendi — aynı yüzeyde iki hedef, hangisinin ne yaptığını
            ancak tıklayınca öğreten bir arayüz demek. */}
        </div>
      )}
    </div>
  )
}
