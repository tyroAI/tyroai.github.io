import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import File01Icon from "@hugeicons/core-free-icons/File01Icon"
import FilterHorizontalIcon from "@hugeicons/core-free-icons/FilterHorizontalIcon"
import FilterRemoveIcon from "@hugeicons/core-free-icons/FilterRemoveIcon"
import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon"
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon"
import Sorting01Icon from "@hugeicons/core-free-icons/Sorting01Icon"
import UserIcon from "@hugeicons/core-free-icons/UserIcon"
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Kbd } from "@/components/ui/kbd"
import { useLocale } from "@/hooks/useLocale"
import { DATE_PRESETS, TYPE_FAMILIES } from "@/lib/filesQuery"
import { NEUTRAL_TONE } from "@/lib/fileMeta"
import { cn } from "@/lib/utils"
import { FilterChip } from "./FilterChip"
import { stopEscape } from "./menuEscape"

export { SourceTrack } from "./SourceTrack"

/**
 * DOSYALARIM ARAÇ ÇUBUĞU — arama · yenile · kaynak şeridi · süzgeçler.
 *
 * ⚠️ **ÇİP HEM DÜĞME HEM DURUM.** Etkin süzgeç ayrı bir "etkin süzgeçler"
 * satırında İKİNCİ kez çizilmez: çipin kendisi değeri yazıyor ("PDF +1") ve
 * yanındaki × onu kaldırıyor (iki KARDEŞ düğme — iç içe düğme yok). Dar
 * kapsayıcıda (<34rem) çipler tek bir "Süzgeçler" düğmesine ve alttan açılan
 * bir sayfaya toplanıyor; orada değerler görünmediği için yalnız ETKİN
 * olanlar kaldırılabilir çip olarak altta duruyor. Süzgeç bir genişlikte bir
 * kez çiziliyor.
 *
 * ⚠️ **ÜÇ ŞERİT, ÜÇ GİYSİ.** Keşfet'in bölüm sekmeleri altı çizili, bu
 * sayfanın kaynak şeridi raylı SEGMENT (kapsam), süzgeçler HAP — iki şeridin
 * aynı giysiyi giymemesi sayfanın kuralı (`FEED_VIEWS` notu).
 */

/**
 * ARAMA KUTUSU — panonun en üst satırı, her görünümde aynı yerde. 48px yüksek
 * `ms-surface` hap: sayfanın birincil eylemi o ve kartların diliyle konuşuyor.
 */
export function SearchBox({ value, onChange, onSubmit, placeholder, inputRef, busy }) {
  const { t } = useLocale()
  return (
    <label className="relative flex min-w-0 flex-1 items-center">
      <span className="sr-only">{t("myfiles.search.label")}</span>
      <HugeiconsIcon
        icon={Search01Icon}
        className={cn(
          "pointer-events-none absolute left-4 size-[1.125rem] text-muted-foreground",
          busy && "animate-pulse text-brand-ink motion-reduce:animate-none",
        )}
        strokeWidth={1.9}
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            onSubmit?.()
          }
          if (e.key === "Escape" && value) {
            // Yalnız DOLU kutuda: temizle ve rıhtıma kaçmasın.
            e.stopPropagation()
            e.preventDefault()
            onChange("")
          }
        }}
        placeholder={placeholder}
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        aria-describedby="myfiles-search-hint"
        className="ms-surface no-ios-zoom h-12 w-full min-w-0 rounded-full pl-11 pr-11 text-[0.9375rem] outline-none transition [appearance:textfield] placeholder:text-muted-foreground/70 focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/25 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("myfiles.search.clear")}
          className="absolute right-2 grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:size-10"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" strokeWidth={2} />
        </button>
      ) : (
        <Kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-4 hidden [@media(pointer:fine)]:inline-flex"
        >
          /
        </Kbd>
      )}
      <span id="myfiles-search-hint" className="sr-only">
        {t("myfiles.search.hint")}
      </span>
    </label>
  )
}

export function RefreshButton({ refreshing, onRefresh }) {
  const { t } = useLocale()
  return (
    <button
      type="button"
      onClick={() => {
        if (!refreshing) onRefresh()
      }}
      aria-label={refreshing ? t("myfiles.refreshing") : t("myfiles.refresh")}
      title={refreshing ? t("myfiles.refreshing") : t("myfiles.refresh")}
      aria-busy={refreshing || undefined}
      aria-disabled={refreshing || undefined}
      className={cn(
        "ms-surface grid size-12 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        refreshing && "cursor-progress text-brand-ink",
      )}
    >
      <HugeiconsIcon
        icon={RefreshIcon}
        className={cn("size-4", refreshing && "animate-spin motion-reduce:animate-none")}
        strokeWidth={1.9}
      />
    </button>
  )
}

