import { useId, useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { groupOf } from "@/lib/selfServiceTeam"
import { cn } from "@/lib/utils"
import { range } from "../kinds"
import { rowNav } from "./rowNav"
import { leaveLine, occasionLine, peopleText, shortDay } from "./teamText"
import { Bar, Legend, Marker } from "./timelineParts"

const cols = (n) => ({ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` })
const ROW = "grid grid-cols-[var(--ncol)_minmax(0,1fr)]"
const DAY = 86400000

/**
 * Bölüm satırı (iki bölüm varken): "Bana bağlı olanlar" · "Ekip arkadaşlarım". Boyu sabit (h-8):
 * yükleme iskeleti bölüm satırlarını da bu boyla sayar (`TeamView`).
 */
function GroupRow({ id, count }) {
  const { t, locale } = useLocale()
  return (
    <div role="row" className={cn(ROW, "h-8 border-b border-border/40")}>
      <span
        role="rowheader"
        className="truncate px-3 pb-1 pt-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground @[60rem]/ss:px-4"
      >
        {t(`selfService.team.group.${id}`)}
      </span>
      <span role="cell" className="min-w-0">
        <span className="sr-only">{peopleText(count, t, locale)}</span>
      </span>
    </div>
  )
}

/** Pencere içindeki doğum günü ve yıl dönümleri → sütunu ve o gün izin çubuğu var mı. */
function marksOf(row, segments, first, last) {
  return (row.occasions ?? [])
    .filter((o) => o.date >= first && o.date <= last)
    .map((o) => {
      const col = Math.round((o.date - first) / DAY)
      return { occasion: o, col, stacked: segments.some((s) => s.from <= col && col <= s.to) }
    })
}

function Row({ row, segments, n, first, last, photo, presence, onOpen }) {
  const { t, locale } = useLocale()
  const p = row.person
  const open = () => onOpen(row.key)
  const marks = marksOf(row, segments, first, last)
  const lines = [
    ...segments.map((s) => leaveLine(s.record, t, locale)),
    ...marks.map((m) => occasionLine(m.occasion, t, locale)),
  ]
  // Dar kişi sütununda etiket adı keserdi: yönetici bölümün başında, "Yöneticim" okunur adında.
  const tag = row.relation === "manager" ? t("selfService.team.managerTag") : null
  return (
    <div role="row" className={cn(ROW, "border-b border-border/40 last:border-b-0")}>
      <span role="rowheader" className="min-w-0">
        <button
          type="button"
          data-team-row
          onClick={open}
          aria-label={t("selfService.team.open", { name: tag ? `${p.name} (${tag})` : p.name })}
          className="flex h-10 w-full min-w-0 items-center gap-2 px-3 text-start transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 pointer-coarse:h-11 @[60rem]/ss:px-4"
        >
          <PersonAvatar
            name={p.name}
            photo={photo}
            presence={presence}
            className="size-6 [&>span:first-of-type]:text-[0.5625rem]"
          />
          <span lang="tr" className="min-w-0 truncate text-[0.8125rem] font-medium">
            {p.name}
          </span>
        </button>
      </span>
      <span role="cell" className="min-w-0">
        <span className="sr-only">
          {lines.length ? lines.join("; ") : t("selfService.team.timeline.none")}
        </span>
        <span aria-hidden="true" className="grid h-full items-center" style={cols(n)}>
          {segments.map((s) => (
            <Bar
              key={`${s.record.id}-${s.from}`}
              segment={s}
              first={first}
              last={last}
              onOpen={open}
            />
          ))}
          {marks.map((m) => (
            <Marker key={m.occasion.kind} {...m} onOpen={open} />
          ))}
        </span>
      </span>
    </div>
  )
}

/**
 * EKİP İZİN ÇİZELGESİ (geniş kap) — bu haftanın Pazartesi'sinden 6 hafta, gün sütunları; her
 * satır bir kişi, izin aralıkları marka tonunda çubuk (bana bağlılarda tür adıyla; çalışılan
 * kayıtlar kesikli, saatlik kayıtlar nokta — yönetici ve ekip arkadaşında yalnız türsüz
 * "İzinde"); doğum günü ve iş yıl dönümü günün sütununda küçük rozet (`Marker`). İki bölüm varsa
 * bölüm satırlarıyla ayrılır. Hafta sonları soluk, bugünün sütunu vurgulu. Anlamı bir tablo: satır
 * başlığı kişi (basınca kişi bölmesi; ↑/↓ ile satırlar arası), hücresi izinlerin ve günlerin okunur
 * listesi; çubuk ve rozetler süs (`aria-hidden`), ayrıntı ipucunda.
 */
export function TeamTimeline({ timeline, groups, rows, photos, presence, onOpen, className }) {
  const { t, locale } = useLocale()
  const titleId = useId()
  const legendId = useId()
  const { days, weekStarts } = timeline
  const n = days.length
  const first = days[0].date
  const last = days[n - 1].date
  const span = range(first, last, locale)
  const byKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows])
  const dayFmt = getDateTimeFormat(locale, { day: "numeric" })
  const split = (groups?.length ?? 0) > 1
  const full = !groups || groups.some((g) => g.id === "reports")
  const sizeOf = new Map((groups ?? []).map((g) => [g.id, g.rows.length]))
  // Göstergede yalnız pencerede işareti olan gün türleri.
  const kinds = ["birthday", "anniversary"].filter((kind) =>
    rows.some((r) => r.occasions?.some((o) => o.kind === kind && o.date <= last)),
  )
  // Satırlar bölüm sırasıyla gelir (`teamOverview`); bölüm değişince başlık satırı.
  const body = []
  let lastGroup = null
  for (const tr of timeline.rows) {
    const row = byKey.get(tr.key)
    if (!row) continue
    const group = groupOf(row)
    if (split && group !== lastGroup)
      body.push(<GroupRow key={`group-${group}`} id={group} count={sizeOf.get(group) ?? 0} />)
    lastGroup = group
    body.push(
      <Row
        key={tr.key}
        row={row}
        segments={tr.segments}
        n={n}
        first={first}
        last={last}
        photo={photos.get(row.person.address)}
        presence={presence.get(row.person.upn)}
        onOpen={onOpen}
      />,
    )
  }
  return (
    <section
      aria-labelledby={titleId}
      className={cn("ms-surface overflow-hidden rounded-2xl", className)}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 pb-2.5 pt-3">
        <h3 id={titleId} className="flex items-center gap-1.5 text-[0.875rem] font-semibold">
          <HugeiconsIcon
            icon={Calendar03Icon}
            aria-hidden="true"
            className="size-4 text-brand-ink"
            strokeWidth={1.9}
          />
          {t("selfService.team.timeline.title")}
          <span className="font-normal text-muted-foreground">· {span}</span>
        </h3>
        <Legend id={legendId} full={full} kinds={kinds} className="ms-auto" />
      </div>
      <div
        role="table"
        aria-labelledby={titleId}
        aria-describedby={legendId}
        className="relative border-t border-border/60 [--ncol:9.5rem] @[60rem]/ss:[--ncol:12.5rem]"
      >
        {/* Gün sütunlarının zemini bir kez, bütün satırların altında: hafta sonu, bugün, hafta ayracı. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-0 start-[var(--ncol)] grid"
          style={cols(n)}
        >
          {days.map((d, i) => (
            <span
              key={i}
              className={cn(
                d.weekend && "bg-foreground/[0.045]",
                d.today && "bg-brand/[0.1]",
                i > 0 && d.date.getDay() === 1 && "border-s border-border/70",
              )}
            />
          ))}
        </div>
        <div role="rowgroup" className="relative">
          <div role="row" className={cn(ROW, "border-b border-border/60")}>
            <span
              role="columnheader"
              className="self-end px-3 pb-1.5 text-[0.6875rem] font-medium text-muted-foreground @[60rem]/ss:px-4"
            >
              {t("selfService.team.timeline.person")}
            </span>
            <span role="columnheader" className="min-w-0 pb-1 pt-1.5">
              <span className="sr-only">
                {t("selfService.team.timeline.leaves", { range: span })}
              </span>
              <span aria-hidden="true" className="grid gap-y-0.5" style={cols(n)}>
                {weekStarts.map((w, i) => (
                  <span
                    key={w.index}
                    className="row-start-1 truncate ps-1 text-[0.6875rem] font-semibold text-foreground/80"
                    style={{
                      gridColumn: `${w.index + 1} / ${(weekStarts[i + 1]?.index ?? n) + 1}`,
                    }}
                  >
                    {shortDay(w.date, locale)}
                  </span>
                ))}
                {days.map((d, i) => (
                  <span
                    key={i}
                    className={cn(
                      "row-start-2 hidden text-center text-[0.625rem] tabular-nums @[56rem]/ss:block",
                      // Hafta sonu zemininde de AA: soluk gri değil, yazı renginin %70'i.
                      d.today ? "font-bold text-brand-ink" : "text-foreground/70",
                    )}
                    style={{ gridColumn: i + 1 }}
                  >
                    {dayFmt.format(d.date)}
                  </span>
                ))}
              </span>
            </span>
          </div>
        </div>
        <div role="rowgroup" className="relative" onKeyDown={rowNav}>
          {body}
        </div>
      </div>
      {!timeline.rows.some((r) => r.segments.length) && (
        <p className="border-t border-border/60 px-4 py-2.5 text-[0.75rem] text-muted-foreground">
          {t("selfService.team.upcoming.empty")}
        </p>
      )}
    </section>
  )
}
