import { useLocale } from "@/hooks/useLocale"
import { AgendaDay } from "./AgendaDay"
import { StateMessage } from "./StateMessage"

/**
 * Aramanın sonucu: yalnız eşleşen günler (boş gün listelenmez — aranan şey
 * "o gün boş mu" değil) ve üstte kaç sonuç bulunduğu, aramanın kapsamıyla.
 */
export function SearchResults({ buckets, dayLabel }) {
  const { t } = useLocale()
  const count = buckets.reduce((n, b) => n + b.events.length, 0)
  return (
    <>
      <p className="px-3.5 pb-1.5 pt-2.5 text-[0.6875rem] text-muted-foreground" aria-live="polite">
        <span className="font-semibold text-foreground/80">
          {t("calendar.searchCount", { n: count })}
        </span>
        <span aria-hidden="true"> · </span>
        {t("calendar.searchScope")}
      </p>
      {count === 0 ? (
        <StateMessage title={t("calendar.searchNone")} />
      ) : (
        buckets.map((bucket) => (
          <AgendaDay key={bucket.day.toISOString()} bucket={bucket} label={dayLabel(bucket.day)} />
        ))
      )}
    </>
  )
}