/* ─────────── Çip + menüler ─────────── */

const TYPE_OPTIONS = [
  ...TYPE_FAMILIES.map((f) => ({ id: f.id, tone: f.tone })),
  { id: "other", tone: NEUTRAL_TONE },
]
/** Kişi seçenekleri; OneDrive kimlik basamağında "others" SORULAMAZ ve çağıran onu çıkarır. */
const PERSON_OPTIONS = ["any", "me", "others"]
const ITEM = "gap-2 rounded-lg px-2 py-1.5 text-[0.78125rem] [@media(pointer:coarse)]:min-h-10"

function typeSummary(types, t) {
  if (!types?.length) return ""
  const first = t(`myfiles.type.${types[0]}`)
  return types.length > 1 ? t("myfiles.filter.more", { first, count: types.length - 1 }) : first
}

/**
 * Tür sayısı (§12.16): sunucunun `FileType` kümelemesinden ("≈", yaklaşık) ya
 * da yüklenen öğelerden (kesin ama yalnız yüklenenler). Bir tür SEÇİLİYKEN
 * hiç gösterilmez: süzgecin kendisi öteki türleri sıfırlar ve "0" yanlış
 * bir şey söylerdi (kümeleme de yalnız Tür boşken isteniyor).
 */
function countLabel(counts, id, locale) {
  const n = counts?.counts?.[id]
  if (n == null) return ""
  const num = new Intl.NumberFormat(locale).format(n)
  return counts.approx ? `≈\u00a0${num}` : num
}

function CountsNote({ counts }) {
  const { t } = useLocale()
  if (!counts?.counts || !Object.keys(counts.counts).length) return null
  return (
    <p className="px-2 pb-0.5 pt-1.5 text-[0.6875rem] leading-snug text-muted-foreground">
      {counts.approx ? t("myfiles.filter.approx") : t("myfiles.filter.countsLoaded")}
    </p>
  )
}

function TypeOptions({ value, onChange, counts, Item = DropdownMenuCheckboxItem }) {
  const { t, locale } = useLocale()
  const shown = value.length ? null : counts
  return (
    <>
      {TYPE_OPTIONS.map((o) => {
        const c = countLabel(shown, o.id, locale)
        return (
          <Item
            key={o.id}
            checked={value.includes(o.id)}
            // Menü açık kalsın: çoklu seçim tek açılışta yapılabilsin.
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(on) =>
              onChange(on ? [...value, o.id] : value.filter((x) => x !== o.id))
            }
            className={ITEM}
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: o.tone }}
            />
            <span className="min-w-0 flex-1">{t(`myfiles.type.${o.id}`)}</span>
            {c && (
              <span className="ml-2 shrink-0 text-[0.6875rem] tabular-nums text-muted-foreground">
                {c}
              </span>
            )}
          </Item>
        )
      })}
      <CountsNote counts={shown} />
    </>
  )
}

/**
 * Geniş kapsayıcının süzgeç çipleri. ⚠️ SIRALAMA BURADA DEĞİL (2026-10-01):
 * görünümün başlığında (`SortMenu`), çünkü yalnız sıralanabilen yerde
 * anlamlı — SharePoint kökünde ve sitenin kitaplık listesinde menü hiçbir şey
 * değiştirmiyordu.
 */
