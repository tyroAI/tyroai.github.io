import { memo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Home01Icon from "@hugeicons/core-free-icons/Home01Icon"
import { cn } from "@/lib/utils"
import { HourStrip } from "./HourStrip"

const ACTION =
  "grid size-5 place-items-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:size-7"

/**
 * Dünya saatinin bir satırı: solda yapışkan bilgi sütunu (kaldır · ana şehir
 * yap · fark · ad · ülke · yerel saat), sağda 24 saatlik şerit. Satırın
 * düğmeleri fareyle üstüne gelince ve klavye odağında görünür (dokunmatikte
 * hep). Ana şehir kaldırılamaz; yerinde ev simgesi durur.
 */
export const ClockRow = memo(function ClockRow({
  row,
  t,
  monthFmt,
  hourLabel,
  onHover,
  onPick,
  onRemove,
  onSetHome,
}) {
  const { city, name, region, abbr, isHome, offset, time, date, otherDay, strip } = row
  return (
    <div className="group/row flex items-center border-b border-border/40 py-2 last:border-b-0">
      <div className="sticky start-0 z-[3] flex w-[var(--info)] shrink-0 items-center gap-1.5 self-stretch bg-popover pe-3 ps-1 transition-colors group-hover/row:bg-muted">
        <div className="flex w-5 shrink-0 flex-col items-center gap-0.5 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100 [@media(pointer:coarse)]:opacity-100">
          {!isHome && (
            <>
              <button
                type="button"
                onClick={() => onRemove(city.id)}
                aria-label={t("worldClock.remove", { city: name })}
                title={t("worldClock.remove", { city: name })}
                className={ACTION}
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => onSetHome(city.id)}
                aria-label={t("worldClock.setHome", { city: name })}
                title={t("worldClock.setHome", { city: name })}
                className={ACTION}
              >
                <HugeiconsIcon icon={Home01Icon} className="size-3" strokeWidth={2} />
              </button>
            </>
          )}
        </div>
        <div className="flex w-8 shrink-0 justify-center">
          {isHome ? (
            <HugeiconsIcon
              icon={Home01Icon}
              className="size-4.5 text-brand"
              strokeWidth={2.2}
              aria-label={t("worldClock.home")}
              role="img"
            />
          ) : (
            <span
              dir="ltr"
              className={cn(
                "text-[0.75rem] font-semibold tabular-nums",
                offset === "±0" ? "text-muted-foreground/60" : "text-muted-foreground",
              )}
            >
              {offset}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5">
            <span
              dir="auto"
              className="truncate text-[0.9375rem] font-semibold leading-tight transition-colors group-hover/row:text-brand"
            >
              {name}
            </span>
            <span className="hidden shrink-0 rounded border border-border px-1 text-[0.625rem] leading-4 text-muted-foreground sm:inline">
              {abbr}
            </span>
          </p>
          <p dir="auto" className="hidden truncate text-[0.75rem] text-muted-foreground sm:block">
            {region}
          </p>
          {/* Dar ekranda saat adın altında (sağ sütuna yer yok). */}
          <p className="text-[0.8125rem] font-semibold tabular-nums sm:hidden">
            {time}
            <span
              className={cn(
                "ms-1.5 text-[0.6875rem] font-normal",
                otherDay ? "text-brand" : "text-muted-foreground",
              )}
            >
              {date}
            </span>
          </p>
        </div>
        <div className="hidden shrink-0 text-end sm:block">
          <p className="text-[1rem] font-semibold leading-tight tabular-nums">{time}</p>
          <p
            className={cn(
              "text-[0.6875rem]",
              otherDay ? "font-medium text-brand" : "text-muted-foreground",
            )}
          >
            {date}
          </p>
        </div>
      </div>
      <div className="ps-2">
        <HourStrip
          strip={strip}
          monthFmt={monthFmt}
          interactive={isHome}
          hourLabel={hourLabel}
          label={t("worldClock.strip", { city: name })}
          onHover={onHover}
          onPick={onPick}
        />
      </div>
    </div>
  )
})
