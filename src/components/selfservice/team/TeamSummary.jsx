import { HugeiconsIcon } from "@hugeicons/react"
import Beach02Icon from "@hugeicons/core-free-icons/Beach02Icon"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon"
import { useLocale } from "@/hooks/useLocale"
import { firstName } from "@/lib/celebrate"
import { cn } from "@/lib/utils"
import { number } from "../kinds"
import { peopleText, shortRange } from "./teamText"

function Stat({ icon, label, short, value, caption, loading }) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-2xl px-2.5 py-2.5 @[44rem]/ss:px-3 @[44rem]/ss:py-3">
      <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand-ink @[44rem]/ss:grid">
        <HugeiconsIcon icon={icon} aria-hidden="true" className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.75rem] font-medium text-foreground/65">
          {/* Telefonda kısa ad: üç kutu tek satırda. */}
          <span className="@[44rem]/ss:hidden">{short ?? label}</span>
          <span className="hidden @[44rem]/ss:inline">{label}</span>
        </span>
        {loading ? (
          <span aria-hidden="true" className="ms-skeleton mt-1 block h-6 w-16 rounded-md" />
        ) : (
          <span className="block truncate text-[0.9375rem] font-semibold tabular-nums tracking-[-0.02em] text-foreground @[44rem]/ss:text-[1.25rem]">
            {value}
          </span>
        )}
        {caption && !loading && (
          <span
            title={caption}
            className="hidden truncate text-[0.6875rem] text-foreground/65 @[44rem]/ss:block"
          >
            {caption}
          </span>
        )}
      </span>
    </li>
  )
}

/**
 * Ekip özeti (tek kart, üç kutu): bugün izinde (adlarıyla), bu hafta izinde (haftanın
 * aralığı), ekip boyu (ortalama kalan yıllık izin). İzin bilgisi yoksa (yetki, hata) ilk iki
 * kutu "—"; yüklenirken yer tutar. `status`: `{ leaves, balance }` bölüm durumları.
 */
export function TeamSummary({ summary, rows, status, className }) {
  const { t, locale } = useLocale()
  const loading = status.leaves === "loading"
  const known = status.leaves === "ready"
  const people = (n) => (known ? peopleText(n, t, locale) : "—")
  const nameOf = new Map(rows.map((r) => [r.key, r.person.givenName || firstName(r.person.name)]))
  const away = summary.todayKeys.map((k) => nameOf.get(k)).filter(Boolean)
  // ERP'de eşleşmeyen üye varken "herkes işte" denmez: onun izni bilinmiyor.
  const allKnown = rows.every((r) => r.matched)
  const avg = summary.avgRemain
  return (
    <ul
      aria-label={t("selfService.team.summary.label")}
      className={cn(
        "ms-surface grid min-w-0 grid-cols-3 gap-1 rounded-[1.25rem] p-1.5 text-card-foreground",
        className,
      )}
    >
      <Stat
        icon={Beach02Icon}
        label={t("selfService.team.summary.today")}
        short={t("selfService.team.summary.todayShort")}
        value={people(summary.today)}
        caption={
          known
            ? away.length
              ? away.join(", ")
              : allKnown
                ? t("selfService.team.summary.allIn")
                : ""
            : ""
        }
        loading={loading}
      />
      <Stat
        icon={Calendar03Icon}
        label={t("selfService.team.summary.week")}
        short={t("selfService.team.summary.weekShort")}
        value={people(summary.thisWeek)}
        caption={known ? shortRange(summary.week.from, summary.week.to, locale) : ""}
        loading={loading}
      />
      <Stat
        icon={UserGroupIcon}
        label={t("selfService.team.summary.size")}
        value={peopleText(summary.size, t, locale)}
        caption={
          status.balance === "ready" && avg != null
            ? t("selfService.team.summary.avgRemain", {
                n: number(Math.round(avg * 10) / 10, locale),
              })
            : ""
        }
      />
    </ul>
  )
}
