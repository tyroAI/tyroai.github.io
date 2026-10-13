import { HugeiconsIcon } from "@hugeicons/react"

/** Akışın durum kartı (izin yok, hata, boş, arama sonucu yok): ikon · başlık · açıklama · eylem. */
export function FeedStateCard({ icon, title, body, action, onAction }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
      {icon && (
        <HugeiconsIcon
          icon={icon}
          className="mx-auto mb-2.5 size-8 text-muted-foreground/40"
          strokeWidth={1.5}
        />
      )}
      <p className="text-[0.875rem] font-medium text-foreground/85">{title}</p>
      {body && (
        <p className="mx-auto mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-lg border border-border bg-background px-3 py-1.5 text-[0.75rem] font-medium text-foreground/85 transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 pointer-coarse:min-h-11"
        >
          {action}
        </button>
      )}
    </div>
  )
}
