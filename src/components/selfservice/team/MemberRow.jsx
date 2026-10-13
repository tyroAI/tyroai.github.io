import { HugeiconsIcon } from "@hugeicons/react"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { PersonAvatar } from "@/components/common/PersonAvatar"
import { useLocale } from "@/hooks/useLocale"
import { hireDayOf } from "@/lib/selfServiceProfile"
import { cn } from "@/lib/utils"
import { tenureText } from "../header/profileText"
import { COL } from "./columns"
import { balanceText, statusLine } from "./teamText"

function Status({ line, className }) {
  if (!line) return null
  return (
    <span
      className={cn(
        "inline-block max-w-full truncate align-middle text-[0.75rem]",
        line.tone === "away"
          ? "rounded-full bg-brand/[0.12] px-2 py-0.5 font-semibold text-brand-ink"
          : "text-muted-foreground",
        className,
      )}
    >
      {line.text}
    </span>
  )
}

/** "Yöneticim" etiketi — ekip arkadaşları bölümünde yöneticinin satırı. */
export function ManagerTag({ className }) {
  const { t } = useLocale()
  return (
    <span
      className={cn(
        "shrink-0 rounded-md bg-foreground/[0.06] px-1.5 py-px text-[0.6875rem] font-semibold text-foreground/75",
        className,
      )}
    >
      {t("selfService.team.managerTag")}
    </span>
  )
}

/**
 * Ekip listesinin satırı (bütünü bir düğme → kişi bölmesi): avatar ve varlık noktası, ad
 * (yöneticide "Yöneticim" etiketi), unvan, sicil; şu anki durum ("Bugün izinde · son gün 16 Eki"
 * / "Sıradaki izin 3 Kas"), kalan yıllık izin (kalan / hak — YALNIZ bana bağlıda), hizmet süresi.
 * Genişte sütunlar, telefonda iki-üç satır. `wide`: bakiye sütunu olmayan bölümde durum sütunu
 * onun yerini de alır (iki bölüm hizalı).
 */
export function MemberRow({ row, photo, presence, status, onOpen, wide = false }) {
  const { t, locale } = useLocale()
  const p = row.person
  const report = row.relation === "report"
  const loading = status.all === "loading"
  const line = status.leaves === "ready" ? statusLine(row.status, t, locale) : null
  const balance = report && status.balance === "ready" ? balanceText(row.balance, t, locale) : ""
  const share =
    row.balance?.claim > 0
      ? Math.min(Math.max((row.balance.used ?? 0) / row.balance.claim, 0), 1)
      : 0
  const tenure = tenureText(hireDayOf(p.employeeHireDate), t, locale)
  const skeleton = <span aria-hidden="true" className="ms-skeleton block h-4 w-24 rounded" />
  return (
    <li>
      <button
        type="button"
        data-team-row
        onClick={() => onOpen(row.key)}
        className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-start transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40 pointer-coarse:min-h-14 @[40rem]/ss:px-4"
      >
        <PersonAvatar
          name={p.name}
          photo={photo}
          presence={presence}
          presenceLabel={presence ? t(`calendar.presence.${presence}`) : undefined}
          className="size-9 [&>span:first-of-type]:text-[0.75rem]"
        />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline gap-2">
            <span lang="tr" className="min-w-0 truncate text-[0.875rem] font-semibold">
              {p.name}
            </span>
            {row.relation === "manager" && <ManagerTag />}
            {balance && (
              <span className="ms-auto shrink-0 text-[0.75rem] font-semibold tabular-nums text-foreground/80 @[56rem]/ss:hidden">
                <span className="sr-only">{t("selfService.team.list.balance")}: </span>
                {balance}
              </span>
            )}
          </span>
          <span className="block truncate text-[0.75rem] text-muted-foreground">
            {p.title && <span lang="tr">{p.title}</span>}
            {p.title && row.personnel && " · "}
            {row.personnel && (
              <span className="tabular-nums">
                <span className="sr-only">{t("selfService.profile.personnel")} </span>#
                {row.personnel}
              </span>
            )}
            {tenure && <span className="@[56rem]/ss:hidden"> · {tenure}</span>}
          </span>
          {line && <Status line={line} className="mt-1 @[56rem]/ss:hidden" />}
        </span>
        <span className={wide ? COL.statusWide : COL.status}>
          {loading ? (
            skeleton
          ) : line ? (
            <>
              <span className="sr-only">{t("selfService.team.list.status")}: </span>
              <Status line={line} />
            </>
          ) : null}
        </span>
        {report && (
          <span className={COL.balance}>
            {loading ? (
              skeleton
            ) : balance ? (
              <>
                <span className="block text-[0.8125rem] font-semibold tabular-nums">
                  <span className="sr-only">{t("selfService.team.list.balance")}: </span>
                  {balance}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-1 block h-1 w-24 overflow-hidden rounded-full bg-foreground/[0.07]"
                >
                  <span
                    className="block h-full rounded-full bg-brand/70"
                    style={{ width: `${share * 100}%` }}
                  />
                </span>
              </>
            ) : (
              <span className="text-[0.8125rem] text-muted-foreground">—</span>
            )}
          </span>
        )}
        <span className={cn(COL.tenure, "text-[0.8125rem] tabular-nums text-foreground/80")}>
          {tenure ? (
            <>
              <span className="sr-only">{t("selfService.profile.tenure")}: </span>
              {tenure}
            </>
          ) : (
            "—"
          )}
        </span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground/50 rtl:rotate-180"
        />
      </button>
    </li>
  )
}
