import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { cn } from "@/lib/utils"

/**
 * A person, as the Outlook-style panels draw one: their Graph photo when we
 * have it, a deterministic initials circle when we don't, and optionally an
 * RSVP badge pinned to the corner.
 *
 * The initials palette is fixed rather than brand-driven on purpose — the
 * same person must stay the same colour across palette switches, or the
 * avatar stops being an identity cue and becomes decoration.
 */

const PERSON_HUES = [230, 25, 145, 300, 340, 65, 190]

function initials(name) {
  return (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

function personTone(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  const hue = PERSON_HUES[Math.abs(hash) % PERSON_HUES.length]
  return {
    backgroundColor: `oklch(0.88 0.055 ${hue})`,
    color: `oklch(0.42 0.11 ${hue})`,
  }
}

// ⚠️ **YEŞİL VE KEHRİBAR DOĞRUDAN YAZILIR, TOKENLA DEĞİL** (2026-09-28).
// Bu dosya tyroTrade'den `--success` / `--warning` çiftiyle geldi; tyro'da o
// tokenlar YOK (anlamsal durum renkleri bilerek palet sisteminin dışında —
// `profile/primitives.jsx`in kuralı). Tanımsız bir `var()` sessizce saydam
// çıkıyordu: kabul rozeti renksiz bir daireydi, "müsait" ve "uzakta" noktaları
// HİÇ çizilmiyordu — yalnız "meşgul" (kırmızı) görünüyordu, header takviminde
// ve çentikte de. Hata vermediği için aylarca fark edilmedi.
// Mürekkep her rozette ölçüyle seçildi: emerald-600 üstünde beyaz ≈ 3,8:1
// (glif için 3:1 yeter), kehribarın üstünde beyaz ~1,6:1 kalıyordu — orada
// koyu mürekkep.
const RESPONSE_BADGE = {
  accepted: { className: "bg-emerald-600 text-white", icon: Tick02Icon },
  declined: { className: "bg-destructive text-white", icon: Cancel01Icon },
}
const TENTATIVE_BADGE = "bg-amber-400 text-amber-950"

/** Canlı Teams durumunun rengi (nokta; mürekkep taşımıyor). SINIF, satır içi
 *  `var(--color-*)` DEĞİL: Tailwind v4 yalnız kullanılan tema değişkenlerini
 *  basıyor ve bir JS dizesindeki `var()` onu "kullanılmış" saydırmıyor. */
const PRESENCE_TONE = {
  available: "bg-emerald-500",
  busy: "bg-destructive",
  away: "bg-amber-400",
  offline: "bg-muted-foreground",
}

/** Photo if Graph has one, initials circle if not, response badge on top. */
export function PersonAvatar({ name, photo, response, presence, presenceLabel, className }) {
  const badge = RESPONSE_BADGE[response]
  const tentative = response === "tentativelyAccepted"
  const tone = PRESENCE_TONE[presence]
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      title={presenceLabel ? `${name} · ${presenceLabel}` : name}
    >
      {photo ? (
        <img src={photo} alt="" className="block size-full rounded-full object-cover" />
      ) : (
        <span
          className="grid size-full place-items-center rounded-full text-[0.5625rem] font-semibold"
          style={personTone(name)}
        >
          {initials(name)}
        </span>
      )}
      {/* Canlı durum ÜST sağda; RSVP rozeti alt sağda kalır. İkisi farklı
          soruların cevabı — "geliyor mu" ile "şu an masasında mı" — ve aynı
          köşeyi paylaşsalardı biri diğerini gizlerdi. Durum bilinmiyorsa
          hiç nokta çizilmez. */}
      {tone && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-popover",
            tone,
          )}
        />
      )}
      {(badge || tentative) && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -right-0.5 -bottom-0.5 grid size-3 place-items-center rounded-full ring-2 ring-popover",
            badge ? badge.className : TENTATIVE_BADGE,
          )}
        >
          {badge ? (
            <HugeiconsIcon icon={badge.icon} className="size-2" strokeWidth={3.5} />
          ) : (
            <span className="text-[0.4375rem] font-bold leading-none">?</span>
          )}
        </span>
      )}
    </span>
  )
}
