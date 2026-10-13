import { HugeiconsIcon } from "@hugeicons/react"
import Gps01Icon from "@hugeicons/core-free-icons/Gps01Icon"
import Loading03Icon from "@hugeicons/core-free-icons/Loading03Icon"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

/**
 * Konum notu + "Konumumu kullan" / "Konumu yenile". Not değişince ekran okuyucu
 * duyar (`role="status"`).
 * ⚠️ Konum TARAYICIDAN geldiyse düğme "yenile" der ve bir hata "ağ bağlantısından
 * tahmin ediliyor" DEMEZ — ekranda tam konum dururken kendiyle çelişiyordu.
 * ⚠️ "Konum bulunuyor…" canlı bölgeye de eklenir (`sr-only`; görünür hâli
 * düğmede): bölge ilerlemeyi hiç duyurmuyordu.
 */
export function LocationRow({ w }) {
  const { t } = useLocale()
  const precise = !w.place.approx
  const note = w.notice
    ? t(
        precise
          ? "myspace.weather.refreshFailed"
          : w.notice === "denied"
            ? "myspace.weather.locationDenied"
            : "myspace.weather.locationUnavailable",
      )
    : t(precise ? "myspace.weather.precisePlace" : "myspace.weather.approxPlace")
  return (
    <div className="mx-5 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-2xl p-3 ring-1 ring-inset ring-foreground/[0.07] sm:mx-6">
      <p
        role="status"
        className={cn(
          "flex min-w-0 flex-[1_1_14rem] items-start gap-2 text-[0.75rem] leading-snug",
          w.notice ? "text-amber-700 dark:text-amber-400" : "text-foreground/70",
        )}
      >
        <span
          aria-hidden="true"
          className="grid size-6 shrink-0 place-items-center rounded-full bg-background/80 text-foreground/70 shadow-[0_1px_2px_rgb(10_30_60/0.12)] ring-1 ring-foreground/[0.06]"
        >
          <HugeiconsIcon icon={Location01Icon} className="size-3.5" strokeWidth={1.9} />
        </span>
        <span className="pt-0.5">{note}</span>
        {w.locating && <span className="sr-only"> {t("myspace.weather.locating")}</span>}
      </p>
      {/* ⚠️ `aria-disabled`, `disabled` DEĞİL: klavyeyle basan kişinin odağı
          düğme kapanınca <body>'ye düşerdi. İkinci basış yok sayılır.
          ⚠️ Odak halkası paletten bağımsız (`foreground/70`, her palette ≥ 7:1). */}
      <button
        type="button"
        onClick={() => {
          if (!w.locating) w.locateMe()
        }}
        aria-disabled={w.locating || undefined}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[0.75rem] font-semibold text-background transition hover:bg-foreground/85 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-disabled:opacity-60 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:px-4"
      >
        <HugeiconsIcon
          icon={w.locating ? Loading03Icon : Gps01Icon}
          className={cn("size-3.5", w.locating && "animate-spin motion-reduce:animate-none")}
          strokeWidth={1.9}
          aria-hidden="true"
        />
        {w.locating
          ? t("myspace.weather.locating")
          : t(precise ? "myspace.weather.refreshLocation" : "myspace.weather.useMyLocation")}
      </button>
    </div>
  )
}
