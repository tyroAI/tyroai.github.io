import { InsightTip } from "@/components/myspace/InsightTip"
import { cn } from "@/lib/utils"

/**
 * Toplantı ritminin bir günü: yüksekliği o günün toplantı süresi olan çubuk
 * ve gün adı; üstüne gelince/basınca günün ipucu (`tip` — toplantı listesi).
 * En yoğun gün paletin gradyanında; sıfır dakikalı gün de iz bırakır (boş bir
 * sütun eksik veri gibi okunurdu).
 */
export function RhythmBar({ tip, pct, minutes, isPeak, isToday, day, label }) {
  return (
    <InsightTip {...tip}>
      <button
        type="button"
        aria-label={label}
        className="group/bar -my-1 flex min-w-0 flex-col items-center justify-end gap-1.5 rounded-xl py-1 outline-none transition-colors hover:bg-foreground/[0.035] focus-visible:ring-2 focus-visible:ring-brand/30 data-[state=open]:bg-foreground/[0.05]"
      >
        <span className="flex max-h-52 min-h-24 w-full flex-1 items-end justify-center">
          <span
            className={cn(
              "w-full max-w-4 rounded-full transition-[height,filter,background-color] duration-500",
              isPeak
                ? "bg-gradient-to-t from-brand-from via-brand-via to-brand-to group-hover/bar:brightness-110 group-data-[state=open]/bar:brightness-110"
                : minutes
                  ? "bg-brand/20 group-hover/bar:bg-brand/35 group-data-[state=open]/bar:bg-brand/35"
                  : "bg-foreground/[0.06] group-hover/bar:bg-foreground/[0.12] group-data-[state=open]/bar:bg-foreground/[0.12]",
            )}
            style={{ height: `${Math.max(pct, 6)}%` }}
          />
        </span>
        <span
          className={cn(
            "text-[0.625rem] text-muted-foreground",
            isToday && "font-semibold text-foreground",
          )}
        >
          {day}
        </span>
      </button>
    </InsightTip>
  )
}
