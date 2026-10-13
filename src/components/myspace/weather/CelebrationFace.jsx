import { HugeiconsIcon } from "@hugeicons/react"
import Award01Icon from "@hugeicons/core-free-icons/Award01Icon"
import BirthdayCakeIcon from "@hugeicons/core-free-icons/BirthdayCakeIcon"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import { useLocale } from "@/hooks/useLocale"
import { getNumberFormat } from "@/lib/intl-cache"
import { cn } from "@/lib/utils"
import { CardParty } from "./CardParty"

/**
 * KUTLAMA GÜNÜNÜN ÖN YÜZÜ — doğum günü ya da iş yıl dönümünde hava kartının
 * önü tamamen o güne ait: tebrik, alt cümle, süs. Hava dipte tek satır; kartın
 * tamamı tıklanır ve hava ayrıntısı penceresini açar (kartın tetiği aynı
 * `sky-weather__trigger`: gerilmiş `::after`, odak halkası kartta).
 * Doğum günü paletin renklerinde (koyu örtüyle — açık paletlerde de beyaz yazı
 * okunsun); yıl dönümü lacivert + altın. İkisi aynı gündeyse doğum günü,
 * yıl altın rozette.
 */
export function CelebrationFace({
  celebration,
  greeting,
  firstName,
  ready,
  weatherLine,
  temp,
  place,
  triggerRef,
  onOpen,
}) {
  const { t, locale } = useLocale()
  const birthday = Boolean(celebration.birthday)
  const years = celebration.anniversary?.years ?? null
  const yearsText = years != null ? getNumberFormat(locale).format(years) : ""
  return (
    <div
      className={cn(
        "absolute inset-0 z-[1] flex flex-col items-center justify-center overflow-hidden rounded-[inherit] px-5 pb-12 pt-6 text-center text-white",
        birthday
          ? "bg-[linear-gradient(135deg,var(--brand-from),var(--brand-via)_55%,var(--brand-to))]"
          : "bg-[radial-gradient(120%_90%_at_50%_0%,#24356e,#0b1230_70%)]",
      )}
    >
      {/* Açık paletlerde (Insta'nın sarısı) beyaz yazı okunsun diye örtü. */}
      {birthday && <div aria-hidden="true" className="absolute inset-0 bg-black/25" />}
      <CardParty celebration={celebration} />
      <span
        aria-hidden="true"
        className={cn(
          "relative grid size-14 place-items-center rounded-full ring-1",
          birthday
            ? "bg-white/20 ring-white/35"
            : "bg-[#ffd65b]/15 ring-[#ffd65b]/50 text-[#ffd65b]",
        )}
      >
        {birthday ? (
          <HugeiconsIcon icon={BirthdayCakeIcon} className="size-7" strokeWidth={1.8} />
        ) : (
          <span className="text-[1.5rem] font-bold tabular-nums">{yearsText}</span>
        )}
      </span>
      <h2 className="relative mt-3 text-[1.5rem] font-semibold leading-tight tracking-[-0.02em]">
        {greeting}, {firstName}!
      </h2>
      <p className="relative mt-1 text-[0.875rem] text-white/85">
        {birthday
          ? t("myspace.cel.face.birthday")
          : t("myspace.cel.face.anniversary", { n: yearsText })}
      </p>
      {birthday && years != null && (
        <span className="relative mt-2 inline-flex items-center gap-1 rounded-full bg-[#ffd65b]/20 px-2.5 py-0.5 text-[0.75rem] font-semibold text-[#ffe9a8] ring-1 ring-[#ffd65b]/40">
          <HugeiconsIcon
            icon={Award01Icon}
            className="size-3.5"
            strokeWidth={2}
            aria-hidden="true"
          />
          {t("feed.cel.years", { count: years })}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 px-4 pb-3.5 text-[0.75rem] text-white/80">
        <HugeiconsIcon
          icon={Location01Icon}
          className="size-3.5 shrink-0"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        {ready ? (
          <span className="min-w-0 truncate">
            {temp}
            {place && ` · ${place}`}
            <span className="text-white/60"> — {t("myspace.cel.face.weather")}</span>
          </span>
        ) : (
          <span aria-hidden="true" className="h-2.5 w-28 rounded-full bg-white/25" />
        )}
      </div>
      {ready && (
        <button
          ref={triggerRef}
          type="button"
          data-weather-trigger=""
          aria-haspopup="dialog"
          onClick={onOpen}
          className="sky-weather__trigger"
        >
          <span className="sr-only">
            {weatherLine}. {t("myspace.weather.openShort")}
          </span>
        </button>
      )}
    </div>
  )
}
