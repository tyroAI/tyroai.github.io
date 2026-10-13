import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { EventDetailCard } from "@/components/common/event-detail/EventDetailCard"
import { MailDetailCard } from "@/components/common/mail/MailDetailCard"
import { useLocale } from "@/hooks/useLocale"
import { TaskPreviewCard } from "./TaskPreviewCard"

/**
 * Özetin önizlemesinin içi, türüne göre — yan kartta ve telefondaki pencerede
 * aynı: toplantı (`EventDetailCard`, yanıt düğmeleriyle), posta (çentikteki
 * posta kartı `MailDetailCard`), Keşfet bildirimi (aynı kart, eylemi
 * "Keşfet'te aç"), görev (`TaskPreviewCard`). `item.openTo`: görev ya da
 * bildirimin uygulama içi adresi.
 */
export function PreviewContent({ kind, item, onDone }) {
  const { t } = useLocale()
  if (kind === "event") return <EventDetailCard event={item} onAnswered={onDone} />
  if (kind === "task") return <TaskPreviewCard task={item} openTo={item.openTo} />
  if (kind === "post") {
    return (
      <MailDetailCard
        m={{
          id: item.id,
          subject: item.subject,
          from: item.author,
          received: item.received,
          isRead: true,
        }}
        footer={
          <Link
            to={item.openTo}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[0.75rem] font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            {t("myspace.tip.posts.open")}
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className="size-3.5 rtl:rotate-180"
              strokeWidth={2}
              aria-hidden="true"
            />
          </Link>
        }
      />
    )
  }
  return <MailDetailCard m={item} />
}
