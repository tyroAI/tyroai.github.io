import { useRef } from "react"
import { FavouriteIcon } from "@/components/ui/favourite"
import { useFeedLike } from "@/hooks/useFeedLike"
import { useLocale } from "@/hooks/useLocale"
import { getNumberFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"
import { ActionButton } from "./ActionButton"

const COMPACT = { notation: "compact" }

/**
 * Beğen — kalp. Beğenince dolar, paletin yazı rengini alır ve bir kez atar (`ui/favourite`;
 * `prefers-reduced-motion`'da atmaz). Ad sabit ("Beğen"), durum `aria-pressed`ta. Sayı
 * yalnız depo verirse (`count != null`) çizilir — yerel depoda yok.
 */
export function LikeButton({ post, showLabel, className }) {
  const { t, locale } = useLocale()
  const { liked, count, toggle } = useFeedLike(post)
  const heart = useRef(null)
  const subject = post.subject || t("feed.noSubject")
  const shown = count != null ? getNumberFormat(locale, COMPACT).format(count) : null
  const name = t("feed.actions.likeAria", { subject })
  return (
    <ActionButton
      aria-pressed={liked}
      aria-label={shown ? `${name} · ${shown}` : name}
      label={t("feed.actions.like")}
      tip={t(liked ? "feed.actions.liked" : "feed.actions.like")}
      showLabel={showLabel}
      className={className}
      onClick={() => {
        if (toggle()) heart.current?.startAnimation?.()
      }}
      icon={
        <FavouriteIcon
          ref={heart}
          size={20}
          className={cn("grid shrink-0", liked && "[&_path]:fill-current")}
        />
      }
    >
      {shown && <span className="tabular-nums">{shown}</span>}
    </ActionButton>
  )
}
