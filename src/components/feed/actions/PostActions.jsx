import { HugeiconsIcon } from "@hugeicons/react"
import AiChat02Icon from "@hugeicons/core-free-icons/AiChat02Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { ActionButton } from "./ActionButton"
import { LikeButton } from "./LikeButton"
import { SaveButton } from "./SaveButton"
import { ShareMenu } from "./ShareMenu"

/**
 * Gönderinin eylem satırı — Instagram düzeni: solda yazısız küme (Beğen · TYRO ile özetle ·
 * Paylaş; TYRO balonu Instagram'daki yorum balonunun yerinde), sağda Kaydet. Adlar ipucunda ve
 * `aria-label`da. Etiketli ve satıra yayılmış ilk sürüm gönderiden kopuk, dağınık duruyordu.
 * Kart ve okuma bölmesi aynı satırı çizer; durum ortak depodan gelir.
 */
export function PostActions({ post, onAsk, className }) {
  const { t } = useLocale()
  const subject = post.subject || t("feed.noSubject")
  return (
    <div
      role="group"
      aria-label={t("feed.actions.aria")}
      className={cn("flex min-w-0 items-center justify-between gap-2", className)}
    >
      <div className="flex items-center gap-0.5">
        <LikeButton post={post} />
        <ActionButton
          icon={<HugeiconsIcon icon={AiChat02Icon} strokeWidth={1.7} />}
          label={t("feed.ask")}
          aria-label={t("feed.actions.askAria", { subject })}
          onClick={onAsk}
        />
        <ShareMenu post={post} />
      </div>
      <SaveButton post={post} />
    </div>
  )
}
