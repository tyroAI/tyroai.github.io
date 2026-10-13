import { Link } from "react-router-dom"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@/lib/utils"

/**
 * Bütün widget'ların ortak kabuğu — kart dili tek: solda ikon + sessiz
 * başlık, sağ üstte sayfa çevirici (`pager`, liste kartlarında) ve TEK eylem,
 * altında gövde (dar kartta isteğe bağlı kısa başlık, `shortTitle`). Yeni bir widget yalnız gövdesini
 * yazar; ileride ekle/çıkar/sürükle bu kabuğun üstüne kurulacak
 * (`data-widget` kimlik).
 */
export function WidgetFrame({
  id,
  title,
  shortTitle,
  icon,
  action,
  pager,
  busy,
  className,
  children,
}) {
  return (
    <section
      data-widget={id}
      aria-label={title}
      aria-busy={busy || undefined}
      className={cn(
        "ms-surface @container/widget relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.75rem] p-5",
        className,
      )}
    >
      <header className="flex min-h-7 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-[0.8125rem] font-medium text-muted-foreground">
          {icon && (
            <HugeiconsIcon
              icon={icon}
              className="size-4 shrink-0 text-muted-foreground/60"
              strokeWidth={1.8}
            />
          )}
          {/* `shortTitle`: dar kartta (içerik < 16rem) başlık kesilmesin diye kısa ad. */}
          <span className={cn("truncate", shortTitle && "@max-[16rem]/widget:hidden")}>
            {title}
          </span>
          {shortTitle && (
            <span className="hidden truncate @max-[16rem]/widget:inline">{shortTitle}</span>
          )}
        </h3>
        {pager || action ? (
          <span className="flex shrink-0 items-center gap-1">
            {pager}
            {action}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  )
}

/** Başlık satırındaki tek eylem: küçük, sessiz bir hap (`to` → iç bağlantı, `href` → dış). */
export function FrameAction({ children, className, ...rest }) {
  const Tag = rest.to ? Link : rest.href ? "a" : "button"
  return (
    <Tag
      {...(Tag === "button" ? { type: "button" } : {})}
      {...rest}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[0.71875rem] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        className,
      )}
    >
      {children}
    </Tag>
  )
}
