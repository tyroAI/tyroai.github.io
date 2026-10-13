import { useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon"
import Location01Icon from "@hugeicons/core-free-icons/Location01Icon"
import Video01Icon from "@hugeicons/core-free-icons/Video01Icon"
import { TeamsLogo } from "@/components/brand/TeamsLogo"
import { useFits } from "@/hooks/useFits"
import { cn } from "@/lib/utils"
import { physicalPlace } from "./meetingPlace"

/**
 * Temsilî harita (gerçek harita değil): kavisli kıyı, parklar, bina
 * blokları, ana/ara yollar ve vurgulu güzergâh. İğne bandın orta hücresinde
 * (`MapPin`). `slice` ile ortalanır — bant kısalınca kenarlardan kırpılır.
 */
function MapArt() {
  return (
    <svg
      viewBox="0 0 320 140"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
      aria-hidden="true"
    >
      <rect width="320" height="140" className="fill-[#f3f2ee] dark:fill-[#222624]" />
      {/* Su: kavisli kıyı */}
      <path
        d="M210 140C222 112 252 104 276 92C298 81 312 66 330 58V140Z"
        className="fill-[#cfe4f4] dark:fill-[#1c3142]"
      />
      {/* Parklar */}
      <rect
        x="-6"
        y="-6"
        width="82"
        height="52"
        rx="14"
        className="fill-[#d7ebcf] dark:fill-[#243629]"
      />
      <rect
        x="238"
        y="-8"
        width="64"
        height="38"
        rx="12"
        className="fill-[#d7ebcf] dark:fill-[#243629]"
      />
      <circle cx="132" cy="122" r="16" className="fill-[#d7ebcf] dark:fill-[#243629]" />
      {/* Bina blokları */}
      <g className="fill-[#e6e4de] dark:fill-[#2b302d]">
        <rect x="100" y="10" width="42" height="26" rx="4" />
        <rect x="166" y="10" width="46" height="26" rx="4" />
        <rect x="100" y="70" width="42" height="24" rx="4" />
        <rect x="166" y="70" width="46" height="24" rx="4" />
        <rect x="20" y="70" width="50" height="24" rx="4" />
      </g>
      {/* Ara yollar */}
      <g className="stroke-white dark:stroke-[#353b37]" strokeWidth="4" strokeLinecap="round">
        <path d="M90 -10V150M156 -10V150M226 -10V60M-10 102H220" />
      </g>
      {/* Ana yollar: gri kenar + beyaz şerit */}
      <g strokeLinecap="round">
        <path d="M-10 56H330" className="stroke-[#d9d6cf] dark:stroke-[#3e4440]" strokeWidth="11" />
        <path d="M-10 56H330" className="stroke-white dark:stroke-[#4a514c]" strokeWidth="8" />
      </g>
      {/* Güzergâh */}
      <path
        d="M-10 128C60 120 96 84 150 70S250 40 330 20"
        fill="none"
        className="stroke-[#f4c95d] dark:stroke-[#8a7536]"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Çevrim içi toplantının zemini: paletin tonlarında yumuşak degrade. */
function OnlineArt() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 bg-gradient-to-br from-brand-from/20 via-brand-via/10 to-brand-to/25 dark:from-brand-from/25 dark:via-brand-via/10 dark:to-brand-to/25"
    />
  )
}

// Rozetten yayılan halkalar (px): dışa doğru silikleşir, bant kenarında kırpılır.
const RINGS = [
  [64, "border-brand/25 dark:border-white/[0.12]"],
  [108, "border-brand/[0.16] dark:border-white/[0.08]"],
  [160, "border-brand/10 dark:border-white/[0.05]"],
  [220, "border-brand/[0.06] dark:border-white/[0.03]"],
]

// Rozetin içi: Teams toplantısında Teams'in logosu, başka sağlayıcıda
// kamera, linksiz etkinlikte takvim; link aranırken boş (sonra belirir).
const GLYPH = {
  teams: <TeamsLogo className="size-4 @[3rem]:size-5" />,
  video: (
    <HugeiconsIcon
      icon={Video01Icon}
      className="size-4 @[3rem]:size-[1.125rem]"
      strokeWidth={1.8}
    />
  ),
  none: (
    <HugeiconsIcon
      icon={Calendar03Icon}
      className="size-4 @[3rem]:size-[1.125rem]"
      strokeWidth={1.8}
    />
  ),
}

/**
 * Çevrim içi toplantı: ortada cam bir rozet ve ondan yayılan ince halkalar.
 * Orta hücre daraldıkça rozet küçülür, çok darsa hiç çizilmez (köşedekilere
 * binmesin).
 */
function OnlineEmblem({ kind }) {
  return (
    <span aria-hidden="true" className="relative grid place-items-center @max-[1.5rem]:hidden">
      {RINGS.map(([size, tone]) => (
        <span
          key={size}
          style={{ width: size, height: size }}
          className={cn("absolute rounded-full border", tone)}
        />
      ))}
      <span className="relative grid size-6 place-items-center rounded-full bg-white/90 text-brand shadow-[0_10px_24px_-10px_color-mix(in_oklab,var(--brand-from)_80%,transparent)] ring-1 ring-white @[2rem]:size-7 @[3rem]:size-9 dark:bg-white/10 dark:text-white dark:ring-white/15">
        {GLYPH[kind] && (
          <span
            key={kind}
            className="grid place-items-center duration-300 animate-in fade-in-0 zoom-in-75"
          >
            {GLYPH[kind]}
          </span>
        )}
      </span>
    </span>
  )
}

/**
 * Haritanın iğnesi. Üzerine gelince (klavyede odakta, dokunmatikte hep) yerinde
 * konum ikonu ve "Konum" etiketine döner — orta hücrede, köşedeki geri sayıma
 * binmez. Yazının sığıp sığmadığı ölçülür (`useFits`, dile göre değişir);
 * sığmıyorsa etiket bandın dibine iner — hiçbir genişlikte yalnız ikon değil.
 */
function MapPin({ label }) {
  const box = useRef(null)
  const ghost = useRef(null)
  const fits = useFits(box, ghost)
  const icon = (
    <HugeiconsIcon
      icon={Location01Icon}
      className="size-3.5 shrink-0 text-red-500"
      strokeWidth={2}
    />
  )
  return (
    <span ref={box} className={cn("grid w-full min-w-0 place-items-center", fits && "relative")}>
      <span ref={ghost} aria-hidden="true" className={cn(PIN_LABEL, "invisible absolute w-max")}>
        {icon}
        {label}
      </span>
      <span
        aria-hidden="true"
        className="relative transition duration-200 [grid-area:1/1] group-hover/thumb:scale-50 group-hover/thumb:opacity-0 group-focus-visible/thumb:scale-50 group-focus-visible/thumb:opacity-0 pointer-coarse:opacity-0"
      >
        <span className="absolute -inset-3.5 rounded-full bg-red-500/20 motion-safe:animate-ping" />
        <span className="absolute -inset-3 rounded-full bg-red-500/15" />
        <span className="relative block size-4 rounded-full bg-red-500 shadow-[0_3px_8px_rgb(220_38_38/0.45)] ring-[3px] ring-white" />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          PIN_LABEL,
          // Dar hücrede iğnenin yerine sığmıyor: hücrenin ortasında bandın dibine, köşedekilerin altına iner.
          fits
            ? "max-w-full [grid-area:1/1]"
            : "absolute -bottom-1 left-1/2 -translate-x-1/2 gap-0.5 px-1.5 py-0.5 text-[0.625rem]",
          "scale-90 bg-white text-neutral-900 opacity-0 shadow-[0_6px_16px_-6px_rgb(0_0_0/0.4)] transition duration-200 group-hover/thumb:scale-100 group-hover/thumb:opacity-100 group-focus-visible/thumb:scale-100 group-focus-visible/thumb:opacity-100 pointer-coarse:scale-100 pointer-coarse:opacity-100 dark:bg-neutral-900 dark:text-white",
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
      </span>
    </span>
  )
}

const PIN_LABEL =
  "flex items-center gap-1 rounded-full px-2 py-1 text-[0.6875rem] font-semibold whitespace-nowrap"
const CHIP =
  "relative z-10 flex shrink-0 items-center rounded-full bg-white/85 px-2.5 py-1 text-[0.6875rem] font-semibold text-foreground/80 shadow-sm backdrop-blur-md dark:bg-black/45"

/**
 * Kartın üst bandı — yer varsa temsilî harita (kendisi Google Haritalar yol
 * tarifi bağlantısı), yoksa paletin degradesi ve rozet (`kind`: teams ·
 * video · none · pending). Üstte tek
 * sıra: solda tarih kutucuğu (`tile`), sağda geri sayım, aradaki boşluğun
 * ortasında iğne ya da rozet — sıra esnek, hiçbiri diğerine binmez. Bant
 * esnektir (`flex-1`): kartta yer kaldıkça uzar, sıkışınca kısalır.
 */
export function MeetingThumb({ event, kind, tile, countdown, pinLabel, mapsLabel, className }) {
  const place = physicalPlace(event)
  const Tag = place ? "a" : "div"
  const link = place
    ? {
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`,
        target: "_blank",
        rel: "noopener noreferrer",
        title: place,
        "aria-label": `${pinLabel}: ${place} — ${mapsLabel}`,
      }
    : {}
  return (
    <Tag
      {...link}
      className={cn(
        "group/thumb relative -mx-5 -mt-5 block min-h-[3.25rem] max-h-28 flex-1 basis-0 overflow-hidden rounded-t-[1.75rem] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50",
        className,
      )}
    >
      {place ? <MapArt /> : <OnlineArt />}
      <span className="absolute inset-0 flex items-start gap-2 pb-2 pe-3 ps-4 pt-2">
        <span className="relative z-10 shrink-0">{tile}</span>
        <span className="@container relative grid min-w-0 flex-1 place-items-center self-stretch">
          {place ? <MapPin label={pinLabel} /> : <OnlineEmblem kind={kind} />}
        </span>
        {countdown && <span className={CHIP}>{countdown}</span>}
      </span>
    </Tag>
  )
}
