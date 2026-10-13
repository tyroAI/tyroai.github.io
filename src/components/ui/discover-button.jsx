import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight02Icon from "@hugeicons/core-free-icons/ArrowRight02Icon"
import { cn } from "@/lib/utils"
import "./discover-button.css"

/**
 * Discover düğmesi — Obsidian UI › discover-button (MIT,
 * github.com/Atharvsinh-codez/ObsidianUI), JSX'e uyarlandı: ok Hugeicons, renkler
 * paletten (`discover-button.css`). `href` verilirse bağlantı, yoksa düğme; kalan
 * özellikler (disabled, aria-describedby, style…) öğeye geçer.
 */
export function DiscoverButton({ label, href, onClick, className, icon = ArrowRight02Icon, ...props }) {
  const face = (
    <>
      <span className="discover-button__fill" aria-hidden="true" />
      <span className="discover-button__icon" aria-hidden="true">
        <HugeiconsIcon icon={icon} className="size-6" strokeWidth={2} />
      </span>
      <span className="discover-button__text">{label}</span>
    </>
  )

  if (href) {
    return (
      <a className={cn("discover-button", className)} href={href} {...props}>
        {face}
      </a>
    )
  }

  return (
    <button type="button" className={cn("discover-button", className)} onClick={onClick} {...props}>
      {face}
    </button>
  )
}
