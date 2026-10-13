import { lazy, Suspense, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import TimeZoneIcon from "@hugeicons/core-free-icons/TimeZoneIcon"
import { ClockText } from "@/components/common/ClockText"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useLocale } from "@/hooks/useLocale"
import { useMinuteNow } from "@/hooks/useMinuteNow"
import { formatClock } from "@/lib/clockFormat"
import { cn } from "@/lib/utils"

const loadDialog = () => import("./WorldClockDialog")
const WorldClockDialog = lazy(loadDialog)

/**
 * Header'daki dünya saati. Geniş masaüstünde (`showClock`) yerel saat ve tarih ikonun
 * sağında — saat dünya saatinin yanında okunur, bildirim (özel günler) kendi düğmesinde
 * tek başına kalır. Tablet ve telefonda yalnız ikon: orada saati takvim hapı gösteriyor.
 * Pencere ilk basışta yüklenir — üstüne gelince önden istenir, açılış beklemesin.
 */
export function WorldClockButton({ showClock = false }) {
  const { t, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-haspopup="dialog"
            aria-expanded={open}
            onPointerEnter={loadDialog}
            onFocus={loadDialog}
            onClick={() => {
              setMounted(true)
              setOpen(true)
            }}
            className={cn(
              "size-9 shrink-0 rounded-xl [&_svg]:!size-5 relative pointer-coarse:after:absolute pointer-coarse:after:-inset-1",
              showClock && "w-auto gap-2 pl-1.5 pr-2",
            )}
            {...(showClock ? {} : { "aria-label": t("worldClock.title") })}
          >
            <HugeiconsIcon icon={TimeZoneIcon} strokeWidth={1.8} />
            {showClock && <ClockLabel locale={locale} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("worldClock.title")}</TooltipContent>
      </Tooltip>
      {mounted && (
        <Suspense fallback={null}>
          <WorldClockDialog open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  )
}

/** Saat yazısı + ekran okuyucu adı (dakikada bir tazelenir; yalnız bu parça çizilir). */
function ClockLabel({ locale }) {
  const { t } = useLocale()
  const now = useMinuteNow()
  const { weekdayLong, fullDate, time } = formatClock(now, locale)
  return (
    <>
      <span className="sr-only">{`${t("worldClock.title")} · ${weekdayLong}, ${fullDate} · ${time}`}</span>
      <span aria-hidden="true" className="contents">
        <ClockText now={now} locale={locale} />
      </span>
    </>
  )
}
