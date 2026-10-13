import { HugeiconsIcon } from "@hugeicons/react"
import Bookmark02Icon from "@hugeicons/core-free-icons/Bookmark02Icon"
import { useFeedSave } from "@/hooks/useFeedSave"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { ActionButton } from "./ActionButton"

/**
 * Kaydet — yer imi. Basınca gönderi To Do'ya "sonra oku" görevi olur (`useFeedSave`), yer imi
 * dolar; dolu yer imine basmak kaydı kaldırır. İstek yolda iken `aria-busy`, ikinci basış
 * yok sayılır (`disabled` değil: odak düşmesin).
 */
export function SaveButton({ post, showLabel, className }) {
  const { t } = useLocale()
  const { saved, busy, toggle } = useFeedSave(post)
  const subject = post.subject || t("feed.noSubject")
  return (
    <ActionButton
      aria-pressed={saved}
      aria-busy={busy || undefined}
      aria-label={t("feed.actions.saveAria", { subject })}
      label={t("feed.actions.save")}
      tip={t(saved ? "feed.actions.saved" : "feed.actions.save")}
      showLabel={showLabel}
      className={className}
      onClick={toggle}
      icon={
        <HugeiconsIcon
          icon={Bookmark02Icon}
          strokeWidth={1.8}
          className={cn(saved && "[&_path]:fill-current")}
        />
      }
    />
  )
}
