import { HugeiconsIcon } from "@hugeicons/react"
import Folder01Icon from "@hugeicons/core-free-icons/Folder01Icon"
import Loading03Icon from "@hugeicons/core-free-icons/Loading03Icon"
import { useLocale } from "@/hooks/useLocale"
import { getNumberFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"

/**
 * PANONUN ÇİPLERİ (2026-10-01).
 *
 * `TypeChips` — "Son 25 dosyanda: Excel 9 · Word 5…": her çip bir süzgeç
 * kapısı. Nokta satırdaki rozetin Office rengi; rengin tek başına anlam
 * taşımadığı için yanında adı ve sayısı.
 *
 * `FolderChips` — klasör kapıları: aramada "sonuçların bulunduğu klasörler",
 * panoda (2026-10-02'den beri) "sık kullandığın klasörler". Panodaki altı
 * kutucukluk ızgara (`FolderDoorTile`, ~140 px) tek satır çipe döndü —
 * istek: *"çok buton, çok kart göz yorar… tek büyük kart ve sonra listeler"*.
 */
const CHIP =
  "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[0.75rem] font-medium text-foreground/80 outline-none transition hover:border-foreground/20 hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:h-11"

/** Tür kapıları. `mix` = `recentTypeMix`; `approx` sayılar sunucunun tahmini ("≈"). */
export function TypeChips({ lead, mix, approx = false, onPick, note }) {
  const { t, locale } = useLocale()
  const num = getNumberFormat(locale)
  if (!mix?.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {lead && (
        <span className="mr-1 text-[0.8125rem] font-medium text-muted-foreground">{lead}</span>
      )}
      {mix.map((m) => {
        const type = t(`myfiles.type.${m.id}`)
        const count = approx ? `≈\u00a0${num.format(m.n)}` : num.format(m.n)
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m.id)}
            aria-label={t("myfiles.mix.chipAria", { type, count })}
            className={CHIP}
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: m.tone }}
            />
            <span className="truncate">{type}</span>
            <span className="tabular-nums text-muted-foreground">{count}</span>
          </button>
        )
      })}
      {note && <span className="text-[0.6875rem] text-muted-foreground">{note}</span>}
    </div>
  )
}

/**
 * Klasör kapıları — aynı hap dili. `scroll`: dar kapsayıcıda satır SARMAZ,
 * yana kayar (panoda tek satır kalsın); geniş kapsayıcıda sarar.
 */
export function FolderChips({
  folders,
  onPick,
  pendingKey,
  labelFor,
  nameFor = (f) => f.name,
  ariaFor,
  lead,
  scroll = false,
}) {
  const { locale } = useLocale()
  const num = getNumberFormat(locale)
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        scroll &&
          // Kolonun İÇİNDE kalır (kenara taşan "bleed" yatay taşma sayılıyordu); sağ kenar solarak kaydığını söyler.
          "@max-[34rem]/files:-my-1 @max-[34rem]/files:flex-nowrap @max-[34rem]/files:overflow-x-auto @max-[34rem]/files:py-1 @max-[34rem]/files:pr-6 @max-[34rem]/files:[mask-image:linear-gradient(to_right,#000_calc(100%-2rem),transparent)] @max-[34rem]/files:[scrollbar-width:none] @max-[34rem]/files:[&::-webkit-scrollbar]:hidden",
      )}
    >
      {lead && (
        <span className="mr-1 shrink-0 text-[0.8125rem] font-medium text-muted-foreground">
          {lead}
        </span>
      )}
      {folders.map((f) => {
        const root = labelFor(f)
        const pending = pendingKey === f.url
        return (
          <button
            key={f.url}
            type="button"
            onClick={() => !pending && onPick(f)}
            aria-busy={pending || undefined}
            aria-label={ariaFor?.(f)}
            className={cn(CHIP, "shrink-0", pending && "cursor-progress opacity-60")}
          >
            <HugeiconsIcon
              icon={pending ? Loading03Icon : Folder01Icon}
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground",
                pending && "animate-spin motion-reduce:animate-none",
              )}
              strokeWidth={1.9}
            />
            <span className="truncate">{nameFor(f)}</span>
            {root && (
              <span className="hidden truncate text-muted-foreground @[30rem]/files:inline">
                · {root}
              </span>
            )}
            <span className="tabular-nums text-muted-foreground">{num.format(f.count)}</span>
          </button>
        )
      })}
    </div>
  )
}
