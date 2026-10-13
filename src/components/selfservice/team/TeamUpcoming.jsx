import { useId, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"
import { OCCASION_ICON } from "./occasionIcons"
import { rowNav } from "./rowNav"
import { leaveAmount, leaveLabel, occasionLabel, shortDay, shortRange } from "./teamText"

const FIRST = 5

/** Satırın ikinci satırı ve sağdaki tarih: izin ya da doğum günü / iş yıl dönümü. */
function Detail({ item }) {
  const { t, locale } = useLocale()
  const o = item.occasion
  if (!o)
    return (
      <span className="block truncate text-[0.75rem] text-muted-foreground">
        {[leaveLabel(item.record, t), leaveAmount(item.record, t, locale)]
          .filter(Boolean)
          .join(" · ")}
      </span>
    )
  return (
    <span className="flex min-w-0 items-center gap-1 text-[0.75rem] text-muted-foreground">
      <HugeiconsIcon
        icon={OCCASION_ICON[o.kind]}
        aria-hidden="true"
        className="size-3.5 shrink-0 text-brand-ink"
        strokeWidth={2}
      />
      <span className="truncate">{occasionLabel(o, t, locale)}</span>
    </span>
  )
}

/**
 * Telefonun çizelgesi — "Yaklaşanlar": önümüzdeki 6 haftadaki izinler, doğum günleri ve iş yıl
 * dönümleri tarih sırasıyla, her satır bir kart ("Ayşe Yılmaz · Yıllık İzin, 5 gün · 12–16 Eki";
 * yönetici ve ekip arkadaşında türsüz "İzinde"; gün satırı simgesiyle "Doğum günü · 12 Kas"); bugün
 * sürenler "Şu an", bugünkü günler "Bugün" rozetli. Basınca kişi bölmesi. Beşten fazlası "Tümünü
 * göster" ile.
 */
export function TeamUpcoming({ upcoming, rows, photos, presence, onOpen, className }) {
  const { t, locale } = useLocale()
  const titleId = useId()
  const [all, setAll] = useState(false)
  const byKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows])
  const list = upcoming.filter((it) => byKey.has(it.key))
  const shown = all ? list : list.slice(0, FIRST)
  return (
    <section
      aria-labelledby={titleId}
      className={cn("ms-surface overflow-hidden rounded-2xl", className)}
    >
      <h3
        id={titleId}
        className="flex items-center gap-1.5 px-4 pb-2 pt-3 text-[0.875rem] font-semibold"
      >
        <HugeiconsIcon
          icon={Calendar03Icon}
          aria-hidden="true"
          className="size-4 text-brand-ink"
          strokeWidth={1.9}
        />
        {t("selfService.team.upcoming.title")}
        <span className="font-normal text-muted-foreground">
          · {t("selfService.team.upcoming.window")}
        </span>
      </h3>
      {list.length ? (
        <ul className="divide-y divide-border/60 border-t border-border/60" onKeyDown={rowNav}>
          {shown.map((it) => {
            const p = byKey.get(it.key).person
            const r = it.record
            const o = it.occasion
            const badge = o
              ? o.inDays === 0 && t("selfService.team.soon.today")
              : it.current && t("selfService.team.upcoming.now")
            return (
              <li key={`${it.key}-${o ? o.kind : r.id}`}>
                <button
                  type="button"
                  data-team-row
                  onClick={() => onOpen(it.key)}
                  className="flex min-h-12 w-full min-w-0 items-center gap-3 px-4 py-2 text-start transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
                >
                  <PersonAvatar
                    name={p.name}
                    photo={photos.get(p.address)}
                    presence={presence.get(p.upn)}
                    className="size-8 [&>span:first-of-type]:text-[0.6875rem]"
                  />
                  <span className="min-w-0 flex-1">
                    <span lang="tr" className="block truncate text-[0.8125rem] font-semibold">
                      {p.name}
                    </span>
                    <Detail item={it} />
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    {badge && (
                      <span className="rounded-full bg-brand/[0.12] px-1.5 py-px text-[0.625rem] font-bold uppercase tracking-[0.04em] text-brand-ink">
                        {badge}
                      </span>
                    )}
                    <span className="text-[0.75rem] font-medium tabular-nums text-foreground/80">
                      {o ? shortDay(o.date, locale) : shortRange(r.start, r.end, locale)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="border-t border-border/60 px-4 py-4 text-[0.8125rem] text-muted-foreground">
          {t("selfService.team.upcoming.empty")}
        </p>
      )}
      {list.length > FIRST && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="w-full border-t border-border/60 px-4 py-2.5 text-start text-[0.75rem] font-semibold text-brand-ink transition hover:bg-brand/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 pointer-coarse:min-h-11"
        >
          {all
            ? t("selfService.detail.showLess")
            : t("selfService.detail.showAll", { n: list.length })}
        </button>
      )}
    </section>
  )
}
