import { useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Attachment01Icon from "@hugeicons/core-free-icons/Attachment01Icon"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { MailDetailCard } from "./MailDetailCard"
import { stamp } from "./mailFormat"

/**
 * Liste satırı + üstüne gelince açılan OKUMA BÖLMESİ (`MailDetailCard`).
 *
 * ── KONUM: KART SATIRA DEĞİL, PANELİN ÜST KENARINA HİZALANIR ───────────
 * Eski hâl `align="start"`la satırın üstüne hizalanıyor, alttaki satırlarda
 * Radix kartı görüntü alanına sığdırmak için yukarı kaydırıyordu — kart her
 * satırda başka yerden başlıyor, panelle hizası rastgele görünüyordu ve
 * sahada bir kez altı ekrandan taştı (düğmeler yarım; ölçüldü: ~33px).
 * Şimdi kart bir okuma bölmesi gibi panelin YANINDA ve ÜSTÜYLE aynı
 * hizada açılır; hangi satıra gelinirse gelinsin yeri aynı. Hesap
 * `onOpenChange`te: panel üstü − satır üstü → `alignOffset`.
 *
 * ⚠️ Kancalar satır başına (`useState`/`useRef`), o yüzden `items.map`
 * içinde inline değil ayrı bileşen — bu deponun `NavSecondaryRow` kuralı.
 */
export function MailRow({ m, photo, panelRef, onExpand }) {
  const { t, locale } = useLocale()
  const rowRef = useRef(null)
  const [offset, setOffset] = useState(0)
  return (
    <li>
      <HoverCard
        openDelay={250}
        closeDelay={150}
        onOpenChange={(next) => {
          // Kart AÇILIRKEN ölç: satırın üstü panelin üstünden ne kadar aşağıda?
          // Negatif `alignOffset` kartı o kadar yukarı alır → üst kenarı
          // panelin üst kenarıyla aynı hizada başlar (okuma bölmesi). Radix
          // aynı render'da konumlar; state burada set edildiği için ilk
          // konum doğru, sonradan zıplama yok.
          if (next && rowRef.current && panelRef?.current) {
            setOffset(
              Math.round(
                panelRef.current.getBoundingClientRect().top -
                  rowRef.current.getBoundingClientRect().top,
              ),
            )
          }
        }}
      >
        <HoverCardTrigger asChild>
          {/* Satır bir DÜĞME: tıklama geniş okuma penceresini açar, Outlook
              yolu pencerenin altında. Bedeli: orta tuş / Cmd+tık ile "yeni
              sekmede aç" yok — gidilecek yer bir sekme değil, aynı sayfadaki
              pencere. */}
          <button
            type="button"
            ref={rowRef}
            onClick={() => onExpand?.(m)}
            className={cn(
              "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-accent/40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
              !m.isRead && "bg-accent/20",
            )}
          >
            {/* Unread carries THREE cues (dot, bold, tinted
                row) because any one alone disappears when the
                list is skimmed at arm's length. */}
            <span
              aria-hidden="true"
              className={cn(
                "mt-3 size-1.5 shrink-0 rounded-full",
                m.isRead ? "bg-transparent" : "bg-brand",
              )}
            />
            <PersonAvatar name={m.from || "?"} photo={photo} className="mt-0.5 size-8" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "truncate text-[0.75rem]",
                    m.isRead ? "text-muted-foreground" : "font-semibold text-foreground",
                  )}
                >
                  {m.from || t("mail.unknownSender")}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[0.625rem] tabular-nums text-muted-foreground">
                  {m.importance === "high" && <span className="font-bold text-destructive">!</span>}
                  {m.hasAttachments && (
                    <HugeiconsIcon
                      icon={Attachment01Icon}
                      className="size-3 text-muted-foreground/60"
                      strokeWidth={1.8}
                    />
                  )}
                  {stamp(m.received, locale)}
                </span>
              </div>
              <p
                className={cn(
                  "truncate text-[0.75rem] leading-snug",
                  m.isRead ? "text-foreground/70" : "font-medium text-foreground",
                )}
              >
                {m.subject || t("mail.noSubject")}
              </p>
              {m.preview && (
                <p className="mt-0.5 line-clamp-1 text-[0.6875rem] text-muted-foreground">
                  {m.preview}
                </p>
              )}
            </div>
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="left"
          align="start"
          alignOffset={offset}
          sideOffset={10}
          /* ⚠️ `sticky="always"`: Radix'in varsayılan `partial` kipi
             (`limitShift`) kartı satıra "yapışık" tutmak için kaydırmayı
             sınırlar — okuma bölmesi bilerek satırdan ayrılıyor, sınır
             kalkmalı. `collisionPadding`: kart görüntü alanının kenarına
             yaslanmaz, 12px nefes. `updatePositionStrategy="always"`:
             gövde SONRADAN geliyor (önizleme → iframe, ~+250px) ve kart
             büyüyor; ResizeObserver bunu genelde yakalıyor ama sahada
             ~33px'lik bir artık taşma ölçüldü (düğmeler ekranın altında
             kaldı). Her karede yeniden konumlamak, kart açıkken birkaç
             getBoundingClientRect — bir hover kartı için ucuz, ve "asla
             taşmaz" güvencesi ölçüldü. */
          sticky="always"
          collisionPadding={12}
          updatePositionStrategy="always"
          /* SABİT 21,5rem'di; geniş ekranda gereksiz dar, dar ekranda taşma
             riski. Artık ekranın payından alıyor. Yükseklik de tavanlı ve
             kart bir flex sütun: gövde (iframe/metin) daralır, başlık ve
             düğme satırı hiç daralmaz — kart görüntü alanına sığmasa bile
             "Outlook'ta aç · TYRO ile yanıtla" hep görünür. */
          className="flex max-h-[calc(100dvh-1.5rem)] w-[min(26rem,calc(100vw-3rem))] flex-col overflow-hidden p-0"
        >
          <MailDetailCard m={m} photo={photo} />
        </HoverCardContent>
      </HoverCard>
    </li>
  )
}
