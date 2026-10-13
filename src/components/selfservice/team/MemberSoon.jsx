import { useId } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Beach02Icon from "@hugeicons/core-free-icons/Beach02Icon"
import { useLocale } from "@/hooks/useLocale"
import { getDateTimeFormat } from "@/lib/intl-cache"
import { daysUntil } from "@/lib/teamOccasions"
import { cn } from "@/lib/utils"
import { number } from "../kinds"
import { OCCASION_ICON } from "./occasionIcons"
import { inDaysText, leaveAmount, leaveLabel, shortRange } from "./teamText"

const LONG_DAY = { weekday: "long", day: "numeric", month: "long" }

/** Bölmenin satırları: sıradaki izin (izinler okunduysa), doğum günü, iş yıl dönümü — tarih sırasıyla. */
function soonItems(row, today, status) {
  const next = status.leaves === "ready" && row.matched ? row.status?.next : null
  const items = (row.occasions ?? []).map((o) => ({ ...o, id: o.kind }))
  if (next)
    items.push({ kind: "leave", id: "leave", record: next, inDays: daysUntil(today, next.start) })
  return items.sort((a, b) => a.inDays - b.inDays)
}

function Item({ item }) {
  const { t, locale } = useLocale()
  const r = item.record
  const leave = item.kind === "leave"
  // "Sıradaki izin" · "Doğum günü" · "İş yıl dönümü"
  const title = t(`selfService.team.soon.${item.kind}`)
  // Yöneticide ve ekip arkadaşında kayıt türsüz: "İzinde" yazmak yerine yalnız tarih ve süre.
  const detail = leave
    ? [
        r.neutral ? null : leaveLabel(r, t),
        shortRange(r.start, r.end, locale),
        leaveAmount(r, t, locale),
      ]
    : [
        item.kind === "anniversary"
          ? t("selfService.team.soon.years", { n: number(item.years, locale) })
          : null,
        getDateTimeFormat(locale, LONG_DAY).format(item.date),
      ]
  const today = item.inDays === 0
  return (
    <li className="flex min-w-0 items-center gap-3 px-3 py-2.5">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-brand/[0.09] text-brand-ink"
      >
        <HugeiconsIcon
          icon={leave ? Beach02Icon : OCCASION_ICON[item.kind]}
          className="size-4"
          strokeWidth={1.9}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-semibold">{title}</span>
        <span className="block truncate text-[0.75rem] text-muted-foreground">
          {detail.filter(Boolean).join(" · ")}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-[0.75rem] tabular-nums",
          today
            ? "rounded-full bg-brand/[0.12] px-2 py-0.5 font-bold text-brand-ink"
            : "font-medium text-foreground/75",
        )}
      >
        {inDaysText(item.inDays, t, locale)}
      </span>
    </li>
  )
}

/**
 * Kişi bölmesinin "Yaklaşanlar"ı: sıradaki izin (bana bağlıda türüyle, yöneticide ve ekip
 * arkadaşında türsüz), doğum günü ve iş yıl dönümü ("5. yıl"), her biri tarihi ve "x gün sonra" /
 * "bugün" ile. Hiçbiri yoksa bölüm çizilmez.
 */
export function MemberSoon({ row, today, status }) {
  const { t } = useLocale()
  const titleId = useId()
  const items = soonItems(row, today, status)
  if (!items.length) return null
  return (
    <section aria-labelledby={titleId} className="mt-5 min-w-0">
      <h3 id={titleId} className="px-1 text-[0.875rem] font-semibold">
        {t("selfService.team.soon.title")}
      </h3>
      <ul className="mt-2 divide-y divide-border/60 overflow-hidden rounded-2xl ring-1 ring-inset ring-border/70">
        {items.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}
