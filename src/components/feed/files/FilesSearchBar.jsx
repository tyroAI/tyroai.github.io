import { FILES_PAGE } from "@/lib/filesPolicy"
import { activeFilterCount } from "@/lib/filesQuery"
import {
  ActiveChips,
  FilterBar,
  FilterSheetButton,
  RefreshButton,
  SearchBox,
  SourceTrack,
} from "./FilesToolbar"

/** Arama satırı + kaynak şeridi + süzgeçler (dar kapsayıcıda süzgeçler sayfada). */
export function FilesSearchBar({
  t,
  text,
  setText,
  setQ,
  placeholder,
  inputRef,
  busy,
  filters,
  setFilter,
  clearAll,
  showPerson,
  personOptions,
  counts,
  activeCount,
  showRefresh,
  refreshing,
  onRefresh,
  source,
  setSource,
}) {
  return (
    // ⚠️ YALNIZ ARAMA SATIRI YAPIŞKAN (§12.12, ≤ 64 px): şerit + süzgeçlerle
    // bütün blok 1366×657'de ekranın beşte birini kaplıyordu.
    <div className="flex min-w-0 flex-col gap-2.5">
      <div
        role="search"
        aria-label={t("myfiles.search.label")}
        className="flex min-w-0 items-center gap-2 @[34rem]/files:sticky @[34rem]/files:top-0 @[34rem]/files:z-10 @[34rem]/files:-mx-1 @[34rem]/files:bg-background/95 @[34rem]/files:px-1 @[34rem]/files:py-1.5 @[34rem]/files:backdrop-blur-sm"
      >
        <SearchBox
          value={text}
          onChange={setText}
          onSubmit={() => setQ(text.trim())}
          placeholder={placeholder}
          inputRef={inputRef}
          busy={busy}
        />
        <div className="@[34rem]/files:hidden">
          <FilterSheetButton
            filters={filters}
            onFilter={setFilter}
            onClearAll={clearAll}
            activeCount={activeFilterCount(filters)}
            showPerson={showPerson}
            personOptions={personOptions}
            typeCounts={counts}
          />
        </div>
        {showRefresh && <RefreshButton refreshing={refreshing} onRefresh={onRefresh} />}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <SourceTrack value={source} onChange={setSource} />
        <div className="hidden min-w-0 @[34rem]/files:flex">
          <FilterBar
            filters={filters}
            onFilter={setFilter}
            onClearAll={clearAll}
            activeCount={activeCount}
            showPerson={showPerson}
            personOptions={personOptions}
            typeCounts={counts}
          />
        </div>
      </div>
      <div className="@[34rem]/files:hidden">
        <ActiveChips filters={filters} onFilter={setFilter} />
      </div>
      {text.trim().length > 0 && text.trim().length < FILES_PAGE.minQuery && (
        <p className="px-1 text-[0.75rem] text-muted-foreground">{t("files.searchShort")}</p>
      )}
    </div>
  )
}
