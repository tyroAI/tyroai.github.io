import { HugeiconsIcon } from "@hugeicons/react"
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon"
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon"
import { EDGE_ARROW, edgeSide } from "@/components/common/edgeArrow"
import { useLocale } from "@/hooks/useLocale"
import { cn } from "@/lib/utils"

// Sıradaki toplantı kartının okuyla AYNI dil (`common/edgeArrow`): kartın içinde, kenarda;
// üzerine gelince ya da odakta belirir, dokunmatikte hep görünür.
const ARROW = cn(
  EDGE_ARROW,
  "pointer-events-auto opacity-0 group-hover/stack:translate-x-0 group-hover/stack:opacity-100 group-focus-within/stack:translate-x-0 group-focus-within/stack:opacity-100 focus-visible:translate-x-0 focus-visible:opacity-100 pointer-coarse:translate-x-0 pointer-coarse:opacity-100",
)

/**
 * Yığının geçişi — kartın üstüne gelince iki yanda, kartın içinde kenarda
 * ‹ › (dokunmatikte hep), altta noktalar (yığın olduğunu hep söyler).
 * Döngüsel: sondan başa geçer. Okun adı GİDİLECEK widget'ı söyler.
 */
export function StackNav({ names, at, onGo }) {
  const { t } = useLocale()
  const n = names.length
  const prev = (at - 1 + n) % n
  const next = (at + 1) % n
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <button
        type="button"
        aria-label={t("widgets.stack.prev", { name: names[prev] })}
        title={t("widgets.stack.prev", { name: names[prev] })}
        onClick={() => onGo(prev, -1)}
        className={cn(ARROW, edgeSide(-1))}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        aria-label={t("widgets.stack.next", { name: names[next] })}
        title={t("widgets.stack.next", { name: names[next] })}
        onClick={() => onGo(next, 1)}
        className={cn(ARROW, edgeSide(1))}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" strokeWidth={2.2} />
      </button>
      <span aria-hidden="true" className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
        {names.map((name, i) => (
          <span
            key={name}
            className={cn(
              "size-1.5 rounded-full transition",
              i === at ? "bg-brand" : "bg-foreground/20",
            )}
          />
        ))}
      </span>
    </div>
  )
}
