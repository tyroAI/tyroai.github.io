import { HugeiconsIcon } from "@hugeicons/react"
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon"
import HelpCircleIcon from "@hugeicons/core-free-icons/HelpCircleIcon"
import Loading03Icon from "@hugeicons/core-free-icons/Loading03Icon"
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon"
import { useLocale } from "@/hooks/useLocale"
import { RSVP_ACTIONS } from "@/lib/calendarInvites"
import { cn } from "@/lib/utils"

const ICON = { accept: Tick02Icon, tentativelyAccept: HelpCircleIcon, decline: Cancel01Icon }
const LABEL = {
  accept: "myspace.invite.accept",
  tentativelyAccept: "myspace.invite.tentative",
  decline: "myspace.invite.decline",
}

// Outlook'un renk dili: kabul yeşil, belki gri, ret kırmızı. `dark` özetin
// koyu ipucunda, `light` toplantı önizleme kartında.
const TONE = {
  dark: {
    accept:
      "bg-emerald-500/15 text-emerald-300 ring-emerald-400/35 hover:bg-emerald-500 hover:text-white",
    tentativelyAccept: "bg-white/10 text-white/80 ring-white/20 hover:bg-white/20 hover:text-white",
    decline: "bg-red-500/15 text-red-300 ring-red-400/35 hover:bg-red-500 hover:text-white",
  },
  light: {
    accept: "bg-emerald-600 text-white ring-emerald-600 hover:bg-emerald-700",
    tentativelyAccept: "bg-muted text-foreground/85 ring-border hover:bg-accent",
    decline: "bg-red-500/10 text-red-700 ring-red-500/30 hover:bg-red-500/15 dark:text-red-300",
  },
}

/**
 * Davet yanıtı: Kabul et · Belki · Reddet — simgeli, renkli. `pending` o an
 * gönderilen yanıt (dönen simge; diğer düğmeler bekler). `iconOnly`: listede
 * yalnız yuvarlak simgeler (ad `aria-label` ve `title`'da).
 */
export function RsvpButtons({ pending, onAnswer, tone = "light", iconOnly = false, className }) {
  const { t } = useLocale()
  return (
    // Sığmazsa alt satıra iner (RU "Под вопросом" kırpılmasın).
    <div className={cn("flex", iconOnly ? "shrink-0 gap-1.5" : "flex-wrap gap-1", className)}>
      {RSVP_ACTIONS.map((action) => (
        <button
          key={action}
          type="button"
          aria-label={iconOnly ? t(LABEL[action]) : undefined}
          title={iconOnly ? t(LABEL[action]) : undefined}
          disabled={Boolean(pending)}
          onClick={(e) => {
            e.stopPropagation()
            onAnswer(action)
          }}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:opacity-60",
            iconOnly
              ? "size-8 [@media(pointer:coarse)]:size-10"
              : "h-7 gap-1 px-2 text-[0.6875rem] [@media(pointer:coarse)]:h-9",
            tone === "light" ? "focus-visible:ring-brand/50" : "focus-visible:ring-white/70",
            TONE[tone][action],
          )}
        >
          <HugeiconsIcon
            icon={pending === action ? Loading03Icon : ICON[action]}
            className={cn(
              iconOnly ? "size-4" : "size-3.5",
              "shrink-0",
              pending === action && "animate-spin motion-reduce:animate-none",
            )}
            strokeWidth={2.2}
            aria-hidden="true"
          />
          {!iconOnly && t(LABEL[action])}
        </button>
      ))}
    </div>
  )
}
