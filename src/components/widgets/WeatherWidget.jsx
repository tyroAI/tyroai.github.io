import { HugeiconsIcon } from "@hugeicons/react"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import SunCloud02Icon from "@hugeicons/core-free-icons/SunCloud02Icon"
import { WeatherGreeting } from "@/components/myspace/WeatherPill"
import { useLocale } from "@/hooks/useLocale"
import { greetingKey } from "@/lib/greeting"
import { cn } from "@/lib/utils"
import { WidgetEmpty } from "./WidgetEmpty"

// Boş durumun tek düğmesi — Copilot yapılacakları widget'ıyla aynı hap.
const CTA =
  "inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-fill-deep px-3.5 text-[0.75rem] font-semibold text-brand-on-brand transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60 pointer-coarse:h-11 [&_svg]:size-3.5"

/**
 * Hava ve karşılama — Anasayfa'nın gökyüzü kartı aynen, hücreyi doldurur. Hava
 * kapalıysa ya da okunamadıysa selamlama bir kartın içinde (çıplak başlık
 * ızgarada boş bir hücre gibi duruyordu).
 * `plain`: aynı kart SELAMLAMASIZ (Pano › "Hava durumu"); konum satırı başta, kutlama
 * yüzü yok. Hava okunamazsa selamlama yerine boş durum ve "Konumumu kullan".
 */
export function WeatherWidget({ weather, now, firstName, celebration, plain = false, className }) {
  const { t } = useLocale()
  const bare = weather.status === "off" || weather.status === "error"
  if (plain && bare) {
    return (
      <div
        data-widget="weather-plain"
        className={cn("ms-surface flex min-w-0 flex-col rounded-[1.75rem] p-5", className)}
      >
        <WidgetEmpty
          icon={SunCloud02Icon}
          action={
            weather.status === "error" && (
              <button
                type="button"
                className={CTA}
                disabled={weather.locating}
                onClick={weather.locateMe}
              >
                <HugeiconsIcon icon={Location01Icon} strokeWidth={1.8} aria-hidden="true" />
                {t(weather.locating ? "myspace.weather.locating" : "myspace.weather.useMyLocation")}
              </button>
            )
          }
        >
          {t("widgets.weatherPlain.unavailable")}
        </WidgetEmpty>
      </div>
    )
  }
  return (
    <div
      data-widget={plain ? "weather-plain" : "weather"}
      className={cn(
        // Gök kartının en az genişliği (260px) dar hücrede taşırıyordu: hücreye sığar.
        "@container/hero flex min-w-0 flex-col [&_.sky-weather]:min-w-0",
        bare && "ms-surface justify-end rounded-[1.75rem] p-5 [&>h2]:mt-0",
        className,
      )}
    >
      <WeatherGreeting
        w={weather}
        greeting={greetingKey(new Date(now).getHours())}
        firstName={firstName}
        celebration={celebration}
        plain={plain}
        className="flex-1"
      />
    </div>
  )
}
