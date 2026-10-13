import { useLocale } from "@/hooks/useLocale"
import { STATUS_TONE } from "@/lib/selfServiceStatus"
import { cn } from "@/lib/utils"
import { day, money, number, TONE_DOT } from "../kinds"
import { AccrualCard } from "../report/AccrualCard"
import { BalanceRow } from "../report/BalanceRow"
import { rowLabel, rowValue } from "../report/reportText"
import { leaveLine } from "../team/teamText"

const CAPS = "text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-foreground/65"
const NOTE = "text-[0.75rem] text-muted-foreground"

function Section({ title, children }) {
  return (
    <section className="min-w-0">
      <h4 className={CAPS}>{title}</h4>
      <div className="mt-1">{children}</div>
    </section>
  )
}

function Row({ label, value, dot }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 py-px text-[0.75rem]">
      <dt className="flex min-w-0 items-center gap-1.5 text-foreground/75">
        {dot && <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dot)} />}
        <span className="truncate">{label}</span>
      </dt>
      <dd className="shrink-0 font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

function LeaveDetail({ balance, accrual, facts, period }) {
  const { t, locale } = useLocale()
  return (
    <>
      {balance ? (
        <BalanceRow balance={balance} />
      ) : (
        <p className={NOTE}>{t("selfService.tile.noBalance")}</p>
      )}
      <AccrualCard accrual={accrual} remain={balance?.remain} />
      {facts.next && (
        <Section title={t("selfService.tile.detail.nextLeave")}>
          <p className="text-[0.75rem] text-foreground/80">{leaveLine(facts.next, t, locale)}</p>
        </Section>
      )}
      <Section title={t("selfService.tile.detail.byType", { period })}>
        {facts.types.length ? (
          <dl>
            {facts.types.map((r) => (
              <Row
                key={r.key}
                label={rowLabel(r, t)}
                value={rowValue(r, "days", null, t, locale)}
              />
            ))}
          </dl>
        ) : (
          <p className={NOTE}>{t("selfService.report.empty")}</p>
        )}
      </Section>
    </>
  )
}

function MoneyDetail({ facts, period }) {
  const { t, locale } = useLocale()
  if (!facts.all) return <p className={NOTE}>{t("selfService.report.empty")}</p>
  const count = (n) => number(n, locale)
  return (
    <>
      <Section title={t("selfService.tile.detail.total", { period })}>
        <dl>
          {(facts.totals.length ? facts.totals : [["TRY", 0]]).map(([cur, amount]) => (
            <Row key={cur} label={cur} value={money(amount, cur, locale)} />
          ))}
        </dl>
      </Section>
      <Section title={t("selfService.report.byStatus")}>
        <dl>
          {facts.statuses.map((s) => (
            <Row
              key={s.key}
              label={rowLabel(s, t, { status: true })}
              value={count(s.count)}
              dot={TONE_DOT[STATUS_TONE[s.key]]}
            />
          ))}
          {facts.excluded > 0 && (
            <Row
              label={t("selfService.report.excludedGroup")}
              value={count(facts.excluded)}
              dot={TONE_DOT.neutral}
            />
          )}
        </dl>
        {facts.excluded > 0 && (
          <p className={cn(NOTE, "mt-1")}>{t("selfService.tile.excludedHint")}</p>
        )}
      </Section>
      {facts.latest && (
        <dl>
          <Row
            label={t("selfService.tile.detail.latest")}
            value={`${facts.latest.number ?? facts.latest.id} · ${day(facts.latest.date, locale)}`}
          />
        </dl>
      )}
    </>
  )
}

/**
 * Özet kutusunun ayrıntısı — masaüstünde hover kartında, telefonda çekmecede (üçü alt alta).
 * Sayılar özetle ve raporla aynı kaynaktan (`tileFacts`: `summarize`, `leaveReport`).
 */
export function TileDetail({ kind, balance, accrual, facts, period, className }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      {kind === "leave" ? (
        <LeaveDetail balance={balance} accrual={accrual} facts={facts.leave} period={period} />
      ) : (
        <MoneyDetail facts={facts[kind]} period={period} />
      )}
    </div>
  )
}
