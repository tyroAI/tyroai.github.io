import { ListSummary } from "./ListSummary"
import { SuspectNote } from "./SuspectNote"

/**
 * Liste başlığı: solda süzülmüş özet ("6 kayıt · ₺12.400 · 1 toplam dışı"; liste boşken yalnız
 * tutarsız kayıt uyarısı), sağda dar kapta (< 52rem) `actions` — Rapor ve Sor düğmeleri: geniş
 * kapta ikisi sağ kolonda, dar kapta listenin üstüne serilmez.
 */
export function ListHead({ tab, view, failed, suspect, actions }) {
  const listed = !failed && view.groups.length > 0
  return (
    // Özet uzunsa (masrafta birden çok para birimi) düğmeler alt satıra, sağa geçer.
    <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
      <div className="min-w-0 flex-1 basis-auto">
        {listed ? (
          <ListSummary
            tab={tab}
            summary={view.listSummary}
            facetLabel={view.facetOptions.find((o) => o.key === view.filters.facet)?.label}
            suspect={suspect}
          />
        ) : (
          !failed &&
          suspect?.length > 0 && (
            <div className="flex px-1">
              <SuspectNote items={suspect} />
            </div>
          )
        )}
      </div>
      {actions && (
        <div className="ms-auto flex shrink-0 items-center gap-1.5 @[52rem]/ss:hidden">
          {actions}
        </div>
      )}
    </div>
  )
}
