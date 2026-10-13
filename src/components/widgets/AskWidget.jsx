import { AskBox } from "@/components/myspace/AskBox"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * Soru kutusu ve hazır sorular — Anasayfa'nın `AskBox`ı AYNEN, çerçevesiz (kart
 * değil; Anasayfa'daki gibi kutu ve kutucuklar sayfanın üstünde). Hücrenin
 * boyu sabit: kutucuklar kalan yüksekliği eşit satırlarla paylaşır.
 */
export function AskWidget({ briefCta, onNewChat, className }) {
  const { t } = useLocale()
  return (
    <section
      data-widget="ask"
      aria-label={t("widgets.ask.title")}
      className={cn(
        "@container/hero flex min-w-0 flex-col",
        "[&_form]:mt-0 [&_[role=group]]:min-h-0 [&_[role=group]]:flex-1 [&_[role=group]]:auto-rows-fr",
        className,
      )}
    >
      <AskBox briefCta={briefCta} onNewChat={onNewChat} />
    </section>
  )
}
