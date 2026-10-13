import { useLocale } from "@/hooks/useLocale"
import { ZoneGrid } from "./ZoneGrid"

/** "Diğer widget'lar" — ana bölümün altında, 1 → 2 → 4 sütun, satır boyu sabit. */
export function MoreWidgets({ render }) {
  const { t } = useLocale()
  return (
    <section aria-labelledby="widgets-more" className="mt-12 lg:mt-14">
      <div className="mb-5">
        <h2 id="widgets-more" className="text-[1.25rem] font-semibold tracking-[-0.02em]">
          {t("widgets.more")}
        </h2>
        <p className="mt-1 text-[0.8125rem] text-muted-foreground">{t("widgets.moreSub")}</p>
      </div>
      <ZoneGrid
        zone="more"
        className="grid grid-flow-row-dense gap-4 @[34rem]/myspace:auto-rows-[15rem] @[34rem]/myspace:grid-cols-2 @[72rem]/myspace:grid-cols-4"
        render={render}
      />
    </section>
  )
}
