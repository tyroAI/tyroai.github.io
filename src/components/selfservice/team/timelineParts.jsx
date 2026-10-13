import { HugeiconsIcon } from "@hugeicons/react"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { OCCASION_ICON } from "./occasionIcons"
import { leaveLabel, leaveLine, occasionLine } from "./teamText"

// Çubuğun içine tür adı ancak bu kadar gün sığar (dar sütunda yalnız ipucu).
const LABEL_DAYS = 4

const LEGEND = [
  ["absence", "h-2.5 w-4 rounded-sm bg-brand/[0.18] ring-1 ring-inset ring-brand/40"],
  ["working", "h-2.5 w-4 rounded-sm border border-dashed border-brand/50"],
  ["partial", "size-2 rounded-full bg-brand"],
]

/**
 * Gösterge; bana bağlı yoksa yalnız "İzin" (ekip arkadaşının çalışılan ve saatlik kaydı gelmez).
 * `kinds`: pencerede işareti olan günler ("birthday", "anniversary") — yalnız onlar anlatılır.
 */
export function Legend({ id, full, kinds = [], className }) {
  const { t } = useLocale()
  const items = full ? LEGEND : LEGEND.slice(0, 1)
  return (
    <ul
      id={id}
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted-foreground",
        className,
      )}
    >
      {items.map(([key, swatch]) => (
        <li key={key} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={swatch} />
          {t(`selfService.team.timeline.legend.${key}`)}
        </li>
      ))}
      {kinds.map((kind) => (
        <li key={kind} className="inline-flex items-center gap-1.5">
          <HugeiconsIcon
            icon={OCCASION_ICON[kind]}
            aria-hidden="true"
            className="size-3.5 text-brand-ink"
            strokeWidth={2}
          />
          {t(`selfService.team.soon.${kind}`)}
        </li>
      ))}
    </ul>
  )
}

export function Bar({ segment, first, last, onOpen }) {
  const { t, locale } = useLocale()
  const { from, to, record, absence, partial } = segment
  const title = leaveLine(record, t, locale)
  const style = { gridColumn: `${from + 1} / ${to + 2}`, gridRow: 1 }
  if (partial)
    return (
      <span
        title={title}
        onClick={onOpen}
        style={style}
        className="size-2 cursor-pointer justify-self-center rounded-full bg-brand"
      />
    )
  // Pencerenin dışına taşan izin kenarda düz biter: "devam ediyor".
  const cutStart = record.start < first
  const cutEnd = (record.end ?? record.start) > last
  return (
    <span
      title={title}
      onClick={onOpen}
      style={style}
      className={cn(
        "mx-px h-5 min-w-0 cursor-pointer truncate rounded-md px-1.5 text-[0.625rem] font-semibold leading-5",
        absence
          ? "bg-brand/[0.18] text-brand-ink ring-1 ring-inset ring-brand/40"
          : "border border-dashed border-brand/50 leading-[1.125rem] text-foreground/75",
        cutStart && "ms-0 rounded-s-none",
        cutEnd && "me-0 rounded-e-none",
      )}
    >
      {to - from + 1 >= LABEL_DAYS ? leaveLabel(record, t) : ""}
    </span>
  )
}

/**
 * Doğum günü / iş yıl dönümü işareti: günün sütununda küçük rozet. O gün bir izin çubuğu varsa
 * hücrenin üst köşesine çıkar (`stacked`), çubuğu örtmez; yoksa çubuk hizasında durur.
 */
export function Marker({ occasion, col, stacked, onOpen }) {
  const { t, locale } = useLocale()
  return (
    <span
      title={occasionLine(occasion, t, locale)}
      onClick={onOpen}
      style={{ gridColumn: col + 1, gridRow: 1 }}
      className={cn(
        "z-[1] grid size-4 cursor-pointer place-items-center justify-self-center rounded-full bg-card text-brand-ink shadow-sm ring-1 ring-brand/35",
        stacked ? "-mt-0.5 self-start" : "self-center",
      )}
    >
      <HugeiconsIcon icon={OCCASION_ICON[occasion.kind]} className="size-3" strokeWidth={2} />
    </span>
  )
}
