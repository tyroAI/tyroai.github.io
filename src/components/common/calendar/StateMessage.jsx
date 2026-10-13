import { HugeiconsIcon } from "@hugeicons/react"

/** Takvim panelinin boş/izin/hata durumu: ikon, başlık, açıklama, tek eylem. */
export function StateMessage({ icon, title, body, action, onAction }) {
  return (
    <div className="px-6 py-8 text-center">
      {icon && (
        <HugeiconsIcon
          icon={icon}
          className="mx-auto mb-2 size-7 text-muted-foreground/40"
          strokeWidth={1.5}
        />
      )}
      <p className="text-[0.78125rem] font-medium text-foreground/80">{title}</p>
      {body && (
        <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted-foreground">{body}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 rounded-md border border-border px-2.5 py-1 text-[0.6875rem] font-medium text-foreground/80 transition hover:bg-accent/60 hover:text-foreground"
        >
          {action}
        </button>
      )}
    </div>
  )
}
