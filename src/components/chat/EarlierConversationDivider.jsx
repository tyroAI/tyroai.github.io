import { useLocale } from "@/hooks/useLocale"
import { bcp47 } from "@/lib/intl-cache"

/**
 * Geri getirilen dökümün başına düşen ince ayraç.
 *
 * Kalıcılık olmadan ekrandaki her satır bu ziyarette söylenmişti. Artık dünkü
 * bir yanıt en üstte duruyor olabilir — damgasız bırakmak onu az önce gelmiş
 * gibi okutur, ki mesajlaşma uygulamalarının gün başlıkları tam da bunun için
 * var.
 */
export function EarlierConversationDivider({ at }) {
  const { t, locale } = useLocale()
  const stamp = (() => {
    if (!at) return null
    const date = at instanceof Date ? at : new Date(at)
    if (Number.isNaN(date.getTime())) return null
    const tag = bcp47(locale)
    const time = date.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" })
    const isToday = new Date().toDateString() === date.toDateString()
    if (isToday) return `${t("chat.session.today", "Bugün")} ${time}`
    return `${date.toLocaleDateString(tag, { day: "numeric", month: "short" })} ${time}`
  })()

  return (
    <div className="flex items-center gap-2.5 px-1 pb-1" role="separator">
      <span className="h-px flex-1 bg-border/60" />
      <span className="whitespace-nowrap text-[0.65625rem] font-medium uppercase tracking-wider text-muted-foreground/70">
        {t("chat.session.earlier", "Önceki konuşma")}
        {stamp ? ` · ${stamp}` : ""}
      </span>
      <span className="h-px flex-1 bg-border/60" />
    </div>
  )
}