export function FilterBar({
  filters,
  onFilter,
  onClearAll,
  activeCount,
  showPerson,
  personOptions = PERSON_OPTIONS,
  typeCounts = null,
}) {
  const { t } = useLocale()
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <FilterChip
        icon={File01Icon}
        label={t("myfiles.filter.type")}
        value={typeSummary(filters.types, t)}
        onClear={() => onFilter({ types: [] })}
      >
        <DropdownMenuLabel className="px-2 pb-1 pt-0.5 text-[0.6875rem] font-semibold text-muted-foreground">
          {t("myfiles.filter.typeTitle")}
        </DropdownMenuLabel>
        <TypeOptions
          value={filters.types}
          onChange={(types) => onFilter({ types })}
          counts={typeCounts}
        />
      </FilterChip>
      <FilterChip
        icon={Calendar03Icon}
        label={t("myfiles.filter.date")}
        value={filters.date ? t(`myfiles.date.${filters.date}`) : ""}
        onClear={() => onFilter({ date: "" })}
      >
        <DropdownMenuLabel className="px-2 pb-1 pt-0.5 text-[0.6875rem] font-semibold text-muted-foreground">
          {t("myfiles.filter.dateTitle")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filters.date || "any"}
          onValueChange={(v) => onFilter({ date: v === "any" ? "" : v })}
        >
          {["any", ...DATE_PRESETS].map((d) => (
            <DropdownMenuRadioItem key={d} value={d} className={ITEM}>
              {t(`myfiles.date.${d}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </FilterChip>
      {showPerson && (
        <FilterChip
          icon={UserIcon}
          label={t("myfiles.filter.person")}
          value={filters.person ? t(`myfiles.person.${filters.person}`) : ""}
          onClear={() => onFilter({ person: "" })}
        >
          <DropdownMenuLabel className="px-2 pb-1 pt-0.5 text-[0.6875rem] font-semibold text-muted-foreground">
            {t("myfiles.filter.personTitle")}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={filters.person || "any"}
            onValueChange={(v) => onFilter({ person: v === "any" ? "" : v })}
          >
            {personOptions.map((p) => (
              <DropdownMenuRadioItem key={p} value={p} className={ITEM}>
                <span className="min-w-0">
                  <span className="block">{t(`myfiles.person.${p}`)}</span>
                  {p === "me" && (
                    <span className="block text-[0.6875rem] text-muted-foreground">
                      {t("myfiles.person.meHint")}
                    </span>
                  )}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </FilterChip>
      )}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[0.75rem] font-medium text-muted-foreground transition hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-10"
        >
          <HugeiconsIcon icon={FilterRemoveIcon} className="size-3.5" strokeWidth={1.9} />
          {t("myfiles.filter.clearAll")}
        </button>
      )}
    </div>
  )
}

export function SortMenu({ sort, options, onSort, align = "end" }) {
  const { t } = useLocale()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("myfiles.sort.aria", { value: t(`myfiles.sort.${sort}`) })}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card py-1.5 pl-3 pr-2.5 text-[0.75rem] text-foreground/75 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:min-h-10"
        >
          <HugeiconsIcon
            icon={Sorting01Icon}
            className="size-3.5 text-muted-foreground"
            strokeWidth={1.9}
          />
          <span className="truncate">{t(`myfiles.sort.${sort}`)}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="size-3 shrink-0 opacity-60"
            strokeWidth={2}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56 p-1.5" onEscapeKeyDown={stopEscape}>
        <DropdownMenuRadioGroup value={sort} onValueChange={onSort}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o} value={o} className={ITEM}>
              {t(`myfiles.sort.${o}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ─────────── Dar kapsayıcı: düğme + alttan sayfa + etkin çipler ─────────── */

function SheetOption({ checked, onClick, children, role = "checkbox" }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-left text-[0.8125rem] transition",
        checked
          ? "border-brand/30 bg-brand/[0.09] font-semibold text-foreground"
          : "border-border bg-card text-foreground/80",
      )}
    >
      {children}
    </button>
  )
}

/**
 * Dar kapsayıcının süzgeç düğmesi — YALNIZ İKON (2026-10-01): "Süzgeçler"
 * yazısı 358px'te arama kutusunu 200px'in altına itiyordu. Adı `aria-label`da
 * ("Süzgeçler, 2 açık"), açık süzgeç sayısı köşedeki rozette.
 */
export function FilterSheetButton({
  filters,
  onFilter,
  onClearAll,
  activeCount,
  showPerson,
  personOptions = PERSON_OPTIONS,
  typeCounts = null,
}) {
  const { t, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const section =
    "px-1 pb-1.5 pt-3 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          activeCount
            ? t("myfiles.filter.openCount", { count: activeCount })
            : t("myfiles.filter.open")
        }
        title={t("myfiles.filter.open")}
        className={cn(
          "ms-surface relative grid size-12 shrink-0 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          activeCount ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <HugeiconsIcon icon={FilterHorizontalIcon} className="size-[1.125rem]" strokeWidth={1.9} />
        {activeCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-fill-deep px-1 text-[0.6875rem] font-semibold tabular-nums text-brand-on-brand"
          >
            {activeCount}
          </span>
        )}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          onEscapeKeyDown={stopEscape}
          className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
        >
          <div className="flex items-center justify-between gap-3 pb-1">
            <SheetTitle className="text-[0.9375rem] font-semibold">
              {t("myfiles.filter.open")}
            </SheetTitle>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("sheet.close")}
              className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-accent/60"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" strokeWidth={2} />
            </button>
          </div>
          <SheetDescription className="sr-only">{t("myfiles.filter.sheetHint")}</SheetDescription>
          <p lang={locale} className={section}>
            {t("myfiles.filter.typeTitle")}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {TYPE_OPTIONS.map((o) => {
              const on = filters.types.includes(o.id)
              const c = countLabel(filters.types.length ? null : typeCounts, o.id, locale)
              return (
                <SheetOption
                  key={o.id}
                  checked={on}
                  onClick={() =>
                    onFilter({
                      types: on
                        ? filters.types.filter((x) => x !== o.id)
                        : [...filters.types, o.id],
                    })
                  }
                >
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: o.tone }}
                  />
                  <span className="min-w-0 flex-1">{t(`myfiles.type.${o.id}`)}</span>
                  {c && (
                    <span className="shrink-0 text-[0.6875rem] tabular-nums text-muted-foreground">
                      {c}
                    </span>
                  )}
                </SheetOption>
              )
            })}
          </div>
          {!filters.types.length && <CountsNote counts={typeCounts} />}
          <p lang={locale} className={section}>
            {t("myfiles.filter.dateTitle")}
          </p>
          <div
            role="radiogroup"
            aria-label={t("myfiles.filter.dateTitle")}
            className="grid grid-cols-2 gap-1.5"
          >
            {["any", ...DATE_PRESETS].map((d) => (
              <SheetOption
                key={d}
                role="radio"
                checked={(filters.date || "any") === d}
                onClick={() => onFilter({ date: d === "any" ? "" : d })}
              >
                {t(`myfiles.date.${d}`)}
              </SheetOption>
            ))}
          </div>
          {showPerson && (
            <>
              <p lang={locale} className={section}>
                {t("myfiles.filter.personTitle")}
              </p>
              <div
                role="radiogroup"
                aria-label={t("myfiles.filter.personTitle")}
                className={cn(
                  "grid gap-1.5",
                  personOptions.length === 3 ? "grid-cols-3" : "grid-cols-2",
                )}
              >
                {personOptions.map((p) => (
                  <SheetOption
                    key={p}
                    role="radio"
                    checked={(filters.person || "any") === p}
                    onClick={() => onFilter({ person: p === "any" ? "" : p })}
                  >
                    {t(`myfiles.person.${p}`)}
                  </SheetOption>
                ))}
              </div>
            </>
          )}
          <div className="mt-4 flex items-center gap-2">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="h-11 rounded-full px-4 text-[0.8125rem] font-medium text-muted-foreground hover:bg-accent/60"
              >
                {t("myfiles.filter.clearAll")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto h-11 rounded-full bg-brand-fill-deep px-5 text-[0.8125rem] font-semibold text-brand-on-brand shadow-sm"
            >
              {t("myfiles.filter.done")}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

/** Dar kapsayıcıda yalnız ETKİN süzgeçler — her biri tek dokunuşla kalkar. */
export function ActiveChips({ filters, onFilter }) {
  const { t } = useLocale()
  const chips = [
    filters.types?.length && {
      key: "types",
      icon: File01Icon,
      label: t("myfiles.filter.type"),
      value: typeSummary(filters.types, t),
      clear: { types: [] },
    },
    filters.date && {
      key: "date",
      icon: Calendar03Icon,
      label: t("myfiles.filter.date"),
      value: t(`myfiles.date.${filters.date}`),
      clear: { date: "" },
    },
    filters.person && {
      key: "person",
      icon: UserIcon,
      label: t("myfiles.filter.person"),
      value: t(`myfiles.person.${filters.person}`),
      clear: { person: "" },
    },
  ].filter(Boolean)
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onFilter(c.clear)}
          aria-label={t("myfiles.filter.remove", { label: `${c.label}: ${c.value}` })}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-brand/30 bg-brand/[0.09] px-3 text-[0.75rem] font-semibold"
        >
          <HugeiconsIcon icon={c.icon} className="size-3.5 text-brand" strokeWidth={1.9} />
          {c.value}
          <HugeiconsIcon icon={Cancel01Icon} className="size-3 opacity-70" strokeWidth={2.2} />
        </button>
      ))}
    </div>
  )
}
