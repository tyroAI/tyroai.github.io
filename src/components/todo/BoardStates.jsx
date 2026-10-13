import { HugeiconsIcon } from "@hugeicons/react"
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import { useLocale } from "@/hooks/useLocale"

/** Görünüm (ya da arama) boşsa: ne olduğu ve ne yapılabileceği, tek kutuda. */
export function EmptyState({ view, searching }) {
  const { t } = useLocale()
  const key = searching ? "search" : view?.startsWith("list:") ? "list" : view
  return (
    <div className="rounded-[1.5rem] border border-dashed border-border px-6 py-12 text-center">
      <HugeiconsIcon
        icon={searching ? Search01Icon : CheckmarkCircle02Icon}
        className="mx-auto mb-3 size-8 text-muted-foreground/35"
        strokeWidth={1.5}
      />
      <p className="text-[0.9375rem] font-medium text-foreground/85">{t(`todo.empty.${key}`)}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
        {t(`todo.emptyBody.${key}`)}
      </p>
    </div>
  )
}

/** Liste inerken satır iskeleti — gerçek satırın ölçüsünde. */
export function RowsSkeleton() {
  return (
    <div aria-hidden="true" className="ms-surface space-y-1 rounded-[1.5rem] p-2">
      {["78%", "54%", "66%", "42%", "70%"].map((w) => (
        <div key={w} className="flex items-center gap-3 px-3 py-3">
          <span className="ms-skeleton size-[1.125rem] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <span className="ms-skeleton block h-3 rounded-full" style={{ width: w }} />
            <span className="ms-skeleton block h-2.5 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
