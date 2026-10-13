import { useId, useMemo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon"
import { useLocale } from "@/hooks/useLocale"
import { memberYear } from "@/lib/selfServiceTeam"
import { cn } from "@/lib/utils"
import { range } from "../kinds"
import { BalanceRow } from "../report/BalanceRow"
import { BreakdownList } from "../report/BreakdownList"
import { leaveAmount, leaveLabel, leaveLine, statusLine } from "./teamText"

const H4 = "px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground"

function Note({ children }) {
  return (
    <p className="mt-2 flex items-start gap-2 rounded-xl bg-muted/70 px-3 py-2 text-[0.75rem] leading-snug text-foreground/80">
      <HugeiconsIcon
        icon={InformationCircleIcon}
        aria-hidden="true"
        className="mt-px size-4 shrink-0 text-muted-foreground"
      />
      {children}
    </p>
  )
}

/** Yaklaşan izinler: tarih aralığı (yıllı) · tür (ekip arkadaşında "İzinde") · süre. */
function Upcoming({ list }) {
  const { t, locale } = useLocale()
  return (
    <section className="min-w-0">
      <h4 className={H4}>{t("selfService.team.pane.upcoming")}</h4>
      {list.length ? (
        <ul className="mt-1.5 space-y-0.5">
          {list.map((r) => (
            <li
              key={r.id}
              className="flex min-w-0 items-baseline gap-2 rounded-xl px-2 py-1.5 text-[0.8125rem]"
            >
              <span className="shrink-0 font-semibold tabular-nums">
                {range(r.start, r.end, locale)}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {[leaveLabel(r, t), leaveAmount(r, t, locale)].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 px-1 text-[0.8125rem] text-muted-foreground">
          {t("selfService.team.pane.noUpcoming")}
        </p>
      )}
    </section>
  )
}

/** Şu anki durum: "Bugün izinde · son gün 16 Eki" ve altında iznin satırı. */
function StatusBox({ line, current }) {
  const { t, locale } = useLocale()
  return (
    <p
      className={cn(
        "rounded-xl px-3 py-2 text-[0.8125rem]",
        line.tone === "away"
          ? "bg-brand/[0.09] font-semibold text-brand-ink"
          : "bg-foreground/[0.04] text-foreground/80",
      )}
    >
      {line.text}
      {current && (
        <span className="block text-[0.75rem] font-normal text-foreground/75">
          {leaveLine(current, t, locale)}
        </span>
      )}
    </p>
  )
}

/**
 * Kişi bölmesinin izin bölümü. Bana bağlıda: şu anki durum, yıllık bakiye, bu yılın türlere göre
 * dağılımı, yaklaşan izinler. Yöneticide ve ekip arkadaşında YALNIZ izin günleri (şu anki durum,
 * yaklaşan izinler — türsüz) ve bunu söyleyen not; bakiye ve tür yok. ERP okunamazsa tek not.
 */
export function MemberLeaves({ row, today, status }) {
  const { t, locale } = useLocale()
  const titleId = useId()
  const report = row.relation === "report"
  const year = today.getFullYear()
  const data = useMemo(() => memberYear(row.leaves, year, today), [row.leaves, year, today])
  const line = statusLine(row.status, t, locale)
  // Bölüm bazında: izinler ve bakiye ayrı düşebilir; ikisi de yoksa tek not.
  const leaves = status.leaves === "ready" && row.matched
  const balance = report && status.balance === "ready" && row.matched
  const note =
    status.all === "ready"
      ? row.matched
        ? t("selfService.team.erp.partial")
        : t("selfService.team.erp.unmatched")
      : status.all === "denied" && status.reason === "consent"
        ? t("selfService.team.erp.consent")
        : status.all === "denied" || status.all === "empty"
          ? t("selfService.team.erp.denied")
          : t("selfService.team.erp.error")

  return (
    <section aria-labelledby={titleId} className="mt-5 min-w-0">
      <h3 id={titleId} className="px-1 text-[0.875rem] font-semibold">
        {report ? t("selfService.team.pane.leaves", { year }) : t("selfService.team.pane.days")}
      </h3>
      {status.all === "loading" ? (
        <div aria-hidden="true" className="mt-2 space-y-2">
          <span className="ms-skeleton block h-9 rounded-xl" />
          <span className="ms-skeleton block h-20 rounded-xl" />
        </div>
      ) : !leaves && !balance ? (
        <Note>{note}</Note>
      ) : !report ? (
        <div className="mt-2 flex flex-col gap-4">
          {line && <StatusBox line={line} current={row.status.current} />}
          <Upcoming list={data.upcoming} />
          <Note>{t("selfService.team.pane.private")}</Note>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-4">
          {leaves && line && <StatusBox line={line} current={row.status.current} />}
          {balance && <BalanceRow balance={row.balance} />}
          {!leaves ? (
            <Note>{note}</Note>
          ) : data.byType.rows.length ? (
            <BreakdownList
              title={t("selfService.team.pane.byType")}
              breakdown={data.byType}
              kind="days"
            />
          ) : (
            <p className="px-1 text-[0.8125rem] text-muted-foreground">
              {t("selfService.team.pane.noLeaves")}
            </p>
          )}
          {leaves && <Upcoming list={data.upcoming} />}
        </div>
      )}
    </section>
  )
}
